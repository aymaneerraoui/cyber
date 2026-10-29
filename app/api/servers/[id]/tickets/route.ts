import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }
const headers = { 'Cache-Control': 'no-store' }

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers })
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  if (!/^\d{17,20}$/.test(id)) return fail('invalid_guild_id', 400)

  try {
    const session = await getSession()
    if (!session) return fail('unauthenticated', 401)

    const guilds = await fetchUserGuilds(session.accessToken)
    if (!guilds.some(g => g.id === id && canManageGuild(g))) {
      return fail('forbidden', 403)
    }

    const base = process.env.BOT_API_URL?.trim().replace(/\/+$/, '')
    const secret = process.env.BOT_API_SECRET
    if (!base || !secret) return fail('bot_api_not_configured', 503)

    const endpoint = new URL(base)
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) {
      return fail('bot_api_url_must_be_https', 503)
    }
    const url = new URL(`${endpoint.toString().replace(/\/+$/, '')}/api/tickets`)
    url.searchParams.set('guildId', id)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    })
    if (!response.ok) {
      console.error('[CYBER tickets] Bot API status', response.status)
      return fail('bot_api_unavailable', 502)
    }

    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object' || !('tickets' in payload) || !Array.isArray(payload.tickets)) {
      return fail('invalid_bot_response', 502)
    }
    return NextResponse.json(payload, { headers })
  } catch (error) {
    console.error('[CYBER tickets] Failed to fetch tickets', error)
    return fail('tickets_unavailable', 502)
  }
}
