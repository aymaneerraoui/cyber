import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Discord OAuth2 entry point. Requires DISCORD_CLIENT_ID and
 * DISCORD_REDIRECT_URI. The callback (token exchange + session) belongs
 * to the backend phase and is intentionally not implemented here.
 */
export function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = process.env.DISCORD_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL('/login?notice=oauth-unconfigured', request.url))
  }

  const state = randomBytes(16).toString('hex')
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify guilds')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'consent')

  const response = NextResponse.redirect(url)
  response.cookies.set('cyber_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
