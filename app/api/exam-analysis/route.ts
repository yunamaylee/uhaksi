import { NextRequest, NextResponse } from 'next/server'
import { getExamAnalysis } from '@/lib/services/examReview'

function toInt(value: string | null): number | null {
  if (value === null) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = toInt(request.nextUrl.searchParams.get('schoolId'))
    const examTitle = request.nextUrl.searchParams.get('examTitle')
    const grade = toInt(request.nextUrl.searchParams.get('grade'))

    if (!schoolId || !examTitle || !grade) {
      return NextResponse.json({ error: 'schoolId, examTitle, grade are required' }, { status: 400 })
    }

    const aggregate = await getExamAnalysis({ schoolId, examTitle, grade })

    return NextResponse.json({ aggregate: aggregate ?? null })
  } catch (e) {
    console.error('GET /api/exam-analysis 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
