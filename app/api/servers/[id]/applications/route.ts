import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getSession } from '@/lib/server/session'
import { fetchUserGuilds } from '@/lib/server/discord'
import { canManageGuild } from '@/lib/discord-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }
const snowflake = /^\d{17,20}$/
const noStore = { 'Cache-Control': 'no-store' }
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore })

type Question = { id: string; text: string; required: boolean; type: 'short' | 'paragraph' | 'yesno' }
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
}
const defaults: Config = {
  questions: [], panelTitle: 'CYBER ORGANIZATION',
  panelDescription: 'Your journey begins here. Apply to join our organization.',
  applyChannel: '', reviewChannel: '', requiredRole: '', pendingRole: '',
  acceptedRole: '', deniedRole: '', interviewRole: '', reviewers: [],
}
function validate(input: unknown): Config | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const x = input as Record<string, unknown>
  if (!Array.isArray(x.questions) || x.questions.length > 10) return null
  const ids = new Set<string>()
  const questions: Question[] = []
  for (const raw of x.questions) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const q = raw as Record<string, unknown>
    if (typeof q.id !== 'string' || !q.id || q.id.length > 100 || ids.has(q.id)) return null
    if (typeof q.text !== 'string' || !q.text.trim() || q.text.length > 400) return null
    if (typeof q.required !== 'boolean' || !['short', 'paragraph', 'yesno'].includes(String(q.type))) return null
    ids.add(q.id)
    questions.push({ id: q.id, text: q.text.trim(), required: q.required, type: q.type as Question['type'] })
  }
  const strings = ['panelTitle', 'panelDescription', 'applyChannel', 'reviewChannel', 'requiredRole', 'pendingRole', 'acceptedRole', 'deniedRole', 'interviewRole'] as const
  for (const key of strings) if (typeof x[key] !== 'string') return null
  if ((x.panelTitle as string).length > 120 || (x.panelDescription as string).length > 1000) return null
  for (const key of strings.slice(2)) if (x[key] !== '' && !snowflake.test(x[key] as string)) return null
  if (!Array.isArray(x.reviewers) || x.reviewers.length > 100 || x.reviewers.some(v => typeof v !== 'string' || !snowflake.test(v))) return null
  return {
    questions, panelTitle: (x.panelTitle as string).trim(), panelDescription: x.panelDescription as string,
    applyChannel: x.applyChannel as string, reviewChannel: x.reviewChannel as string,
    requiredRole: x.requiredRole as string, pendingRole: x.pendingRole as string,
    acceptedRole: x.acceptedRole as string, deniedRole: x.deniedRole as string,
    interviewRole: x.interviewRole as string, reviewers: [...new Set(x.reviewers as string[])],
  }
}
async function authorize(id: string) {
  const session = await getSession()
  if (!session) return { error: fail('unauthenticated', 401) }
  const guilds = await fetchUserGuilds(session.accessToken)
  if (!guilds.some(g => g.id === id && canManageGuild(g))) return { error: fail('forbidden', 403) }
  return { error: null }
}
async function db() {
  if (!process.env.DATABASE_URL) return null
  const sql = neon(process.env.DATABASE_URL)
  await sql`CREATE TABLE IF NOT EXISTS cyber_application_configs (
    guild_id TEXT PRIMARY KEY,
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
  return sql
}
export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params
  if (!snowflake.test(id)) return fail('invalid_guild_id', 400)
  try {
    const auth = await authorize(id)
    if (auth.error) return auth.error
    const sql = await db()
    if (!sql) return fail('database_not_configured', 503)
    const rows = await sql`SELECT config FROM cyber_application_configs WHERE guild_id = ${id} LIMIT 1`
    return NextResponse.json({ ok: true, config: rows.length ? { ...defaults, ...(rows[0].config as object) } : defaults }, { headers: noStore })
  } catch (error) {
    console.error('[CYBER V10 config GET]', error)
    return fail('configuration_unavailable', 503)
  }
}
export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params
  if (!snowflake.test(id)) return fail('invalid_guild_id', 400)
  try {
    const auth = await authorize(id)
    if (auth.error) return auth.error
    let payload: unknown
    try { payload = await request.json() } catch { return fail('invalid_json', 400) }
    const config = validate(payload)
    if (!config) return fail('invalid_application_configuration', 400)
    const sql = await db()
    if (!sql) return fail('database_not_configured', 503)
    await sql`INSERT INTO cyber_application_configs (guild_id, config, updated_at)
      VALUES (${id}, ${JSON.stringify(config)}::jsonb, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`
    return NextResponse.json({ ok: true, config }, { headers: noStore })
  } catch (error) {
    console.error('[CYBER V10 config PUT]', error)
    return fail('configuration_save_failed', 503)
  }
}
