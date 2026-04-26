import { prisma } from '@/lib/prisma'

export type ExamReviewKey = {
  schoolId: number
  examTitle: string
  grade: number
}

export type UpsertExamReviewInput = ExamReviewKey & {
  createdByUserId: number
  difficulty: number
  grammarCount: number | null
  vocabCount: null
  readingCount: null
  writingCount: number | null
  listeningCount: null
  otherCount: null
  freeText: string | null
}

export type UpdateExamReviewData = {
  difficulty?: number
  grammarCount?: number | null
  writingCount?: number | null
  vocabCount?: number | null
  readingCount?: number | null
  listeningCount?: number | null
  otherCount?: number | null
  freeText?: string | null
}

// 내 리뷰 단건 조회
export async function findMyExamReview(key: ExamReviewKey, userId: number) {
  return prisma.examReview.findUnique({
    where: {
      schoolId_examTitle_grade_createdByUserId: {
        ...key,
        createdByUserId: userId,
      },
    },
    select: {
      id: true,
      grade: true,
      difficulty: true,
      grammarCount: true,
      writingCount: true,
      freeText: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

// 리뷰 ID로 단건 조회 (소유권·집계 키 포함)
export async function findExamReviewById(id: number) {
  return prisma.examReview.findUnique({
    where: { id },
    select: { createdByUserId: true, schoolId: true, examTitle: true, grade: true },
  })
}

// 리뷰 upsert (제출·수정 통합)
export async function upsertExamReview(input: UpsertExamReviewInput) {
  const { schoolId, examTitle, grade, createdByUserId, ...data } = input
  return prisma.examReview.upsert({
    where: {
      schoolId_examTitle_grade_createdByUserId: { schoolId, examTitle, grade, createdByUserId },
    },
    update: data,
    create: { schoolId, examTitle, grade, createdByUserId, ...data },
    select: { id: true },
  })
}

// 리뷰 부분 업데이트
export async function updateExamReview(id: number, data: UpdateExamReviewData) {
  return prisma.examReview.update({ where: { id }, data })
}

// 리뷰 삭제
export async function deleteExamReview(id: number) {
  return prisma.examReview.delete({ where: { id } })
}

// 집계 단건 조회
export async function findExamReviewAggregate(key: ExamReviewKey) {
  return prisma.examReviewAggregate.findUnique({
    where: { schoolId_examTitle_grade: key },
  })
}

// 집계 키 목록 (recompute용, 중복 제거)
export async function findDistinctExamReviewKeys(limit: number = 500) {
  return prisma.examReview.findMany({
    distinct: ['schoolId', 'examTitle', 'grade'],
    select: { schoolId: true, examTitle: true, grade: true },
    take: limit,
  })
}

// 분석용 리뷰 목록 조회 (최신순, 난이도·문항수·자유후기만 선택)
export async function findExamReviewsForAnalysis(key: ExamReviewKey, take: number) {
  return prisma.examReview.findMany({
    where: { schoolId: key.schoolId, examTitle: key.examTitle, grade: key.grade },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      difficulty: true,
      grammarCount: true,
      writingCount: true,
      freeText: true,
    },
  })
}

// 키 조건으로 리뷰 수 집계
export async function countExamReviewsByKey(key: ExamReviewKey): Promise<number> {
  return prisma.examReview.count({
    where: { schoolId: key.schoolId, examTitle: key.examTitle, grade: key.grade },
  })
}

// cutoff 이전 리뷰 전체 삭제
export async function deleteExamReviewsBefore(cutoff: Date): Promise<number> {
  const result = await prisma.examReview.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return result.count
}
