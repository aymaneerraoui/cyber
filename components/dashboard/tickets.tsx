
'use client'

import { useState } from 'react'
import { Plus, Save, Ticket, Trash2 } from 'lucide-react'
import { PageHeader } from './page-header'
import { useChannels, useResource } from '@/hooks/use-cyber'
import type { TicketPanel } from '@/lib/types/config'

export function TicketsDashboard({
  serverId
}: {
  serverId: string
}) {
  const panels = useResource(serverId, 'ticketPanels')
  const channels = useChannels(serverId)

  const [name, setName] = useState('')
  const [channelId, setChannelId] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const items = panels.data ?? []

  async function addPanel() {
    if (!panels.data || !name.trim() || !channelId) {
      setMessage('Enter a name and select a channel.')
      return
    }

    const newPanel: TicketPanel = {
      id: crypto.randomUUID(),
      name: name.trim(),
      channelId,
      state: 'draft',
      updatedAt: new Date().toISOString(),
      message: {
        content,
        embeds: [],
        buttons: []
      }
    }

    setSaving(true)
    setMessage('')

    try {
      await panels.save(
        [...items, newPanel],
        'Created ticket panel'
      )

      setName('')
      setChannelId('')
      setContent('')
      setMessage('Ticket panel saved successfully.')
    } catch {
      setMessage('Failed to save ticket panel.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePanel(id: string) {
    if (!panels.data) return
    if (!window.confirm('Delete this ticket panel?')) return

    setSaving(true)
    setMessage('')

    try {
      await panels.save(
        items.filter(panel => panel.id !== id),
        'Deleted ticket panel'
      )
      setMessage('Ticket panel deleted.')
    } catch {
      setMessage('Failed to delete ticket panel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="COMMUNITY MANAGEMENT"
        title="Tickets"
        description="Create and manage ticket panels for your Discord server."
      />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <Ticket className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">
            Create Ticket Panel
          </h2>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm">
              Panel Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Support Tickets"
              maxLength={100}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">
              Discord Channel
            </label>
            <select
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Select a channel</option>
              {(channels.data ?? [])
                .filter(c =>
                  c.kind === 'text' ||
                  c.kind === 'announcement'
                )
                .map(channel => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm">
              Panel Message
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Welcome to CYBER Support. Open a ticket to get assistance."
              rows={4}
              maxLength={2000}
              className="w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={addPanel}
            disabled={saving || !panels.data}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Plus className="size-4" />
                <Save className="size-4" />
                Save Ticket Panel
              </>
            )}
          </button>

          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Ticket Panels
          </h2>
          <span className="font-mono text-sm text-primary">
            {items.length}
          </span>
        </div>

        {panels.error && (
          <p className="text-sm text-destructive">
            Unable to load ticket panels.
          </p>
        )}

        {!panels.data && !panels.error && (
          <p className="text-sm text-muted-foreground">
            Loading ticket panels...
          </p>
        )}

        {panels.data && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No ticket panels yet. Create your first panel above.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {items.map(panel => (
            <div
              key={panel.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate font-medium">
                  {panel.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Status: {panel.state}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {panel.message.content || 'No message'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => deletePanel(panel.id)}
                disabled={saving}
                aria-label={`Delete ${panel.name}`}
                className="rounded-lg border border-border p-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
