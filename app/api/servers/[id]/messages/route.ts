
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

type PanelButton = {
  id: string
  label: string
  emoji?: string
  style: string
}

type PanelEmbed = {
  title?: string
  description?: string
  color?: string
  thumbnail?: { url: string } | null
  image?: { url: string } | null
  footerText?: string
}

type Panel = {
  id: string
  channelId: string | null
  message: {
    content: string
    embeds: PanelEmbed[]
    buttons: PanelButton[]
  }
}

function fail(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

function safeImage(url?: string) {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

function makeEmbed(embed: PanelEmbed) {
  const color = /^#[0-9a-fA-F]{6}$/.test(embed.color ?? '')
    ? parseInt(embed.color!.slice(1), 16)
    : 0xeabf46

  const thumbnail = safeImage(embed.thumbnail?.url)
  const image = safeImage(embed.image?.url)

  return {
    title: (embed.title ?? '').slice(0, 256),
    description: (embed.description ?? '').slice(0, 4096),
    color,
    ...(thumbnail ? { thumbnail: { url: thumbnail } } : {}),
    ...(image ? { image: { url: image } } : {}),
    ...(embed.footerText
      ? { footer: { text: embed.footerText.slice(0, 2048) } }
      : {})
  }
}

function makeButton(button: PanelButton, panelId: string) {
  const styles: Record<string, number> = {
    primary: 1,
    secondary: 2,
    success: 3,
    danger: 4
  }

  const component: {
    type: number
    style: number
    label: string
    custom_id: string
    emoji?: { name: string; id?: string }
  } = {
    type: 2,
    style: styles[button.style] ?? 2,
    label: button.label.slice(0, 80),
    custom_id: `cyber_ticket:${panelId}:${button.id}`
  }

  const emoji = button.emoji?.trim()

  if (emoji) {
    const custom = emoji.match(/^<(a?):([^:]+):(\d{17,20})>$/)

    if (custom) {
      component.emoji = {
        name: custom[2],
        id: custom[3]
      }
    } else if (!emoji.includes(':')) {
      component.emoji = { name: emoji }
    }
  }

  return component
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params

    if (!/^\d{17,20}$/.test(id)) {
      return fail('Invalid server ID', 400)
    }

    const session = await getSession()
    if (!session) return fail('Login required', 401)

    const databaseUrl = process.env.DATABASE_URL
    const botToken = process.env.DISCORD_BOT_TOKEN

    if (!databaseUrl || !botToken) {
      return fail('Bot or database not configured', 503)
    }

    const guilds = await fetchUserGuilds(session.accessToken)

    if (!guilds.some(g => g.id === id && canManageGuild(g))) {
      return fail('No permission to manage this server', 403)
    }

    const sql = neon(databaseUrl)

    const connected = await sql`
      SELECT guild_ids
      FROM cyber_bot_status
      WHERE bot_id = 'cyber'
        AND updated_at > NOW() - INTERVAL '3 minutes'
      LIMIT 1
    `

    const guildIds: unknown = connected[0]?.guild_ids

    if (
      !Array.isArray(guildIds) ||
      !guildIds.includes(id)
    ) {
      return fail('CYBER Bot is not connected', 503)
    }

    const body: unknown = await request.json()

    if (
      !body ||
      typeof body !== 'object' ||
      !('panelId' in body) ||
      typeof body.panelId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(body.panelId)
    ) {
      return fail('Invalid panel ID', 400)
    }

    const panelId = body.panelId

    const rows = await sql`
      SELECT config
      FROM cyber_server_config
      WHERE guild_id = ${id}
        AND resource_key = 'ticketPanels'
      LIMIT 1
    `

    const panels: unknown = rows[0]?.config

    if (!Array.isArray(panels)) {
      return fail('Ticket panels not found', 404)
    }

    const panel = panels.find(
      (item: Panel) => item.id === panelId
    ) as Panel | undefined

    if (!panel || !panel.channelId) {
      return fail('Panel or channel not found', 404)
    }

    if (
      !/^\d{17,20}$/.test(panel.channelId) ||
      !panel.message ||
      !Array.isArray(panel.message.embeds) ||
      !Array.isArray(panel.message.buttons)
    ) {
      return fail('Invalid panel configuration', 400)
    }

    const channelResponse = await fetch(
      `https://discord.com/api/v10/channels/${panel.channelId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store'
      }
    )

    if (!channelResponse.ok) {
      return fail('Unable to verify Discord channel', 502)
    }

    const channel = await channelResponse.json()

    if (
      channel.guild_id !== id ||
      ![0, 5].includes(channel.type)
    ) {
      return fail('Channel does not belong to this server', 403)
    }

    const embeds = panel.message.embeds
      .slice(0, 10)
      .map(makeEmbed)

    const buttons = panel.message.buttons.slice(0, 5)

    if (
      buttons.some(
        b => !b.id || !b.label?.trim() ||
        !['primary', 'secondary', 'success', 'danger'].includes(b.style)
      )
    ) {
      return fail('Invalid ticket buttons', 400)
    }

    const content = (panel.message.content ?? '').slice(0, 2000)

    if (!content && embeds.length === 0) {
      return fail('Panel message is empty', 400)
    }

    const payload = {
      content,
      embeds,
      allowed_mentions: { parse: [] },
      ...(buttons.length
        ? {
            components: [{
              type: 1,
              components: buttons.map(b => makeButton(b, panel.id))
            }]
          }
        : {})
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${panel.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      console.error(
        '[CYBER PUBLISH]',
        response.status,
        await response.text()
      )
      return fail('Discord rejected the message', 502)
    }

    const published = await response.json()

    return NextResponse.json({
      success: true,
      messageId: published.id,
      channelId: panel.channelId,
      message: 'Ticket panel published successfully'
    })
  } catch (error) {
    console.error('[CYBER TICKET PUBLISH]', error)
    return fail('Unable to publish ticket panel', 502)
  }
}

