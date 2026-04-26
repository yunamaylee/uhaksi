import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/sessionUser'
import { getMyReview, submitReview } from '@/lib/services/examReview'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'

function toInt(value: string | null): number | null {
  if (value === null) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function optCount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) return null
  return num
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = toInt(request.nextUrl.searchParams.get('schoolId'))
    const examTitle = request.nextUrl.searchParams.get('examTitle')
    const grade = toInt(request.nextUrl.searchParams.get('grade'))

    if (!schoolId || !examTitle || !grade) {
      return NextResponse.json({ error: 'schoolId, examTitle, grade는 필수입니다.' }, { status: 400 })
    }

    const userId = await getSessionUserId()
    const mine = await getMyReview({ schoolId, examTitle, grade }, userId)

    return NextResponse.json({ mine })
  } catch (e) {
    console.error('GET /api/exam-reviews 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const schoolId = Number(body.schoolId)
    const examTitle = String(body.examTitle ?? '').trim()
    const grade = Number(body.grade)
    const difficulty = Number(body.difficulty)

    if (!Number.isFinite(schoolId) || !examTitle || !Number.isFinite(grade) || !Number.isFinite(difficulty)) {
      return NextResponse.json({ error: '필수 값이 누락됐습니다.' }, { status: 400 })
    }
    if (difficulty < 1 || difficulty > 5) {
      return NextResponse.json({ error: 'difficulty는 1~5여야 합니다.' }, { status: 400 })
    }

    const grammarCount = optCount(body.mcqCount ?? body.grammarCount)
    const writingCount = optCount(body.subjectiveCount ?? body.writingCount)
    const freeText = typeof body.freeText === 'string' ? body.freeText : null

    const created = await submitReview(
      { schoolId, examTitle, grade, difficulty, grammarCount, writingCount, freeText },
      userId,
    )

    return NextResponse.json({ ok: true, id: created.id })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('POST /api/exam-reviews 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
