import { upsertExamReviewAggregate } from '@/lib/examAnalysis'
import { purgeStaleExamData } from '@/lib/dataRetention'
import { findDistinctExamReviewKeys } from '@/lib/repositories/examReview'
import type { ExamAnalysisKey } from '@/lib/examAnalysis'

export type RecomputeOptions = {
  schoolId: number | null
  examTitle: string | null
  grade: number | null
  generateAiSummary: boolean
  windowStart: Date
  windowEnd: Date
}

// 집계 재계산 (특정 키 지정 시 단건, 미지정 시 전체)
export async function recomputeExamAnalysisBatch(opts: RecomputeOptions): Promise<number> {
  const keys: ExamAnalysisKey[] =
    opts.schoolId != null && opts.examTitle != null && opts.grade != null
      ? [{ schoolId: opts.schoolId, examTitle: opts.examTitle, grade: opts.grade }]
      : await findDistinctExamReviewKeys(500)

  let updated = 0
  for (const key of keys) {
    await upsertExamReviewAggregate({
      key,
      windowStart: opts.windowStart,
      windowEnd: opts.windowEnd,
      generateAiSummary: opts.generateAiSummary,
    })
    updated++
  }
  return updated
}

// 오래된 시험 데이터 정리
export async function purgeStaleExamDataBatch() {
  return purgeStaleExamData()
}
