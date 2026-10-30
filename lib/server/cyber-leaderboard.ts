import { neon } from '@neondatabase/serverless'
import React from 'react'
import { ImageResponse } from 'next/og'

const API = 'https://discord.com/api/v10'
const snowflake = /^\d{17,20}$/
const token = () => { const t=process.env.DISCORD_BOT_TOKEN; if(!t) throw new Error('DISCORD_BOT_TOKEN missing'); return t }
const db = () => { const url=process.env.DATABASE_URL; if(!url) throw new Error('DATABASE_URL missing'); return neon(url) }
export async function discord(path:string, init:RequestInit={}) {
 const r=await fetch(`${API}${path}`,{...init,headers:{Authorization:`Bot ${token()}`,...(init.headers||{})},cache:'no-store'})
 if(!r.ok) throw new Error(`Discord HTTP ${r.status}: ${(await r.text()).slice(0,250)}`)
 return r.status===204?null:r.json()
}
export async function ensurePublisherTable(){
 const sql=db(); await sql`CREATE TABLE IF NOT EXISTS cyber_leaderboard_publishers (guild_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, message_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
}
export async function publisher(guildId:string){
 await ensurePublisherTable();const sql=db();const rows=await sql`SELECT channel_id AS "channelId", message_id AS "messageId" FROM cyber_leaderboard_publishers WHERE guild_id=${guildId}`;return rows[0] as {channelId:string;messageId:string|null}|undefined
}
async function ranking(guildId:string){
 const sql=db();const rows=await sql`
 WITH closed AS (SELECT DISTINCT ON (ticket_id) ticket_id,claimed_by_id,occurred_at FROM cyber_ticket_events WHERE guild_id=${guildId} AND event_type='closed' ORDER BY ticket_id,occurred_at ASC,event_id ASC)
 SELECT claimed_by_id AS "staffId",COUNT(*)::int AS "ticketsHandled" FROM closed WHERE claimed_by_id IS NOT NULL GROUP BY claimed_by_id ORDER BY "ticketsHandled" DESC,"staffId" ASC LIMIT 10`
 return Promise.all(rows.map(async (r:any)=>{
  let name=`Staff ${String(r.staffId).slice(-6)}`
  try { const u=await discord(`/users/${r.staffId}`);name=String(u.global_name||u.username||name) }catch{}
  return {staffId:String(r.staffId),name,ticketsHandled:Number(r.ticketsHandled)}
 }))
}
type Person={staffId:string;name:string;ticketsHandled:number}
export async function leaderboardPng(people:Person[]):Promise<Buffer>{
 const el=React.createElement
 const txt=(s:string,size:number,color='#f4f0e6',weight=600)=>el('span',{style:{fontSize:size,color,fontWeight:weight,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},s)
 const row=(person:Person|undefined,i:number)=>el('div',{key:i,style:{display:'flex',alignItems:'center',height:67,borderBottom:'1px solid #403821',padding:'0 24px',gap:18,background:i%2?'#18191d':'#121318'}},
 txt(`#${i+1}`,26,i===0?'#f6d36d':'#c7b77d',800),el('div',{style:{display:'flex',flexDirection:'column',flex:1}},txt(person?.name||'Unranked',24,'#f5f1e8',700),txt(person?`DISCORD ID: ${person.staffId}`:'No staff assigned',13,'#98969a',400)),txt(`${person?.ticketsHandled||0} TICKETS`,21,'#f1c761',800))
 const root=el('div',{style:{display:'flex',flexDirection:'column',width:1200,height:960,background:'linear-gradient(135deg,#090a0e,#1a1712 55%,#090a0e)',padding:48,color:'white',fontFamily:'Arial'}},
 el('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',paddingBottom:24,borderBottom:'2px solid #9d782c'}},txt('♛  CYBER ORGANIZATION',30,'#eabf46',900),txt('STAFF LEADERBOARD',56,'#fff4d6',900),txt('LIVE TICKET PERFORMANCE  •  TOP 10',18,'#c2a66b',600)),
 el('div',{style:{display:'flex',flexDirection:'column',marginTop:22,border:'1px solid #80672e',borderRadius:18,overflow:'hidden'}},...Array.from({length:10},(_,i)=>row(people[i],i))),
 el('div',{style:{display:'flex',justifyContent:'space-between',marginTop:22}},txt('ONE COMMUNITY. ONE POWER. ONE LEGACY.',17,'#d2b05e',700),txt('RANKED BY CLOSED & CLAIMED TICKETS',15,'#a7a4a0',500)))
 const response=new ImageResponse(root,{width:1200,height:960});return Buffer.from(await response.arrayBuffer())
}
const locks=new Set<string>()
export async function publishLeaderboard(guildId:string,channelOverride?:string){
 if(!snowflake.test(guildId)) throw new Error('Invalid guild')
 if(locks.has(guildId)) return {skipped:true}
 locks.add(guildId)
 try{
  await ensurePublisherTable();const sql=db();const previous=await publisher(guildId)
  const channelId=channelOverride||previous?.channelId
  if(!channelId||!snowflake.test(channelId)) throw new Error('Select a valid channel')
  const ch=await discord(`/channels/${channelId}`)
  if(ch.guild_id!==guildId||![0,5].includes(ch.type))throw new Error('Channel must be a text/announcement channel in this server')
  const people=await ranking(guildId);const png=await leaderboardPng(people)
  const content='🏆 **CYBER STAFF LEADERBOARD — TOP 10**\n'+people.map((x,i)=>`${['🥇','🥈','🥉'][i]||`#${i+1}`} <@${x.staffId}> — **${x.ticketsHandled} Tickets Closed**`).join('\n')+'\n\n*Automatically updated • Mentions do not send notifications*'
  const form=new FormData();form.append('payload_json',JSON.stringify({content,allowed_mentions:{parse:[]},attachments:[{id:0,filename:'cyber-leaderboard.png'}]}));form.append('files[0]',new Blob([new Uint8Array(png)],{type:'image/png'}),'cyber-leaderboard.png')
  let message:any;let edited=false
  if(previous?.messageId&&previous.channelId===channelId){
   try{message=await discord(`/channels/${channelId}/messages/${previous.messageId}`,{method:'PATCH',body:form});edited=true}catch(e){
    // Only replace missing messages. Never create a duplicate for permissions or transient failures.
    if(!String(e).includes('Discord HTTP 404'))throw e
   }
  }
  if(!message){
   const fresh=new FormData();fresh.append('payload_json',JSON.stringify({content,allowed_mentions:{parse:[]},attachments:[{id:0,filename:'cyber-leaderboard.png'}]}));fresh.append('files[0]',new Blob([new Uint8Array(png)],{type:'image/png'}),'cyber-leaderboard.png')
   message=await discord(`/channels/${channelId}/messages`,{method:'POST',body:fresh})
  }
  await sql`INSERT INTO cyber_leaderboard_publishers(guild_id,channel_id,message_id,updated_at) VALUES(${guildId},${channelId},${String(message.id)},NOW()) ON CONFLICT(guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,message_id=EXCLUDED.message_id,updated_at=NOW()`
  return {ok:true,channelId,messageId:String(message.id),edited,staffCount:people.length}
 }finally{locks.delete(guildId)}
}
export async function refreshPublishedLeaderboard(guildId:string){
 const setting=await publisher(guildId);if(!setting)return {skipped:true};return publishLeaderboard(guildId)
}
