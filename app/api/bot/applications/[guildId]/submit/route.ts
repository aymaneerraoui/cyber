
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { timingSafeEqual, randomUUID } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = {
  params: Promise<{ guildId: string }>
}

const snowflake = /^\d{17,20}$/

type Question = {
  id: string
  text: string
  required: boolean
  type: 'short' | 'paragraph' | 'yesno'
}

type ApplicationConfig = {
  questions: Question[]
  reviewChannel: string
  pendingRole: string
}

function response(error: string, status: number) {
  return NextResponse.json(
    { ok: false, error },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.BOT_API_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || !authorization?.startsWith('Bearer ')) {
    return false
  }

  const expected = Buffer.from(secret, 'utf8')
  const provided = Buffer.from(
    authorization.slice(7),
    'utf8'
  )

  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  )
}

export async function POST(
  request: NextRequest,
  { params }: Context
) {
  if (!authorized(request)) {
    return response('Unauthorized', 401)
  }

  const { guildId } = await params

  if (!snowflake.test(guildId)) {
    return response('Invalid guild ID', 400)
  }

  if (!process.env.DATABASE_URL) {
    return response('Database not configured', 503)
  }

  const contentLength = Number(
    request.headers.get('content-length') || 0
  )

  if (contentLength > 30000) {
    return response('Application too large', 413)
  }

  let payload: unknown

  try {
    const raw = await request.text()

    if (raw.length > 30000) {
      return response('Application too large', 413)
    }

    payload = JSON.parse(raw)
  } catch {
    return response('Invalid JSON', 400)
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return response('Invalid application', 400)
  }

  const data = payload as Record<string, unknown>
  const userId = data.userId
  const answers = data.answers

  if (typeof userId !== 'string' || !snowflake.test(userId)) {
    return response('Invalid applicant ID', 400)
  }

  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers)
  ) {
    return response('Invalid answers', 400)
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const configRows = await sql`
      SELECT config
      FROM cyber_application_configs
      WHERE guild_id = ${guildId}
      LIMIT 1
    `

    if (!configRows.length) {
      return response('Application system not configured', 404)
    }

    const config = configRows[0].config as ApplicationConfig
    const questions = config.questions

    if (
      !Array.isArray(questions) ||
      questions.length === 0 ||
      questions.length > 10
    ) {
      return response('Questions not configured', 400)
    }

    if (!snowflake.test(config.reviewChannel || '')) {
      return response('Review channel not configured', 400)
    }

    const submitted = answers as Record<string, unknown>
    const questionIds = new Set(questions.map(q => q.id))

    if (
      Object.keys(submitted).some(
        key => !questionIds.has(key)
      )
    ) {
      return response('Unknown question in application', 400)
    }

    const validatedAnswers: Record<string, string> = {}

    for (const question of questions) {
      const value = submitted[question.id]

      if (value !== undefined && typeof value !== 'string') {
        return response('Invalid answer format', 400)
      }

      const answer = (value || '').trim()

      if (question.required && !answer) {
        return response(
          `Required question missing: ${question.id}`,
          400
        )
      }

      const maxLength =
        question.type === 'paragraph' ? 1000 : 300

      if (answer.length > maxLength) {
        return response('Answer too long', 400)
      }

      validatedAnswers[question.id] = answer
    }

    await sql`
      CREATE TABLE IF NOT EXISTS cyber_applications (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        questions JSONB NOT NULL,
        answers JSONB NOT NULL,
        review_channel_id TEXT NOT NULL,
        reviewed_by TEXT,
        review_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS
      cyber_applications_one_active_per_user
      ON cyber_applications (guild_id, user_id)
      WHERE status IN ('pending', 'interview')
    `

    const applicationId = randomUUID()

    const inserted = await sql`
      INSERT INTO cyber_applications (
        id,
        guild_id,
        user_id,
        status,
        questions,
        answers,
        review_channel_id
      )
      VALUES (
        ${applicationId},
        ${guildId},
        ${userId},
        'pending',
        ${JSON.stringify(questions)}::jsonb,
        ${JSON.stringify(validatedAnswers)}::jsonb,
        ${config.reviewChannel}
      )
      ON CONFLICT DO NOTHING
      RETURNING id, created_at
    `

    if (!inserted.length) {
      return response(
        'You already have an active application',
        409
      )
    }

    return NextResponse.json(
      {
        ok: true,
        applicationId,
        guildId,
        userId,
        status: 'pending',
        reviewChannelId: config.reviewChannel,
        pendingRoleId: config.pendingRole || null,
        createdAt: inserted[0].created_at,
        questions,
        answers: validatedAnswers,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    console.error('[CYBER V10 Submit Application]', error)

    return response(
      'Unable to submit application',
      503
    )
  }
}
