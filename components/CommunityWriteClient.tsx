'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import {
  type CommunityCategory,
  COMMUNITY_TAB_LABELS,
  communityShell as shell,
} from '@/components/CommunityShared'
import { useCommunityWrite } from '@/hooks/useCommunityWrite'

const CATEGORIES: CommunityCategory[] = ['QA', 'STUDY_TIP', 'STUDY_PROOF']

export type CommunityWriteGate = 'ok' | 'login' | 'forbidden'

type Props = {
  gate: CommunityWriteGate
  initialCategory: CommunityCategory
}

export default function CommunityWriteClient({ gate, initialCategory }: Props) {
  const { tab, setTab, title, setTitle, body, setBody, imageFile, setImageFile, submitMessage, submitting, submit } =
    useCommunityWrite({ initialCategory })

  if (gate === 'login' || gate === 'forbidden') {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <Card pastel="yellow" style={{ padding: '20px' }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>글쓰기를 이용할 수 없어요</p>
            <p style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
              로그인 및 학생 인증(또는 관리자) 후 이용할 수 있어요.
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link href="/community" style={{ fontWeight: 800, color: 'var(--accent-strong)', textDecoration: 'none' }}>
                ← 커뮤니티로
              </Link>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#111827' }}>
            글쓰기
          </h1>
          <Link
            href={`/community?category=${tab}`}
            style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textDecoration: 'none' }}
          >
            ← 목록으로
          </Link>
        </div>

        <section
          style={{
            background: shell.cardBg,
            border: `1px solid ${shell.line}`,
            borderRadius: '14px',
            padding: '22px',
            boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 800, color: '#9ca3af' }}>게시판</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {CATEGORIES.map((category) => {
              const isActive = tab === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setTab(category)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '999px',
                    border: `1px solid ${isActive ? shell.tabOn : shell.tabBorder}`,
                    background: isActive ? shell.tabOn : shell.tabOff,
                    color: isActive ? '#ffffff' : '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  {COMMUNITY_TAB_LABELS[category]}
                </button>
              )
            })}
          </div>

          {tab === 'STUDY_PROOF' ? (
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.55 }}>
              사진은 AI로 검사합니다. 시험지·답안으로 보이면 올릴 수 없어요.
            </p>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <input
              className="ui-input"
              placeholder="제목 (선택)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                marginBottom: '10px',
                fontSize: '14px',
                boxSizing: 'border-box',
                border: `1px solid ${shell.line}`,
                borderRadius: '10px',
                background: '#fafafa',
              }}
            />
            <textarea
              className="ui-input"
              placeholder={
                tab === 'QA'
                  ? '질문이나 답변을 적어 주세요.'
                  : tab === 'STUDY_TIP'
                    ? '공부 팁을 적어 주세요.'
                    : '오늘 공부 인증 한 줄과 함께 사진을 올려 주세요.'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              style={{
                width: '100%',
                resize: 'vertical',
                fontSize: '14px',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                border: `1px solid ${shell.line}`,
                borderRadius: '10px',
                background: '#fafafa',
              }}
            />
            {tab === 'STUDY_PROOF' ? (
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>사진 (필수)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(ev) => setImageFile(ev.target.files?.[0] ?? null)}
                  style={{ display: 'block', marginTop: '6px', fontSize: '13px' }}
                />
              </div>
            ) : null}
            {submitMessage ? (
              <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#dc2626' }}>{submitMessage}</p>
            ) : null}
            <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary" size="md" disabled={submitting}>
                {submitting ? '등록 중…' : '등록하기'}
              </Button>
              <Link href="/community" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="secondary" size="md">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
