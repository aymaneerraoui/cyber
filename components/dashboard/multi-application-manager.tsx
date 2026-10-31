
'use client'

import { useState } from 'react'
import {
  Crown, Plus, Trash2, Copy, Pencil, ArrowLeft,
  FileText, Settings2, ShieldCheck, Hash, Palette,
  Save, AlertTriangle, CheckCircle2, Eye, ListChecks
} from 'lucide-react'
import { toast } from 'sonner'

type Question = {
  id: string
  text: string
  type: 'short' | 'paragraph' | 'yesno'
  required: boolean
}

type FormConfig = {
  id: string
  name: string
  emoji: string
  description: string
  enabled: boolean
  questions: Question[]
  reviewChannel: string
  requiredRole: string
  pendingRole: string
  acceptedRole: string
  deniedRole: string
  interviewRole: string
  reviewerRoles: string[]
  buttonText: string
  buttonEmoji: string
  buttonColor: 'primary' | 'success' | 'danger' | 'secondary'
}

type Studio = {
  id: string
  name: string
  description: string
  enabled: boolean
  applyChannel: string
  panelTitle: string
  panelDescription: string
  panelThumbnail: string
  panelBanner: string
  panelFooter: string
  panelColor: string
  menuPlaceholder: string
  forms: FormConfig[]
}

const uid = () => crypto.randomUUID()

function newForm(name = 'New Application'): FormConfig {
  return {
    id: uid(),
    name,
    emoji: '📝',
    description: 'Submit your application',
    enabled: true,
    questions: [
      {
        id: uid(),
        text: 'Why do you want to join?',
        type: 'paragraph',
        required: true
      }
    ],
    reviewChannel: '',
    requiredRole: '',
    pendingRole: '',
    acceptedRole: '',
    deniedRole: '',
    interviewRole: '',
    reviewerRoles: [],
    buttonText: 'Apply Now',
    buttonEmoji: '📝',
    buttonColor: 'success'
  }
}

function newStudio(name = 'New Application Studio'): Studio {
  return {
    id: uid(),
    name,
    description: 'Custom recruitment system',
    enabled: true,
    applyChannel: '',
    panelTitle: 'CYBER ORGANIZATION',
    panelDescription: 'Select an application below to continue.',
    panelThumbnail: '',
    panelBanner: '',
    panelFooter: 'CYBER ORGANIZATION • RECRUITMENT',
    panelColor: '#D9AC55',
    menuPlaceholder: 'Make a selection',
    forms: []
  }
}

const field =
  'w-full min-w-0 rounded-xl border border-[#49402e] bg-[#0d1017] px-4 py-3 text-sm text-white outline-none focus:border-[#e0b45d]'

const panel =
  'rounded-2xl border border-[#383126] bg-[#14171e] p-5'

const gold =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#e5bb68] px-4 py-3 text-sm font-bold text-[#19150e] hover:bg-[#f2d18c] disabled:opacity-40'

const secondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#51432e] px-4 py-3 text-sm font-semibold text-[#e9c37a] hover:bg-[#d5a952]/10'

const colors = {
  primary: '#5865F2',
  success: '#248046',
  danger: '#DA373C',
  secondary: '#4E5058'
}

