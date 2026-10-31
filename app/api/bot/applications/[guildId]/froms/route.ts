
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = {
  params: Promise<{ guildId: string }>
}

const snowflake = /^\d{17,20}$/

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.BOT_API_SECRET
  const header = request.headers.get('authorization')

  if (!secret || !header?.startsWith('Bearer ')) {
    return false
  }

  const expected = Buffer.from(secret, 'utf8')
  const received = Buffer.from(header.slice(7), 'utf8')

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  )
}

export async function GET(
  request: NextRequest,
  { params }: Context
) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { guildId } = await params

  if (!snowflake.test(guildId)) {
    return NextResponse.json(
      { error: 'Invalid guild ID' },
      { status: 400 }
    )
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const rows = await sql`
      SELECT form_id, name, config
      FROM cyber_application_forms
      WHERE guild_id = ${guildId}
      ORDER BY created_at ASC
    `

    return NextResponse.json(
      {
        ok: true,
        guildId,
        forms: rows.map(row => ({
          id: row.form_id,
          name: row.name,
          config: row.config
        }))
      },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  } catch (error) {
    console.error('[CYBER Bot Multi-Forms]', error)

    return NextResponse.json(
      { error: 'Unable to load application forms' },
      { status: 503 }
    )
  }
}
