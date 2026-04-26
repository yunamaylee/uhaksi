import * as examRepo from '@/lib/repositories/exam'
import type { ExamSubjectInput, SubjectRangeInput } from '@/lib/repositories/exam'
import { NotFoundError } from '@/lib/services/errors'

export { NotFoundError }

export type UpsertExamParams = {
  schoolId: number
  title: string
  startDate: string
  endDate: string
  subjects?: ExamSubjectInput[]
  subjectRanges?: SubjectRangeInput[]
}

// YYYYMMDD 문자열을 Date로 변환
function parseDate(yyyymmdd: string): Date {
  const year = parseInt(yyyymmdd.slice(0, 4))
  const month = parseInt(yyyymmdd.slice(4, 6)) - 1
  const day = parseInt(yyyymmdd.slice(6, 8))
  return new Date(year, month, day)
}

// SubjectRange 입력값 정규화 (빈 문자열 null 처리, 기본값 보정)
function normalizeSubjectRange(r: SubjectRangeInput): SubjectRangeInput {
  return {
    grade: typeof r.grade === 'number' ? r.grade : null,
    subject: r.subject,
    label: r.label?.trim() || null,
    content: r.content?.trim() || null,
    sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : 0,
  }
}

// 시험 upsert (같은 학교+제목이 있으면 업데이트, 없으면 생성)
export async function upsertExam(params: UpsertExamParams) {
  const { schoolId, title, startDate, endDate, subjects = [], subjectRanges = [] } = params

  const school = await examRepo.findSchoolById(schoolId)
  if (!school) throw new NotFoundError('학교를 찾을 수 없습니다.')

  const normalizedRanges = subjectRanges.map(normalizeSubjectRange)

  const existingExam = await examRepo.findExamBySchoolAndTitle(school.id, title)

  if (existingExam) {
    await examRepo.deleteExamSubjectsByExamId(existingExam.id)
    await examRepo.deleteSubjectRangesByExamId(existingExam.id)
    return examRepo.updateExamWithRelations(existingExam.id, subjects, normalizedRanges)
  }

  return examRepo.createExamWithRelations(
    school.id,
    title,
    parseDate(startDate),
    parseDate(endDate),
    subjects,
    normalizedRanges,
  )
}

// 시험 삭제 (ExamSubject → SubjectRange → Exam 순으로 트랜잭션 처리)
export async function deleteExam(examId: number): Promise<void> {
  await examRepo.deleteExamWithRelations(examId)
}