function Label({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-[#b4a78c]">
        {title}
      </span>
      {children}
    </label>
  )
}

export function MultiApplicationManager({
  serverId
}: {
  serverId: string
}) {
  const [studios, setStudios] = useState<Studio[]>([])
  const [studioId, setStudioId] = useState<string | null>(null)
  const [formId, setFormId] = useState<string | null>(null)
  const [section, setSection] = useState<
    'general' | 'panel' | 'questions' | 'roles'
  >('general')

  const studio = studios.find(s => s.id === studioId)
  const form = studio?.forms.find(f => f.id === formId)

  function updateStudio(patch: Partial<Studio>) {
    setStudios(old =>
      old.map(s => s.id === studioId ? { ...s, ...patch } : s)
    )
  }

  function updateForm(patch: Partial<FormConfig>) {
    if (!studio) return
    updateStudio({
      forms: studio.forms.map(f =>
        f.id === formId ? { ...f, ...patch } : f
      )
    })
  }

  function createStudio() {
    const name = window.prompt(
      'Application Studio name:',
      'New Application Studio'
    )

    if (!name?.trim()) return

    const item = newStudio(name.trim())
    setStudios(old => [...old, item])
    setStudioId(item.id)
    setFormId(null)
    setSection('general')
  }

  function duplicateStudio(item: Studio) {
    const copy: Studio = {
      ...structuredClone(item),
      id: uid(),
      name: `${item.name} (Copy)`,
      forms: item.forms.map(f => ({
        ...f,
        id: uid(),
        questions: f.questions.map(q => ({ ...q, id: uid() }))
      }))
    }

    setStudios(old => [...old, copy])
    toast.success('Studio duplicated in draft')
  }

  function deleteStudio(item: Studio) {
    if (!window.confirm(`Delete "${item.name}" from this draft?`)) {
      return
    }

    setStudios(old => old.filter(s => s.id !== item.id))
    setStudioId(null)
    setFormId(null)
  }

  function createForm() {
    if (!studio) return

    const name = window.prompt(
      'Application name:',
      'Apply Mafia'
    )

    if (!name?.trim()) return

    const item = newForm(name.trim())

    updateStudio({
      forms: [...studio.forms, item]
    })

    setFormId(item.id)
    setSection('questions')
  }

  function deleteForm() {
    if (!studio || !form) return

    if (!window.confirm(`Delete "${form.name}" from this draft?`)) {
      return
    }

    updateStudio({
      forms: studio.forms.filter(f => f.id !== form.id)
    })

    setFormId(null)
  }

  function addQuestion() {
    if (!form || form.questions.length >= 10) return

    updateForm({
      questions: [
        ...form.questions,
        {
          id: uid(),
          text: 'New question',
          type: 'short',
          required: true
        }
      ]
    })
  }

  function editQuestion(id: string, patch: Partial<Question>) {
    if (!form) return

    updateForm({
      questions: form.questions.map(q =>
        q.id === id ? { ...q, ...patch } : q
      )
    })
  }

  function selectSection(
    next: 'general' | 'panel' | 'questions' | 'roles'
  ) {
    setSection(next)
  }

  return (
    <div className="w-full min-w-0 space-y-6 rounded-[26px] border border-[#584321] bg-[#090b10] p-4 text-white md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3d3426] pb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#d9ac55]/50 bg-[#d9ac55]/10 p-3">
            <Crown className="text-[#f1ca78]" size={28} />
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[.25em] text-[#dcb366]">
              CYBER ORGANIZATION · V11
            </p>
            <h1 className="text-xl font-black md:text-3xl">
              MULTI-APPLICATION <span className="text-[#e7bb68]">STUDIO</span>
            </h1>
            <p className="text-xs text-[#9699a3]">
              Independent studios, forms and recruitment workflows
            </p>
          </div>
        </div>

        <button className={gold} onClick={createStudio}>
          <Plus size={17} />
          New Application Studio
        </button>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-[#6b5128] bg-[#4c3818]/20 p-4 text-xs leading-5 text-[#e9c681]">
        <AlertTriangle size={17} className="shrink-0" />
        <span>
          V11 draft editor. Changes are currently held only in this
          browser page. Do not use this for live recruitment yet.
          Neon persistence and Discord publishing are not connected.
          Your existing V10 system remains unchanged.
        </span>
      </div>

      {!studio && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Your Application Studios</h2>
              <p className="text-sm text-[#9699a3]">
                Create separate recruitment systems for any department.
              </p>
            </div>
            <span className="text-sm text-[#dcb366]">
              {studios.length} Studios
            </span>
          </div>

          {studios.length === 0 ? (
            <div className={`${panel} py-16 text-center`}>
              <Crown size={42} className="mx-auto mb-4 text-[#e5b960]" />
              <h3 className="text-lg font-bold">Create Your First Studio</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#a2a4ae]">
                Create a studio, add Mafia, LSPD, Staff or any other
                application forms, and customize each one independently.
              </p>
              <button className={`${gold} mt-6`} onClick={createStudio}>
                <Plus size={17} />
                Create New Studio
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {studios.map(s => (
                <div key={s.id} className={panel}>
                  <div className="flex items-start justify-between gap-3">
                    <Crown className="text-[#e7bb68]" />
                    <span className={`rounded-lg px-2 py-1 text-xs ${
                      s.enabled
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {s.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold">{s.name}</h3>
                  <p className="mt-2 text-sm text-[#9ea1aa]">
                    {s.description}
                  </p>

                  <div className="mt-5 text-xs text-[#e6c27a]">
                    {s.forms.length} Applications
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      className={gold}
                      onClick={() => {
                        setStudioId(s.id)
                        setFormId(null)
                        setSection('general')
                      }}
                    >
                      <Pencil size={15} />
                      Open
                    </button>

                    <button
                      className={secondary}
                      onClick={() => duplicateStudio(s)}
                      aria-label="Duplicate studio"
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      className={secondary}
                      onClick={() => deleteStudio(s)}
                      aria-label="Delete studio"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {studio && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={secondary}
              onClick={() => {
                if (formId) {
                  setFormId(null)
                } else {
                  setStudioId(null)
                }
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold">
                {form ? `${form.emoji} ${form.name}` : studio.name}
              </h2>
              <p className="text-xs text-[#a4a5ad]">
                {form ? 'Application Form Editor' : 'Studio Configuration'}
              </p>
            </div>
          </div>

          {!form && (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className={`${panel} space-y-4`}>
                  <h3 className="flex items-center gap-2 font-bold">
                    <Settings2 size={18} className="text-[#e7bb68]" />
                    Studio Settings
                  </h3>

                  <Label title="Studio Name">
                    <input
                      className={field}
                      value={studio.name}
                      onChange={e =>
                        updateStudio({ name: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Studio Description">
                    <textarea
                      className={field}
                      value={studio.description}
                      onChange={e =>
                        updateStudio({ description: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Application Panel Channel ID">
                    <input
                      className={field}
                      value={studio.applyChannel}
                      placeholder="Discord channel ID"
                      onChange={e =>
                        updateStudio({ applyChannel: e.target.value })
                      }
                    />
                  </Label>

                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={studio.enabled}
                      onChange={e =>
                        updateStudio({ enabled: e.target.checked })
                      }
                    />
                    Studio Enabled
                  </label>
                </div>

                <div className={`${panel} space-y-4`}>
                  <h3 className="flex items-center gap-2 font-bold">
                    <Palette size={18} className="text-[#e7bb68]" />
                    Studio Panel Designer
                  </h3>

                  <Label title="Panel Title">
                    <input
                      className={field}
                      value={studio.panelTitle}
                      onChange={e =>
                        updateStudio({ panelTitle: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Panel Description">
                    <textarea
                      className={field}
                      value={studio.panelDescription}
                      onChange={e =>
                        updateStudio({ panelDescription: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Dropdown Placeholder">
                    <input
                      className={field}
                      value={studio.menuPlaceholder}
                      onChange={e =>
                        updateStudio({ menuPlaceholder: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Thumbnail Image URL">
                    <input
                      className={field}
                      value={studio.panelThumbnail}
                      placeholder="https://example.com/logo.png"
                      onChange={e =>
                        updateStudio({ panelThumbnail: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Banner Image URL">
                    <input
                      className={field}
                      value={studio.panelBanner}
                      placeholder="https://example.com/banner.png"
                      onChange={e =>
                        updateStudio({ panelBanner: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Embed Footer">
                    <input
                      className={field}
                      value={studio.panelFooter}
                      onChange={e =>
                        updateStudio({ panelFooter: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Embed Color">
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(studio.panelColor)
                          ? studio.panelColor
                          : '#D9AC55'}
                        onChange={e =>
                          updateStudio({ panelColor: e.target.value })
                        }
                        className="h-12 w-16"
                      />
                      <input
                        className={field}
                        value={studio.panelColor}
                        onChange={e =>
                          updateStudio({ panelColor: e.target.value })
                        }
                      />
                    </div>
                  </Label>
                </div>
              </div>

              <div className={panel}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">
                      Application Forms
                    </h3>
                    <p className="text-xs text-[#9ea1aa]">
                      Each form has independent questions, roles and review channel.
                    </p>
                  </div>

                  <button className={gold} onClick={createForm}>
                    <Plus size={16} />
                    Add Application
                  </button>
                </div>

                {studio.forms.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#5b482c] p-10 text-center text-sm text-[#a3a5ae]">
                    No applications yet. Add your first form.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {studio.forms.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setFormId(f.id)
                          setSection('questions')
                        }}
                        className="rounded-xl border border-[#48402f] bg-[#101319] p-4 text-left hover:border-[#d6aa56]"
                      >
                        <div className="mb-3 text-2xl">{f.emoji}</div>
                        <div className="font-bold">{f.name}</div>
                        <div className="mt-2 text-xs text-[#a4a5ad]">
                          {f.questions.length} Questions
                        </div>
                        <div className="mt-3 text-xs text-[#e5bb68]">
                          Edit Application →
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={panel}>
                <h3 className="mb-4 flex items-center gap-2 font-bold">
                  <Eye size={17} className="text-[#e7bb68]" />
                  Discord Dropdown Preview
                </h3>

                <div className="max-w-xl rounded-xl bg-[#313338] p-4">
                  <div
                    className="rounded-r-md border-l-4 bg-[#2b2d31] p-4"
                    style={{
                      borderLeftColor:
                        /^#[0-9a-fA-F]{6}$/.test(studio.panelColor)
                          ? studio.panelColor
                          : '#D9AC55'
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold">
                          {studio.panelTitle}
                        </h4>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-[#dbdee1]">
                          {studio.panelDescription}
                        </p>
                      </div>

                      {studio.panelThumbnail.startsWith('https://') && (
                        <img
                          src={studio.panelThumbnail}
                          alt="Thumbnail"
                          className="size-16 rounded-lg object-cover"
                        />
                      )}
                    </div>

                    {studio.panelBanner.startsWith('https://') && (
                      <img
                        src={studio.panelBanner}
                        alt="Banner"
                        className="mt-4 w-full rounded-lg"
                      />
                    )}

                    <p className="mt-4 text-xs text-[#aeb1b8]">
                      {studio.panelFooter}
                    </p>
                  </div>

                  <select
                    className="mt-3 w-full rounded-lg border border-[#555761] bg-[#202127] p-3 text-sm text-white"
                    defaultValue=""
                    key={`${studio.id}-${studio.forms.length}`}
                  >
                    <option value="" disabled>
                      {studio.menuPlaceholder}
                    </option>
                    {studio.forms
                      .filter(f => f.enabled)
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          {f.emoji} {f.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {form && (
            <>
              <div className="flex flex-wrap gap-2">
                {([
                  ['general', 'General', Settings2],
                  ['questions', 'Questions', ListChecks],
                  ['roles', 'Roles & Channel', ShieldCheck],
                  ['panel', 'Button Designer', Palette]
                ] as const).map(([key, title, Icon]) => (
                  <button
                    key={key}
                    onClick={() => selectSection(key)}
                    className={section === key ? gold : secondary}
                  >
                    <Icon size={15} />
                    {title}
                  </button>
                ))}
              </div>

              {section === 'general' && (
                <div className={`${panel} max-w-3xl space-y-5`}>
                  <Label title="Application Name">
                    <input
                      className={field}
                      value={form.name}
                      onChange={e =>
                        updateForm({ name: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Application Emoji">
                    <input
                      className={field}
                      value={form.emoji}
                      onChange={e =>
                        updateForm({ emoji: e.target.value })
                      }
                    />
                  </Label>

                  <Label title="Application Description">
                    <textarea
                      className={field}
                      value={form.description}
                      onChange={e =>
                        updateForm({ description: e.target.value })
                      }
                    />
                  </Label>

                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={e =>
                        updateForm({ enabled: e.target.checked })
                      }
                    />
                    Enable Application
                  </label>

                  <button
                    className="flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-400"
                    onClick={deleteForm}
                  >
                    <Trash2 size={16} />
                    Delete Application
                  </button>
                </div>
              )}

              {section === 'questions' && (
                <div className={panel}>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {form.name} — Questions
                      </h3>
                      <p className="text-xs text-[#a4a5ad]">
                        {form.questions.length}/10 Questions
                      </p>
                    </div>

                    <button
                      className={gold}
                      disabled={form.questions.length >= 10}
                      onClick={addQuestion}
                    >
                      <Plus size={16} />
                      Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.questions.map((q, index) => (
                      <div
                        key={q.id}
                        className="space-y-3 rounded-xl border border-[#3c3d45] bg-[#101319] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#e9c37a]">
                            {index + 1}.
                          </span>

                          <input
                            className={field}
                            value={q.text}
                            onChange={e =>
                              editQuestion(q.id, {
                                text: e.target.value
                              })
                            }
                          />

                          <button
                            className="text-red-400"
                            onClick={() =>
                              updateForm({
                                questions: form.questions.filter(
                                  x => x.id !== q.id
                                )
                              })
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <select
                            className={`${field} max-w-48`}
                            value={q.type}
                            onChange={e =>
                              editQuestion(q.id, {
                                type: e.target.value as Question['type']
                              })
                            }
                          >
                            <option value="short">Short Text</option>
                            <option value="paragraph">Paragraph</option>
                            <option value="yesno">Yes / No</option>
                          </select>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={e =>
                                editQuestion(q.id, {
                                  required: e.target.checked
                                })
                              }
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === 'roles' && (
                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    ['reviewChannel', 'Review Channel ID'],
                    ['requiredRole', 'Required Role ID'],
                    ['pendingRole', 'Wait / Pending Role ID'],
                    ['acceptedRole', 'Accepted Role ID'],
                    ['deniedRole', 'Denied Role ID'],
                    ['interviewRole', 'Interview Role ID']
                  ] as const).map(([key, title]) => (
                    <div className={panel} key={key}>
                      <Label title={title}>
                        <input
                          className={field}
                          value={form[key]}
                          placeholder="Discord ID"
                          onChange={e =>
                            updateForm({ [key]: e.target.value })
                          }
                        />
                      </Label>
                    </div>
                  ))}

                  <div className={`${panel} md:col-span-2`}>
                    <Label title="Reviewer Role IDs (comma separated)">
                      <input
                        className={field}
                        value={form.reviewerRoles.join(', ')}
                        placeholder="Role ID 1, Role ID 2"
                        onChange={e =>
                          updateForm({
                            reviewerRoles: e.target.value
                              .split(',')
                              .map(v => v.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </Label>

                    <p className="mt-3 text-xs text-[#a4a5ad]">
                      These IDs will be used by the future Discord
                      review handler. They do not grant permissions yet.
                    </p>
                  </div>
                </div>
              )}

              {section === 'panel' && (
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className={`${panel} space-y-5`}>
                    <Label title="Apply Button Text">
                      <input
                        className={field}
                        value={form.buttonText}
                        onChange={e =>
                          updateForm({ buttonText: e.target.value })
                        }
                      />
                    </Label>

                    <Label title="Apply Button Emoji">
                      <input
                        className={field}
                        value={form.buttonEmoji}
                        onChange={e =>
                          updateForm({ buttonEmoji: e.target.value })
                        }
                      />
                    </Label>

                    <Label title="Discord Button Color">
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            ['primary', 'Blue'],
                            ['success', 'Green'],
                            ['danger', 'Red'],
                            ['secondary', 'Gray']
                          ] as const
                        ).map(([key, name]) => (
                          <button
                            key={key}
                            className={`rounded-xl border-2 p-3 text-sm font-bold text-white ${
                              form.buttonColor === key
                                ? 'border-[#f0d18b]'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: colors[key] }}
                            onClick={() =>
                              updateForm({ buttonColor: key })
                            }
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </Label>
                  </div>

                  <div className={panel}>
                    <h3 className="mb-5 flex items-center gap-2 font-bold">
                      <Eye size={17} className="text-[#e7bb68]" />
                      Button Preview
                    </h3>

                    <div className="rounded-xl bg-[#313338] p-5">
                      <div className="mb-4 text-sm font-bold">
                        {form.emoji} {form.name}
                      </div>

                      <p className="mb-5 text-sm text-[#c9cbd2]">
                        {form.description}
                      </p>

                      <div
                        className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-bold text-white"
                        style={{
                          backgroundColor: colors[form.buttonColor]
                        }}
                      >
                        {form.buttonEmoji} {form.buttonText}
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-[#a4a5ad]">
                      Discord dropdown options use the application name
                      and emoji. Button styles apply to button-based
                      interactions, not dropdown option colors.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#383126] pt-5 text-xs text-[#92949c]">
        <span>CYBER V11 • MULTI-APPLICATION MANAGER</span>
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#e7bb68]" />
          Draft only — not saved to Neon
        </span>
      </footer>
    </div>
  )
}
