import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }
type Question = { id: string; text: string; required: boolean; type: 'short' | 'paragraph' | 'yesno' }
type Action = 'accept' | 'deny' | 'interview' | 'delete'
type RoleAction = { add: string[]; remove: string[] }
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
  applicationName: string
  actionRoles: Record<Action, RoleAction>
}

const snowflake = /^\d{17,20}$/
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const noStore = { 'Cache-Control': 'no-store' }
const actions: Action[] = ['accept', 'deny', 'interview', 'delete']
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore })
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function stringField(x: Record<string, unknown>, key: string, max: number): string | null {
  const value = x[key]
  return typeof value === 'string' && value.length <= max ? value : null
}

function roleIds(value: unknown, max = 100): string[] | null {
  if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== 'string' || !snowflake.test(v))) return null
  return [...new Set(value)]
}

function imageUrl(value: string): boolean {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return ['https:', 'http:'].includes(parsed.protocol)
  } catch { return false }
}

function validateConfig(input: unknown): Config | null {
  if (!record(input)) return null
  const x = input
  if (!Array.isArray(x.questions) || x.questions.length > 10) return null
  const seen = new Set<string>()
  const questions: Question[] = []
  for (const raw of x.questions) {
    if (!record(raw) || typeof raw.id !== 'string' || !raw.id || raw.id.length > 100 || seen.has(raw.id)) return null
    if (typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 400) return null
    if (typeof raw.required !== 'boolean' || !['short', 'paragraph', 'yesno'].includes(String(raw.type))) return null
    seen.add(raw.id)
    questions.push({ id: raw.id, text: raw.text.trim(), required: raw.required, type: raw.type as Question['type'] })
  }

  const applicationName = stringField(x, 'applicationName', 100)
  const panelTitle = stringField(x, 'panelTitle', 120)
  const panelDescription = stringField(x, 'panelDescription', 1000)
  const panelThumbnail = stringField(x, 'panelThumbnail', 2048)
  const panelBanner = stringField(x, 'panelBanner', 2048)
  const panelFooter = stringField(x, 'panelFooter', 200)
  const panelColor = stringField(x, 'panelColor', 7)
  const buttonText = stringField(x, 'buttonText', 80)
  const buttonEmoji = stringField(x, 'buttonEmoji', 100)
  const buttonColor = x.buttonColor
  if (!applicationName?.trim() || panelTitle === null || panelDescription === null ||
      panelThumbnail === null || panelBanner === null || panelFooter === null ||
      panelColor === null || buttonText === null || buttonEmoji === null ||
      !/^#[0-9a-fA-F]{6}$/.test(panelColor) || !imageUrl(panelThumbnail) || !imageUrl(panelBanner) ||
      !['primary', 'success', 'danger', 'secondary'].includes(String(buttonColor))) return null

  const channelAndRoleKeys = [
    'applyChannel', 'reviewChannel', 'requiredRole', 'pendingRole',
    'acceptedRole', 'deniedRole', 'interviewRole'
  ] as const
  const ids: Record<(typeof channelAndRoleKeys)[number], string> = {
    applyChannel: '', reviewChannel: '', requiredRole: '', pendingRole: '',
    acceptedRole: '', deniedRole: '', interviewRole: ''
  }
  for (const key of channelAndRoleKeys) {
    const value = stringField(x, key, 20)
    if (value === null || (value !== '' && !snowflake.test(value))) return null
    ids[key] = value
  }
  const reviewers = roleIds(x.reviewers)
  if (!reviewers || !record(x.actionRoles)) return null
  const actionRoles = {} as Record<Action, RoleAction>
  for (const action of actions) {
    const item = x.actionRoles[action]
    if (!record(item)) return null
    const add = roleIds(item.add)
    const remove = roleIds(item.remove)
    if (!add || !remove || add.some(id => remove.includes(id))) return null
    actionRoles[action] = { add, remove }
  }

  return {
    questions, applicationName: applicationName.trim(), panelTitle, panelDescription,
    ...ids, reviewers, panelThumbnail, panelBanner, panelFooter, panelColor,
    buttonText, buttonEmoji, buttonColor: buttonColor as Config['buttonColor'], actionRoles
  }
}

