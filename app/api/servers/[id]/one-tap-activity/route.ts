import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VoiceRow = {
  staffId: string
  [key: string]: unknown
}

function avatarUrl(guildId: string, userId: string, member: any): string {
  const user = member?.user
  if (typeof member?.avatar === 'string' && member.avatar) {
    const ext = member.avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${member.avatar}.${ext}?size=128`
  }
  if (typeof user?.avatar === 'string' && user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${ext}?size=128`
  }
  if (user) {
    const index = user.discriminator && user.discriminator !== '0'
      ? Number(user.discriminator) % 5
      : Number((BigInt(userId) >> 22n) % 6n)
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`
  }
  return ''
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d{17,20}$/.test(id)) return NextResponse.json({ error: 'invalid_server_id' }, { status: 400 })
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'database_unavailable' }, { status: 503 })

  try {
    const guilds = await fetchUserGuilds(session.accessToken)
    if (!guilds.some(g => g.id === id && canManageGuild(g))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL)
    await sql`CREATE TABLE IF NOT EXISTS cyber_voice_sessions (guild_id TEXT NOT NULL,room_id TEXT NOT NULL,owner_id TEXT NOT NULL,staff_id TEXT NOT NULL,staff_name TEXT,room_name TEXT,room_type TEXT,status TEXT NOT NULL,rating TEXT,reason TEXT,claimed_at TIMESTAMPTZ,joined_at TIMESTAMPTZ,finished_at TIMESTAMPTZ,duration_ms BIGINT NOT NULL DEFAULT 0,recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(guild_id,room_id,staff_id,claimed_at))`
    const rows = await sql`SELECT room_id AS "roomId",owner_id AS "ownerId",staff_id AS "staffId",staff_name AS "staffName",room_name AS "roomName",room_type AS "roomType",status,rating,reason,claimed_at AS "claimedAt",joined_at AS "joinedAt",finished_at AS "finishedAt",(duration_ms/1000)::int AS "durationSeconds" FROM cyber_voice_sessions WHERE guild_id=${id} ORDER BY recorded_at DESC LIMIT 500`

    // Fetch Discord avatars server-side. Never send the bot token to the browser.
    // A member's server-specific avatar takes priority over their global avatar.
    const token = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN || ''
    const staffIds = [...new Set(rows.map(r => String(r.staffId || '')).filter(x => /^\d{17,20}$/.test(x)))].slice(0, 50)
    const avatars = new Map<string, string>()
    if (token) {
      for (let start = 0; start < staffIds.length; start += 5) {
        await Promise.all(staffIds.slice(start, start + 5).map(async staffId => {
          try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${id}/members/${staffId}`, {
              headers: { Authorization: `Bot ${token}` },
              cache: 'no-store',
              signal: AbortSignal.timeout(4000),
            })
            if (!response.ok) {
              if (response.status !== 404) console.warn('[CYBER VOICE AVATAR] Discord member lookup:', response.status)
              return
            }
            const member = await response.json()
            const url = avatarUrl(id, staffId, member)
            if (url) avatars.set(staffId, url)
          } catch (e) {
            console.warn('[CYBER VOICE AVATAR] Lookup failed:', e instanceof Error ? e.message : 'unknown')
          }
        }))
      }
    }
    const sessions = rows.map(row => ({ ...row, staffAvatarUrl: avatars.get(String(row.staffId)) || '' }))
    return NextResponse.json({ sessions }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[CYBER VOICE ACTIVITY]', e)
    return NextResponse.json({ error: 'activity_unavailable' }, { status: 503 })
  }
}
