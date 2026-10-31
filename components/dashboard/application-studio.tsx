'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import {
  Crown, LayoutDashboard, ListChecks, ShieldCheck, Tags, Hash,
  Inbox, Palette, Plus, Trash2, GripVertical, Save, Sparkles,
  ArrowRight, CheckCircle2, Clock3, XCircle, Mic, Settings2,
  Eye, AlertCircle, Image as ImageIcon, Send, Loader2,
  ExternalLink, RotateCcw, Copy, ChevronDown
} from 'lucide-react'

type Question = {
  id: string
  text: string
  required: boolean
  type: 'short' | 'paragraph' | 'yesno'
}

type Config = {
  questions: Question[]
  panelTitle: string
  panelDescription: string
  applyChannel: string
  reviewChannel: string
  requiredRole: string
  pendingRole: string
  acceptedRole: string
  deniedRole: string
  interviewRole: string
  reviewers: string[]
  panelThumbnail: string
  panelBanner: string
  panelColor: string
  panelFooter: string
  buttonText: string
  buttonEmoji: string
  buttonColor: 'primary' | 'success' | 'danger' | 'secondary'
  applicationName?: string
  actionRoles?: Record<'accept' | 'deny' | 'interview' | 'delete', { add: string[]; remove: string[] }>
}

const initial: Config = {
  questions: [
    {
      id: '1',
      text: 'What is your FiveM roleplay experience?',
      required: true,
      type: 'paragraph'
    },
    {
      id: '2',
      text: 'Why do you want to join CYBER ORGANIZATION?',
      required: true,
      type: 'paragraph'
    },
    {
      id: '3',
      text: 'How many hours can you be active daily?',
      required: true,
      type: 'short'
    }
  ],
  panelTitle: 'CYBER ORGANIZATION',
  panelDescription: 'Your journey begins here. Apply to join our organization.',
  applyChannel: '',
  reviewChannel: '',
  requiredRole: '',
  pendingRole: '',
  acceptedRole: '',
  deniedRole: '',
  interviewRole: '',
  reviewers: [],
  panelThumbnail: '',
  panelBanner: '',
  panelColor: '#D9AC55',
  panelFooter: 'CYBER ORGANIZATION • RECRUITMENT SYSTEM',
  buttonText: 'Apply Now',
  buttonEmoji: '📝',
  buttonColor: 'success'
}

type SavedForm = { id: string; name: string; config: Config }

const emptyActions = () => ({
  accept: { add: [] as string[], remove: [] as string[] },
  deny: { add: [] as string[], remove: [] as string[] },
  interview: { add: [] as string[], remove: [] as string[] },
  delete: { add: [] as string[], remove: [] as string[] }
})

function freshConfig(name: string): Config {
  return {
    ...initial,
    questions: [],
    panelTitle: name,
    panelDescription: `Apply for ${name}.`,
    applicationName: name,
    reviewers: [],
    actionRoles: emptyActions()
  }
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'questions', label: 'Questions Builder', icon: ListChecks },
  { id: 'staff', label: 'Staff Roles', icon: ShieldCheck },
  { id: 'roles', label: 'Status Roles', icon: Tags },
  { id: 'channels', label: 'Channel Settings', icon: Hash },
  { id: 'applications', label: 'Applications', icon: Inbox },
  { id: 'designer', label: 'Panel Designer', icon: Palette }
] as const

type Tab = (typeof tabs)[number]['id']

type DiscordItem = {
  id: string
  name: string
}

const input =
  'w-full rounded-xl border border-[#3a3529] bg-[#0e1118] px-4 py-3 text-sm text-white outline-none transition focus:border-[#d5ac57] focus:ring-2 focus:ring-[#d5ac57]/10'

const card =
  'rounded-2xl border border-[#302b25] bg-gradient-to-br from-[#181b22] to-[#101218] p-5 shadow-[0_14px_45px_rgba(0,0,0,.18)]'

const goldButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f5d58a] to-[#c38b35] px-5 py-3 text-sm font-bold text-[#1c160d] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40'

const buttonColors = {
  primary: '#5865F2',
  success: '#248046',
  danger: '#DA373C',
  secondary: '#4E5058'
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-[#a4a5ac]">
        {label}
      </span>
      {children}
    </label>
  )
}

function isValidImageUrl(value: string) {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function ApplicationStudio({
  serverId
}: {
  serverId: string
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedId, setSelectedId] = useState('legacy')
  const [forms, setForms] = useState<SavedForm[]>([])
  const [formsReady, setFormsReady] = useState(false)
  const [config, setConfig] = useState<Config>(initial)
  const [busy, setBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [roles, setRoles] = useState<DiscordItem[]>([])
  const [channels, setChannels] = useState<DiscordItem[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`cyber-application-drafts-v11:${serverId}`)
      const data = raw ? JSON.parse(raw) : []
      setForms(Array.isArray(data) ? data.filter((f: SavedForm) => f && typeof f.id === 'string' && f.config) : [])
    } catch {
      setForms([])
      toast.error('Could not read locally saved application drafts')
    }
    setFormsReady(true)
  }, [serverId])

  useEffect(() => {
    if (!formsReady) return
    try {
      window.localStorage.setItem(`cyber-application-drafts-v11:${serverId}`, JSON.stringify(forms))
    } catch {
      toast.error('Browser storage is full; new forms could not be saved')
    }
  }, [forms, formsReady, serverId])

  useEffect(() => {
    let active = true

    setLoaded(false)
    setDirty(false)

    fetch(`/api/servers/${serverId}/applications/config`)
      .then(async r => {
        if (!r.ok) throw new Error('Failed to load configuration')
        return r.json()
      })
      .then(d => {
        if (active && d.config) {
          if (selectedId === 'legacy') setConfig({ ...initial, ...d.config })
        }
      })
      .catch(() => {
        if (active) toast.error('Could not load application configuration')
      })
      .finally(() => {
        if (active) setLoaded(true)
      })

    Promise.allSettled([
      fetch(`/api/servers/${serverId}/roles`).then(r => r.json()),
      fetch(`/api/servers/${serverId}/channels`).then(r => r.json())
    ]).then(([a, b]) => {
      if (!active) return

      if (a.status === 'fulfilled') {
        const d = a.value
        setRoles(
          Array.isArray(d)
            ? d
            : Array.isArray(d.roles)
              ? d.roles
              : []
        )
      }

      if (b.status === 'fulfilled') {
        const d = b.value
        setChannels(
          Array.isArray(d)
            ? d
            : Array.isArray(d.channels)
              ? d.channels
              : []
        )
      }
    })

    return () => {
      active = false
    }
  }, [serverId])

  function change<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig(c => ({ ...c, [key]: value }))
    setDirty(true)
  }

  function chooseForm(id: string) {
    if (dirty && !window.confirm('You have unsaved changes. Switch application?')) return
    setSelectedId(id)
    setTab('overview')
    setDirty(false)
    if (id === 'legacy') {
      setLoaded(false)
      fetch(`/api/servers/${serverId}/applications/config`)
        .then(async r => { if (!r.ok) throw new Error('Load failed'); return r.json() })
        .then(d => setConfig({ ...initial, ...(d.config || {}) }))
        .catch(() => toast.error('Could not load V10 configuration'))
        .finally(() => setLoaded(true))
    } else {
      const f = forms.find(x => x.id === id)
      if (f) setConfig({ ...freshConfig(f.name), ...f.config })
      setLoaded(true)
    }
  }

  function addForm() {
    const name = window.prompt('Name your new application:', 'New Application')?.trim()
    if (!name) return
    if (dirty && !window.confirm('Switching will discard unsaved changes. Continue?')) return
    const id = crypto.randomUUID()
    const item = { id, name, config: freshConfig(name) }
    setForms(old => [...old, item])
    setSelectedId(id)
    setConfig(item.config)
    setDirty(false)
    setLoaded(true)
    setTab('questions')
    toast.success('Independent application created as a local draft')
  }

  function duplicateForm() {
    const name = (config.applicationName || forms.find(f => f.id === selectedId)?.name || 'Application') + ' Copy'
    const id = crypto.randomUUID()
    const copied: Config = { ...structuredClone(config), applicationName: name,
      questions: config.questions.map(q => ({ ...q, id: crypto.randomUUID() })) }
    setForms(old => [...old, { id, name, config: copied }])
    setSelectedId(id)
    setConfig(copied)
    setDirty(false)
    toast.success('Application duplicated as a local draft')
  }

  function deleteForm() {
    if (selectedId === 'legacy') return
    if (!window.confirm('Delete this application draft from this browser?')) return
    setForms(old => old.filter(f => f.id !== selectedId))
    setSelectedId('legacy')
    setDirty(false)
    setLoaded(false)
    fetch(`/api/servers/${serverId}/applications/config`)
      .then(async r => { if (!r.ok) throw new Error('Load failed'); return r.json() })
      .then(d => setConfig({ ...initial, ...(d.config || {}) }))
      .catch(() => toast.error('Could not load V10 configuration'))
      .finally(() => setLoaded(true))
  }

  function validate() {
    if (config.questions.length > 10) {
      toast.error('Maximum 10 questions allowed')
      return false
    }

    if (config.questions.some(q => !q.text.trim())) {
      toast.error('Questions cannot be empty')
      return false
    }

    if (
      !isValidImageUrl(config.panelThumbnail) ||
      !isValidImageUrl(config.panelBanner)
    ) {
      toast.error('Please enter valid HTTP or HTTPS image URLs')
      return false
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(config.panelColor)) {
      toast.error('Invalid embed color')
      return false
    }

    if (!config.buttonText.trim()) {
      toast.error('Apply button text cannot be empty')
      return false
    }

    return true
  }

  async function save(): Promise<boolean> {
    if (!validate()) return false

    if (selectedId !== 'legacy') {
      const name = config.applicationName?.trim() || 'Untitled Application'
      setForms(old => old.map(f => f.id === selectedId ? { ...f, name, config: structuredClone(config) } : f))
      setDirty(false)
      toast.success('Draft saved in this browser only (not Neon)')
      return true
    }

    setBusy(true)

    try {
      const r = await fetch(
        `/api/servers/${serverId}/applications/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        }
      )

      const d = await r.json()

      if (!r.ok) {
        throw new Error(d.error || 'Save failed')
      }

      setDirty(false)
      toast.success('Application configuration saved')
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function publishPanel() {
    if (selectedId !== 'legacy') {
      toast.error('New applications cannot publish yet. Multi-form Neon and bot APIs are required.')
      return
    }
    if (!config.applyChannel) {
      toast.error('Select an Application Panel Channel first')
      setTab('channels')
      return
    }

    if (!config.reviewChannel) {
      toast.error('Select a Review Channel first')
      setTab('channels')
      return
    }

    if (!config.questions.length) {
      toast.error('Add at least one application question')
      setTab('questions')
      return
    }

    if (!validate()) return

    setPublishing(true)

    try {
      if (dirty) {
        const saved = await save()
        if (!saved) return
      }

      const r = await fetch(
        `/api/servers/${serverId}/applications/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const d = await r.json().catch(() => ({}))

      if (!r.ok) {
        if (r.status === 404) {
          throw new Error(
            'Publish API is not connected yet. The next backend file is required.'
          )
        }

        throw new Error(d.error || 'Could not publish panel')
      }

      toast.success('Application panel published to Discord!')
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Publishing failed'
      )
    } finally {
      setPublishing(false)
    }
  }

  function roleSelect(
    value: string,
    onChange: (value: string) => void
  ) {
    return (
      <select
        className={input}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Not configured</option>
        {roles.map(r => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    )
  }

  function channelSelect(
    value: string,
    onChange: (value: string) => void
  ) {
    return (
      <select
        className={input}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select a Discord channel</option>
        {channels.map(c => (
          <option key={c.id} value={c.id}>
            # {c.name}
          </option>
        ))}
      </select>
    )
  }

  const configuredChannels =
    [config.applyChannel, config.reviewChannel].filter(Boolean).length

  const activeTab = tabs.find(t => t.id === tab)!
  const ActiveIcon = activeTab.icon

  return (
    <div className="relative w-full min-w-0 max-w-none overflow-hidden rounded-[24px] border border-[#4b3a20] bg-[#090b10] text-[#f4f1e8] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
      <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-[#c9963e]/[.09] blur-[95px]" />

      {/* HEADER */}
      <header className="relative border-b border-[#3c3020] bg-gradient-to-r from-[#17150f] via-[#101116] to-[#0c1016] px-5 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#e7bd66]/50 bg-[#e7bd66]/10">
              <Crown className="size-8 text-[#f0c772]" />
            </div>

            <div>
              <div className="text-[10px] font-bold tracking-[.25em] text-[#d6ac5a]">
                CYBER ORGANIZATION · V10
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                APPLICATION <span className="text-[#e8bc65]">STUDIO</span>
              </h1>
              <p className="text-xs text-[#9698a1]">
                Premium recruitment control center
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={addForm} className={goldButton}>
              <Plus size={16} /> New Application
            </button>
            {selectedId !== 'legacy' && (
              <>
                <button onClick={duplicateForm} className="rounded-xl border border-[#6c542c] px-4 py-3 text-xs font-bold text-[#e8c37d]">
                  <Copy size={15} className="inline mr-2" />Duplicate
                </button>
                <button onClick={deleteForm} className="rounded-xl border border-red-800 px-4 py-3 text-xs font-bold text-red-400">
                  <Trash2 size={15} className="inline mr-2" />Delete
                </button>
              </>
            )}
            <button
              onClick={() => setTab('designer')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#6c542c] px-4 py-3 text-xs font-bold text-[#e8c37d] hover:bg-[#d8ae59]/10"
            >
              <Palette size={16} />
              Panel Designer
            </button>

            <button
              onClick={() => void save()}
              disabled={busy || !loaded}
              className={goldButton}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#4a3922] bg-[#0c0e13] p-3">
          <span className="text-xs font-semibold text-[#dcb56b]">CURRENT APPLICATION</span>
          <select
            aria-label="Choose application"
            className="min-w-[200px] flex-1 rounded-lg border border-[#584628] bg-[#171a20] px-3 py-2 text-sm text-white"
            value={selectedId}
            onChange={e => chooseForm(e.target.value)}
          >
            <option value="legacy">Original V10 Application (Live Config)</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <span className="text-[11px] text-[#a7a8ae]">{selectedId === 'legacy' ? 'Existing Neon API' : 'Local draft · Not published'}</span>
        </div>
      </header>

      <div className="relative grid min-w-0 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        {/* STUDIO SIDEBAR */}
        <aside className="min-w-0 border-b border-[#302a22] bg-[#0d0f14]/85 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 px-3 pt-3 text-[10px] font-bold uppercase tracking-[.24em] text-[#a78b56]">
            Application System
          </div>

          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-all lg:w-full ${
                    tab === t.id
                      ? 'border border-[#d4a64e]/40 bg-[#a77b31]/20 text-[#f5d48c]'
                      : 'border border-transparent text-[#a4a6af] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  {t.label}
                  {tab === t.id && (
                    <ArrowRight size={13} className="ml-auto hidden lg:block" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-10 hidden rounded-xl border border-[#3b3327] bg-[#181914] p-4 lg:block">
            <Sparkles className="mb-2 text-[#d9b269]" />
            <div className="text-xs font-bold">CYBER PREMIUM</div>
            <p className="mt-2 text-[11px] leading-5 text-[#9698a1]">
              Customize your recruitment system, questions, roles,
              channels and Discord application panel.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 w-full p-4 md:p-6 xl:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full min-w-0 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[#d8ae59]/35 bg-[#d8ae59]/10 p-3">
                  <ActiveIcon className="size-5 text-[#f0c56e]" />
                </div>

                <div>
                  <h2 className="text-xl font-bold md:text-2xl">
                    {activeTab.label}
                  </h2>
                  <p className="text-xs text-[#999ba5]">
                    {tab === 'designer'
                      ? 'Design your Discord panel and customize the Apply button.'
                      : tab === 'questions'
                        ? 'Manage up to 10 recruitment questions.'
                        : tab === 'roles'
                          ? 'Configure automatic application status roles.'
                          : tab === 'staff'
                            ? 'Select authorized reviewer roles.'
                            : tab === 'channels'
                              ? 'Configure application and review channels.'
                              : tab === 'applications'
                                ? 'Manage submitted applications.'
                                : 'Recruitment system overview.'}
                  </p>
                </div>
              </div>

              {/* OVERVIEW */}
              {tab === 'overview' && (
                <>
                  {selectedId !== 'legacy' && (
                    <div className={card}>
                      <Field label="Application Name (you choose any name)">
                        <input className={input} value={config.applicationName || ''}
                          onChange={e => change('applicationName', e.target.value)} />
                      </Field>
                      <p className="mt-3 text-xs text-[#d9b366]">This is an independent draft. It will not affect the original V10 application.</p>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                    {[
                      {
                        label: 'Configured Questions',
                        value: config.questions.length,
                        icon: ListChecks
                      },
                      {
                        label: 'Required Questions',
                        value: config.questions.filter(q => q.required).length,
                        icon: CheckCircle2
                      },
                      {
                        label: 'Reviewer Roles',
                        value: config.reviewers.length,
                        icon: ShieldCheck
                      },
                      {
                        label: 'Channel Setup',
                        value: `${configuredChannels}/2`,
                        icon: Hash
                      }
                    ].map(s => {
                      const Icon = s.icon
                      return (
                        <div key={s.label} className={card}>
                          <Icon className="mb-5 text-[#e5b960]" size={23} />
                          <div className="text-3xl font-black text-[#f3cb7b]">
                            {s.value}
                          </div>
                          <div className="mt-2 text-xs text-[#a2a4ad]">
                            {s.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className={card}>
                    <h3 className="mb-2 text-lg font-bold">
                      Recruitment Configuration
                    </h3>
                    <p className="mb-5 text-sm leading-6 text-[#a4a5ad]">
                      Configure your questions, staff permissions, status
                      roles, Discord channels and application panel.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        className={goldButton}
                        onClick={() => setTab('questions')}
                      >
                        <ListChecks size={16} />
                        Configure Questions
                      </button>

                      <button
                        onClick={() => setTab('designer')}
                        className="rounded-xl border border-[#6c542c] px-5 py-3 text-sm font-bold text-[#e8c37d]"
                      >
                        Open Panel Designer
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* QUESTIONS BUILDER */}
              {tab === 'questions' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: 'Total Questions',
                        value: config.questions.length
                      },
                      {
                        label: 'Required',
                        value: config.questions.filter(q => q.required).length
                      },
                      {
                        label: 'Optional',
                        value: config.questions.filter(q => !q.required).length
                      }
                    ].map(s => (
                      <div key={s.label} className={card}>
                        <div className="text-3xl font-black text-[#edc574]">
                          {s.value}
                        </div>
                        <div className="mt-1 text-xs text-[#a4a5ad]">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={card}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">Manage Questions</h3>
                        <p className="text-xs text-[#999ba5]">
                          {config.questions.length} of 10 available
                        </p>
                      </div>

                      <button
                        disabled={config.questions.length >= 10}
                        onClick={() =>
                          change('questions', [
                            ...config.questions,
                            {
                              id: crypto.randomUUID(),
                              text: 'New question',
                              required: true,
                              type: 'short'
                            }
                          ])
                        }
                        className={goldButton}
                      >
                        <Plus size={15} />
                        Add Question
                      </button>
                    </div>

                    <div className="space-y-3">
                      {config.questions.map((q, i) => (
                        <motion.div
                          layout
                          key={q.id}
                          className="rounded-xl border border-[#343640] bg-[#12161e] p-4"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical size={15} className="shrink-0 text-[#666b76]" />

                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#a77c35] text-xs text-[#efc578]">
                              {i + 1}
                            </span>

                            <input
                              aria-label={`Question ${i + 1}`}
                              className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:text-[#f3cf83]"
                              value={q.text}
                              onChange={e =>
                                change(
                                  'questions',
                                  config.questions.map(x =>
                                    x.id === q.id
                                      ? { ...x, text: e.target.value }
                                      : x
                                  )
                                )
                              }
                            />

                            <button
                              aria-label="Remove question"
                              className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                              onClick={() =>
                                change(
                                  'questions',
                                  config.questions.filter(x => x.id !== q.id)
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <select
                              aria-label="Answer type"
                              value={q.type}
                              onChange={e =>
                                change(
                                  'questions',
                                  config.questions.map(x =>
                                    x.id === q.id
                                      ? {
                                          ...x,
                                          type: e.target.value as Question['type']
                                        }
                                      : x
                                  )
                                )
                              }
                              className="rounded-lg border border-[#353840] bg-[#20252e] px-3 py-2 text-xs"
                            >
                              <option value="short">Short Text</option>
                              <option value="paragraph">Paragraph</option>
                              <option value="yesno">Yes / No</option>
                            </select>

                            <label className="flex items-center gap-2 text-xs text-[#d4b577]">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={e =>
                                  change(
                                    'questions',
                                    config.questions.map(x =>
                                      x.id === q.id
                                        ? { ...x, required: e.target.checked }
                                        : x
                                    )
                                  )
                                }
                              />
                              Required
                            </label>

                            <div className="ml-auto flex gap-2">
                              <button
                                disabled={i === 0}
                                onClick={() => {
                                  const a = [...config.questions]
                                  ;[a[i - 1], a[i]] = [a[i], a[i - 1]]
                                  change('questions', a)
                                }}
                                className="rounded-md border border-[#3a3d43] px-3 py-1 text-xs disabled:opacity-30"
                              >
                                ↑
                              </button>

                              <button
                                disabled={i === config.questions.length - 1}
                                onClick={() => {
                                  const a = [...config.questions]
                                  ;[a[i], a[i + 1]] = [a[i + 1], a[i]]
                                  change('questions', a)
                                }}
                                className="rounded-md border border-[#3a3d43] px-3 py-1 text-xs disabled:opacity-30"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* STAFF ROLES */}
              {tab === 'staff' && (
                <div className={card}>
                  <h3 className="mb-2 font-bold">
                    Authorized Reviewer Roles
                  </h3>
                  <p className="mb-5 text-xs text-[#a4a5ad]">
                    Choose which Discord roles may Accept, Deny or send
                    applicants to Interview.
                  </p>

                  <div className="space-y-2">
                    {roles.length ? (
                      roles
                        .filter(r => r.name !== '@everyone')
                        .map(r => (
                          <label
                            key={r.id}
                            className="flex items-center gap-3 rounded-xl border border-[#34363d] bg-[#12161e] p-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={config.reviewers.includes(r.id)}
                              onChange={e =>
                                change(
                                  'reviewers',
                                  e.target.checked
                                    ? [...config.reviewers, r.id]
                                    : config.reviewers.filter(id => id !== r.id)
                                )
                              }
                            />
                            <ShieldCheck
                              size={16}
                              className="text-[#d9b366]"
                            />
                            {r.name}
                          </label>
                        ))
                    ) : (
                      <p className="text-sm text-[#a4a5ad]">
                        Discord roles unavailable. Check bot connection.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STATUS ROLES */}
              {tab === 'roles' && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(
                      [
                        {
                          key: 'requiredRole',
                          label: 'Required Role to Apply',
                          icon: ShieldCheck
                        },
                        {
                          key: 'pendingRole',
                          label: 'Wait / Pending Role',
                          icon: Clock3
                        },
                        {
                          key: 'acceptedRole',
                          label: 'Accepted Role',
                          icon: CheckCircle2
                        },
                        {
                          key: 'deniedRole',
                          label: 'Denied Role',
                          icon: XCircle
                        },
                        {
                          key: 'interviewRole',
                          label: 'Interview Role',
                          icon: Mic
                        }
                      ] as const
                    ).map(s => {
                      const Icon = s.icon
                      return (
                        <div className={card} key={s.key}>
                          <div className="mb-4 flex items-center gap-2 font-semibold">
                            <Icon size={18} className="text-[#e5b960]" />
                            {s.label}
                          </div>

                          {roleSelect(
                            config[s.key],
                            v => change(s.key, v)
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {selectedId !== 'legacy' && (
                    <div className={`${card} space-y-4`}>
                      <h3 className="font-bold">Staff Button Role Actions</h3>
                      <p className="text-xs text-[#a4a5ad]">Configure roles added or removed for each decision. Bot enforcement will be connected later.</p>
                      {(['accept', 'deny', 'interview', 'delete'] as const).map(action => {
                        const actions = config.actionRoles || emptyActions()
                        return (
                          <div key={action} className="rounded-xl border border-[#343640] p-4">
                            <h4 className="mb-3 text-sm font-bold capitalize text-[#edc574]">{action}</h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {(['add', 'remove'] as const).map(kind => (
                                <Field key={kind} label={`${kind === 'add' ? 'Give' : 'Remove'} Roles`}>
                                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#353840] p-3">
                                    {roles.filter(r => r.name !== '@everyone').map(r => (
                                      <label key={r.id} className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={actions[action][kind].includes(r.id)}
                                          onChange={e => {
                                            const updated = structuredClone(actions)
                                            updated[action][kind] = e.target.checked
                                              ? [...updated[action][kind], r.id]
                                              : updated[action][kind].filter(id => id !== r.id)
                                            change('actionRoles', updated)
                                          }} />{r.name}
                                      </label>
                                    ))}
                                  </div>
                                </Field>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className={card}>
                    <h3 className="mb-3 font-bold">
                      Automatic Role Workflow
                    </h3>
                    <p className="text-sm leading-7 text-[#a4a5ad]">
                      Apply → Wait Role → Staff Review → Accepted,
                      Interview or Denied Role.
                    </p>
                    <p className="mt-3 text-xs text-[#d7b46c]">
                      Role changes require the Discord bot decision
                      handler and Manage Roles permission.
                    </p>
                  </div>
                </>
              )}

              {/* CHANNEL SETTINGS */}
              {tab === 'channels' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={card}>
                    <Hash className="mb-3 text-[#e5b960]" />

                    <Field label="Application Panel Channel">
                      {channelSelect(
                        config.applyChannel,
                        v => change('applyChannel', v)
                      )}
                    </Field>

                    <p className="mt-3 text-xs text-[#999ba5]">
                      The Discord channel where members see your Apply button.
                    </p>
                  </div>

                  <div className={card}>
                    <Inbox className="mb-3 text-[#e5b960]" />

                    <Field label="Staff Review Channel">
                      {channelSelect(
                        config.reviewChannel,
                        v => change('reviewChannel', v)
                      )}
                    </Field>

                    <p className="mt-3 text-xs text-[#999ba5]">
                      Submitted answers and staff review actions appear here.
                    </p>
                  </div>
                </div>
              )}

              {/* APPLICATIONS */}
              {tab === 'applications' && (
                <div className={`${card} flex flex-col items-center py-16 text-center`}>
                  <Inbox size={44} className="mb-4 text-[#dcb25d]" />

                  <h3 className="text-lg font-bold">
                    Application Inbox
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-[#a4a5ad]">
                    Applications submitted through Discord will be
                    managed here after the application listing and
                    decision APIs are connected.
                  </p>

                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#5c4828] bg-[#dcb25d]/10 px-4 py-2 text-xs text-[#e6c37e]">
                    <AlertCircle size={15} />
                    Review API integration required
                  </div>
                </div>
              )}

              {/* PANEL DESIGNER */}
              {tab === 'designer' && (
                <div className="space-y-5">
                  <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    {/* DESIGN CONTROLS */}
                    <div className="min-w-0 space-y-5">
                      <div className={`${card} space-y-5`}>
                        <div className="flex items-center gap-2">
                          <Palette size={19} className="text-[#e5b960]" />
                          <h3 className="font-bold">
                            Embed Content
                          </h3>
                        </div>

                        <Field label="Panel Title">
                          <input
                            className={input}
                            value={config.panelTitle}
                            maxLength={120}
                            onChange={e =>
                              change('panelTitle', e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Panel Description">
                          <textarea
                            className={`${input} min-h-36 resize-y`}
                            value={config.panelDescription}
                            maxLength={1000}
                            onChange={e =>
                              change('panelDescription', e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Embed Footer">
                          <input
                            className={input}
                            value={config.panelFooter}
                            maxLength={200}
                            onChange={e =>
                              change('panelFooter', e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Embed Accent Color">
                          <div className="flex gap-3">
                            <input
                              type="color"
                              aria-label="Embed color picker"
                              value={
                                /^#[0-9a-fA-F]{6}$/.test(config.panelColor)
                                  ? config.panelColor
                                  : '#D9AC55'
                              }
                              onChange={e =>
                                change('panelColor', e.target.value)
                              }
                              className="h-12 w-16 cursor-pointer rounded-lg border border-[#3a3529] bg-transparent p-1"
                            />

                            <input
                              className={input}
                              value={config.panelColor}
                              maxLength={7}
                              onChange={e =>
                                change('panelColor', e.target.value)
                              }
                            />
                          </div>
                        </Field>
                      </div>

                      {/* IMAGES */}
                      <div className={`${card} space-y-5`}>
                        <div className="flex items-center gap-2">
                          <ImageIcon size={19} className="text-[#e5b960]" />
                          <h3 className="font-bold">
                            Panel Images
                          </h3>
                        </div>

                        <Field label="Thumbnail Image — Right Side">
                          <input
                            type="url"
                            className={input}
                            placeholder="https://example.com/logo.png"
                            value={config.panelThumbnail}
                            onChange={e =>
                              change('panelThumbnail', e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Banner Image — Bottom">
                          <input
                            type="url"
                            className={input}
                            placeholder="https://example.com/banner.png"
                            value={config.panelBanner}
                            onChange={e =>
                              change('panelBanner', e.target.value)
                            }
                          />
                        </Field>

                        <p className="text-xs leading-5 text-[#999ba5]">
                          Use publicly accessible image URLs. The thumbnail
                          appears on the right, and the banner appears below
                          the embed description.
                        </p>
                      </div>

                      {/* BUTTON DESIGNER */}
                      <div className={`${card} space-y-5`}>
                        <div className="flex items-center gap-2">
                          <Sparkles size={19} className="text-[#e5b960]" />
                          <h3 className="font-bold">
                            Apply Button Designer
                          </h3>
                        </div>

                        <Field label="Button Text">
                          <input
                            className={input}
                            value={config.buttonText}
                            maxLength={80}
                            placeholder="Apply Now"
                            onChange={e =>
                              change('buttonText', e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Button Emoji">
                          <input
                            className={input}
                            value={config.buttonEmoji}
                            placeholder="📝"
                            onChange={e =>
                              change('buttonEmoji', e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Discord Button Color">
                          <div className="grid grid-cols-2 gap-3">
                            {(
                              [
                                { key: 'primary', name: 'Blue' },
                                { key: 'success', name: 'Green' },
                                { key: 'danger', name: 'Red' },
                                { key: 'secondary', name: 'Gray' }
                              ] as const
                            ).map(c => (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() =>
                                  change('buttonColor', c.key)
                                }
                                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                                  config.buttonColor === c.key
                                    ? 'border-[#e8bd67] ring-2 ring-[#e8bd67]/20'
                                    : 'border-[#3b3d45]'
                                }`}
                                style={{
                                  backgroundColor: buttonColors[c.key],
                                  color: '#fff'
                                }}
                              >
                                {config.buttonColor === c.key && (
                                  <CheckCircle2 size={14} />
                                )}
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </Field>

                        <div className="rounded-xl border border-[#3d3528] bg-[#0c0e13] p-4">
                          <p className="mb-3 text-xs font-semibold text-[#d5b674]">
                            Button Preview
                          </p>

                          <div
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-white"
                            style={{
                              backgroundColor:
                                buttonColors[config.buttonColor]
                            }}
                          >
                            <span>{config.buttonEmoji}</span>
                            <span>{config.buttonText || 'Apply Now'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LIVE PREVIEW */}
                    <div className="min-w-0">
                      <div className={`${card} space-y-5 2xl:sticky 2xl:top-5`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-bold">
                            <Eye size={18} className="text-[#e4b960]" />
                            Live Discord Preview
                          </div>

                          <span className="rounded-lg border border-[#5a4526] bg-[#d8ad57]/10 px-3 py-1 text-[10px] font-bold text-[#e8c37d]">
                            LIVE PREVIEW
                          </span>
                        </div>

                        <div className="rounded-xl bg-[#313338] p-4 md:p-5">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#111319]">
                              <Crown size={22} className="text-[#e5b960]" />
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  CYBER ORGANIZATION
                                </span>
                                <span className="rounded bg-[#5865F2] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  BOT
                                </span>
                              </div>
                              <p className="text-[10px] text-[#a9aab1]">
                                Application System
                              </p>
                            </div>
                          </div>

                          <div
                            className="min-w-0 overflow-hidden rounded-r-md border-l-4 bg-[#2b2d31] p-4"
                            style={{
                              borderLeftColor:
                                /^#[0-9a-fA-F]{6}$/.test(config.panelColor)
                                  ? config.panelColor
                                  : '#D9AC55'
                            }}
                          >
                            <div className="flex items-start gap-4">
                              <div className="min-w-0 flex-1">
                                <h3 className="break-words text-base font-bold text-white">
                                  {config.panelTitle || 'CYBER ORGANIZATION'}
                                </h3>

                                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#dbdee1]">
                                  {config.panelDescription}
                                </p>
                              </div>

                              {isValidImageUrl(config.panelThumbnail) &&
                                config.panelThumbnail && (
                                  <img
                                    src={config.panelThumbnail}
                                    alt="Panel thumbnail"
                                    className="size-16 shrink-0 rounded-lg object-cover sm:size-20"
                                  />
                                )}
                            </div>

                            {isValidImageUrl(config.panelBanner) &&
                              config.panelBanner && (
                                <img
                                  src={config.panelBanner}
                                  alt="Panel banner"
                                  className="mt-5 max-h-[360px] w-full rounded-lg object-contain"
                                />
                              )}

                            {config.panelFooter && (
                              <div className="mt-5 border-t border-white/10 pt-3 text-[11px] text-[#aeb1b8]">
                                {config.panelFooter}
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <div
                              className="inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
                              style={{
                                backgroundColor:
                                  buttonColors[config.buttonColor]
                              }}
                            >
                              {config.buttonEmoji && (
                                <span>{config.buttonEmoji}</span>
                              )}
                              <span>{config.buttonText || 'Apply Now'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#3c3426] bg-[#111319] p-4">
                          <h4 className="mb-3 text-sm font-bold">
                            Publishing Destination
                          </h4>

                          <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#a4a5ad]">
                                Application Channel
                              </span>
                              <span className="max-w-[55%] truncate text-right text-[#e8c37d]">
                                {channels.find(c => c.id === config.applyChannel)?.name
                                  ? `#${channels.find(c => c.id === config.applyChannel)?.name}`
                                  : 'Not configured'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#a4a5ad]">
                                Review Channel
                              </span>
                              <span className="max-w-[55%] truncate text-right text-[#e8c37d]">
                                {channels.find(c => c.id === config.reviewChannel)?.name
                                  ? `#${channels.find(c => c.id === config.reviewChannel)?.name}`
                                  : 'Not configured'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#a4a5ad]">
                                Questions
                              </span>
                              <span className="text-white">
                                {config.questions.length}/10
                              </span>
                            </div>
                          </div>
                        </div>

                        {dirty && (
                          <div className="flex items-center gap-2 rounded-lg border border-[#69502a] bg-[#d6a84f]/10 px-3 py-3 text-xs text-[#eac47d]">
                            <AlertCircle size={15} />
                            You have unsaved changes.
                          </div>
                        )}

                        <button
                          onClick={() => void publishPanel()}
                          disabled={publishing || busy || !loaded || selectedId !== 'legacy'}
                          className={`${goldButton} w-full`}
                        >
                          {publishing ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <Send size={17} />
                          )}
                          {publishing
                            ? 'Publishing...'
                            : selectedId !== 'legacy' ? 'Publish Requires Multi-Form API' : 'Publish Application Panel'}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => void save()}
                            disabled={busy || publishing}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#65502e] px-3 py-3 text-xs font-bold text-[#e6c27d] disabled:opacity-40"
                          >
                            <Save size={15} />
                            Save Design
                          </button>

                          <button
                            onClick={() => {
                              change('panelColor', '#D9AC55')
                              change('buttonColor', 'success')
                              change('buttonText', 'Apply Now')
                              change('buttonEmoji', '📝')
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#393a40] px-3 py-3 text-xs font-bold text-[#bfc0c6]"
                          >
                            <RotateCcw size={15} />
                            Reset Style
                          </button>
                        </div>

                        <p className="text-center text-[11px] leading-5 text-[#92949d]">
                          Publishing requires the application publish API
                          and KataBump bot integration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#342e25] pt-5 text-[11px] text-[#8d919b]">
            <span>CYBER ORGANIZATION V10 · APPLICATION STUDIO</span>

            <span className="flex items-center gap-2">
              <Settings2 size={13} />
              {loaded ? 'Configuration loaded' : 'Loading...'}
              {dirty && ' · Unsaved changes'}
              {selectedId !== 'legacy' && ' · Browser-only draft'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}
