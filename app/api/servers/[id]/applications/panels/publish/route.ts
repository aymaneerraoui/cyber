import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }
const snowflake = /^\d{17,20}$/
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const safeUrl = (v: string) => {
  if (!v) return true
  try { return ['https:', 'http:'].includes(new URL(v).protocol) } catch { return false }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id: guildId } = await params
    if (!snowflake.test(guildId)) return jsonError('Invalid server ID', 400)

    const session = await getSession()
    if (!session) return jsonError('Please sign in', 401)
    const guilds = await fetchUserGuilds(session.accessToken)
    if (!guilds.some(g => g.id === guildId && canManageGuild(g))) {
      return jsonError('You cannot manage this server', 403)
    }

    const payload: unknown = await request.json().catch(() => null)
    if (!isRecord(payload)) return jsonError('Invalid request', 400)
    const channelId = payload.channelId
    const formIds = payload.formIds
    if (typeof channelId !== 'string' || !snowflake.test(channelId)) return jsonError('Choose a valid post channel', 400)
    if (!Array.isArray(formIds) || formIds.length < 1 || formIds.length > 25 ||
        formIds.some(v => typeof v !== 'string' || !uuid.test(v)) ||
        new Set(formIds).size !== formIds.length) {
      return jsonError('Choose 1 to 25 unique saved applications', 400)
    }

    const read = (key: string, max: number): string | null =>
      typeof payload[key] === 'string' && (payload[key] as string).length <= max ? payload[key] as string : null
    const title = read('title', 256)
    const description = read('description', 4096)
    const footer = read('footer', 2048)
    const thumbnail = read('thumbnail', 2048)
    const banner = read('banner', 2048)
    const color = read('color', 7)
    const placeholder = read('placeholder', 150)
    if (title === null || description === null || footer === null || thumbnail === null ||
        banner === null || color === null || placeholder === null ||
        !/^#[\da-fA-F]{6}$/.test(color) || !safeUrl(thumbnail) || !safeUrl(banner)) {
      return jsonError('Invalid panel settings', 400)
    }
    if (!process.env.DATABASE_URL) return jsonError('DATABASE_URL is not configured', 503)
    if (!process.env.DISCORD_BOT_TOKEN) return jsonError('DISCORD_BOT_TOKEN is not configured on Vercel', 503)

    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT form_id, name, config FROM cyber_application_forms
      WHERE guild_id = ${guildId} AND form_id = ANY(${formIds}::text[])`
    if (rows.length !== formIds.length) return jsonError('One or more applications are not saved in Neon', 400)
    const byId = new Map(rows.map(row => [String(row.form_id), row]))
    const ordered = formIds.map(formId => byId.get(formId)!)
    if (ordered.some(row => !isRecord(row.config) ||
        !snowflake.test(String(row.config.reviewChannel || '')) ||
        !Array.isArray(row.config.questions) || row.config.questions.length === 0)) {
      return jsonError('Every selected application needs questions and a Staff Review Channel', 400)
    }

    const token = process.env.DISCORD_BOT_TOKEN
    const channelResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: { Authorization: `Bot ${token}` }, cache: 'no-store'
    })
    if (!channelResponse.ok) return jsonError('Bot cannot access the selected channel', 403)
    const channel: unknown = await channelResponse.json()
    if (!isRecord(channel) || ![0, 5].includes(Number(channel.type))) {
      return jsonError('Selected channel must be a text or announcement channel', 400)
    }
    // Discord's channel response can omit guild_id in some integrations.
    // Verify the channel against the selected guild's channel collection.
    const guildChannelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` }, cache: 'no-store'
    })
    if (!guildChannelsResponse.ok) return jsonError('Bot cannot access channels in the selected server', 403)
    const guildChannels: unknown = await guildChannelsResponse.json()
    if (!Array.isArray(guildChannels) || !guildChannels.some(c => isRecord(c) && c.id === channelId)) {
      return jsonError('Selected channel does not belong to this server', 400)
    }

    const embed: Record<string, unknown> = {
      title: title || 'CYBER ORGANIZATION',
      description: description || 'Select an application below.',
      color: Number.parseInt(color.slice(1), 16)
    }
    if (footer) embed.footer = { text: footer }
    if (thumbnail) embed.thumbnail = { url: thumbnail }
    if (banner) embed.image = { url: banner }

    const message = {
      embeds: [embed],
      components: [{ type: 1, components: [{
        type: 3,
        custom_id: 'cyber_apply_multi:select',
        placeholder: placeholder || 'Select an application',
        min_values: 1,
        max_values: 1,
        options: ordered.map(row => ({ label: String(row.name).slice(0, 100), value: String(row.form_id) }))
      }]}],
      allowed_mentions: { parse: [] }
    }
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message), cache: 'no-store'
    })
    const result: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      console.error('[CYBER panel publish] Discord status', response.status, result)
      return jsonError(`Discord rejected panel (${response.status}). Check bot permissions.`, 502)
    }
    const messageId = isRecord(result) && typeof result.id === 'string' ? result.id : null
    return NextResponse.json({ ok: true, channelId, messageId }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[CYBER multi-panel publish]', error)
    return jsonError('Panel publishing failed', 503)
  }
}
