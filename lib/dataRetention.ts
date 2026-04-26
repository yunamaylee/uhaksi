import {
  findStaleExamIds,
  deleteExamSubjectsByExamIds,
  deleteSubjectRangesByExamIds,
  deleteExamsByIds,
} from '@/lib/repositories/exam'
import { deleteExamReviewsBefore, countExamReviewsByKey } from '@/lib/repositories/examReview'
import {
  findAllExamReviewAggregatesForPurge,
  deleteExamReviewAggregateById,
} from '@/lib/repositories/examAnalysisAggregate'

/** 시험 종료일이 이 날짜 미만이면 삭제 (당해·직전 연도만 유지). */
export function examRetentionCutoffDate(now = new Date()): Date {
  const cutoffYear = now.getFullYear() - 1
  return new Date(cutoffYear, 0, 1)
}

/**
 * 오래된 시험·후기·빈 집계를 정리합니다.
 * 예: 2027년이면 2026-01-01 이전에 끝난 시험 행과, 그 시점 이전에 작성된 후기를 삭제합니다.
 */
export async function purgeStaleExamData(now = new Date()): Promise<{
  cutoff: string
  examsDeleted: number
  reviewsDeleted: number
  aggregatesDeleted: number
}> {
  const cutoff = examRetentionCutoffDate(now)

  const examIds = await findStaleExamIds(cutoff)

  if (examIds.length > 0) {
    await deleteExamSubjectsByExamIds(examIds)
    await deleteSubjectRangesByExamIds(examIds)
  }
  const examsDeleted = examIds.length > 0 ? await deleteExamsByIds(examIds) : 0

  const reviewsDeleted = await deleteExamReviewsBefore(cutoff)

  const aggregates = await findAllExamReviewAggregatesForPurge()
  let aggregatesDeleted = 0
  for (const aggregate of aggregates) {
    const reviewCount = await countExamReviewsByKey({
      schoolId: aggregate.schoolId,
      examTitle: aggregate.examTitle,
      grade: aggregate.grade,
    })
    if (reviewCount === 0) {
      await deleteExamReviewAggregateById(aggregate.id)
      aggregatesDeleted++
    }
  }

  return {
    cutoff: cutoff.toISOString(),
    examsDeleted,
    reviewsDeleted,
    aggregatesDeleted,
  }
}
