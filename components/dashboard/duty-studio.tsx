'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type DiscordItem = { id: string; name: string; type?: number; kind?: string; color?: string }
type DutyEvent = { user_id: string; event_type: string; at_time: string; channel_id: string | null; username: string | null }
type Config = { enabled: boolean; voiceChannelIds: string[]; staffRoleIds: string[]; panelTitle: string; description: string; embedColor: string; imageUrl: string; thumbnailUrl: string }
type SelectorProps = { title: string; subtitle: string; items: DiscordItem[]; selected: string[]; onChange: (ids: string[]) => void; emptyMessage: string; loading: boolean }
const initial: Config = { enabled: false, voiceChannelIds: [], staffRoleIds: [], panelTitle: 'CYBER STAFF DUTY', description: 'Staff duty is tracked automatically in selected voice rooms.', embedColor: '#eab308', imageUrl: '', thumbnailUrl: '' }
const inputStyle = 'w-full rounded-xl border border-white/10 bg-[#0b0d13] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/60'
const cardStyle = 'rounded-2xl border border-white/10 bg-[#101218] p-5 shadow-[0_16px_55px_rgba(0,0,0,.22)]'

function MultiSelector({ title, subtitle, items, selected, onChange, emptyMessage, loading }: SelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
  return <div className="relative">
    <div className="mb-3"><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-zinc-500">{subtitle}</p></div>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-[#0b0d13] px-4 py-3 text-left text-sm text-zinc-200 hover:border-amber-400/60">
      <span>{selected.length ? `${selected.length} selected` : `Select ${title.toLowerCase()}`}</span><span className="text-amber-400">{open ? '▲' : '▼'}</span>
    </button>
    {selected.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selected.map(id => { const item = items.find(i => i.id === id); return <button type="button" key={id} onClick={() => onChange(selected.filter(x => x !== id))} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">{item?.name || id} ×</button> })}</div>}
    {open && <div className="mt-2 rounded-xl border border-amber-500/25 bg-[#17191f] p-3 shadow-2xl">
      <input aria-label={`Search ${title}`} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className={inputStyle} />
      <div className="mt-2 max-h-52 overflow-y-auto">{loading ? <p className="p-3 text-sm text-zinc-400">Loading Discord data...</p> : filtered.length === 0 ? <p className="p-3 text-sm text-zinc-400">{items.length ? 'No matches found.' : emptyMessage}</p> : filtered.map(item => <button type="button" key={item.id} onClick={() => onChange(selected.includes(item.id) ? selected.filter(x => x !== item.id) : [...selected, item.id])} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"><span className={`flex h-4 w-4 items-center justify-center rounded border ${selected.includes(item.id) ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-500'}`}>{selected.includes(item.id) ? '✓' : ''}</span><span className="truncate">{item.name}</span></button>)}</div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><button type="button" onClick={() => onChange([])} className="text-xs text-zinc-400 hover:text-white">Clear all</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-black">Done</button></div>
    </div>}
  </div>
}

export default function DutyStudio({ serverId }: { serverId: string }) {
  const [channels, setChannels] = useState<DiscordItem[]>([])
  const [roles, setRoles] = useState<DiscordItem[]>([])
  const [config, setConfig] = useState<Config>(initial)
  const [events, setEvents] = useState<DutyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [tab, setTab] = useState<'studio' | 'tracking' | 'leaderboard' | 'logs'>('studio')
  const api = `/api/servers/${serverId}`

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const responses = await Promise.all([fetch(`${api}/channels`, { cache: 'no-store' }), fetch(`${api}/roles`, { cache: 'no-store' }), fetch(`${api}/config/duty`, { cache: 'no-store' }), fetch(`${api}/duty`, { cache: 'no-store' })])
      const payloads: unknown[] = await Promise.all(responses.map(r => r.json()))
      const [ch, ro, raw, stats] = payloads
      if (!responses[0].ok || !responses[1].ok) throw new Error(`Discord channels/roles unavailable (channels: ${responses[0].status}, roles: ${responses[1].status}). Check bot connection and permissions.`)
      const extract = (data: unknown, key: string): DiscordItem[] => {
        const array = Array.isArray(data) ? data : data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : null
        return Array.isArray(array) ? array.filter((x): x is DiscordItem => !!x && typeof x.id === 'string' && typeof x.name === 'string') : []
      }
      setChannels(extract(ch, 'channels'))
      setRoles(extract(ro, 'roles'))
      if (responses[2].ok) {
        const outer = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
        const value = outer.value && typeof outer.value === 'object' && !Array.isArray(outer.value) ? outer.value as Record<string, unknown> : outer
        setConfig({ ...initial, ...value, voiceChannelIds: Array.isArray(value.voiceChannelIds) ? value.voiceChannelIds.filter((x): x is string => typeof x === 'string') : [], staffRoleIds: Array.isArray(value.staffRoleIds) ? value.staffRoleIds.filter((x): x is string => typeof x === 'string') : [] })
      }
      if (responses[3].ok) { const data = stats as { events?: DutyEvent[] } | null; setEvents(Array.isArray(data?.events) ? data.events : []) }
    } catch (e) { const message = e instanceof Error ? e.message : 'Unable to load Discord data'; setError(message); toast.error(message) } finally { setLoading(false) }
  }, [api])
  useEffect(() => { void load() }, [load])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])

  const voiceChannels = useMemo(() => channels.filter(c => c.kind === 'voice' || c.kind === 'stage' || c.type === 2 || c.type === 13), [channels])
  const leaderboard = useMemo(() => {
    const people = new Map<string, { id: string; name: string; total: number; active: boolean; logs: DutyEvent[] }>()
    for (const event of events) { const p = people.get(event.user_id) || { id: event.user_id, name: event.username || event.user_id, total: 0, active: false, logs: [] }; p.logs.push(event); p.name = event.username || p.name; people.set(event.user_id, p) }
    for (const p of people.values()) { let start: number | null = null; for (const e of p.logs) { const time = new Date(e.at_time).getTime(); if (!Number.isFinite(time)) continue; if (e.event_type === 'start' && start === null) start = time; if (e.event_type === 'stop' && start !== null) { p.total += Math.max(0, time - start); start = null } } if (start !== null) { p.total += Math.max(0, now - start); p.active = true } }
    return [...people.values()].sort((a, b) => b.total - a.total)
  }, [events, now])
  const fmt = (ms: number) => `${Math.floor(ms / 3600000)}h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}m`
  const update = <K extends keyof Config>(key: K, value: Config[K]) => setConfig(prev => ({ ...prev, [key]: value }))
  async function save() { setBusy(true); try { const res = await fetch(`${api}/config/duty`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: config }) }); if (!res.ok) throw new Error(`Save failed (${res.status})`); toast.success('Duty settings saved') } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save') } finally { setBusy(false) } }
  const profile = leaderboard.find(p => p.id === selectedStaff)
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
  const todayMs = events.reduce((sum, event, i, all) => {
    if (event.event_type !== 'start') return sum
    const start = new Date(event.at_time).getTime()
    if (!Number.isFinite(start)) return sum
    const next = all.slice(i + 1).find(e => e.user_id === event.user_id && e.event_type === 'stop' && new Date(e.at_time).getTime() >= start)
    const end = next ? new Date(next.at_time).getTime() : now
    const dayStart = new Date(new Date().toLocaleString('en-US', {timeZone:'Africa/Casablanca'})); dayStart.setHours(0,0,0,0)
    return sum + Math.max(0, end - Math.max(start, dayStart.getTime()))
  }, 0)
  const statCards = [
    { label: 'TOTAL STAFF', value: String(leaderboard.length), sub: 'Tracked members', accent: 'text-white' },
    { label: 'ON DUTY NOW', value: String(leaderboard.filter(p => p.active).length), sub: 'Live voice status', accent: 'text-emerald-400' },
    { label: 'HOURS TODAY', value: fmt(todayMs), sub: todayKey, accent: 'text-white' },
    { label: 'TOTAL HOURS', value: fmt(leaderboard.reduce((sum,p) => sum + p.total, 0)), sub: 'All-time activity', accent: 'text-amber-400' }
  ]
  const tabs = [{id:'studio',name:'✦ Panel Studio'},{id:'tracking',name:'◉ Duty Settings'},{id:'leaderboard',name:'▥ Leaderboard'},{id:'logs',name:'◷ Staff Logs'}] as const
  return <main className="mx-auto max-w-7xl space-y-5 px-3 py-6 text-[#e8e8e8] sm:px-6" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
    <div className="overflow-hidden rounded-2xl border border-[#33302a] bg-[#080a0e] shadow-[0_24px_80px_rgba(0,0,0,.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292c31] bg-[#101217] px-5 py-4">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f7d57a] to-[#9d691d] text-xl font-black text-[#101010]">C</div><div><p className="text-sm font-extrabold tracking-[.15em]">CYBER <span className="text-[#e8b94d]">CONSOLE</span></p><p className="text-[10px] tracking-[.17em] text-[#9297a2]">STAFF MANAGEMENT SYSTEM</p></div></div>
        <span className="text-xs font-semibold text-emerald-400">● SYSTEM CONSOLE</span>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[.2em] text-[#e8b94d]">MANAGEMENT / DUTY SUPPORT</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Duty Control Center</h1><p className="mt-1 text-sm text-[#9297a2]">Manage duty tracking, staff activity and Discord panels.</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} className="rounded-lg border border-[#353940] px-4 py-2.5 text-xs font-semibold hover:bg-[#1c2027]">↻ Refresh</button><button type="button" disabled={busy || loading} onClick={() => void save()} className="rounded-lg bg-gradient-to-r from-[#f4d074] to-[#b98222] px-4 py-2.5 text-xs font-bold text-[#18130a] disabled:opacity-50">{busy ? 'Saving...' : 'Save Configuration ✓'}</button></div></div>
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{statCards.map(s => <div key={s.label} className="rounded-xl border border-[#292d34] bg-[#101319] p-4"><p className="text-[11px] font-semibold tracking-wide text-[#9297a2]">{s.label}</p><p className={`mt-2 text-xl font-bold sm:text-2xl ${s.accent}`}>{s.value}</p><p className="mt-1 text-[11px] text-[#9297a2]">{s.sub}</p></div>)}</div>
        <div className="flex gap-1 overflow-x-auto border-b border-[#292d34]">{tabs.map(t => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition ${tab === t.id ? 'border-[#eac267] text-[#eac267]' : 'border-transparent text-[#9297a2] hover:text-white'}`}>{t.name}</button>)}</div>
        {tab === 'studio' && <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <section className="space-y-4 rounded-xl border border-[#292d34] bg-[#101319] p-5"><div><h2 className="text-base font-bold">✦ Discord Panel Builder</h2><p className="mt-1 text-xs text-[#9297a2]">Customize your panel with live preview.</p></div>
            <label className="block space-y-2 text-xs font-semibold text-[#bdc1cb]">Panel Title<input className={inputStyle} value={config.panelTitle} onChange={e => update('panelTitle',e.target.value)}/></label>
            <label className="block space-y-2 text-xs font-semibold text-[#bdc1cb]">Description<textarea rows={4} className={inputStyle} value={config.description} onChange={e => update('description',e.target.value)}/></label>
            <label className="block space-y-2 text-xs font-semibold text-[#bdc1cb]">Embed Color<div className="flex gap-2"><input type="color" aria-label="Embed color" className="h-11 w-16 cursor-pointer rounded-lg border border-[#343944] bg-[#0a0d12] p-1" value={/^#[0-9a-fA-F]{6}$/.test(config.embedColor) ? config.embedColor : '#e4b449'} onChange={e => update('embedColor',e.target.value)}/><input className={inputStyle} value={config.embedColor} onChange={e => update('embedColor',e.target.value)}/></div></label>
            <label className="block space-y-2 text-xs font-semibold text-[#bdc1cb]">Banner Image URL<input className={inputStyle} placeholder="https://example.com/banner.png" value={config.imageUrl} onChange={e => update('imageUrl',e.target.value)}/></label>
            <label className="block space-y-2 text-xs font-semibold text-[#bdc1cb]">Thumbnail Image URL<input className={inputStyle} placeholder="https://example.com/logo.png" value={config.thumbnailUrl} onChange={e => update('thumbnailUrl',e.target.value)}/></label>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">Panel publishing is not connected in this UI update. Save Configuration saves the existing Duty settings; it does not post a message to Discord.</div>
          </section>
          <section className="space-y-4 rounded-xl border border-[#292d34] bg-[#101319] p-5"><div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold">Live Discord Preview</h2><span className="rounded-md border border-[#534524] bg-[#282519] px-2 py-1 text-[10px] font-bold text-[#edc468]">LIVE PREVIEW</span></div>
            <div className="rounded-xl border border-[#393c43] bg-[#22252b] p-4"><div className="mb-3 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d5a847] font-black text-black">C</div><div><p className="text-xs font-bold">CYBER BOT <span className="rounded bg-[#5269bd] px-1 py-0.5 text-[9px] text-white">APP</span></p><p className="text-[10px] text-[#9297a2]">Preview</p></div></div>
              <div className="overflow-hidden rounded-r-md border-l-4 bg-[#2b2d33] p-4" style={{borderLeftColor:/^#[0-9a-fA-F]{6}$/.test(config.embedColor) ? config.embedColor : '#e4b449'}}>{config.thumbnailUrl && <img src={config.thumbnailUrl} alt="Thumbnail preview" className="float-right ml-3 h-16 w-16 rounded-md object-cover"/>}<h3 className="text-sm font-bold">{config.panelTitle || 'CYBER STAFF DUTY'}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#c4c7d0]">{config.description || 'Panel description'}</p><p className="mt-4 text-[11px] font-semibold text-emerald-400">● AUTO DUTY TRACKING ENABLED</p><p className="mt-1 text-[11px] text-[#9297a2]">Duty starts automatically in authorized voice rooms.</p>{config.imageUrl && <img src={config.imageUrl} alt="Banner preview" className="mt-4 max-h-48 w-full rounded-md object-cover"/>}<p className="mt-4 text-[10px] text-[#9297a2]">CYBER ORGANIZATION • Duty System</p></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-md bg-[#255d45] px-2 py-2 text-center text-[11px] font-bold">◉ My Duty Status</div><div className="rounded-md bg-[#353940] px-2 py-2 text-center text-[11px] font-bold">▥ Leaderboard</div></div>
            </div><p className="text-xs text-[#9297a2]">Preview only. Discord buttons shown here are visual examples, not published controls.</p>
          </section>
        </div>}
        {tab === 'tracking' && <div className="grid gap-4 lg:grid-cols-2"><section className="space-y-5 rounded-xl border border-[#292d34] bg-[#101319] p-5"><div><h2 className="text-base font-bold">◉ Automatic Duty Tracking</h2><p className="mt-1 text-xs text-[#9297a2]">Track authorized staff inside selected voice rooms.</p></div><label className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 text-sm font-semibold"><span>Enable Auto Duty</span><input type="checkbox" className="h-4 w-4 accent-amber-400" checked={config.enabled} onChange={e => update('enabled',e.target.checked)}/></label><MultiSelector title="Voice Channels" subtitle="Click to select one or more voice rooms" items={voiceChannels} selected={config.voiceChannelIds} onChange={ids => update('voiceChannelIds', ids)} emptyMessage="No voice rooms returned by Discord. Check bot permissions." loading={loading}/><MultiSelector title="Staff Roles" subtitle="Only members with selected roles are tracked" items={roles.filter(r => r.name !== '@everyone')} selected={config.staffRoleIds} onChange={ids => update('staffRoleIds', ids)} emptyMessage="No roles returned by Discord." loading={loading}/><div className="rounded-lg border border-[#27543e] bg-[#15221e] p-3 text-xs leading-6 text-[#8ce0b4]">✓ Enter selected Voice → Auto ON DUTY<br/>✓ Leave Voice → Auto PAUSE<br/>✓ Return to selected Voice → Auto RESUME<br/>✓ History remains stored across days</div></section><section className="rounded-xl border border-[#292d34] bg-[#101319] p-5"><h2 className="text-base font-bold">How Duty Tracking Works</h2><div className="mt-5 space-y-6">{[['01 — AUTO START','Staff enters an authorized voice room.'],['02 — AUTO PAUSE','Staff leaves voice or moves to an unauthorized room.'],['03 — AUTO RESUME','Returning to a selected room resumes accumulated time.'],['04 — DAILY ARCHIVE','Each session contributes to stored history.']].map(([title,desc]) => <div key={title}><p className="text-xs font-bold text-[#eac267]">{title}</p><p className="mt-1 text-sm text-[#9297a2]">{desc}</p></div>)}</div></section></div>}
        {tab === 'leaderboard' && <section className="rounded-xl border border-[#292d34] bg-[#101319] p-5"><div className="mb-4 flex justify-between"><h2 className="text-base font-bold">Staff Leaderboard</h2><span className="text-xs text-[#eac267]">ALL TIME</span></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="border-b border-[#292d34] text-[#9297a2]"><tr><th className="p-3">RANK</th><th>STAFF MEMBER</th><th>STATUS</th><th>TOTAL HOURS</th><th>PROFILE</th></tr></thead><tbody>{leaderboard.map((p,i) => <tr key={p.id} className="border-b border-[#292d34]"><td className="p-3 font-bold text-[#eac267]">#{i+1}</td><td><p className="font-semibold">{p.name}</p><p className="text-[10px] text-[#9297a2]">{p.id}</p></td><td className={p.active ? 'text-emerald-400' : 'text-[#9297a2]'}>{p.active ? '● On Duty' : '○ Off Duty'}</td><td className="font-semibold">{fmt(p.total)}</td><td><button type="button" onClick={() => setSelectedStaff(p.id)} className="rounded-md border border-amber-500/30 px-3 py-2 text-amber-300">View Profile</button></td></tr>)}</tbody></table>{leaderboard.length === 0 && <p className="py-10 text-center text-sm text-[#9297a2]">No duty sessions recorded yet.</p>}</div></section>}
        {tab === 'logs' && <section className="rounded-xl border border-[#292d34] bg-[#101319] p-5"><div className="mb-4 flex justify-between"><h2 className="text-base font-bold">Staff Activity & Daily History</h2><span className="text-xs text-[#eac267]">ACTIVITY LOGS</span></div><div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[590px] text-left text-xs"><thead className="sticky top-0 bg-[#101319] text-[#9297a2]"><tr><th className="p-3">STAFF</th><th>EVENT</th><th>DATE / TIME</th><th>VOICE</th></tr></thead><tbody>{[...events].reverse().map((e,i) => <tr key={`${e.user_id}-${e.at_time}-${i}`} className="border-b border-[#292d34]"><td className="p-3">{e.username || e.user_id}</td><td className={e.event_type === 'start' ? 'text-emerald-400' : 'text-amber-400'}>{e.event_type === 'start' ? 'AUTO ON DUTY' : 'AUTO PAUSE / STOP'}</td><td>{new Date(e.at_time).toLocaleString()}</td><td>{channels.find(c => c.id === e.channel_id)?.name || e.channel_id || '—'}</td></tr>)}</tbody></table>{events.length === 0 && <p className="py-10 text-center text-sm text-[#9297a2]">No activity recorded yet.</p>}</div></section>}
        <p className="pt-2 text-center text-[11px] tracking-wider text-[#9297a2]">CYBER V3 • DUTY CONTROL CENTER</p>
      </div>
    </div>
    {profile && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedStaff(null)}><div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-amber-500/30 bg-[#121419] p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-400">Staff Profile</p><h2 className="mt-2 text-2xl font-bold">{profile.name}</h2><p className="mt-1 text-xs text-zinc-500">Discord ID: {profile.id}</p></div><button onClick={() => setSelectedStaff(null)} className="text-2xl text-zinc-400">×</button></div><div className="my-5 rounded-xl bg-amber-400/10 p-4"><p className="text-xs text-zinc-400">Total Duty Time</p><p className="text-3xl font-bold text-amber-400">{fmt(profile.total)}</p><p className="mt-1 text-xs text-zinc-400">{profile.active ? 'Currently on duty' : 'Currently off duty'}</p></div><h3 className="mb-3 font-bold">Activity Timeline</h3><div className="space-y-2">{[...profile.logs].reverse().map((e,i) => <div key={`${e.at_time}-${i}`} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"><span className={e.event_type === 'start' ? 'text-emerald-400' : 'text-amber-300'}>{e.event_type === 'start' ? 'ON DUTY' : 'STOPPED'}</span><span>{new Date(e.at_time).toLocaleString()}</span><span className="text-zinc-400">{channels.find(c => c.id === e.channel_id)?.name || e.channel_id || '—'}</span></div>)}</div></div></div>}
  </main>
}
