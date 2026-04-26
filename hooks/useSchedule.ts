'use client'

import { useEffect, useState } from 'react'

type ExamPeriod = {
  name: string
  dates: string[]
  startDate: string
  endDate: string
}

// 학교 시험 일정을 가져오는 훅
export function useSchedule(schoolId: number) {
  const [loadingExams, setLoadingExams] = useState<boolean>(true)
  const [exams, setExams] = useState<ExamPeriod[]>([])
  const [selectedExamTitle, setSelectedExamTitle] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingExams(true)
    fetch(`/api/search/schedule?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const list = Array.isArray(d) ? (d as ExamPeriod[]) : []
        setExams(list)
        setSelectedExamTitle((prev) => prev ?? (list[0]?.name ?? null))
      })
      .finally(() => {
        if (cancelled) return
        setLoadingExams(false)
      })
    return () => {
      cancelled = true
    }
  }, [schoolId])

  return { loadingExams, exams, selectedExamTitle, setSelectedExamTitle }
}
