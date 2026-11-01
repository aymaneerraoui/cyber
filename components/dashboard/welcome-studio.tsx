'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Save, RefreshCw, Sparkles, ShieldCheck, Radio, WandSparkles, ArrowUpRight, ChevronDown, Search, X, Check } from 'lucide-react'
import { motion } from 'motion/react'

type Channel = { id: string; name: string; kind: string }
type Role = { id: string; name: string }
type LinkButton = { id: string; label: string; emoji: string; channelId: string }
type MessageSettings = { enabled: boolean; channelId: string; title: string; description: string; color: string; footer: string; bannerUrl: string; showAvatar: boolean; buttons: LinkButton[] }
type WelcomeConfig = { welcome: MessageSettings; goodbye: MessageSettings; autoRoleIds: string[] }
const defaults: WelcomeConfig = {
  welcome: { enabled: false, channelId: '', title: '🖤 WELCOME TO {server}', description: 'Welcome {user}! You are member #{memberCount}.', color: '#d4af37', footer: 'CYBER ORGANIZATION', bannerUrl: '', showAvatar: true, buttons: [] },
  goodbye: { enabled: false, channelId: '', title: 'GOODBYE {username}', description: '{username} has left {server}.', color: '#d4af37', footer: 'CYBER ORGANIZATION', bannerUrl: '', showAvatar: true, buttons: [] },
  autoRoleIds: []
}
const cloneDefaults = (): WelcomeConfig => JSON.parse(JSON.stringify(defaults))
const isImageUrl = (value: string) => !value || /^https:\/\//i.test(value)

export function WelcomeStudio({ serverId }: { serverId: string }) {
  const [config, setConfig] = useState<WelcomeConfig>(cloneDefaults)
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tab, setTab] = useState<'welcome' | 'goodbye'>('welcome')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
const [roleSearch, setRoleSearch] = useState('')

