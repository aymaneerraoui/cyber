import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { timingSafeEqual } from 'node:crypto'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const snowflake = /^\d{17,20}$/
function authorized(r: NextRequest) {
  const secret = process.env.BOT_API_SECRET
  const bearer = r.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || !bearer) return false
  const a = Buffer.from(secret), b = Buffer.from(bearer)
  return a.length === b.length && timingSafeEqual(a,b)
}
const timestamp = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 8640000000000000 ? new Date(v).toISOString() : null
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({error:'unauthorized'}, {status:401})
  if (!process.env.DATABASE_URL) return NextResponse.json({error:'database_unavailable'}, {status:503})
  let e: Record<string,unknown>
  try { e = await request.json() } catch { return NextResponse.json({error:'invalid_json'}, {status:400}) }
  if (!e || typeof e !== 'object' || Array.isArray(e)) return NextResponse.json({error:'invalid_event',field:'body'}, {status:400})
  const required = ['guildId','roomId','ownerId','staffId'] as const
  for (const field of required) if (!snowflake.test(String(e[field] ?? ''))) return NextResponse.json({error:'invalid_event',field}, {status:400})
  if (!['completed','incomplete'].includes(String(e.status))) return NextResponse.json({error:'invalid_event',field:'status'}, {status:400})
  if (!timestamp(e.claimedAt)) return NextResponse.json({error:'invalid_event',field:'claimedAt'}, {status:400})
  const rating = String(e.rating ?? '').toLowerCase()
  if (!['good','normal','bad',''].includes(rating)) return NextResponse.json({error:'invalid_event',field:'rating'}, {status:400})
  try {
    const sql = neon(process.env.DATABASE_URL)
    await sql`CREATE TABLE IF NOT EXISTS cyber_voice_sessions (guild_id TEXT NOT NULL,room_id TEXT NOT NULL,owner_id TEXT NOT NULL,staff_id TEXT NOT NULL,staff_name TEXT,room_name TEXT,room_type TEXT,status TEXT NOT NULL,rating TEXT,reason TEXT,claimed_at TIMESTAMPTZ,joined_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,duration_ms BIGINT NOT NULL DEFAULT 0,recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,room_id,staff_id,claimed_at))`
    const guildId=String(e.guildId),roomId=String(e.roomId),ownerId=String(e.ownerId),staffId=String(e.staffId)
    const staffName=String(e.staffName??'').slice(0,100),roomName=String(e.roomName??'').slice(0,100),roomType=String(e.roomType??'normal').slice(0,20),status=String(e.status),reason=String(e.reason??'').slice(0,1000)
    const claimedAt=timestamp(e.claimedAt),joinedAt=timestamp(e.joinedAt),finishedAt=timestamp(e.finishedAt)
    const durationMs=Math.max(0,Math.min(Number(e.durationMs)||0,315360000000))
    await sql`INSERT INTO cyber_voice_sessions(guild_id,room_id,owner_id,staff_id,staff_name,room_name,room_type,status,rating,reason,claimed_at,joined_at,finished_at,duration_ms)
    VALUES(${guildId},${roomId},${ownerId},${staffId},${staffName},${roomName},${roomType},${status},${rating},${reason},${claimedAt},${joinedAt},${finishedAt},${durationMs})
    ON CONFLICT(guild_id,room_id,staff_id,claimed_at) DO UPDATE SET
    staff_name=EXCLUDED.staff_name,room_name=EXCLUDED.room_name,room_type=EXCLUDED.room_type,
    status=EXCLUDED.status,rating=EXCLUDED.rating,reason=EXCLUDED.reason,joined_at=EXCLUDED.joined_at,finished_at=EXCLUDED.finished_at,duration_ms=EXCLUDED.duration_ms,recorded_at=NOW()
    WHERE cyber_voice_sessions.status <> 'completed' AND EXCLUDED.status='completed'`
    return NextResponse.json({ok:true})
  } catch (err) {
    console.error('[CYBER VOICE EVENT]',err)
    return NextResponse.json({error:'database_unavailable'}, {status:503})
  }
}
