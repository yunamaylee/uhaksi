import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type ExamAggregateKey = {
  schoolId: number
  examTitle: string
  grade: number
}

export type AiSummaryResult = {
  text: string
  model: string
} | null

export type UpsertExamAggregateInput = {
  key: ExamAggregateKey
  windowStart: Date
  windowEnd: Date
  sourceCount: number
  statsJson: Prisma.JsonObject
  aiResult: AiSummaryResult
}

// 키 조건으로 집계 전체 삭제 (후기가 0건일 때 정리용)
export async function deleteExamReviewAggregatesByKey(key: ExamAggregateKey): Promise<void> {
  await prisma.examReviewAggregate.deleteMany({
    where: {
      schoolId: key.schoolId,
      examTitle: key.examTitle,
      grade: key.grade,
    },
  })
}

// 집계 upsert (update 시 aiResult가 null이면 기존 AI 요약 유지)
export async function upsertExamReviewAggregateData(input: UpsertExamAggregateInput): Promise<void> {
  const { key, windowStart, windowEnd, sourceCount, statsJson, aiResult } = input
  await prisma.examReviewAggregate.upsert({
    where: {
      schoolId_examTitle_grade: {
        schoolId: key.schoolId,
        examTitle: key.examTitle,
        grade: key.grade,
      },
    },
    update: {
      windowStart,
      windowEnd,
      sourceCount,
      statsJson,
      aiSummary: aiResult?.text ?? undefined,
      aiModel: aiResult?.model ?? undefined,
      aiGeneratedAt: aiResult ? new Date() : undefined,
    },
    create: {
      schoolId: key.schoolId,
      examTitle: key.examTitle,
      grade: key.grade,
      windowStart,
      windowEnd,
      sourceCount,
      statsJson,
      aiSummary: aiResult?.text ?? null,
      aiModel: aiResult?.model ?? null,
      aiGeneratedAt: aiResult ? new Date() : null,
    },
  })
}

// 학교·시험 목록으로 집계 조회 (학년 1·2·3 한정)
export async function findExamReviewAggregatesBySchoolAndTitles(
  schoolId: number,
  examTitles: string[],
) {
  return prisma.examReviewAggregate.findMany({
    where: {
      schoolId,
      examTitle: { in: examTitles },
      grade: { in: [1, 2, 3] },
    },
  })
}

// 전체 집계 조회 (purge용, id + 키 컬럼만 선택)
export async function findAllExamReviewAggregatesForPurge() {
  return prisma.examReviewAggregate.findMany({
    select: { id: true, schoolId: true, examTitle: true, grade: true },
  })
}

// ID로 집계 단건 삭제
export async function deleteExamReviewAggregateById(id: number): Promise<void> {
  await prisma.examReviewAggregate.delete({ where: { id } })
}
