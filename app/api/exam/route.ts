import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { upsertExam, deleteExam, NotFoundError } from '@/lib/services/exam'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { schoolId, title, startDate, endDate, subjects, subjectRanges } = await request.json()

    if (!schoolId || !title || !startDate || !endDate) {
      return NextResponse.json({ error: '필수 값이 누락됐습니다.' }, { status: 400 })
    }

    const exam = await upsertExam({
      schoolId: Number(schoolId),
      title,
      startDate,
      endDate,
      subjects,
      subjectRanges,
    })

    return NextResponse.json(exam)
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    console.error('POST /api/exam 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { examId } = await request.json()
    if (!examId) {
      return NextResponse.json({ error: '필수 값이 누락됐습니다.' }, { status: 400 })
    }

    const id = Number(examId)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: '잘못된 examId 입니다.' }, { status: 400 })
    }

    await deleteExam(id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/exam 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}