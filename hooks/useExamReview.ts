'use client'

import { useState, useEffect } from 'react'

type Review = {
  id: number
  difficulty: number
  grammarCount: number | null
  writingCount: number | null
  freeText: string | null
  createdAt: string
  updatedAt: string
}

type Props = {
  schoolId: number
  examTitle: string
  grade: number
}

export function useExamReview(props: Props) {
  const { schoolId, examTitle, grade } = props
  const [loading, setLoading] = useState(true)
  const [mine, setMine] = useState<Review | null>(null)
  const [difficulty, setDifficulty] = useState(3)
  const [mcqCount, setMcqCount] = useState<number | ''>('')
  const [subjectiveCount, setSubjectiveCount] = useState<number | ''>('')
  const [freeText, setFreeText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/exam-reviews?schoolId=${schoolId}&examTitle=${encodeURIComponent(examTitle)}&grade=${grade}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const review: Review | null = data.mine ?? null
        setMine(review)
        if (review) {
          setDifficulty(review.difficulty)
          setMcqCount(review.grammarCount ?? '')
          setSubjectiveCount(review.writingCount ?? '')
          setFreeText(review.freeText ?? '')
        }
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [schoolId, examTitle, grade])

  // 리뷰 저장 (성공 시 true 반환)
  const save = async (): Promise<boolean> => {
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/exam-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId,
        examTitle,
        grade,
        difficulty,
        mcqCount: mcqCount === '' ? null : mcqCount,
        subjectiveCount: subjectiveCount === '' ? null : subjectiveCount,
        freeText,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setSaveError(data?.error ?? '저장에 실패했습니다.')
      return false
    }
    return true
  }

  // 리뷰 삭제 (성공 시 true 반환)
  const remove = async (): Promise<boolean> => {
    if (!mine) return false
    setDeleting(true)
    const res = await fetch(`/api/exam-reviews/${mine.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSaveError(data?.error ?? '삭제에 실패했습니다.')
      setDeleting(false)
      return false
    }
    setMine(null)
    setDifficulty(3)
    setMcqCount('')
    setSubjectiveCount('')
    setFreeText('')
    setDeleting(false)
    return true
  }

  return {
    loading,
    mine,
    difficulty,
    setDifficulty,
    mcqCount,
    setMcqCount,
    subjectiveCount,
    setSubjectiveCount,
    freeText,
    setFreeText,
    saving,
    deleting,
    saveError,
    save,
    remove,
  }
}
