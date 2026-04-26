'use client'

import { useEffect, useState, useRef, useId } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import ExamFriendsSummary from '@/components/ExamFriendsSummary'
import type { ExamAggBundle } from '@/lib/examReviewAggregatesForSchool'
import ExamReviewModal from '@/components/ExamReviewModal'
import { IconCamera, IconPencil, IconTrash } from '@/components/icons/ToolbarIcons'
import { useExamAccordion } from '@/hooks/useExamAccordion'

type ExamPeriod = {
  name: string
  dates: string[]
  startDate: string
  endDate: string
}

type Props = {
  exam: ExamPeriod
  schoolId: number
  schoolName: string
  defaultOpen?: boolean
  reviewAggregateBundle?: ExamAggBundle
  existingExam?: {
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
  } | null
}

function formatDate(yyyymmdd: string) {
  const month = parseInt(yyyymmdd.slice(4, 6))
  const day = parseInt(yyyymmdd.slice(6, 8))
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const date = new Date(parseInt(yyyymmdd.slice(0, 4)), month - 1, day)
  return `${month}/${day} (${weekdays[date.getDay()]})`
}

const GRADES = [1, 2, 3]
const PERIODS = [1, 2, 3, 4]

const SCAN_CAMERA_HINT_TITLE = '시험범위 통신문을 업로드하면 시험 과목이 한 번에 채워져요.'
const SCAN_CAMERA_HINT_LINES = ['⭐ 시험범위 통신문을 업로드하면', '시험 과목이 한 번에 채워져요.'] as const

