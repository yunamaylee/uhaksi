'use client'

import { useEffect, useState } from 'react'
import type { ExamAggBundle, ExamReviewAggregateClient } from '@/lib/examReviewAggregatesForSchool'

type Options = {
  initialByGrade?: ExamAggBundle
  reloadKey?: number
}

// exam-analysis API에서 집계 데이터를 가져오는 훅
// initialByGrade가 있으면 첫 로드는 서버 데이터를 그대로 사용
export function useExamAnalysis(
  schoolId: number,
  examTitle: string,
  grade: number,
  options: Options = {},
) {
  const { initialByGrade, reloadKey = 0 } = options
  const g = (grade === 1 || grade === 2 || grade === 3 ? grade : 1) as 1 | 2 | 3
  const seeded = initialByGrade?.[g]
  const [loading, setLoading] = useState<boolean>(() => initialByGrade === undefined)
  const [agg, setAgg] = useState<ExamReviewAggregateClient | null>(() => seeded ?? null)

  useEffect(() => {
    let cancelled = false

    if (reloadKey === 0 && initialByGrade !== undefined) {
      setAgg(initialByGrade[g] ?? null)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    const quietRefresh = reloadKey > 0
    if (!quietRefresh) setLoading(true)

    fetch(
      `/api/exam-analysis?schoolId=${schoolId}&examTitle=${encodeURIComponent(examTitle)}&grade=${grade}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setAgg(d.aggregate ?? null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [schoolId, examTitle, grade, g, reloadKey, initialByGrade])

  return { loading, agg }
}