const toggleAutoRole = (roleId: string) => {
  setConfig(prev => ({
    ...prev,
    autoRoleIds: prev.autoRoleIds.includes(roleId)
      ? prev.autoRoleIds.filter(id => id !== roleId)
      : [...prev.autoRoleIds, roleId]
  }))
}
  const load = useCallback(async () => {
    setBusy(true); setMessage('')
    try {
      const base = `/api/servers/${serverId}`
      const [c, r, s] = await Promise.all([fetch(`${base}/channels`), fetch(`${base}/roles`), fetch(`${base}/config/welcome`)])
      if (!c.ok || !r.ok) throw new Error('Cannot load Discord channels or roles. Check bot connection and permissions.')
      const [channelData, roleData] = await Promise.all([c.json(), r.json()])
      setChannels(channelData.filter((x: Channel) => ['text', 'announcement'].includes(x.kind)))
      setRoles(roleData.filter((x: Role) => x.id !== serverId))
      if (s.ok) {
        const data = await s.json()
        setConfig({ welcome: { ...defaults.welcome, ...data.welcome, buttons: Array.isArray(data.welcome?.buttons) ? data.welcome.buttons : [] }, goodbye: { ...defaults.goodbye, ...data.goodbye, buttons: Array.isArray(data.goodbye?.buttons) ? data.goodbye.buttons : [] }, autoRoleIds: Array.isArray(data.autoRoleIds) ? data.autoRoleIds : [] })
      } else if (s.status !== 404) throw new Error(`Config load failed (HTTP ${s.status})`)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to load') }
    finally { setBusy(false) }
  }, [serverId])
  useEffect(() => { void load() }, [load])
  const current = config[tab]
  const update = (changes: Partial<MessageSettings>) => setConfig(prev => ({ ...prev, [tab]: { ...prev[tab], ...changes } }))
  const save = async () => {
    if (!isImageUrl(config.welcome.bannerUrl) || !isImageUrl(config.goodbye.bannerUrl)) return setMessage('Banner URL must start with https://')
    if (config.welcome.enabled && !config.welcome.channelId) return setMessage('Select a Welcome channel')
    if (config.goodbye.enabled && !config.goodbye.channelId) return setMessage('Select a Goodbye channel')
    for (const section of [config.welcome, config.goodbye]) if (section.buttons.some(b => !b.label.trim() || !b.channelId)) return setMessage('Every button needs a label and target channel')
    setBusy(true); setMessage('')
    try {
      const res = await fetch(`/api/servers/${serverId}/config/welcome`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: config }) })
      if (!res.ok) throw new Error(`Save failed (HTTP ${res.status}): ${JSON.stringify(await res.json().catch(() => ({})))}`)
      setMessage('✓ Saved to Neon. Bot delivery requires Welcome listener installation.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Save failed') }
    finally { setBusy(false) }
  }
  const field = (label: string, key: keyof MessageSettings, multi = false) => <label className="block space-y-1 text-sm" key={key}><span className="text-zinc-300">{label}</span>{multi ? <textarea className="w-full min-h-28 rounded-lg border border-amber-700/40 bg-zinc-950 p-3 text-white" value={String(current[key])} onChange={e => update({ [key]: e.target.value })} /> : <input className="w-full rounded-lg border border-amber-700/40 bg-zinc-950 p-3 text-white" value={String(current[key])} onChange={e => update({ [key]: e.target.value })} />}</label>
  return <div className="relative isolate mx-auto max-w-7xl space-y-7 overflow-hidden rounded-[28px] border border-amber-400/10 bg-[#080a0e] p-4 text-zinc-100 shadow-[0_30px_120px_rgba(0,0,0,.4)] md:p-8">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{backgroundImage:'linear-gradient(rgba(212,175,55,.15) 1px, transparent 1px),linear-gradient(90deg,rgba(212,175,55,.15) 1px,transparent 1px)',backgroundSize:'48px 48px',maskImage:'linear-gradient(to bottom, black, transparent 85%)'}} />
      <motion.div className="absolute -right-28 -top-48 h-[450px] w-[450px] rounded-full bg-amber-400/10 blur-[85px]" animate={{x:[0,-40,0],y:[0,50,0],scale:[1,1.2,1]}} transition={{duration:14,repeat:Infinity,ease:'easeInOut'}} />
      <motion.div className="absolute -bottom-56 -left-36 h-[450px] w-[450px] rounded-full bg-yellow-700/10 blur-[90px]" animate={{x:[0,60,0],y:[0,-40,0]}} transition={{duration:18,repeat:Infinity,ease:'easeInOut'}} />
      <motion.div className="absolute right-[10%] top-24 h-36 w-36 rotate-45 rounded-[30px] border border-amber-300/10" animate={{rotate:[45,75,45],y:[0,-25,0]}} transition={{duration:16,repeat:Infinity,ease:'easeInOut'}} />
      <motion.div className="absolute left-[18%] top-[30%] h-14 w-14 rotate-12 rounded-xl border border-amber-300/10" animate={{rotate:[12,-24,12],y:[0,30,0]}} transition={{duration:12,repeat:Infinity,ease:'easeInOut'}} />
    </div>
    <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.55}} className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-zinc-950/90 to-black/80 p-5 backdrop-blur-xl md:p-7">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.3em] text-amber-300"><Radio className="h-3 w-3 animate-pulse"/> CYBER ORGANIZATION / COMMUNITY MODULE / V1</div>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">WELCOME <span className="bg-gradient-to-r from-[#f6db82] via-[#d4af37] to-[#8c6820] bg-clip-text text-transparent">STUDIO</span></h1><p className="mt-2 max-w-xl text-sm text-zinc-400">Create the first impression. Design dynamic greetings, channel portals and automatic member roles.</p></div><div className="flex gap-2"><button onClick={() => void load()} disabled={busy} className="rounded-xl border border-amber-400/20 bg-white/5 px-4 py-3 text-sm transition hover:border-amber-400/50 hover:bg-amber-400/10 disabled:opacity-50"><RefreshCw className={`mr-1 inline h-4 w-4 ${busy?'animate-spin':''}`}/> Refresh</button><motion.button whileHover={{scale:1.03}} whileTap={{scale:.97}} onClick={() => void save()} disabled={busy} className="rounded-xl bg-gradient-to-r from-[#b98c2c] via-[#f6d776] to-[#b98c2c] px-5 py-3 text-sm font-black text-black shadow-[0_0_25px_rgba(212,175,55,.18)] transition hover:shadow-[0_0_40px_rgba(212,175,55,.3)] disabled:opacity-50"><Save className="mr-1 inline h-4 w-4"/> {busy?'Working...':'Save to Neon'}</motion.button></div></div>
    </motion.div>
    <div className="grid gap-3 sm:grid-cols-3">{[{icon:Sparkles,label:'WELCOME',detail:'Personalized embeds'},{icon:ShieldCheck,label:'AUTO ROLE',detail:`${config.autoRoleIds.length} selected roles`},{icon:WandSparkles,label:'LIVE PREVIEW',detail:'Real-time customization'}].map((item,i)=><motion.div key={item.label} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*.1}} whileHover={{y:-3}} className="flex items-center gap-3 rounded-2xl border border-amber-400/15 bg-zinc-900/60 p-4 backdrop-blur-md"><div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-300"><item.icon className="h-5 w-5"/></div><div><p className="text-[10px] font-bold tracking-[.2em] text-amber-300">{item.label}</p><p className="mt-1 text-xs text-zinc-400">{item.detail}</p></div></motion.div>)}</div>
    {message && <p role="status" className="rounded-lg border border-amber-700/40 bg-zinc-900 p-3 text-sm">{message}</p>}

<div className="rounded-2xl border border-amber-400/20 bg-zinc-900/70 p-5 shadow-[0_12px_40px_rgba(0,0,0,.18)] backdrop-blur-xl">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold text-amber-400">
        Auto Role on Join
      </h2>
      <p className="mt-1 text-xs text-zinc-400">
        Automatically assign selected roles when a member joins.
      </p>
    </div>

    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
      {config.autoRoleIds.length} Selected
    </span>
  </div>

  <div className="relative">
    <button
      type="button"
      onClick={() => setRoleDropdownOpen(prev => !prev)}
      aria-expanded={roleDropdownOpen}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-zinc-950 px-4 py-4 text-left text-sm text-zinc-200 transition hover:border-amber-400/60"
    >
      <span>
        {config.autoRoleIds.length
          ? `${config.autoRoleIds.length} roles selected`
          : 'Select Auto Roles...'}
      </span>

      <ChevronDown
        className={`h-4 w-4 text-amber-400 transition-transform duration-300 ${
          roleDropdownOpen ? 'rotate-180' : ''
        }`}
      />
    </button>

    {roleDropdownOpen && (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mt-2 overflow-hidden rounded-xl border border-amber-400/25 bg-[#0c0d11] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <Search className="h-4 w-4 text-amber-400" />

          <input
            type="text"
            placeholder="Search Discord roles..."
            value={roleSearch}
            onChange={e => setRoleSearch(e.target.value)}
            className="w-full bg-transparent p-2 text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto p-2">
          {roles
            .filter(role =>
              role.name
                .toLowerCase()
                .includes(roleSearch.toLowerCase())
            )
            .map(role => {
              const selected = config.autoRoleIds.includes(role.id)

              return (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => toggleAutoRole(role.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition ${
                    selected
                      ? 'bg-amber-400/10 text-amber-300'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{role.name}</span>

                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-amber-400" />
                  )}
                </button>
              )
            })}

          {roles.filter(role =>
            role.name.toLowerCase().includes(roleSearch.toLowerCase())
          ).length === 0 && (
            <p className="p-4 text-center text-xs text-zinc-500">
              No roles found.
            </p>
          )}
        </div>
      </motion.div>
    )}
  </div>

  {config.autoRoleIds.length > 0 && (
    <div className="mt-4 flex flex-wrap gap-2">
      {config.autoRoleIds.map(roleId => {
        const role = roles.find(r => r.id === roleId)

        return (
          <span
            key={roleId}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200"
          >
            {role?.name || roleId}

            <button
              type="button"
              aria-label={`Remove ${role?.name || roleId}`}
              onClick={() => toggleAutoRole(roleId)}
              className="transition hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )
      })}
    </div>
  )}

  <div className="mt-4 flex items-center justify-between gap-2">
    <p className="text-xs text-zinc-500">
      Bot requires Manage Roles permission and a higher role position.
    </p>

    <button
      type="button"
      onClick={() =>
        setConfig(prev => ({ ...prev, autoRoleIds: [] }))
      }
      disabled={config.autoRoleIds.length === 0}
      className="shrink-0 text-xs font-semibold text-amber-400 transition hover:text-amber-200 disabled:opacity-40"
    >
      Clear All
    </button>
  </div>
</div>
    <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-400/10 bg-zinc-900/60 p-2 backdrop-blur-xl">{(['welcome', 'goodbye'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 ${tab === t ? 'bg-gradient-to-r from-amber-500 to-yellow-300 text-black shadow-[0_0_24px_rgba(212,175,55,.2)]' : 'bg-zinc-800/70 text-zinc-400 hover:bg-amber-400/10 hover:text-amber-200'}`}>{t === 'welcome' ? '👋 Welcome' : '🚪 Goodbye'}</button>)}</div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="space-y-4 rounded-2xl border border-amber-400/20 bg-zinc-900/70 p-5 shadow-[0_12px_40px_rgba(0,0,0,.18)] backdrop-blur-xl"><label className="flex items-center gap-2"><input type="checkbox" checked={current.enabled} onChange={e => update({ enabled: e.target.checked })}/><strong>Enable {tab} messages</strong></label><label className="block space-y-1 text-sm"><span>Publish in Channel</span><select className="w-full rounded-lg border border-amber-700/40 bg-zinc-950 p-3" value={current.channelId} onChange={e => update({ channelId: e.target.value })}><option value="">Select Discord channel</option>{channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}</select></label>{field('Embed Title', 'title')}{field('Embed Description • {user} {username} {server} {memberCount}', 'description', true)}{field('Embed Color (#hex)', 'color')}{field('Footer', 'footer')}{field('Banner Image URL (https://)', 'bannerUrl')}<label className="flex gap-2 text-sm"><input type="checkbox" checked={current.showAvatar} onChange={e => update({ showAvatar: e.target.checked })}/>Show member profile avatar on right</label><div className="space-y-3 border-t border-zinc-700 pt-4"><div className="flex justify-between"><h3 className="font-semibold">Room Link Buttons ({current.buttons.length}/25)</h3><button disabled={current.buttons.length >= 25} onClick={() => update({ buttons: [...current.buttons, { id: crypto.randomUUID(), label: '', emoji: '📜', channelId: '' }] })} className="text-amber-400"><Plus className="inline h-4 w-4"/> Add</button></div>{current.buttons.map((b, i) => <div key={b.id} className="grid gap-2 rounded-lg bg-zinc-950 p-3 sm:grid-cols-[1fr_1fr_auto]"><input aria-label="Button name" placeholder="Button name" className="min-w-0 rounded bg-zinc-800 p-2" value={b.label} onChange={e => update({ buttons: current.buttons.map((x,j) => j === i ? { ...x, label: e.target.value } : x) })}/><input aria-label="Emoji" placeholder="Emoji" className="min-w-0 rounded bg-zinc-800 p-2" value={b.emoji} onChange={e => update({ buttons: current.buttons.map((x,j) => j === i ? { ...x, emoji: e.target.value } : x) })}/><button aria-label="Delete button" onClick={() => update({ buttons: current.buttons.filter(x => x.id !== b.id) })}><Trash2 className="h-4 w-4 text-red-400"/></button><select className="rounded bg-zinc-800 p-2 sm:col-span-3" value={b.channelId} onChange={e => update({ buttons: current.buttons.map((x,j) => j === i ? { ...x, channelId: e.target.value } : x) })}><option value="">Target channel</option>{channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}</select></div>)}</div></section>
    <section className="space-y-4 rounded-2xl border border-amber-400/20 bg-zinc-900/60 p-5 backdrop-blur-xl"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-amber-300"><Sparkles className="h-4 w-4"/> Live Discord Preview</h2><span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[10px] text-green-300">● LIVE</span></div><div className="rounded-xl border-l-4 border-amber-400 bg-[#202127] p-5 shadow-[0_12px_40px_rgba(0,0,0,.2)]"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{current.title || 'Embed Title'}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{current.description || 'Embed description'}</p></div>{current.showAvatar && <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-3xl">👤</div>}</div>{current.bannerUrl && <p className="mt-4 break-all rounded bg-zinc-800 p-3 text-xs">🖼 {current.bannerUrl}</p>}<p className="mt-4 text-xs text-zinc-400">{current.footer}</p></div><div className="flex flex-wrap gap-2">{current.buttons.map(b => <span key={b.id} className="inline-flex items-center gap-1 rounded-lg border border-zinc-500/30 bg-zinc-700 px-3 py-2 text-sm transition hover:bg-zinc-600">{b.emoji} {b.label || 'Button'} <ArrowUpRight className="h-3 w-3"/></span>)}</div><p className="text-xs text-zinc-500">Preview only. Buttons will be Discord Link Buttons; member avatar is filled by the bot on join/leave.</p></section></div>
  </div>
}
