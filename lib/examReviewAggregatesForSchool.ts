import { findExamReviewAggregatesBySchoolAndTitles } from '@/lib/repositories/examAnalysisAggregate'

/** 클라이언트·서버 경계에서 그대로 넘길 집계 스냅샷 */
export type ExamReviewAggregateClient = {
  sourceCount: number
  statsJson: unknown
  aiSummary: string | null
  aiGeneratedAt: string | null
}

export type ExamAggBundle = Record<1 | 2 | 3, ExamReviewAggregateClient | null>

/** 시험 기간별 1·2·3학년 집계를 한 번에 불러 맵으로 만든다. */
export async function loadExamAggBundlesForExams(
  schoolId: number,
  examTitles: string[],
): Promise<Map<string, ExamAggBundle>> {
  const map = new Map<string, ExamAggBundle>()
  for (const t of examTitles) {
    map.set(t, { 1: null, 2: null, 3: null })
  }
  if (examTitles.length === 0) return map

  const rows = await findExamReviewAggregatesBySchoolAndTitles(schoolId, examTitles)

  for (const row of rows) {
    const bundle = map.get(row.examTitle)
    if (!bundle) continue
    const g = row.grade
    if (g !== 1 && g !== 2 && g !== 3) continue
    bundle[g] = {
      sourceCount: row.sourceCount,
      statsJson: row.statsJson,
      aiSummary: row.aiSummary,
      aiGeneratedAt: row.aiGeneratedAt?.toISOString() ?? null,
    }
  }

  return map
}
