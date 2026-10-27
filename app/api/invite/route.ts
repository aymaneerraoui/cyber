import { NextResponse, type NextRequest } from 'next/server'

/** Redirects to Discord's bot authorization screen once a client ID is configured. */
export function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?notice=invite-unconfigured', request.url))
  }
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'bot applications.commands')
  // Manage Channels, Manage Roles, Kick, Ban, Moderate Members, Send Messages, Embed Links, Attach Files, Read History, Manage Messages
  url.searchParams.set('permissions', process.env.DISCORD_BOT_PERMISSIONS ?? '1099780156438')
  return NextResponse.redirect(url)
}
