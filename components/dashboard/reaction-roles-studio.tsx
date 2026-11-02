'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Trash2, Save, RefreshCw, SmilePlus, Send, ShieldCheck } from 'lucide-react'

type Channel = { id: string; name: string; kind: string }
type Role = { id: string; name: string }
type RoleButton = { id: string; label: string; emoji: string; roleId: string }
type Config = { channelId: string; title: string; description: string; color: string; bannerUrl: string; footer: string; buttons: RoleButton[] }
const initial: Config = { channelId: '', title: '🎭 CHOOSE YOUR ROLES', description: 'Select the roles you want to unlock your community experience.', color: '#d4af37', bannerUrl: '', footer: 'CYBER ORGANIZATION • ONE COMMUNITY', buttons: [{ id: 'gaming', label: 'GAMING', emoji: '🎮', roleId: '' }, { id: 'community', label: 'COMMUNITY', emoji: '💬', roleId: '' }, { id: 'roleplay', label: 'ROLEPLAY', emoji: '🎭', roleId: '' }] }
const fieldClass = 'w-full rounded-xl border border-amber-400/20 bg-black/60 p-3 text-sm text-white outline-none focus:border-amber-400/60'

export function ReactionRolesStudio({ serverId }: { serverId: string }) {
  const [config, setConfig] = useState<Config>(initial)
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const update = (value: Partial<Config>) => setConfig(old => ({ ...old, ...value }))
  const load = useCallback(async () => {
    setBusy(true); setNotice('')
    try {
      const base = `/api/servers/${serverId}`
      const [c, r, s] = await Promise.all([fetch(`${base}/channels`), fetch(`${base}/roles`), fetch(`${base}/config/reaction-roles`)])
      if (!c.ok || !r.ok) throw new Error('Could not load channels and roles.')
      const [cs, rs] = await Promise.all([c.json(), r.json()])
      setChannels(cs.filter((x: Channel) => ['text', 'announcement'].includes(x.kind)))
      setRoles(rs.filter((x: Role) => x.id !== serverId))
      if (s.ok) {
        const data = await s.json()
        const saved = data.value || data.config || data
        setConfig({ ...initial, ...saved, buttons: Array.isArray(saved.buttons) ? saved.buttons : initial.buttons })
      } else if (s.status !== 404) throw new Error(`Configuration unavailable: HTTP ${s.status}`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Load failed') }
    finally { setBusy(false) }
  }, [serverId])
  useEffect(() => { void load() }, [load])
  const validate = () => {
    if (!config.channelId) return 'Select a Discord channel.'
    if (!/^#[0-9a-f]{6}$/i.test(config.color)) return 'Enter a valid HEX color.'
    if (config.bannerUrl && !/^https:\/\//i.test(config.bannerUrl)) return 'Banner must use HTTPS.'
    if (!config.buttons.length) return 'Add at least one role button.'
    if (config.buttons.length > 25) return 'Maximum 25 buttons.'
    if (config.buttons.some(b => !b.label.trim() || !b.roleId)) return 'Every button needs a label and role.'
    if (new Set(config.buttons.map(b => b.roleId)).size !== config.buttons.length) return 'Choose a different role for each button.'
    return null
  }
  const action = async (publish: boolean) => {
    const invalid = validate(); if (invalid) return setNotice(invalid)
    setBusy(true); setNotice('')
    try {
      const url = `/api/servers/${serverId}/config/reaction-roles`
      const value = publish ? { ...config, publishRevision: crypto.randomUUID(), publishedMessageId: null, publishedChannelId: null } : { ...config, publishRevision: undefined, publishedMessageId: undefined, publishedChannelId: undefined }
      const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) })
      if (!response.ok) throw new Error(`Server API returned HTTP ${response.status}.`)
      setNotice(publish ? 'Publish queued. Bot will post within about 20 seconds if online.' : 'Configuration saved to Neon.')
      if (publish) setConfig(value)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Action failed') }
    finally { setBusy(false) }
  }
  const updateButton = (id: string, patch: Partial<RoleButton>) => update({ buttons: config.buttons.map(b => b.id === id ? { ...b, ...patch } : b) })
  return (
    <div className="mx-auto max-w-7xl space-y-6 rounded-[28px] border border-amber-400/10 bg-[#080a0e] p-4 text-zinc-100 md:p-8">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-zinc-950 to-black p-6">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[.25em] text-amber-300"><SmilePlus size={16}/> CYBER ORGANIZATION / COMMUNITY</div>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">REACTION <span className="text-amber-400">ROLES STUDIO</span></h1>
        <p className="mt-2 text-sm text-zinc-400">Create a premium role selector. Members click once to join a role and click again to leave it.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => void load()} className="rounded-xl border border-amber-400/20 px-4 py-3 text-sm"><RefreshCw size={16} className="mr-2 inline"/>Refresh</button>
          <button disabled={busy} onClick={() => void action(false)} className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-black"><Save size={16} className="mr-2 inline"/>Save Configuration</button>
          <button disabled={busy} onClick={() => void action(true)} className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-300"><Send size={16} className="mr-2 inline"/>Publish to Discord</button>
        </div>
      </motion.header>
      {notice && <div role="status" className="rounded-xl border border-amber-400/30 bg-zinc-900 p-3 text-sm">{notice}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-amber-400/20 bg-zinc-900/60 p-5">
          <h2 className="font-bold text-amber-300">EMBED BUILDER</h2>
          <label className="block space-y-2 text-sm">Publish Channel<select className={fieldClass} value={config.channelId} onChange={e => update({ channelId: e.target.value })}><option value="">Select a channel</option>{channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}</select></label>
          <label className="block space-y-2 text-sm">Embed Title<input className={fieldClass} maxLength={256} value={config.title} onChange={e => update({ title: e.target.value })}/></label>
          <label className="block space-y-2 text-sm">Description<textarea className={`${fieldClass} min-h-28`} maxLength={4000} value={config.description} onChange={e => update({ description: e.target.value })}/></label>
          <label className="block space-y-2 text-sm">Embed Color<div className="flex gap-3"><input type="color" aria-label="Choose color" className="h-12 w-16 cursor-pointer" value={/^#[0-9a-f]{6}$/i.test(config.color) ? config.color : '#d4af37'} onChange={e => update({ color: e.target.value })}/><input className={`${fieldClass} max-w-40`} maxLength={7} value={config.color} onChange={e => update({ color: e.target.value })}/></div></label>
          <label className="block space-y-2 text-sm">Banner Image URL<input className={fieldClass} placeholder="https://..." value={config.bannerUrl} onChange={e => update({ bannerUrl: e.target.value })}/></label>
          <label className="block space-y-2 text-sm">Footer<input className={fieldClass} value={config.footer} onChange={e => update({ footer: e.target.value })}/></label>
          <div className="flex items-center justify-between border-t border-white/10 pt-4"><h2 className="font-bold text-amber-300">ROLE BUTTONS ({config.buttons.length}/25)</h2><button disabled={config.buttons.length >= 25} onClick={() => update({ buttons: [...config.buttons, { id: crypto.randomUUID(), label: '', emoji: '✨', roleId: '' }] })} className="text-sm text-amber-400"><Plus size={15} className="inline"/> Add</button></div>
          {config.buttons.map((b, i) => <div key={b.id} className="space-y-2 rounded-xl border border-amber-400/10 bg-black/40 p-3"><div className="flex items-center justify-between text-xs text-zinc-400">BUTTON {i + 1}<button aria-label="Delete role button" onClick={() => update({ buttons: config.buttons.filter(x => x.id !== b.id) })}><Trash2 size={16} className="text-red-400"/></button></div><div className="grid grid-cols-[1fr_75px] gap-2"><input aria-label="Button label" className={fieldClass} placeholder="Label" value={b.label} maxLength={80} onChange={e => updateButton(b.id, { label: e.target.value })}/><input aria-label="Button emoji" className={fieldClass} value={b.emoji} onChange={e => updateButton(b.id, { emoji: e.target.value })}/></div><select aria-label="Assign role" className={fieldClass} value={b.roleId} onChange={e => updateButton(b.id, { roleId: e.target.value })}><option value="">Select Discord role</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>)}
        </section>
        <section className="space-y-4 rounded-2xl border border-amber-400/20 bg-zinc-900/60 p-5"><div className="flex items-center gap-2 font-bold text-amber-300"><ShieldCheck size={17}/> LIVE DISCORD PREVIEW</div><div className="rounded-xl border-l-4 bg-[#202127] p-5" style={{ borderLeftColor: /^#[0-9a-f]{6}$/i.test(config.color) ? config.color : '#d4af37' }}><h3 className="font-bold">{config.title || 'Role Selector'}</h3><p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{config.description}</p>{config.bannerUrl.startsWith('https://') && <img src={config.bannerUrl} alt="Role selector banner" className="mt-4 max-h-72 w-full rounded-lg object-contain"/>}<p className="mt-4 text-xs text-zinc-400">{config.footer}</p></div><div className="flex flex-wrap gap-2">{config.buttons.map(b => <span key={b.id} className="rounded-lg border border-zinc-600 bg-[#33363d] px-4 py-2 text-sm">{b.emoji} {b.label || 'Button'}</span>)}</div><p className="text-xs text-zinc-500">Preview only. Discord role buttons become interactive after the backend and bot handler are installed.</p></section>
      </div>
    </div>
  )
}
