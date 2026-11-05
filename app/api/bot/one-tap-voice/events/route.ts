import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { timingSafeEqual } from 'node:crypto'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const snowflake=/^\d{17,20}$/
function authorized(r:NextRequest){const secret=process.env.BOT_API_SECRET;const bearer=r.headers.get('authorization')?.replace(/^Bearer /,'');if(!secret||!bearer)return false;const a=Buffer.from(secret),b=Buffer.from(bearer);return a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:'unauthorized'},{status:401})
 if(!process.env.DATABASE_URL)return NextResponse.json({error:'database_unavailable'},{status:503})
 let e:Record<string,unknown>;try{e=await request.json()}catch{return NextResponse.json({error:'invalid_json'},{status:400})}
 if(!e||typeof e!=='object'||!snowflake.test(String(e.guildId||''))||!snowflake.test(String(e.roomId||''))||!snowflake.test(String(e.ownerId||''))||!snowflake.test(String(e.staffId||''))||!['completed','incomplete'].includes(String(e.status))||!['good','normal','bad',''].includes(String(e.rating||'')))return NextResponse.json({error:'invalid_event'},{status:400})
 try{const sql=neon(process.env.DATABASE_URL);await sql`CREATE TABLE IF NOT EXISTS cyber_voice_sessions (guild_id TEXT NOT NULL,room_id TEXT NOT NULL,owner_id TEXT NOT NULL,staff_id TEXT NOT NULL,staff_name TEXT,room_name TEXT,room_type TEXT,status TEXT NOT NULL,rating TEXT,reason TEXT,claimed_at TIMESTAMPTZ,joined_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,duration_ms BIGINT NOT NULL DEFAULT 0,recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,room_id,staff_id,claimed_at))`;
 const guildId=String(e.guildId),roomId=String(e.roomId),ownerId=String(e.ownerId),staffId=String(e.staffId),staffName=String(e.staffName||'').slice(0,100),roomName=String(e.roomName||'').slice(0,100),roomType=String(e.roomType||'normal').slice(0,20),status=String(e.status),rating=String(e.rating||''),reason=String(e.reason||'').slice(0,1000),claimedAt=typeof e.claimedAt==='number'&&Number.isFinite(e.claimedAt)?new Date(e.claimedAt).toISOString():null,joinedAt=typeof e.joinedAt==='number'&&Number.isFinite(e.joinedAt)?new Date(e.joinedAt).toISOString():null,finishedAt=typeof e.finishedAt==='number'&&Number.isFinite(e.finishedAt)?new Date(e.finishedAt).toISOString():null,durationMs=Math.max(0,Math.min(Number(e.durationMs)||0,315360000000));
 await sql`INSERT INTO cyber_voice_sessions(guild_id,room_id,owner_id,staff_id,staff_name,room_name,room_type,status,rating,reason,claimed_at,joined_at,finished_at,duration_ms) VALUES(${guildId},${roomId},${ownerId},${staffId},${staffName},${roomName},${roomType},${status},${rating},${reason},${claimedAt},${joinedAt},${finishedAt},${durationMs}) ON CONFLICT(guild_id,room_id,staff_id,claimed_at) DO UPDATE SET staff_name=EXCLUDED.staff_name,room_name=EXCLUDED.room_name,status=EXCLUDED.status,rating=EXCLUDED.rating,reason=EXCLUDED.reason,joined_at=EXCLUDED.joined_at,finished_at=EXCLUDED.finished_at,duration_ms=EXCLUDED.duration_ms`;
 return NextResponse.json({ok:true})}catch(e){console.error('[CYBER VOICE EVENT]',e);return NextResponse.json({error:'database_unavailable'},{status:503})}
}
