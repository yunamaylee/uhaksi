import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/sessionUser'
import { updateReview, removeReview } from '@/lib/services/examReview'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'

type Params = { params: Promise<{ id: string }> }

function optCountInPatch(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) return undefined
  return num
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const { id } = await params
    const reviewId = Number(id)
    if (!Number.isFinite(reviewId)) return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 })

    const body = await request.json()
    const difficulty = typeof body.difficulty === 'number' ? body.difficulty : undefined

    const grammarFromBody = 'mcqCount' in body ? body.mcqCount : 'grammarCount' in body ? body.grammarCount : undefined
    const writingFromBody = 'subjectiveCount' in body ? body.subjectiveCount : 'writingCount' in body ? body.writingCount : undefined

    const data = {
      ...(difficulty !== undefined ? { difficulty } : {}),
      ...(optCountInPatch(grammarFromBody) !== undefined ? { grammarCount: optCountInPatch(grammarFromBody) } : {}),
      ...(optCountInPatch(writingFromBody) !== undefined ? { writingCount: optCountInPatch(writingFromBody) } : {}),
      ...(typeof body.vocabCount === 'number' || body.vocabCount === null ? { vocabCount: body.vocabCount } : {}),
      ...(typeof body.readingCount === 'number' || body.readingCount === null ? { readingCount: body.readingCount } : {}),
      ...(typeof body.listeningCount === 'number' || body.listeningCount === null ? { listeningCount: body.listeningCount } : {}),
      ...(typeof body.otherCount === 'number' || body.otherCount === null ? { otherCount: body.otherCount } : {}),
      ...(typeof body.freeText === 'string' || body.freeText === null ? { freeText: body.freeText } : {}),
    }

    await updateReview(reviewId, userId, data)

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('PATCH /api/exam-reviews/[id] 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const { id } = await params
    const reviewId = Number(id)
    if (!Number.isFinite(reviewId)) return NextResponse.json({ error: '잘못된 id 입니다.' }, { status: 400 })

    await removeReview(reviewId, userId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error('DELETE /api/exam-reviews/[id] 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
