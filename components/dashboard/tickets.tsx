
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Save, Ticket, Trash2, Pencil, Eye,
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

  const items = panels.data ?? []


  function reset() {
    setEditingId(null)
    setName('')
    setChannelId('')
    setContent('')
    setEmbed(null)
    setButtons([])
    setNotice('')
  }

  function updateEmbed<K extends keyof EmbedConfig>(
    key: K,
    value: EmbedConfig[K]
  ) {
    setEmbed(previous => ({
      ...(previous ?? emptyEmbed()),
      [key]: value
    }))
  }

  function editPanel(panel: TicketPanel) {
    setEditingId(panel.id)
    setName(panel.name)
    setChannelId(panel.channelId ?? '')
    setContent(panel.message.content)
    setEmbed(panel.message.embeds[0] ?? emptyEmbed())
    setButtons(panel.message.buttons)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function savePanel() {
    if (!panels.data || !name.trim() || !channelId) {
      setNotice('Enter a panel name and select a channel.')
      return
    }

    const previous = items.find(p => p.id === editingId)

    const panel: TicketPanel = {
      id: editingId ?? crypto.randomUUID(),
      name: name.trim(),
      channelId,
      state: previous?.state ?? 'draft',
      updatedAt: new Date().toISOString(),
      message: {
        content,
        embeds: embed ? [embed] : [],
        buttons
      }
    }

    const next = editingId
      ? items.map(p => p.id === editingId ? panel : p)
      : [...items, panel]

    setSaving(true)
    setNotice('')

    try {
      await panels.save(next, 'Saved ticket panel')
      reset()
      setNotice('Ticket panel saved successfully.')
    } catch {
      setNotice('Failed to save ticket panel.')
    } finally {
      setSaving(false)
    }
  }

  async function publishPanel(panelId: string) {
    if (saving) return

    setSaving(true)
    setNotice('Publishing ticket panel to Discord...')

    try {
      const response = await fetch(
        `/api/servers/${encodeURIComponent(serverId)}/messages`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ panelId })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Publish failed')
      }

      setNotice('Ticket panel published successfully!')
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Publish failed'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deletePanel(id: string) {
    if (!panels.data || !window.confirm('Delete this panel?')) return
    setSaving(true)

    try {
      await panels.save(
        items.filter(p => p.id !== id),
        'Deleted ticket panel'
      )
      if (editingId === id) reset()
      setNotice('Panel deleted.')
    } catch {
      setNotice('Failed to delete panel.')
    } finally {
      setSaving(false)
    }
  }

  const previewEmbed = embed
  const previewButtons = buttons

  return (
    <div className="relative flex flex-col gap-8">
      <PageHeader
        eyebrow="CYBER CONTROL CENTER"
        title="Ticket Studio"
        description="Design, preview and manage your Discord ticket panels."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Ticket className="size-5 text-primary" />
              {editingId ? 'Edit Panel' : 'Create Panel'}
            </h2>
            <button onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            Panel Name
            <input className={field} value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100} placeholder="CYBER SUPPORT" />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Publish Channel
            <select className={field} value={channelId}
              onChange={e => setChannelId(e.target.value)}>
              <option value="">Select a channel</option>
              {(channels.data ?? [])
                .filter(c => c.kind === 'text' || c.kind === 'announcement')
                .map(c => (
                  <option key={c.id} value={c.id}># {c.name}</option>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Message Content (outside embed)
            <textarea className={field} rows={3} value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={2000}
              placeholder="Welcome to CYBER!" />
          </label>

          <div className="flex items-center justify-between border-t border-border pt-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <ImageIcon className="size-4 text-primary" />
              Embed Builder
            </h3>
            <button
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary"
              onClick={() => setEmbed(embed ? null : emptyEmbed())}
            >
              {embed ? 'Disable Embed' : 'Enable Embed'}
            </button>
          </div>

          {embed && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm">
                Embed Title
                <input className={field} value={embed.title}
                  maxLength={256}
                  onChange={e => updateEmbed('title', e.target.value)} />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Embed Description
                <textarea className={field} rows={6}
                  maxLength={4096} value={embed.description}
                  onChange={e => updateEmbed('description', e.target.value)} />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Embed Color
                <div className="flex gap-2">
                  <input type="color" value={embed.color}
                    onChange={e => updateEmbed('color', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-background" />
                  <input className={field} value={embed.color}
                    onChange={e => updateEmbed('color', e.target.value)}
                    placeholder="#eabf46" />
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Thumbnail Image URL (right side)
                <input className={field}
                  value={embed.thumbnail?.url ?? ''}
                  onChange={e => updateEmbed('thumbnail', asset(e.target.value))}
                  placeholder="https://example.com/logo.png" />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Banner Image URL (bottom)
                <input className={field}
                  value={embed.image?.url ?? ''}
                  onChange={e => updateEmbed('image', asset(e.target.value))}
                  placeholder="https://example.com/banner.png" />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Footer Text
                <input className={field} value={embed.footerText}
                  maxLength={2048}
                  onChange={e => updateEmbed('footerText', e.target.value)} />
              </label>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-5">
            <h3 className="font-semibold">Ticket Buttons</h3>
            <button
              disabled={buttons.length >= 5}
              onClick={() => setButtons([...buttons, emptyButton()])}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary disabled:opacity-50"
            >
              <Plus className="size-3" /> Add Button
            </button>
          </div>

          {buttons.map((button, index) => (
            <div key={button.id} className="rounded-lg border border-border bg-background p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Button {index + 1}
                </span>
                <button
                  onClick={() => setButtons(buttons.filter(b => b.id !== button.id))}
                  aria-label="Remove button"
                  className="text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input className={field} value={button.label}
                  maxLength={80} placeholder="Button text"
                  onChange={e => setButtons(buttons.map(b =>
                    b.id === button.id ? { ...b, label: e.target.value } : b
                  ))} />

                <input className={field} value={button.emoji}
                  placeholder="🎟️"
                  onChange={e => setButtons(buttons.map(b =>
                    b.id === button.id ? { ...b, emoji: e.target.value } : b
                  ))} />

                <select className={field} value={button.style}
                  onChange={e => setButtons(buttons.map(b =>
                    b.id === button.id
                      ? { ...b, style: e.target.value as ButtonStyle }
                      : b
                  ))}>
                  <option value="primary">Blue</option>
                  <option value="secondary">Gray</option>
                  <option value="success">Green</option>
                  <option value="danger">Red</option>
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={savePanel}
            disabled={saving || !panels.data}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? 'Saving...' : editingId ? 'Update Panel' : 'Save Panel'}
          </button>

          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}
        </motion.div>

        <div className="flex flex-col gap-4">
          <div className="sticky top-5 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-5 flex items-center gap-2 font-semibold">
              <Eye className="size-4 text-primary" />
              Discord Live Preview
            </h2>

            <div className="rounded-lg bg-[#313338] p-4 text-[#dbdee1]">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-[#eabf46] font-bold text-black">
                  C
                </div>
                <span className="text-sm font-bold text-white">CYBER</span>
                <span className="rounded bg-[#5865f2] px-1 text-[10px] text-white">
                  APP
                </span>
              </div>

              {content && (
                <p className="mb-3 whitespace-pre-wrap break-words text-sm">
                  {content}
                </p>
              )}

              {previewEmbed && (
                <div
                  className="rounded bg-[#2b2d31] p-3"
                  style={{ borderLeft: `4px solid ${previewEmbed.color}` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-2 break-words font-bold text-white">
                        {previewEmbed.title}
                      </h3>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {previewEmbed.description}
                      </p>
                    </div>
                    {previewEmbed.thumbnail?.url && (
                      <img
                        src={previewEmbed.thumbnail.url}
                        alt="Thumbnail"
                        className="size-20 rounded object-cover"
                      />
                    )}
                  </div>

                  {previewEmbed.image?.url && (
                    <img
                      src={previewEmbed.image.url}
                      alt="Banner"
                      className="mt-4 max-h-64 w-full rounded object-contain"
                    />
                  )}

                  {previewEmbed.footerText && (
                    <p className="mt-3 text-xs text-[#949ba4]">
                      {previewEmbed.footerText}
                    </p>
                  )}
                </div>
              )}

              {previewButtons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewButtons.map(b => (
                    <div
                      key={b.id}
                      className="rounded px-3 py-2 text-xs font-medium text-white"
                      style={{
                        backgroundColor:
                          b.style === 'success' ? '#248046' :
                          b.style === 'danger' ? '#da373c' :
                          b.style === 'primary' ? '#5865f2' :
                          '#4e5058'
                      }}
                    >
                      {b.emoji} {b.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-5 font-semibold">
          Saved Ticket Panels ({items.length})
        </h2>

        {panels.error && (
          <p className="text-sm text-destructive">
            Unable to load ticket panels.
          </p>
        )}

        {!panels.data && !panels.error && (
          <p className="text-sm text-muted-foreground">
            Loading panels...
          </p>
        )}

        <div className="flex flex-col gap-3">
          {items.map(panel => (
            <div
              key={panel.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{panel.name}</p>
                <p className="text-xs text-muted-foreground">
                  {panel.state} · {panel.message.buttons.length} buttons
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => publishPanel(panel.id)}
                  disabled={saving}
                  className="rounded border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  onClick={() => editPanel(panel)}
                  className="rounded border border-border p-2 hover:border-primary"
                  aria-label={`Edit ${panel.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => deletePanel(panel.id)}
                  disabled={saving}
                  className="rounded border border-border p-2 text-destructive"
                  aria-label={`Delete ${panel.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