async function authorize(guildId: string) {
  if (!snowflake.test(guildId)) return fail('invalid_guild_id', 400)
  const session = await getSession()
  if (!session) return fail('unauthenticated', 401)
  const guilds = await fetchUserGuilds(session.accessToken)
  if (!guilds.some(g => g.id === guildId && canManageGuild(g))) return fail('forbidden', 403)
  return null
}

async function database() {
  if (!process.env.DATABASE_URL) return null
  const sql = neon(process.env.DATABASE_URL)
  await sql`CREATE TABLE IF NOT EXISTS cyber_application_forms (
    guild_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, form_id)
  )`
  return sql
}

function toForm(row: Record<string, unknown>) {
  return { id: row.form_id, name: row.name, config: row.config, createdAt: row.created_at, updatedAt: row.updated_at }
}

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const denied = await authorize(id)
    if (denied) return denied
    const sql = await database()
    if (!sql) return fail('database_not_configured', 503)
    const rows = await sql`SELECT form_id, name, config, created_at, updated_at
      FROM cyber_application_forms WHERE guild_id = ${id} ORDER BY created_at ASC`
    return NextResponse.json({ ok: true, forms: rows.map(row => toForm(row)) }, { headers: noStore })
  } catch (error) {
    console.error('[CYBER forms GET]', error)
    return fail('forms_unavailable', 503)
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const denied = await authorize(id)
    if (denied) return denied
    const payload: unknown = await request.json().catch(() => null)
    if (!record(payload) || typeof payload.id !== 'string' || !uuid.test(payload.id)) return fail('invalid_form_id', 400)
    const config = validateConfig(payload.config)
    if (!config) return fail('invalid_application_configuration', 400)
    const sql = await database()
    if (!sql) return fail('database_not_configured', 503)
    const rows = await sql`INSERT INTO cyber_application_forms (guild_id, form_id, name, config)
      VALUES (${id}, ${payload.id}, ${config.applicationName}, ${JSON.stringify(config)}::jsonb)
      ON CONFLICT (guild_id, form_id) DO NOTHING
      RETURNING form_id, name, config, created_at, updated_at`
    if (!rows.length) return fail('form_already_exists', 409)
    return NextResponse.json({ ok: true, form: toForm(rows[0]) }, { status: 201, headers: noStore })
  } catch (error) {
    console.error('[CYBER forms POST]', error)
    return fail('form_create_failed', 503)
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const denied = await authorize(id)
    if (denied) return denied
    const payload: unknown = await request.json().catch(() => null)
    if (!record(payload) || typeof payload.id !== 'string' || !uuid.test(payload.id)) return fail('invalid_form_id', 400)
    const config = validateConfig(payload.config)
    if (!config) return fail('invalid_application_configuration', 400)
    const sql = await database()
    if (!sql) return fail('database_not_configured', 503)
    const rows = await sql`UPDATE cyber_application_forms
      SET name = ${config.applicationName}, config = ${JSON.stringify(config)}::jsonb, updated_at = NOW()
      WHERE guild_id = ${id} AND form_id = ${payload.id}
      RETURNING form_id, name, config, created_at, updated_at`
    if (!rows.length) return fail('form_not_found', 404)
    return NextResponse.json({ ok: true, form: toForm(rows[0]) }, { headers: noStore })
  } catch (error) {
    console.error('[CYBER forms PUT]', error)
    return fail('form_save_failed', 503)
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params
    const denied = await authorize(id)
    if (denied) return denied
    const formId = request.nextUrl.searchParams.get('id') || ''
    if (!uuid.test(formId)) return fail('invalid_form_id', 400)
    const sql = await database()
    if (!sql) return fail('database_not_configured', 503)
    const rows = await sql`DELETE FROM cyber_application_forms
      WHERE guild_id = ${id} AND form_id = ${formId} RETURNING form_id`
    if (!rows.length) return fail('form_not_found', 404)
    return NextResponse.json({ ok: true, deletedId: formId }, { headers: noStore })
  } catch (error) {
    console.error('[CYBER forms DELETE]', error)
    return fail('form_delete_failed', 503)
  }
}
