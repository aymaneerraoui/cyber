import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params
 if(!/^\d{17,20}$/.test(id))return NextResponse.json({error:'invalid_server_id'},{status:400})
 const session=await getSession()
 if(!session)return NextResponse.json({error:'unauthenticated'},{status:401})
 try{
  const guilds=await fetchUserGuilds(session.accessToken)
  if(!guilds.some(g=>g.id===id&&canManageGuild(g)))return NextResponse.json({error:'forbidden'},{status:403})
  return NextResponse.json({error:'activity_storage_not_connected'},{status:503})
 }catch{return NextResponse.json({error:'discord_unavailable'},{status:502})}
}
