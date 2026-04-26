'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { IconBot } from '@/components/icons/ToolbarIcons'
import type { ExamAggBundle, ExamReviewAggregateClient } from '@/lib/examReviewAggregatesForSchool'
import { sanitizeAiSummaryText, splitAiSummaryParagraphs } from '@/lib/aiSummaryDisplay'
import { useExamAnalysis } from '@/hooks/useExamAnalysis'

type Props = {
  schoolId: number
  examTitle: string
  grade: number
  reloadKey?: number
  omitSectionTitle?: boolean
  locked?: boolean
  /** 서버에서 미리 조회한 1·2·3학년 집계 — 있으면 첫 화면에서 fetch·로딩 문구 없이 표시 */
  initialByGrade?: ExamAggBundle
}

type Aggregate = ExamReviewAggregateClient

type StatsShape = {
  difficulty?: { histogram?: Record<string, number> }
  counts?: Record<string, { avg?: number | null }>
}

function asStatsShape(v: unknown): StatsShape {
  if (typeof v !== 'object' || v === null) return {}
  return v as StatsShape
}

const metaColor = '#6b7280'
const labelColor = '#374151'
const bodyColor = '#111827'
const starOn = '#f5b400'
const starOff = '#e5e7eb'
const panelBg = '#f3f4f6'

/** 요약 블록 타이포·간격 (원본 대비 ~80%, 이전 2/3보다 살짝 큼) */
const UI_SCALE = 0.8
const z = (px: number) => Math.round(px * UI_SCALE)

