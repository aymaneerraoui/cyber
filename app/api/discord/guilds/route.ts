import { NextResponse } from 'next/server'
import type { ManagedGuildsResponse } from '@/lib/auth-types'
import { canManageGuild, guildIconUrl } from '@/lib/discord-permissions'
import { DiscordApiError, fetchBotGuildIds, fetchUserGuilds } from '@/lib/server/discord'
import { getBotToken } from '@/lib/server/env'
import { rateLimit } from '@/lib/server/rate-limit'
import { clearSessionCookie, getSession } from '@/lib/server/session'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * Guilds the signed-in user may manage. Permissions are computed from
 * Discord's response on the server — nothing from the browser is trusted.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: NO_STORE })

  const limit = rateLimit(`guilds:${session.user.id}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': String(limit.retryAfterSeconds) } })
  }

  let guilds
  try {
    guilds = await fetchUserGuilds(session.accessToken)
  } catch (err) {
    if (err instanceof DiscordApiError && err.status === 401) {
      const response = NextResponse.json({ error: 'session_expired' }, { status: 401, headers: NO_STORE })
      clearSessionCookie(response)
      return response
    }
    if (err instanceof DiscordApiError && err.status === 429) {
      return NextResponse.json({ error: 'discord_rate_limited' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': String(err.retryAfterSeconds ?? 5) } })
    }
    console.error('[guilds] Failed to load user guilds:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'discord_unavailable' }, { status: 502, headers: NO_STORE })
  }

  let botGuildIds: Set<string> | null = null
  const botToken = getBotToken()
  if (botToken) {
    try {
      botGuildIds = await fetchBotGuildIds(botToken)
    } catch (err) {
      console.error('[guilds] Failed to check bot membership:', err instanceof Error ? err.message : 'unknown error')
    }
  }

  const body: ManagedGuildsResponse = {
    guilds: guilds.filter(canManageGuild).map((g) => ({
      id: g.id,
      name: g.name,
      iconUrl: guildIconUrl(g.id, g.icon),
      owner: g.owner,
      botInstalled: botGuildIds ? botGuildIds.has(g.id) : null,
    })),
    botStatusKnown: botGuildIds !== null,
  }
  return NextResponse.json(body, { headers: NO_STORE })
}
