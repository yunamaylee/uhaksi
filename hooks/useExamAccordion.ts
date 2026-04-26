'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const GRADES = [1, 2, 3] as const
const PERIODS = [1, 2, 3, 4]

type TableState = Record<number, Record<string, Record<number, string>>>
type RangesState = Record<number, Record<string, Array<{ label: string; content: string }>>>

type ExistingExam = {
  id: number
  title: string
  startDate: string | Date
  endDate: string | Date
  subjects: Array<{
    id: number
    subject: string
    grade: number | null
    period: number | null
    date: string | null
  }>
  subjectRanges: Array<{
    id: number
    grade?: number | null
    subject: string
    label?: string | null
    content?: string | null
    sortOrder?: number | null
  }>
}

type Props = {
  examName: string
  examDates: string[]
  examStartDate: string
  examEndDate: string
  schoolId: number
  existingExam: ExistingExam | null | undefined
  defaultOpen?: boolean
}

function initTable(dates: string[]): TableState {
  const state: TableState = {}
  GRADES.forEach((grade) => {
    state[grade] = {}
    dates.forEach((date) => {
      state[grade][date] = {}
      PERIODS.forEach((period) => {
        state[grade][date][period] = ''
      })
    })
  })
  return state
}

export function useExamAccordion(props: Props) {
  const { examName, examDates, examStartDate, examEndDate, schoolId, existingExam, defaultOpen = false } = props
  const [open, setOpen] = useState(defaultOpen)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [table, setTable] = useState<TableState>(() => initTable(examDates))
  const [ranges, setRanges] = useState<RangesState>({})
  const router = useRouter()

  const resetFromExisting = () => {
    const newTable = initTable(examDates)
    existingExam?.subjects?.forEach((subject) => {
      if (!subject.date || !subject.grade || !subject.period) return
      if (newTable[subject.grade]?.[subject.date]?.[subject.period] !== undefined) {
        newTable[subject.grade][subject.date][subject.period] = subject.subject
      }
    })
    setTable(newTable)

    const nextRanges: RangesState = {}
    existingExam?.subjectRanges?.forEach((rangeItem) => {
      const grade = typeof rangeItem.grade === 'number' ? rangeItem.grade : 0
      if (!nextRanges[grade]) nextRanges[grade] = {}
      if (!nextRanges[grade][rangeItem.subject]) nextRanges[grade][rangeItem.subject] = []
      nextRanges[grade][rangeItem.subject].push({
        label: rangeItem.label ?? '',
        content: rangeItem.content ?? '',
      })
    })
    setRanges(nextRanges)
  }

  const resetToEmpty = () => {
    setTable(initTable(examDates))
    setRanges({})
  }

  useEffect(() => {
    if (!existingExam) return
    resetFromExisting()
    setEditing(false)
    setOpen(defaultOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingExam, examDates, defaultOpen])

  const subjectsFromTable = (grade: number) => {
    const subjectSet = new Set<string>()
    examDates.forEach((date) => {
      PERIODS.forEach((period) => {
        const value = table[grade]?.[date]?.[period]
        if (value && value.trim()) subjectSet.add(value.trim())
      })
    })
    return Array.from(subjectSet).sort((a, b) => a.localeCompare(b, 'ko'))
  }

  // 이미지 업로드로 시험표 파싱
  const uploadImage = async (file: File): Promise<void> => {
    setErrorMessage('')
    setParsing(true)
    const formData = new FormData()
    formData.append('image', file)
    formData.append('dates', JSON.stringify(examDates))

    const res = await fetch('/api/parse-exam', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setErrorMessage(data?.error ?? '인식 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.')
      setParsing(false)
      return
    }

    if (!data.subjects) {
      setErrorMessage('인식에 실패했습니다. 다시 시도해주세요.')
      setParsing(false)
      return
    }

    const newTable = initTable(examDates)
    data.subjects.forEach((subject: { grade: number; period: number; date: string; subject: string }) => {
      if (newTable[subject.grade]?.[subject.date]?.[subject.period] !== undefined) {
        newTable[subject.grade][subject.date][subject.period] = subject.subject
      }
    })
    setTable(newTable)
    setParsing(false)
  }

  // 시험 저장 (성공 시 true 반환)
  const submitExam = async (selectedGrade: number): Promise<boolean> => {
    setErrorMessage('')
    const subjects: { grade: number; period: number; date: string; subject: string }[] = []
    GRADES.forEach((grade) => {
      examDates.forEach((date) => {
        PERIODS.forEach((period) => {
          const subject = table[grade][date][period]
          if (subject.trim()) subjects.push({ grade, period, date, subject })
        })
      })
    })

    if (subjects.length === 0) {
      setErrorMessage('과목을 입력해주세요.')
      return false
    }

    setLoading(true)
    const res = await fetch('/api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId,
        title: examName,
        startDate: examStartDate,
        endDate: examEndDate,
        subjects,
        subjectRanges: GRADES.flatMap((grade) =>
          subjectsFromTable(grade).flatMap((subject) =>
            (ranges[grade]?.[subject] ?? []).map((item, index) => ({
              grade,
              subject,
              label: item.label,
              content: item.content,
              sortOrder: index,
            })),
          ),
        ),
      }),
    })

    setLoading(false)
    if (res.ok) {
      router.refresh()
      setOpen(false)
      setEditing(false)
      return true
    }
    setErrorMessage('저장에 실패했습니다.')
    return false
  }

  // 시험 삭제 (성공 시 true 반환)
  const deleteExam = async (): Promise<boolean> => {
    if (!existingExam) return false
    setErrorMessage('')
    setLoading(true)

    const res = await fetch('/api/exam', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId: existingExam.id }),
    })
    const data = await res.json().catch(() => ({}))

    setLoading(false)
    if (res.ok) {
      resetToEmpty()
      setEditing(false)
      setOpen(false)
      router.refresh()
      return true
    }
    setErrorMessage(data?.error ?? '삭제에 실패했습니다.')
    return false
  }

  return {
    open,
    setOpen,
    editing,
    setEditing,
    loading,
    parsing,
    errorMessage,
    table,
    setTable,
    ranges,
    setRanges,
    subjectsFromTable,
    uploadImage,
    submitExam,
    deleteExam,
    resetFromExisting,
    resetToEmpty,
  }
}
