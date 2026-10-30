
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = {
  params: Promise<{ id: string; resource: string }>
}

const resources = new Set([
  'ticketPanels',
  'ticketCategories',
  'ticketSettings',
  'applicationForms',
  'announcements',
  'antiSpam',
  'staffPermissions',
  'moderationRecords',
  'auditEvents',
  'streamFeeds',
  'videoFeeds',
  'modules',
  'welcome',
  'suggestions',
  'scheduled',
  'general'
])

const NO_STORE = { 'Cache-Control': 'no-store' }

async function authorize(id: string, resource: string) {
  if (!/^\d{17,20}$/.test(id) || !resources.has(resource)) {
    return { error: 'invalid_request', status: 400 }
  }

  const session = await getSession()

  if (!session) {
    return { error: 'unauthenticated', status: 401 }
  }

  if (!process.env.DATABASE_URL) {
    return { error: 'database_unavailable', status: 503 }
  }

  const guilds = await fetchUserGuilds(session.accessToken)

  if (!guilds.some(g => g.id === id && canManageGuild(g))) {
    return { error: 'forbidden', status: 403 }
  }

  const sql = neon(process.env.DATABASE_URL)

  const rows = await sql`
    SELECT guild_ids
    FROM cyber_bot_status
    WHERE bot_id = 'cyber'
      AND updated_at > NOW() - INTERVAL '3 minutes'
    LIMIT 1
  `

  const ids: unknown = rows[0]?.guild_ids

  if (
    !Array.isArray(ids) ||
    !ids.every(value => typeof value === 'string') ||
    !ids.includes(id)
  ) {
    return { error: 'bot_not_connected', status: 503 }
  }

  return { sql }
}

function failure(error: string, status: number) {
  return NextResponse.json(
    { error, message: error },
    { status, headers: NO_STORE }
  )
}

export async function GET(
  _request: Request,
  { params }: Context
) {
  const { id, resource } = await params

  try {
    const auth = await authorize(id, resource)

    if ('error' in auth) {
