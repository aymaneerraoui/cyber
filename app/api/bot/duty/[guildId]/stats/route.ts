import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EventRow = { user_id: string; event_type: string; at_time: string | Date; username: string | null }
type StaffStat = { userId: string; username: string; totalSeconds: number; todaySeconds: number; active: boolean; rank: number }
const zone = 'Africa/Casablanca'
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
function dayStart(now: number): number {
  const key = dayKey(new Date(now))
  let lo = now - 48 * 3600000, hi = now
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2)
    if (dayKey(new Date(mid)) === key) hi = mid
    else lo = mid
  }
  return hi
}
const seconds = (start: number, end: number) => Math.max(0, Math.floor((end - start) / 1000))

export async function GET(req: NextRequest, {params}: {params: Promise<{guildId: string}>}) {
  if (!process.env.BOT_API_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.BOT_API_SECRET}`)
    return NextResponse.json({error:'Unauthorized'}, {status:401})
  const {guildId} = await params
  if (!/^\d{17,20}$/.test(guildId)) return NextResponse.json({error:'Invalid guild ID'}, {status:400})
  if (!process.env.DATABASE_URL) return NextResponse.json({error:'Database unavailable'}, {status:503})
  try {
    const sql = neon(process.env.DATABASE_URL)
    await sql`CREATE TABLE IF NOT EXISTS cyber_duty_events (event_id TEXT PRIMARY KEY,guild_id TEXT NOT NULL,user_id TEXT NOT NULL,event_type TEXT NOT NULL,at_time TIMESTAMPTZ NOT NULL,channel_id TEXT,username TEXT)`
    const rows = await sql`SELECT user_id, event_type, at_time, username FROM cyber_duty_events WHERE guild_id=${guildId} ORDER BY at_time ASC, event_id ASC` as EventRow[]
    const now = Date.now(), midnight = dayStart(now)
    const byUser = new Map<string, {username:string; totalSeconds:number; todaySeconds:number; since:number|null}>()
    for (const row of rows) {
      const id = String(row.user_id)
      let s = byUser.get(id)
      if (!s) {s = {username: row.username || id, totalSeconds:0, todaySeconds:0, since:null};byUser.set(id,s)}
      if (row.username) s.username = row.username
      const t = new Date(row.at_time).getTime()
      if (!Number.isFinite(t)) continue
      if (row.event_type === 'start') {
        // Ignore duplicate starts; avoid counting overlapping sessions twice.
        if (s.since === null) s.since = t
      } else if (row.event_type === 'stop' && s.since !== null) {
        const end = Math.min(t, now)
        if (end > s.since) {
          s.totalSeconds += seconds(s.since,end)
          s.todaySeconds += seconds(Math.max(s.since,midnight),end)
        }
        s.since = null
      }
    }
    const stats: StaffStat[] = [...byUser.entries()].map(([userId,s]) => {
      const active = s.since !== null
      const extra = active ? seconds(s.since!,now) : 0
      const todayExtra = active ? seconds(Math.max(s.since!,midnight),now) : 0
      return {userId,username:s.username,totalSeconds:s.totalSeconds+extra,todaySeconds:s.todaySeconds+todayExtra,active,rank:0}
    })
    stats.sort((a,b)=>b.totalSeconds-a.totalSeconds || a.userId.localeCompare(b.userId))
    stats.forEach((s,i)=>s.rank=i+1)
    const userId = req.nextUrl.searchParams.get('userId')
    if (userId && !/^\d{17,20}$/.test(userId)) return NextResponse.json({error:'Invalid user ID'},{status:400})
    return NextResponse.json({ok:true,day:dayKey(new Date(now)),timezone:zone,staffCount:stats.length,leaderboard:stats.slice(0,10),member:userId?(stats.find(s=>s.userId===userId)||{userId,username:'',totalSeconds:0,todaySeconds:0,active:false,rank:null}):null}, {headers:{'Cache-Control':'no-store'}})
  } catch (err) {
    console.error('[CYBER Duty Stats]',err)
    return NextResponse.json({error:'Unable to load duty statistics'}, {status:503})
  }
}
