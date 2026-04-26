'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import {
  COMMUNITY_TAB_LABELS,
  type CommunityCategory,
  communityShell as shell,
} from '@/components/CommunityShared'
import { useCommunityPostEdit } from '@/hooks/useCommunityPostEdit'

export type CommunityEditInitial = {
  id: number
  category: CommunityCategory
  title: string | null
  body: string
  imageData: string | null
}

export type CommunityPostEditGate = 'ok' | 'login' | 'forbidden' | 'error'

type Props = {
  gate: CommunityPostEditGate
  postId: number
  initial: CommunityEditInitial | null
  loadError?: string
}

export default function CommunityPostEditClient({ gate, postId, initial, loadError = '' }: Props) {
  const { title, setTitle, body, setBody, imageFile, setImageFile, submitMessage, submitting, submit } =
    useCommunityPostEdit({ postId, initial })

  const loaded = gate === 'ok' && initial ? initial : null

  if (gate === 'login') {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <Card pastel="yellow" style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ margin: 0, fontWeight: 800 }}>로그인이 필요해요</p>
          <Link
            href="/login"
            style={{ marginTop: '12px', display: 'inline-block', fontWeight: 700, color: 'var(--accent-strong)' }}
          >
            로그인하기
          </Link>
        </Card>
      </main>
    )
  }

  if (gate === 'forbidden') {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <Card pastel="yellow" style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ margin: 0, fontWeight: 800 }}>수정할 수 없어요</p>
          <Link href="/community" style={{ marginTop: '12px', display: 'inline-block' }}>
            커뮤니티로
          </Link>
        </Card>
      </main>
    )
  }

  if (gate === 'error' || !loaded) {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <p style={{ color: '#dc2626' }}>{loadError || '글을 찾을 수 없어요.'}</p>
        <Link href={Number.isFinite(postId) ? `/community/post/${postId}` : '/community'}>← 돌아가기</Link>
      </main>
    )
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div
          style={{
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#111827' }}>글 수정</h1>
          <Link
            href={`/community/post/${postId}`}
            style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textDecoration: 'none' }}
          >
            취소
          </Link>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#9ca3af' }}>
          {COMMUNITY_TAB_LABELS[loaded.category]} · 게시판은 바꿀 수 없어요.
        </p>

        <section
          style={{ background: shell.cardBg, border: `1px solid ${shell.line}`, borderRadius: '14px', padding: '22px' }}
        >
          {loaded.category === 'STUDY_PROOF' ? (
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.55 }}>
              사진을 바꾸려면 새 파일을 선택하세요. 선택하지 않으면 기존 사진이 유지돼요.
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
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
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
            {loaded.category === 'STUDY_PROOF' ? (
              <div style={{ marginTop: '14px' }}>
                {loaded.imageData && !imageFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={loaded.imageData}
                    alt=""
                    style={{
                      maxWidth: '100%',
                      borderRadius: '10px',
                      marginBottom: '10px',
                      border: `1px solid ${shell.lineSoft}`,
                    }}
                  />
                ) : null}
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>새 사진 (선택)</label>
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
                {submitting ? '저장 중…' : '저장하기'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
