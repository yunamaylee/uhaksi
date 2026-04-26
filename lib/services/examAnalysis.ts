import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '@prisma/client'
import { plainifyAndCapAiSummary } from '@/lib/aiSummaryDisplay'
import { findExamReviewsForAnalysis } from '@/lib/repositories/examReview'
import {
  deleteExamReviewAggregatesByKey,
  upsertExamReviewAggregateData,
  type ExamAggregateKey,
  type AiSummaryResult,
} from '@/lib/repositories/examAnalysisAggregate'

export type ExamAnalysisKey = ExamAggregateKey

export type ExamAnalysisStats = {
  reviewCount: number
  difficulty: { avg: number | null; histogram: Record<string, number> }
  /** DB 필드 grammarCount·writingCount에 매핑 (객관식·서술형) */
  counts: {
    mcq: { avg: number | null }
    subjective: { avg: number | null }
  }
  /** 집계·요약용 짧은 발췌 (개인 식별 정보 없음) */
  freeTextExcerpts: string[]
}

function avg(nums: Array<number | null | undefined>): number | null {
  const filtered = nums.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  if (filtered.length === 0) return null
  return filtered.reduce((a, b) => a + b, 0) / filtered.length
}

function difficultyHistogram(difficulties: number[]): Record<string, number> {
  const hist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  for (const d of difficulties) {
    const key = String(d)
    if (hist[key] !== undefined) hist[key]++
  }
  return hist
}

export async function computeExamAnalysisStats(key: ExamAnalysisKey): Promise<{ stats: ExamAnalysisStats; sourceCount: number }> {
  const rows = await findExamReviewsForAnalysis(key, 500)

  const diffs = rows.map((r) => r.difficulty)
  const sourceCount = rows.length

  const excerpts: string[] = []
  for (const r of rows) {
    const excerpt = (r.freeText ?? '').trim().replace(/\s+/g, ' ')
    if (!excerpt) continue
    const slice = excerpt.length > 140 ? `${excerpt.slice(0, 140)}…` : excerpt
    excerpts.push(slice)
    if (excerpts.length >= 12) break
  }

  const stats: ExamAnalysisStats = {
    reviewCount: sourceCount,
    difficulty: {
      avg: avg(diffs),
      histogram: difficultyHistogram(diffs),
    },
    counts: {
      mcq: { avg: avg(rows.map((r) => r.grammarCount)) },
      subjective: { avg: avg(rows.map((r) => r.writingCount)) },
    },
    freeTextExcerpts: excerpts,
  }

  return { stats, sourceCount }
}

async function generateSummaryText(opts: {
  apiKey: string
  key: ExamAnalysisKey
  stats: ExamAnalysisStats
}): Promise<AiSummaryResult> {
  if (!opts.apiKey) return null
  if (opts.stats.reviewCount < 3) return null

  const client = new Anthropic({ apiKey: opts.apiKey })
  const model = 'claude-sonnet-4-6'

  const prompt = `너는 고등학교 내신 분석 교사다.
아래는 학생들이 남긴 객관식·서술형 문항 수(자가보고 평균), 체감 난이도, 그리고 자유 후기 발췌다. 통계와 발췌를 바탕으로 한국어로 아주 짧은 총평을 작성하라.

엄수할 출력 규칙 (위반 금지):
- 공백·줄바꿈 포함 최대 220자. 한 글자도 넘기지 말 것.
- 문단은 정확히 2개만. 첫 문단: 출제 경향·느낌(짧은 문장 1~2개, 같은 문단 안에서는 문장마다 줄바꿈 1번). 둘째 문단: 난이도·객관식/서술형 평균 등 숫자는 한 문장으로만 압축. 두 문단 사이에는 빈 줄 한 줄(엔터 두 번)만 넣을 것.
- "표본이 적어", "일반화에는 한계" 같은 긴 면책·보고서 톤(응답 분포:, 대시 나열)은 쓰지 말 것.
- (1) (2) 같은 번호·# 제목·---·**굵게**·목록(- )·이모지 금지.
- 과장 금지, 데이터에 근거. 개인 특정 금지.
- "학교ID" 같은 메타 문구를 응답에 넣지 말 것.

대상(참고용, 응답에 그대로 베끼지 말 것):
- 학교ID: ${opts.key.schoolId}
- 시험: ${opts.key.examTitle}
- 학년: ${opts.key.grade}

통계(JSON):
${JSON.stringify(opts.stats, null, 2)}
`

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 360,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    })
    const raw = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const text = plainifyAndCapAiSummary(raw)
    if (!text) return null
    return { text, model }
  } catch {
    return null
  }
}

export async function upsertExamReviewAggregate(opts: {
  key: ExamAnalysisKey
  windowStart: Date
  windowEnd: Date
  generateAiSummary?: boolean
}): Promise<void> {
  const { stats, sourceCount } = await computeExamAnalysisStats(opts.key)

  if (sourceCount === 0) {
    await deleteExamReviewAggregatesByKey(opts.key)
    return
  }

  const aiResult = opts.generateAiSummary
    ? await generateSummaryText({
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        key: opts.key,
        stats,
      })
    : null

  await upsertExamReviewAggregateData({
    key: opts.key,
    windowStart: opts.windowStart,
    windowEnd: opts.windowEnd,
    sourceCount,
    statsJson: stats as unknown as Prisma.JsonObject,
    aiResult,
  })
}

const AGG_WINDOW_MS = 1000 * 60 * 60 * 24 * 180

/** 후기 저장·수정·삭제 뒤 친구들 평가/분석 집계를 맞춘다. 실패해도 로그만 남기고 본 요청은 성공 처리한다. */
export async function syncExamReviewAggregateFromReviews(key: ExamAnalysisKey): Promise<void> {
  try {
    const now = new Date()
    await upsertExamReviewAggregate({
      key,
      windowStart: new Date(now.getTime() - AGG_WINDOW_MS),
      windowEnd: now,
      generateAiSummary: true,
    })
  } catch (err) {
    console.error('[syncExamReviewAggregateFromReviews]', JSON.stringify(key), err)
  }
}
