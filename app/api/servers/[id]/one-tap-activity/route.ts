import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params
 if(!/^\d{17,20}$/.test(id))return NextResponse.json({error:'invalid_server_id'},{status:400})
 const session=await getSession();if(!session)return NextResponse.json({error:'unauthenticated'},{status:401})
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'database_unavailable'},{status:503})
 try{
  const guilds=await fetchUserGuilds(session.accessToken)
  if(!guilds.some(g=>g.id===id&&canManageGuild(g)))return NextResponse.json({error:'forbidden'},{status:403})
  const sql=neon(process.env.DATABASE_URL)
  await sql`CREATE TABLE IF NOT EXISTS cyber_voice_sessions (guild_id TEXT NOT NULL,room_id TEXT NOT NULL,owner_id TEXT NOT NULL,staff_id TEXT NOT NULL,staff_name TEXT,room_name TEXT,room_type TEXT,status TEXT NOT NULL,rating TEXT,reason TEXT,claimed_at TIMESTAMPTZ,joined_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,duration_ms BIGINT NOT NULL DEFAULT 0,recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,room_id,staff_id,claimed_at))`
  const rows=await sql`SELECT room_id AS "roomId",owner_id AS "ownerId",staff_id AS "staffId",staff_name AS "staffName",room_name AS "roomName",room_type AS "roomType",status,rating,reason,claimed_at AS "claimedAt",joined_at AS "joinedAt",finished_at AS "finishedAt",(duration_ms/1000)::int AS "durationSeconds" FROM cyber_voice_sessions WHERE guild_id=${id} ORDER BY recorded_at DESC LIMIT 500`
  return NextResponse.json({sessions:rows},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('[CYBER VOICE ACTIVITY]',e);return NextResponse.json({error:'activity_unavailable'},{status:503})}
}
