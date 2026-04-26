import { prisma } from '@/lib/prisma'
import type { Exam, School } from '@prisma/client'

export type ExistingExam = {
  id: number
  title: string
  startDate: Date
  endDate: Date
  subjects: Array<{
    id: number
    subject: string
    grade: number | null
    period: number | null
    date: string | null
  }>
  subjectRanges: Array<{
    id: number
    grade: number | null
    subject: string
    label: string | null
    content: string | null
    sortOrder: number
  }>
}

export type ExamSubjectInput = {
  date?: string | null
  grade?: number | null
  period?: number | null
  subject: string
}

export type SubjectRangeInput = {
  grade?: number | null
  subject: string
  label?: string | null
  content?: string | null
  sortOrder?: number
}

// 학교 단건 조회
export async function findSchoolById(id: number): Promise<School | null> {
  return prisma.school.findUnique({ where: { id } })
}

// 학교+제목으로 시험 단건 조회
export async function findExamBySchoolAndTitle(schoolId: number, title: string): Promise<Exam | null> {
  return prisma.exam.findFirst({ where: { schoolId, title } })
}

// examId에 속한 ExamSubject 전체 삭제
export async function deleteExamSubjectsByExamId(examId: number): Promise<void> {
  await prisma.examSubject.deleteMany({ where: { examId } })
}

// examId에 속한 SubjectRange 전체 삭제
export async function deleteSubjectRangesByExamId(examId: number): Promise<void> {
  await prisma.subjectRange.deleteMany({ where: { examId } })
}

// 시험 업데이트 (연관 데이터 재생성 포함)
export async function updateExamWithRelations(
  examId: number,
  subjects: ExamSubjectInput[],
  subjectRanges: SubjectRangeInput[],
) {
  return prisma.exam.update({
    where: { id: examId },
    data: {
      subjects: { create: subjects },
      subjectRanges: { create: subjectRanges },
    },
    include: { subjects: true, subjectRanges: true },
  })
}

// 시험 생성 (연관 데이터 포함)
export async function createExamWithRelations(
  schoolId: number,
  title: string,
  startDate: Date,
  endDate: Date,
  subjects: ExamSubjectInput[],
  subjectRanges: SubjectRangeInput[],
) {
  return prisma.exam.create({
    data: {
      schoolId,
      title,
      startDate,
      endDate,
      subjects: { create: subjects },
      subjectRanges: { create: subjectRanges },
    },
    include: { subjects: true, subjectRanges: true },
  })
}

// 시험 단건 삭제
export async function deleteExamById(id: number): Promise<void> {
  await prisma.exam.delete({ where: { id } })
}

// 시험 및 연관 데이터 트랜잭션 삭제 (ExamSubject → SubjectRange → Exam 순)
export async function deleteExamWithRelations(examId: number): Promise<void> {
  await prisma.$transaction([
    prisma.examSubject.deleteMany({ where: { examId } }),
    prisma.subjectRange.deleteMany({ where: { examId } }),
    prisma.exam.delete({ where: { id: examId } }),
  ])
}

// 학교 ID로 시험 목록 조회 (과목·범위 포함)
export async function findExamsBySchoolId(schoolId: number): Promise<ExistingExam[]> {
  return prisma.exam.findMany({
    where: { schoolId },
    include: { subjects: true, subjectRanges: true },
  }) as Promise<ExistingExam[]>
}

// 종료일이 cutoff 미만인 시험 ID 목록 조회
export async function findStaleExamIds(cutoff: Date): Promise<number[]> {
  const staleExams = await prisma.exam.findMany({
    where: { endDate: { lt: cutoff } },
    select: { id: true },
  })
  return staleExams.map((exam) => exam.id)
}

// 시험 ID 목록으로 ExamSubject 전체 삭제
export async function deleteExamSubjectsByExamIds(examIds: number[]): Promise<void> {
  await prisma.examSubject.deleteMany({ where: { examId: { in: examIds } } })
}

// 시험 ID 목록으로 SubjectRange 전체 삭제
export async function deleteSubjectRangesByExamIds(examIds: number[]): Promise<void> {
  await prisma.subjectRange.deleteMany({ where: { examId: { in: examIds } } })
}

// 시험 ID 목록으로 Exam 전체 삭제, 삭제된 건수 반환
export async function deleteExamsByIds(examIds: number[]): Promise<number> {
  const result = await prisma.exam.deleteMany({ where: { id: { in: examIds } } })
  return result.count
}
