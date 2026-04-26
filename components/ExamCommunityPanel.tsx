'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ExamAnalysisPanel from '@/components/ExamAnalysisPanel'
import ExamReviewPanel from '@/components/ExamReviewPanel'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useSchedule } from '@/hooks/useSchedule'

type Props = {
  schoolId: number
}

export default function ExamCommunityPanel({ schoolId }: Props) {
  const router = useRouter()
  const { status } = useSession()
  const { loadingExams, exams, selectedExamTitle, setSelectedExamTitle } = useSchedule(schoolId)
  const [grade, setGrade] = useState<1 | 2 | 3>(2)
  const [showWrite, setShowWrite] = useState(false)
  const [reviewReloadKey, setReviewReloadKey] = useState(0)

  const isAuthed = status === 'authenticated'

  const header = useMemo(() => {
    if (loadingExams) return '불러오는 중...'
    if (exams.length === 0) return '시험이 없어요'
    return selectedExamTitle ?? '시험 선택'
  }, [loadingExams, exams.length, selectedExamTitle])

  if (!isAuthed) {
    // “데이터 없는 상태에서 블러 더미가 보이는” 문제 제거:
    // 로그인 전에는 실제 컨텐츠를 보여주지 않고, 유도만 합니다.
    return (
      <Card pastel="yellow" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '10px' }}>
          <Badge tone="accent">익명 총평</Badge>
        </div>
        <p className="ui-title" style={{ margin: 0, color: 'var(--text)' }}>
          로그인 후 확인할 수 있어요
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
          여기는 <b>개별 후기</b>가 아니라, 모두의 후기를 <b>익명으로 집계</b>한 “총평/차트”만 보여요.
          <br />
          로그인하면 {header} 기준으로 확인하고, 내 후기도 남길 수 있어요.
        </p>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" onClick={() => router.push('/login')} variant="primary" size="md">
            로그인하기
          </Button>
        </div>
      </Card>
    )
  }

  if (loadingExams) {
    return <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>불러오는 중...</p>
  }

  if (exams.length === 0 || !selectedExamTitle) {
    return (
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
        아직 표시할 시험이 없어요.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Card pastel="mint" style={{ padding: '14px' }}>
        <div style={{ marginBottom: '10px' }}>
          <Badge tone="accent">익명 집계</Badge>
        </div>
        <p className="ui-title" style={{ margin: 0, color: 'var(--text)' }}>
          총평/차트
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
          개별 후기는 공개되지 않아요. 여러 명의 후기를 합쳐서만 보여요.
        </p>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {exams.map((e) => (
            <Chip
              key={e.name}
              label={e.name}
              selected={e.name === selectedExamTitle}
              variant="tab"
              onClick={() => {
                setSelectedExamTitle(e.name)
                setShowWrite(false)
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
          {([1, 2, 3] as const).map((g) => (
            <Chip
              key={g}
              label={`${g}학년`}
              selected={g === grade}
              variant="tab"
              onClick={() => {
                setGrade(g)
                setShowWrite(false)
              }}
            />
          ))}
        </div>
      </Card>

      <ExamAnalysisPanel schoolId={schoolId} examTitle={selectedExamTitle} grade={grade} reloadKey={reviewReloadKey} />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="button"
          onClick={() => setShowWrite((v) => !v)}
          variant={showWrite ? 'secondary' : 'primary'}
          size="md"
        >
          {showWrite ? '작성 닫기' : '내 후기 남기기'}
        </Button>
      </div>

      {showWrite && (
        <div>
          <ExamReviewPanel
            schoolId={schoolId}
            examTitle={selectedExamTitle}
            grade={grade}
            onSaved={() => setReviewReloadKey((k) => k + 1)}
            onDeleted={() => setReviewReloadKey((k) => k + 1)}
          />
        </div>
      )}
    </div>
  )
}

