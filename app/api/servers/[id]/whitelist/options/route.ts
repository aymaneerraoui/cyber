import {NextResponse} from 'next/server'
import {getSession} from '@/lib/server/session'
import {fetchUserGuilds} from '@/lib/server/discord'
import {canManageGuild} from '@/lib/discord-permissions'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^\d{17,20}$/.test(id))return NextResponse.json({error:'Invalid server'},{status:400});
 try{const session=await getSession();if(!session)return NextResponse.json({error:'Login required'},{status:401});const guilds=await fetchUserGuilds(session.accessToken);if(!guilds.some(g=>g.id===id&&canManageGuild(g)))return NextResponse.json({error:'Forbidden'},{status:403});const token=process.env.DISCORD_BOT_TOKEN;if(!token)return NextResponse.json({error:'DISCORD_BOT_TOKEN missing'},{status:503});
 const headers={Authorization:`Bot ${token}`};const [rolesRes,channelsRes]=await Promise.all([fetch(`https://discord.com/api/v10/guilds/${id}/roles`,{headers,cache:'no-store'}),fetch(`https://discord.com/api/v10/guilds/${id}/channels`,{headers,cache:'no-store'})]);
 if(!rolesRes.ok||!channelsRes.ok)return NextResponse.json({error:`Discord API failed (roles ${rolesRes.status}, channels ${channelsRes.status}). Check bot membership/token.`},{status:502});
 const [roles,channels]=await Promise.all([rolesRes.json(),channelsRes.json()]);if(!Array.isArray(roles)||!Array.isArray(channels))return NextResponse.json({error:'Unexpected Discord API data'},{status:502});
 return NextResponse.json({roles:roles.filter((r:{name:string})=>r.name!=='@everyone').map((r:{id:string;name:string;color:number})=>({id:r.id,name:r.name,color:`#${r.color.toString(16).padStart(6,'0')}`})),channels:channels.filter((c:{type:number})=>[0,2,5].includes(c.type)).map((c:{id:string;name:string;type:number})=>({id:c.id,name:c.name,kind:c.type===2?'voice':c.type===5?'announcement':'text'}))},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('[whitelist options]',e);return NextResponse.json({error:'Could not load Discord options'},{status:502})}
}
