import * as reviewRepo from '@/lib/repositories/examReview'
import { findUserById } from '@/lib/repositories/user'
import { syncExamReviewAggregateFromReviews } from '@/lib/services/examAnalysis'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'
import type { ExamReviewKey, UpdateExamReviewData } from '@/lib/repositories/examReview'

export type SubmitReviewInput = ExamReviewKey & {
  difficulty: number
  grammarCount: number | null
  writingCount: number | null
  freeText: string | null
}

// 내 리뷰 조회 (비로그인 시 null)
export async function getMyReview(key: ExamReviewKey, userId: number | null) {
  if (!userId) return null
  const user = await findUserById(userId)
  if (!user) return null
  return reviewRepo.findMyExamReview(key, userId)
}

// 리뷰 제출 (upsert)
export async function submitReview(input: SubmitReviewInput, userId: number) {
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('유저를 찾을 수 없습니다.')

  const { schoolId, examTitle, grade, difficulty, grammarCount, writingCount, freeText } = input

  const created = await reviewRepo.upsertExamReview({
    schoolId,
    examTitle,
    grade,
    createdByUserId: userId,
    difficulty,
    grammarCount,
    vocabCount: null,
    readingCount: null,
    writingCount,
    listeningCount: null,
    otherCount: null,
    freeText,
  })

  await syncExamReviewAggregateFromReviews({ schoolId, examTitle, grade })
  return created
}

// 리뷰 수정
export async function updateReview(reviewId: number, userId: number, data: UpdateExamReviewData) {
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('유저를 찾을 수 없습니다.')

  const existing = await reviewRepo.findExamReviewById(reviewId)
  if (!existing) throw new NotFoundError('리뷰를 찾을 수 없습니다.')
  if (existing.createdByUserId !== userId) throw new ForbiddenError('권한이 없습니다.')

  if (data.difficulty !== undefined && (data.difficulty < 1 || data.difficulty > 5)) {
    throw new ValidationError('difficulty는 1~5여야 합니다.')
  }

  await reviewRepo.updateExamReview(reviewId, data)
  await syncExamReviewAggregateFromReviews({
    schoolId: existing.schoolId,
    examTitle: existing.examTitle,
    grade: existing.grade,
  })
}

// 리뷰 삭제
export async function removeReview(reviewId: number, userId: number) {
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('유저를 찾을 수 없습니다.')

  const existing = await reviewRepo.findExamReviewById(reviewId)
  if (!existing) throw new NotFoundError('리뷰를 찾을 수 없습니다.')
  if (existing.createdByUserId !== userId) throw new ForbiddenError('권한이 없습니다.')

  await reviewRepo.deleteExamReview(reviewId)
  await syncExamReviewAggregateFromReviews({
    schoolId: existing.schoolId,
    examTitle: existing.examTitle,
    grade: existing.grade,
  })
}

// 집계 조회
export async function getExamAnalysis(key: ExamReviewKey) {
  return reviewRepo.findExamReviewAggregate(key)
}
