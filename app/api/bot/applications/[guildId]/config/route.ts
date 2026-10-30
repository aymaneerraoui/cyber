import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ guildId: string }> }
const snowflake = /^\d{17,20}$/

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.BOT_API_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header?.startsWith('Bearer ')) return false
  const expected = Buffer.from(secret, 'utf8')
  const received = Buffer.from(header.slice(7), 'utf8')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function GET(request: NextRequest, { params }: Context) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { guildId } = await params
  if (!snowflake.test(guildId)) {
    return NextResponse.json({ error: 'Invalid guild ID' }, { status: 400 })
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      SELECT config
      FROM cyber_application_configs
      WHERE guild_id = ${guildId}
      LIMIT 1
    `
    if (!rows.length) {
      return NextResponse.json({ error: 'Application settings not configured' }, { status: 404 })
    }
    return NextResponse.json(
      { ok: true, guildId, config: rows[0].config },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[CYBER V10 Bot Application Config]', error)
    return NextResponse.json({ error: 'Unable to read application settings' }, { status: 503 })
  }
}
