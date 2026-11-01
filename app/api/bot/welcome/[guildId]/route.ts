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
  const expected = Buffer.from(secret)
  const actual = Buffer.from(header.slice(7))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function GET(request: NextRequest, { params }: Context) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { guildId } = await params
  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: 'Invalid guild ID' }, { status: 400 })
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      SELECT config FROM cyber_server_config
      WHERE guild_id = ${guildId} AND resource_key = 'welcome'
      LIMIT 1
    `
    return NextResponse.json(
      { ok: true, guildId, config: rows[0]?.config ?? null },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[CYBER Welcome Bot API]', error)
    return NextResponse.json({ error: 'Unable to load welcome settings' }, { status: 503 })
  }
}