export default function ExamAccordion({
  exam,
  schoolId,
  existingExam,
  defaultOpen = false,
  reviewAggregateBundle,
}: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3>(1)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewReloadKey, setReviewReloadKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanCameraTipId = useId()

  const {
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
  } = useExamAccordion({
    examName: exam.name,
    examDates: exam.dates,
    examStartDate: exam.startDate,
    examEndDate: exam.endDate,
    schoolId,
    existingExam: existingExam ?? null,
    defaultOpen,
  })

  const readOnly = !!existingExam && !editing
  const showInputs = !!session && editing
  const inputStyle = { fontSize: '12px', textAlign: 'center' as const, minWidth: '0px' }

  const pickSubjectFromCell = (date: string, period: number) => {
    const raw = (table[selectedGrade]?.[date]?.[period] ?? '').trim()
    if (!raw || raw === '-') {
      setSelectedSubject(null)
      setSelectedPeriod(null)
      return
    }
    setSelectedSubject(raw)
    setSelectedPeriod(period)
  }

  const handleImageUpload = async (file: File) => {
    if (existingExam && !editing) {
      const confirmed = window.confirm('이미 등록된 시험입니다. 내용을 수정할까요?')
      if (!confirmed) return
      setEditing(true)
    }
    if (!existingExam && !editing) setEditing(true)
    await uploadImage(file)
  }

  const handleExamSubmit = async () => {
    if (!session) {
      router.push('/login')
      return
    }
    const confirmed = window.confirm(existingExam ? '수정 내용을 저장할까요?' : '시험 정보를 등록할까요?')
    if (!confirmed) return
    await submitExam(selectedGrade)
  }

  const handleExamDelete = async () => {
    if (!session) {
      router.push('/login')
      return
    }
    if (!existingExam) return
    const confirmed = window.confirm('정말 삭제할까요? 삭제하면 복구할 수 없습니다.')
    if (!confirmed) return
    await deleteExam()
  }

  const handleEditCancel = () => {
    if (existingExam) {
      resetFromExisting()
      setEditing(false)
      return
    }
    resetToEmpty()
    setEditing(false)
  }

  useEffect(() => {
    setSelectedSubject(null)
    setSelectedPeriod(null)
  }, [selectedGrade])

  useEffect(() => {
    setReviewModalOpen(false)
  }, [selectedSubject, selectedGrade])

  return (
    <div style={{ borderBottom: '1px solid rgba(17, 24, 39, 0.08)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'transparent',
          padding: '14px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span className="ui-subtitle" style={{ color: 'var(--text)' }}>
          {exam.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {existingExam && <span className="ui-meta" style={{ fontWeight: 700 }}>등록됨</span>}
          <span className="ui-meta" style={{ color: 'var(--muted)', fontSize: '13px' }}>
            {formatDate(exam.startDate)} ~ {formatDate(exam.endDate)}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '16px 0 20px', background: 'transparent' }}>
          <>
            <div
              style={{
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                rowGap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {GRADES.map((grade) => (
                  <Chip
                    key={grade}
                    label={`${grade}학년`}
                    selected={selectedGrade === grade}
                    variant="tab"
                    onClick={() => setSelectedGrade(grade as 1 | 2 | 3)}
                  />
                ))}
              </div>
              {session ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginLeft: 'auto',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleImageUpload(file)
                    }}
                  />
                  <span className="exam-scan-camera-wrap">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={parsing || (!editing && !!existingExam)}
                      variant="ghost"
                      size="sm"
                      title={parsing ? '인식 중…' : `사진으로 입력 — ${SCAN_CAMERA_HINT_TITLE}`}
                      aria-label={parsing ? '인식 중' : '사진으로 입력'}
                      aria-describedby={parsing ? undefined : scanCameraTipId}
                      style={{
                        minWidth: '36px',
                        padding: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                      }}
                    >
                      <IconCamera size={18} />
                    </Button>
                    <span id={scanCameraTipId} role="tooltip" className="exam-scan-camera-tip">
                      {SCAN_CAMERA_HINT_LINES.map((line, index) => (
                        <span key={index} className="exam-scan-camera-tip__line">
                          {line}
                        </span>
                      ))}
                    </span>
                  </span>
                  {!existingExam && !editing && (
                    <Button
                      type="button"
                      onClick={() => setEditing(true)}
                      variant="secondary"
                      size="sm"
                      title="입력"
                      aria-label="입력"
                    >
                      입력
                    </Button>
                  )}
                  {existingExam && !editing && (
                    <>
                      <Button
                        type="button"
                        onClick={() => setEditing(true)}
                        variant="ghost"
                        size="sm"
                        title="수정"
                        aria-label="수정"
                        style={{
                          minWidth: '36px',
                          padding: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                        }}
                      >
                        <IconPencil size={18} />
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleExamDelete()}
                        variant="ghostDanger"
                        size="sm"
                        title="삭제"
                        aria-label="삭제"
                        style={{
                          minWidth: '36px',
                          padding: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                        }}
                      >
                        <IconTrash size={18} />
                      </Button>
                    </>
                  )}
                  {editing && (
                    <Button
                      type="button"
                      onClick={handleEditCancel}
                      disabled={loading || parsing}
                      variant="secondary"
                      size="sm"
                      title="취소"
                      aria-label="취소"
                    >
                      취소
                    </Button>
                  )}
                  {parsing && (
                    <span className="ui-meta" style={{ fontSize: '12px' }}>
                      읽는 중…
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {!session && (
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '12px' }}>
                로그인 후 시험 과목을 등록할 수 있어요.
              </p>
            )}

            {errorMessage && (
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#dc2626' }}>{errorMessage}</p>
            )}

            <div
              style={{
                marginBottom: '12px',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
              }}
              aria-busy={parsing}
            >
              <table className="ui-table ui-scheduleTable">
                <thead>
                  <tr>
                    <th style={{ width: '64px', textAlign: 'center' }}>교시</th>
                    {exam.dates.map((date) => (
                      <th key={date} style={{ textAlign: 'center' }}>
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period) => (
                    <tr key={period} className={selectedPeriod === period ? 'ui-scheduleRow-selected' : undefined}>
                      <td style={{ width: '64px', textAlign: 'center', fontWeight: 900, fontSize: '12px' }}>
                        {period}교시
                      </td>
                      {exam.dates.map((date) => {
                        const cellRaw = (table[selectedGrade][date][period] ?? '').trim()
                        const hasSubject = !!cellRaw && cellRaw !== '-'
                        return (
                          <td key={date} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            {!showInputs ? (
                              <button
                                type="button"
                                className={[
                                  'ui-scheduleCellBtn',
                                  hasSubject ? 'ui-scheduleCellBtn-interactive' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                onClick={() => pickSubjectFromCell(date, period)}
                                disabled={!hasSubject}
                                title={hasSubject ? cellRaw : undefined}
                              >
                                <div className="ui-cellText" title={cellRaw || undefined}>
                                  {cellRaw ? cellRaw : <span className="ui-cellText-muted">-</span>}
                                </div>
                              </button>
                            ) : (
                              <input
                                className="ui-input ui-pill-input ui-scheduleInput"
                                value={table[selectedGrade][date][period]}
                                onChange={(e) =>
                                  setTable((prev) => ({
                                    ...prev,
                                    [selectedGrade]: {
                                      ...prev[selectedGrade],
                                      [date]: { ...prev[selectedGrade][date], [period]: e.target.value },
                                    },
                                  }))
                                }
                                onFocus={() => pickSubjectFromCell(date, period)}
                                placeholder="-"
                                disabled={!session}
                                style={{ ...inputStyle, textAlign: 'center' as const, fontSize: '12px' }}
                              />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsing ? (
                <div
                  role="status"
                  aria-live="polite"
                  aria-label="시험표 이미지를 읽는 중입니다"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '14px',
                    background: 'rgba(255, 255, 255, 0.86)',
                    backdropFilter: 'blur(3px)',
                    WebkitBackdropFilter: 'blur(3px)',
                    zIndex: 4,
                  }}
                >
                  <span className="ui-spinner" aria-hidden />
                  <span className="ui-meta" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>
                    읽는 중…
                  </span>
                </div>
              ) : null}
            </div>

            <p className="ui-meta" style={{ margin: '10px 0 0', fontSize: '12px', lineHeight: 1.5 }}>
              {showInputs
                ? '셀을 누르면 아래에서 그 과목 범위를 적을 수 있어요.'
                : '과목 칸을 누르면 아래에 범위가 나와요.'}
            </p>

            {(existingExam || session) && (
              <div style={{ marginBottom: '18px' }}>
                {subjectsFromTable(selectedGrade).length === 0 ? (
                  <p style={{ margin: '18px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                    {session && editing ? '표에 과목을 채운 뒤 범위를 적을 수 있어요.' : '이 학년에 등록된 과목이 없어요.'}
                  </p>
                ) : !selectedSubject ? null : (
                  <>
                    <div className="ui-divider" style={{ margin: '20px 0 16px' }} />
                    <p className="ui-subtitle" style={{ margin: '0 0 14px', color: 'var(--text)' }}>
                      {selectedSubject} 시험범위
                      <span className="ui-meta" style={{ marginLeft: '8px', fontWeight: 600 }}>
                        {selectedGrade}학년
                      </span>
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(ranges[selectedGrade]?.[selectedSubject] ?? []).length === 0 && readOnly && (
                        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>등록된 시험 범위가 없습니다.</p>
                      )}

                      {(ranges[selectedGrade]?.[selectedSubject] ?? []).map((item, index) => {
                        if (readOnly) {
                          return (
                            <div key={index}>
                              {index > 0 && <div className="ui-divider" style={{ margin: '10px 0' }} />}
                              <p className="ui-meta" style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--text)' }}>
                                {item.label?.trim() ? item.label : '범위'}
                              </p>
                              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                {item.content?.trim() ? item.content : '-'}
                              </p>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={index}
                            style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '8px', alignItems: 'start' }}
                          >
                            <input
                              className="ui-input"
                              value={item.label}
                              onChange={(e) => {
                                const value = e.target.value
                                setRanges((prev) => {
                                  const gradeMap = { ...(prev[selectedGrade] ?? {}) }
                                  const list = [...(gradeMap[selectedSubject] ?? [])]
                                  list[index] = { ...list[index], label: value }
                                  gradeMap[selectedSubject] = list
                                  return { ...prev, [selectedGrade]: gradeMap }
                                })
                              }}
                              placeholder="구분(예: 교과서)"
                              style={{ ...inputStyle, textAlign: 'left' as const, borderRadius: '10px' }}
                            />
                            <textarea
                              className="ui-textarea"
                              value={item.content}
                              onChange={(e) => {
                                const value = e.target.value
                                setRanges((prev) => {
                                  const gradeMap = { ...(prev[selectedGrade] ?? {}) }
                                  const list = [...(gradeMap[selectedSubject] ?? [])]
                                  list[index] = { ...list[index], content: value }
                                  gradeMap[selectedSubject] = list
                                  return { ...prev, [selectedGrade]: gradeMap }
                                })
                              }}
                              placeholder="범위 내용을 입력하세요 (여러 줄 가능)"
                              rows={2}
                              style={{ width: '100%', fontSize: '12px', borderRadius: '10px' }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                setRanges((prev) => {
                                  const gradeMap = { ...(prev[selectedGrade] ?? {}) }
                                  const list = [...(gradeMap[selectedSubject] ?? [])]
                                  list.splice(index, 1)
                                  gradeMap[selectedSubject] = list
                                  return { ...prev, [selectedGrade]: gradeMap }
                                })
                              }}
                              variant="secondary"
                              style={{ padding: '8px 10px', fontSize: '12px' }}
                            >
                              삭제
                            </Button>
                          </div>
                        )
                      })}

                      <div>
                        <Button
                          type="button"
                          onClick={() => {
                            setRanges((prev) => {
                              const gradeMap = { ...(prev[selectedGrade] ?? {}) }
                              const list = [...(gradeMap[selectedSubject] ?? [])]
                              list.push({ label: '', content: '' })
                              gradeMap[selectedSubject] = list
                              return { ...prev, [selectedGrade]: gradeMap }
                            })
                          }}
                          variant="secondary"
                          style={{
                            opacity: readOnly ? 0.0 : 1,
                            height: readOnly ? 0 : undefined,
                            paddingTop: readOnly ? 0 : undefined,
                            paddingBottom: readOnly ? 0 : undefined,
                            borderWidth: readOnly ? 0 : undefined,
                          }}
                          disabled={readOnly}
                        >
                          + 범위 항목 추가
                        </Button>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '22px',
                        padding: '20px 18px 18px',
                        borderRadius: '14px',
                        border: '1px solid rgba(17, 24, 39, 0.12)',
                        background: 'rgba(255, 255, 255, 0.98)',
                        boxShadow: '0 2px 8px rgba(17, 24, 39, 0.06)',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 16px',
                          fontSize: '16px',
                          fontWeight: 800,
                          color: 'var(--text)',
                          letterSpacing: '-0.35px',
                          lineHeight: 1.35,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span aria-hidden style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>
                          🤔
                        </span>
                        <span>친구들은 시험 치고 이렇게 느꼈대요</span>
                      </p>
                      <ExamFriendsSummary
                        schoolId={schoolId}
                        examTitle={exam.name}
                        grade={selectedGrade}
                        reloadKey={reviewReloadKey}
                        omitSectionTitle
                        locked={!session}
                        initialByGrade={reviewAggregateBundle}
                      />
                      {session && (
                        <>
                          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="primary" size="md" onClick={() => setReviewModalOpen(true)}>
                              내 후기 남기기
                            </Button>
                          </div>
                          <ExamReviewModal
                            open={reviewModalOpen}
                            onClose={() => setReviewModalOpen(false)}
                            schoolId={schoolId}
                            examTitle={exam.name}
                            grade={selectedGrade}
                            onSaved={() => {
                              setReviewModalOpen(false)
                              setReviewReloadKey((k) => k + 1)
                            }}
                            onDeleted={() => {
                              setReviewModalOpen(false)
                              setReviewReloadKey((k) => k + 1)
                            }}
                          />
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {session && editing && (
              <Button onClick={() => void handleExamSubmit()} disabled={loading || parsing} variant="primary">
                {loading ? '저장 중...' : existingExam ? '수정 저장' : '저장'}
              </Button>
            )}
          </>
        </div>
      )}
    </div>
  )
}
