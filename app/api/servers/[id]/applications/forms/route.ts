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
