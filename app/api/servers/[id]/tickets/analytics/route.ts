
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = {
  params: Promise<{ id: string }>
}

const responseHeaders = {
  'Cache-Control': 'no-store'
}

function fail(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: responseHeaders }
  )
}

export async function GET(
  _request: Request,
  { params }: Context
) {
  const { id } = await params

  if (!/^\d{17,20}$/.test(id)) {
    return fail('invalid_guild_id', 400)
  }

  try {
    const session = await getSession()

    if (!session) {
      return fail('unauthenticated', 401)
    }

    const guilds = await fetchUserGuilds(
      session.accessToken
    )

    const allowed = guilds.some(
      guild =>
        guild.id === id &&
        canManageGuild(guild)
    )

    if (!allowed) {
      return fail('forbidden', 403)
    }

    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      return fail('database_not_configured', 503)
    }

    const sql = neon(databaseUrl)

    // CYBER V8 - STAFF LEADERBOARD
    // Count each closed ticket once.
    // Credit the staff member claimed at close.

    const leaderboard = await sql`
      WITH closed_tickets AS (
        SELECT DISTINCT ON (ticket_id)
          ticket_id,
          claimed_by_id,
          occurred_at
        FROM cyber_ticket_events
        WHERE guild_id = ${id}
          AND event_type = 'closed'
        ORDER BY ticket_id, occurred_at ASC, event_id ASC
      )
      SELECT
        claimed_by_id AS "staffId",
        COUNT(*)::int AS "ticketsHandled",
        MAX(occurred_at) AS "lastCompletedAt"
      FROM closed_tickets
      WHERE claimed_by_id IS NOT NULL
      GROUP BY claimed_by_id
      ORDER BY "ticketsHandled" DESC,
               "lastCompletedAt" ASC,
               "staffId" ASC
      LIMIT 100
    `

    // CYBER V8 - TICKET LOGS

    const logs = await sql`
      SELECT
        event_id AS "eventId",
        ticket_id AS "ticketId",
        panel_id AS "panelId",
        owner_id AS "ownerId",
        actor_id AS "actorId",
        event_type AS "type",
        claimed_by_id AS "claimedById",
        occurred_at AS "occurredAt"
      FROM cyber_ticket_events
      WHERE guild_id = ${id}
      ORDER BY occurred_at DESC, event_id DESC
      LIMIT 100
    `

    // CYBER V8 - SUMMARY

    const summaryRows = await sql`
      SELECT
        COUNT(DISTINCT ticket_id)
          FILTER (WHERE event_type = 'created')::int
          AS "totalCreated",

        COUNT(DISTINCT ticket_id)
          FILTER (WHERE event_type = 'closed')::int
          AS "totalClosed",

        COUNT(DISTINCT ticket_id)
          FILTER (WHERE event_type = 'deleted')::int
          AS "totalDeleted",

        COUNT(DISTINCT actor_id)
          FILTER (WHERE event_type = 'claimed')::int
          AS "staffWhoClaimed"
      FROM cyber_ticket_events
      WHERE guild_id = ${id}
    `

    return NextResponse.json(
      {
        ok: true,
        guildId: id,
        leaderboard: leaderboard.map((staff, index) => ({
          ...staff,
          rank: index + 1
        })),
        logs,
        summary: summaryRows[0] || {
          totalCreated: 0,
          totalClosed: 0,
          totalDeleted: 0,
          staffWhoClaimed: 0
        },
        fetchedAt: new Date().toISOString()
      },
      { headers: responseHeaders }
    )

  } catch (error) {
    console.error(
      '[CYBER V8 Analytics]',
      error instanceof Error
        ? error.message
        : 'Unknown error'
    )

    return fail('analytics_unavailable', 502)
  }
}
