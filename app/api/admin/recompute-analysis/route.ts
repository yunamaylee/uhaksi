import { NextRequest, NextResponse } from 'next/server'
import { recomputeExamAnalysisBatch, purgeStaleExamDataBatch } from '@/lib/services/admin'

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_RECOMPUTE_SECRET
  if (!secret) return false
  return request.headers.get('x-admin-secret') === secret
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const runPurge = body.purge !== false
    const purgeResult = runPurge ? await purgeStaleExamDataBatch() : null

    const now = new Date()
    const windowStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 180)
    const windowEnd = now

    const updated = await recomputeExamAnalysisBatch({
      schoolId: typeof body.schoolId === 'number' ? body.schoolId : null,
      examTitle: typeof body.examTitle === 'string' ? body.examTitle : null,
      grade: typeof body.grade === 'number' ? body.grade : null,
      generateAiSummary: body.generateAiSummary !== false,
      windowStart,
      windowEnd,
    })

    return NextResponse.json({ ok: true, updated, purge: purgeResult })
  } catch (e) {
    console.error('POST /api/admin/recompute-analysis 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