function StarRow({ avg, starSize }: { avg: number; starSize: number }) {
  const r = Math.round(Math.max(1, Math.min(5, avg)))
  return (
    <div
      style={{
        display: 'flex',
        gap: '1px',
        fontSize: starSize,
        lineHeight: 1,
        letterSpacing: '-0.12em',
        justifyContent: 'center',
      }}
      aria-hidden
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= r ? starOn : starOff }}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function ExamFriendsSummary({
  schoolId,
  examTitle,
  grade,
  reloadKey = 0,
  omitSectionTitle = false,
  locked = false,
  initialByGrade,
}: Props) {
  const { loading, agg } = useExamAnalysis(schoolId, examTitle, grade, { initialByGrade, reloadKey })

  const computed = useMemo(() => {
    const stats = asStatsShape(agg?.statsJson)
    const histRaw = stats.difficulty?.histogram ?? null
    const histogram: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    if (histRaw) {
      for (const k of ['1', '2', '3', '4', '5']) {
        histogram[k] = Number(histRaw[k] ?? 0)
      }
    }
    let sum = 0
    let count = 0
    for (const k of ['1', '2', '3', '4', '5']) {
      const n = histogram[k]
      sum += Number(k) * n
      count += n
    }
    const avgDifficulty = count > 0 ? sum / count : 0
    const total = agg?.sourceCount ?? count
    const topTwo = (histogram['4'] ?? 0) + (histogram['5'] ?? 0)
    const easyHighPct = total > 0 ? Math.round((topTwo / total) * 100) : 0
    const counts = stats.counts ?? {}
    const mcq = Number(counts.mcq?.avg ?? counts.grammar?.avg ?? 0)
    const subj = Number(counts.subjective?.avg ?? counts.writing?.avg ?? 0)
    const barMax = Math.max(...['1', '2', '3', '4', '5'].map((k) => histogram[k] ?? 0), 1)

    const aiSummaryDisplay = sanitizeAiSummaryText(agg?.aiSummary ?? null)
    return {
      avgDifficulty,
      histogram,
      barMax,
      easyHighPct,
      aiSummaryDisplay,
      aiSummaryParagraphs: splitAiSummaryParagraphs(aiSummaryDisplay),
      counts: { mcq, subj },
      total,
    }
  }, [agg])

  const loginPrompt = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: z(14),
        padding: `${z(20)}px ${z(16)}px`,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: z(16),
          fontWeight: 800,
          color: bodyColor,
          lineHeight: 1.5,
          letterSpacing: '-0.2px',
        }}
      >
        로그인하면 친구들 평균과 AI 총평을 볼 수 있어요
      </p>
      <Link href="/login" style={{ textDecoration: 'none' }}>
        <Button type="button" variant="primary" size="md">
          로그인하기
        </Button>
      </Link>
    </div>
  )

  if (loading) {
    return (
      <p style={{ margin: 0, color: metaColor, fontSize: z(15), lineHeight: 1.6, fontWeight: 600 }}>
        불러오는 중…
      </p>
    )
  }

  if (!agg) {
    if (locked) {
      return loginPrompt
    }
    return (
      <p style={{ margin: 0, color: metaColor, fontSize: z(15), lineHeight: 1.65, fontWeight: 500 }}>
        아직 모은 후기가 없어요. 첫 후기를 남기면 여기에 평균이 쌓여요.
      </p>
    )
  }

  const mcqLabel =
    Number.isFinite(computed.counts.mcq) && computed.counts.mcq > 0
      ? `객관식 평균 ${Math.round(computed.counts.mcq)}문항`
      : null
  const subjLabel =
    Number.isFinite(computed.counts.subj) && computed.counts.subj > 0
      ? `서술형 평균 ${Math.round(computed.counts.subj)}문항`
      : null
  const typeLine = [mcqLabel, subjLabel].filter(Boolean).join(' · ')

  const avgShow = computed.avgDifficulty > 0 ? computed.avgDifficulty.toFixed(1) : '—'

  const summaryPanel = (
    <div
      style={{
        background: panelBg,
        borderRadius: z(14),
        padding: `${z(18)}px ${z(16)}px ${z(16)}px`,
        border: '1px solid rgba(17, 24, 39, 0.06)',
      }}
    >
      {!omitSectionTitle ? (
        <div style={{ marginBottom: z(14), display: 'flex', alignItems: 'baseline', gap: z(8), flexWrap: 'wrap' }}>
          <span style={{ fontSize: z(17), fontWeight: 800, color: bodyColor, letterSpacing: '-0.3px' }}>친구들 후기</span>
          <span style={{ fontSize: z(16), fontWeight: 800, color: bodyColor }}>{agg.sourceCount}</span>
          <span style={{ fontSize: z(14), fontWeight: 600, color: metaColor }}>개 반영</span>
        </div>
      ) : (
        <div style={{ marginBottom: z(14), display: 'flex', alignItems: 'baseline', gap: z(6), flexWrap: 'wrap' }}>
          <span style={{ fontSize: z(16), fontWeight: 800, color: bodyColor }}>후기</span>
          <span style={{ fontSize: z(18), fontWeight: 900, color: bodyColor, letterSpacing: '-0.5px' }}>{agg.sourceCount}</span>
          <span style={{ fontSize: z(14), fontWeight: 600, color: metaColor }}>개 반영</span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: z(20),
          alignItems: 'stretch',
        }}
      >
        <div
          className="exam-review-summary-left"
          style={{
            flex: '0 0 auto',
            minWidth: z(120),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: z(44),
              fontWeight: 900,
              color: bodyColor,
              letterSpacing: '-2px',
              lineHeight: 1,
              marginBottom: z(10),
            }}
          >
            {avgShow}
          </div>
          {computed.avgDifficulty > 0 ? <StarRow avg={computed.avgDifficulty} starSize={z(22)} /> : null}
          <p style={{ margin: `${z(10)}px 0 0`, fontSize: z(13), fontWeight: 600, color: metaColor }}>
            체감 난이도 {computed.easyHighPct}%
            <span style={{ fontWeight: 500, marginLeft: z(4), fontSize: z(12) }}>(4~5점 비율)</span>
          </p>
        </div>

        <div
          style={{
            flex: `1 1 ${z(200)}px`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: z(8),
            justifyContent: 'center',
          }}
        >
          <p style={{ margin: `0 0 ${z(4)}px`, fontSize: z(12), fontWeight: 700, color: labelColor }}>체감 난이도 분포</p>
          {[5, 4, 3, 2, 1].map((star) => {
            const n = computed.histogram[String(star)] ?? 0
            const pct = computed.barMax > 0 ? Math.round((n / computed.barMax) * 100) : 0
            const isTop = star === 5
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: z(10) }}>
                <span
                  style={{
                    width: z(32),
                    fontSize: z(13),
                    fontWeight: isTop ? 800 : 600,
                    color: isTop ? 'var(--accent-strong)' : metaColor,
                    flexShrink: 0,
                  }}
                >
                  {star}점
                </span>
                <div
                  style={{
                    flex: 1,
                    height: z(10),
                    background: 'rgba(17, 24, 39, 0.08)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: isTop ? 'var(--accent)' : 'rgba(255, 111, 15, 0.45)',
                      minWidth: n > 0 ? z(4) : 0,
                      transition: 'width 200ms ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    width: z(36),
                    textAlign: 'right',
                    fontSize: z(12),
                    fontWeight: 600,
                    color: metaColor,
                    flexShrink: 0,
                  }}
                >
                  {n}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {typeLine ? (
        <p
          style={{
            margin: `${z(14)}px 0 0`,
            paddingTop: z(14),
            borderTop: '1px solid rgba(17, 24, 39, 0.08)',
            fontSize: z(14),
            fontWeight: 600,
            color: labelColor,
            lineHeight: 1.55,
          }}
        >
          {typeLine}
        </p>
      ) : null}
    </div>
  )

  const aiBlock = (
    <div style={{ marginTop: z(18) }}>
      <p
        style={{
          margin: `0 0 ${z(10)}px`,
          fontSize: z(14),
          fontWeight: 800,
          color: bodyColor,
          letterSpacing: '-0.2px',
          display: 'flex',
          alignItems: 'center',
          gap: z(6),
        }}
      >
        <span style={{ flexShrink: 0, color: labelColor, display: 'flex', alignItems: 'center' }}>
          <IconBot size={z(18)} />
        </span>
        <span>AI 후기 총평</span>
      </p>
      <div
        style={{
          paddingLeft: z(10),
          borderLeft: `${Math.max(2, z(3))}px solid rgba(255, 111, 15, 0.28)`,
        }}
      >
        {computed.aiSummaryParagraphs.length > 0 ? (
          computed.aiSummaryParagraphs.map((para, idx) => (
            <p
              key={idx}
              style={{
                margin: idx > 0 ? `${z(10)}px 0 0` : 0,
                fontSize: z(15),
                lineHeight: 1.92,
                color: bodyColor,
                fontWeight: 500,
                whiteSpace: 'pre-line',
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
              }}
            >
              {para}
            </p>
          ))
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: z(15),
              lineHeight: 1.92,
              color: bodyColor,
              fontWeight: 500,
              wordBreak: 'keep-all',
            }}
          >
            {agg.sourceCount < 3
              ? '후기가 3개 이상이면 여기에 AI 총평이 붙어요.'
              : '이번에는 요약을 만들지 못했어요. 잠시 후 다시 시도해 보세요.'}
          </p>
        )}
      </div>
    </div>
  )

  const faqBadge = (letter: string) => (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        width: z(20),
        height: z(20),
        borderRadius: z(6),
        background: 'rgba(17, 24, 39, 0.06)',
        color: metaColor,
        fontSize: z(11),
        fontWeight: 800,
        lineHeight: `${z(20)}px`,
        textAlign: 'center',
      }}
    >
      {letter}
    </span>
  )

  const qaGrid = {
    display: 'grid' as const,
    gridTemplateColumns: 'auto 1fr',
    columnGap: z(10),
    rowGap: z(6),
    alignItems: 'start' as const,
  }

  const reviewInfoFaq = (
    <div
      role="note"
      style={{
        marginTop: z(16),
        padding: `${z(8)}px ${z(10)}px`,
        background: 'rgba(243, 244, 246, 0.9)',
        borderRadius: z(10),
        border: '1px solid rgba(17, 24, 39, 0.07)',
      }}
    >
      <div style={qaGrid}>
        {faqBadge('Q')}
        <span style={{ fontSize: z(12), lineHeight: 1.45, fontWeight: 600, color: metaColor }}>익명이 보장되나요?</span>
        {faqBadge('A')}
        <span style={{ fontSize: z(12), lineHeight: 1.55, fontWeight: 500, color: metaColor }}>
          네. 내가 쓴 글은 남에게 그대로{' '}
          <span style={{ whiteSpace: 'nowrap' }}>보이지 않아요.</span> 평균·분포·AI 총평처럼 모아서만 반영돼요.
        </span>
      </div>
    </div>
  )

  const inner = (
    <>
      {summaryPanel}
      {aiBlock}
      {reviewInfoFaq}
    </>
  )

  if (locked) {
    return (
      <>
        <div style={{ position: 'relative', minHeight: z(260) }}>
          <div
            style={{
              filter: 'blur(9px)',
              opacity: 0.88,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            {summaryPanel}
            {aiBlock}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: z(12),
              padding: z(16),
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(4px)',
              borderRadius: z(12),
            }}
          >
            <p style={{ margin: 0, fontSize: z(16), fontWeight: 800, color: bodyColor, textAlign: 'center', lineHeight: 1.5 }}>
              로그인하고 친구들 후기를 확인해 보세요
            </p>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Button type="button" variant="primary" size="md">
                로그인하기
              </Button>
            </Link>
          </div>
        </div>
        {reviewInfoFaq}
      </>
    )
  }

  return <div>{inner}</div>
}
