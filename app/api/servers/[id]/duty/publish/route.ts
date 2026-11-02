import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{id:string}> }
const snowflake = /^\d{17,20}$/
const fail = (error:string,status:number) => NextResponse.json({error},{status})
const record = (x:unknown): x is Record<string,unknown> => !!x && typeof x==='object' && !Array.isArray(x)
function validUrl(v:string) {if (!v) return true;try {return new URL(v).protocol === 'https:'}catch{return false}}

export async function POST(request:Request,{params}:Context) {
  try {
    const {id}=await params
    if (!snowflake.test(id)) return fail('Invalid server ID',400)
    const session=await getSession()
    if (!session) return fail('Please sign in',401)
    const guilds=await fetchUserGuilds(session.accessToken)
    if (!guilds.some(g=>g.id===id && canManageGuild(g))) return fail('You cannot manage this server',403)
    const token=process.env.DISCORD_BOT_TOKEN
    if (!token) return fail('DISCORD_BOT_TOKEN missing on Vercel',503)
    const body:unknown=await request.json().catch(()=>null)
    if (!record(body)||typeof body.channelId!=='string'||!snowflake.test(body.channelId)||!record(body.config))return fail('Invalid panel settings',400)
    const config=body.config
    const str=(key:string,max:number)=>typeof config[key]==='string'?(config[key] as string).slice(0,max):''
    const title=str('panelTitle',256)||'CYBER STAFF DUTY'
    const description=str('description',4096)||'Duty is tracked automatically in selected voice channels.'
    const color=str('embedColor',7)||'#eab308'
    const imageUrl=str('imageUrl',2048),thumbnailUrl=str('thumbnailUrl',2048)
    if (!/^#[0-9a-fA-F]{6}$/.test(color)||!validUrl(imageUrl)||!validUrl(thumbnailUrl))return fail('Invalid embed color or image URL (HTTPS required)',400)
    const channelId=body.channelId
    const headers={Authorization:`Bot ${token}`}
    const channelRes=await fetch(`https://discord.com/api/v10/channels/${channelId}`,{headers,cache:'no-store'})
    if (!channelRes.ok)return fail(`Discord channel unavailable (${channelRes.status})`,502)
    const channel:unknown=await channelRes.json().catch(()=>null)
    if (!record(channel)||String(channel.guild_id)!==id||![0,5].includes(Number(channel.type)))return fail('Select a text or announcement channel in this server',400)
    const embed:Record<string,unknown>={title,description,color:parseInt(color.slice(1),16),footer:{text:'CYBER ORGANIZATION • Duty System'}}
    if (imageUrl)embed.image={url:imageUrl}
    if (thumbnailUrl)embed.thumbnail={url:thumbnailUrl}
    const message={embeds:[embed],components:[{type:1,components:[
      {type:2,style:3,label:'My Duty Status',custom_id:'cyber_duty:status'},
      {type:2,style:2,label:'Leaderboard',custom_id:'cyber_duty:leaderboard'}
    ]}],allowed_mentions:{parse:[]}}
    const send=await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(message),cache:'no-store'})
    const result:unknown=await send.json().catch(()=>null)
    if (!send.ok)return fail(`Discord publish failed (${send.status}): ${record(result)&&record(result.message)?String(result.message).slice(0,180):'Check bot channel permissions'}`,502)
    if (!record(result)||typeof result.id!=='string')return fail('Discord returned an invalid message',502)
    return NextResponse.json({ok:true,channelId,messageId:result.id})
  }catch(e){console.error('[Duty Publish]',e);return fail('Unable to publish duty panel',500)}
}
