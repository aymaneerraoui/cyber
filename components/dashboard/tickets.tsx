
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Plus, Save, Ticket, Trash2, Pencil, Eye,
  Image as ImageIcon, RotateCcw
} from 'lucide-react'
import { PageHeader } from './page-header'
import { useChannels, useResource } from '@/hooks/use-cyber'
import type {
  TicketPanel, EmbedConfig, MessageButton,
  ButtonStyle
} from '@/lib/types/config'

const field =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary'

const emptyEmbed = (): EmbedConfig => ({
  id: crypto.randomUUID(),
  title: '🎫・CYBER TICKET',
  description: '🛠️ Welcome to CYBER Support!\n\nPlease describe your issue clearly. Our staff will assist you shortly.',
  url: '',
  color: '#eabf46',
  authorName: '',
  authorIcon: null,
  thumbnail: null,
  image: null,
  footerText: 'ONE COMMUNITY. ONE POWER. ONE LEGACY.',
  footerIcon: null,
  timestamp: false,
  fields: []
})

type TicketCreationSettings = {
  categoryId: string
  channelName: string
  welcomeTitle: string
  welcomeMessage: string
  welcomeColor: string
  welcomeImageUrl: string
  closeButtonLabel: string
  oneTicketPerUser: boolean
  staffRoleIds: string[]
  claimButtonLabel: string
}

type ConfiguredTicketPanel = TicketPanel & {
  ticketSettings?: TicketCreationSettings
}

const defaultTicketSettings = (): TicketCreationSettings => ({
  categoryId: '',
  channelName: 'ticket-{username}',
  welcomeTitle: '🎫 CYBER TICKET SYSTEM',
  welcomeMessage: 'Welcome {user}!\n\nPlease describe your issue or request.\nOur team will assist you soon.',
  welcomeColor: '#eabf46',
  welcomeImageUrl: '',
  closeButtonLabel: 'Close Ticket',
  oneTicketPerUser: true,
  staffRoleIds: [],
  claimButtonLabel: 'Claim Ticket'
})

const emptyButton = (): MessageButton => ({
  id: crypto.randomUUID(),
  label: 'Open Ticket',
  emoji: '🎟️',
  style: 'success'
})

const asset = (url: string) =>
  url.trim()
    ? { url: url.trim(), name: 'Remote image', size: 0, type: 'image/url' }
    : null

export function TicketsDashboard({
  serverId
}: {
  serverId: string
}) {
  const panels = useResource(serverId, 'ticketPanels')
  const channels = useChannels(serverId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [channelId, setChannelId] = useState('')
  const [content, setContent] = useState('')
  const [embed, setEmbed] = useState<EmbedConfig | null>(null)
  const [buttons, setButtons] = useState<MessageButton[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({})
  const [ticketSettings, setTicketSettings] = useState<TicketCreationSettings>(defaultTicketSettings)
  const [staffRolesInput, setStaffRolesInput] = useState('')
