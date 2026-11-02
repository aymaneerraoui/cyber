import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ guildId: string }> }
function authorized(request: NextRequest) {
  const secret = process.env.BOT_API_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header?.startsWith('Bearer ')) return false
  const a = Buffer.from(secret), b = Buffer.from(header.slice(7))
  return a.length === b.length && timingSafeEqual(a, b)
}
export async function GET(request: NextRequest, { params }: Context) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { guildId } = await params
  if (!/^\d{17,20}$/.test(guildId)) return NextResponse.json({ error: 'Invalid guild' }, { status: 400 })
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No database' }, { status: 503 })
  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT config FROM cyber_server_config WHERE guild_id = ${guildId} AND resource_key = 'reaction-roles' LIMIT 1`
    return NextResponse.json({ config: rows[0]?.config ?? null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { console.error('[Reaction Roles GET]', e); return NextResponse.json({ error: 'Database error' }, { status: 503 }) }
}
export async function POST(request: NextRequest, { params }: Context) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { guildId } = await params
  if (!/^\d{17,20}$/.test(guildId) || !process.env.DATABASE_URL) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  let body: { revision?: string; messageId?: string; channelId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || !/^[a-f0-9-]{36}$/i.test(body.revision || '') || !/^\d{17,20}$/.test(body.messageId || '') || !/^\d{17,20}$/.test(body.channelId || '')) return NextResponse.json({ error: 'Invalid acknowledgement' }, { status: 400 })
  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`UPDATE cyber_server_config SET config = jsonb_set(jsonb_set(config, '{publishedMessageId}', to_jsonb(${body.messageId!}::text)), '{publishedChannelId}', to_jsonb(${body.channelId!}::text)), updated_at = NOW() WHERE guild_id = ${guildId} AND resource_key = 'reaction-roles' AND config->>'publishRevision' = ${body.revision!} RETURNING config`
    return NextResponse.json({ ok: rows.length > 0 }, { status: rows.length ? 200 : 409 })
  } catch (e) { console.error('[Reaction Roles ACK]', e); return NextResponse.json({ error: 'Database error' }, { status: 503 }) }
}
