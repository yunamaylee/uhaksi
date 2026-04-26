'use client'

import Link from 'next/link'
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { AccountKind } from '@/types/accountKind'
import Button from '@/components/ui/Button'
import { useAccountWithdraw } from '@/hooks/useAccountWithdraw'

export type AccountMyPanelUser = {
  loginId: string
  email: string
  name: string
  emailVerified: boolean
  accountKind: AccountKind
  studentVerifiedAt: string | null
  verifiedSchoolName: string | null
  isAdmin: boolean
  createdAt: string
}

const KIND_LABEL: Record<AccountKind, string> = {
  STUDENT: '학생',
  OTHER: '그 외',
}

const ink = '#111827'
const inkMuted = '#4b5563'
const inkSoft = '#6b7280'
const pageBg = '#f0f2f5'
const cardBg = '#ffffff'
const cardBorder = '1px solid rgba(17, 24, 39, 0.1)'
const rowRule = '1px solid rgba(17, 24, 39, 0.08)'

function formatJoined(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

const cardShell: CSSProperties = {
  background: cardBg,
  border: cardBorder,
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(17, 24, 39, 0.06)',
}

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  color: inkSoft,
  marginBottom: '6px',
}

const valueStyle: CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: ink,
  lineHeight: 1.5,
  letterSpacing: '-0.02em',
}

function ProfileRow({ children, isFirst, isLast }: { children: ReactNode; isFirst?: boolean; isLast?: boolean }) {
  return (
    <div
      style={{
        paddingTop: isFirst ? 0 : 18,
        paddingBottom: isLast ? 0 : 18,
        borderBottom: isLast ? 'none' : rowRule,
      }}
    >
      {children}
    </div>
  )
}

export default function AccountMyPanel({ user }: { user: AccountMyPanelUser }) {
  const [password, setPassword] = useState('')
  const { loading, message, withdraw } = useAccountWithdraw()

  const canWithdraw = user.emailVerified && !user.isAdmin

  const handleAccountWithdraw = async () => {
    if (!canWithdraw) return
    if (!password) return
    const confirmed = window.confirm(
      '정말 탈퇴할까요? 작성한 커뮤니티 글·댓글·시험 후기가 삭제되며 복구할 수 없습니다.',
    )
    if (!confirmed) return
    await withdraw(password)
  }

  return (
    <main style={{ background: pageBg, color: ink, minHeight: '100%', flex: 1 }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '52px 24px 64px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '-0.5px',
            color: ink,
            margin: '0 0 12px',
            lineHeight: 1.25,
          }}
        >
          마이페이지
        </h1>
        <p style={{ margin: '0 0 28px', color: inkMuted, fontSize: '15px', lineHeight: 1.65, fontWeight: 500 }}>
          가입 정보는 확인만 할 수 있어요. 수정이 필요하면 문의로 알려 주세요.
        </p>

        <div style={{ ...cardShell, padding: '24px 22px 22px' }}>
          <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ProfileRow isFirst>
              <dt style={labelStyle}>이름</dt>
              <dd style={valueStyle}>{user.name}</dd>
            </ProfileRow>
            <ProfileRow>
              <dt style={labelStyle}>아이디</dt>
              <dd style={valueStyle}>{user.loginId}</dd>
            </ProfileRow>
            <ProfileRow>
              <dt style={labelStyle}>이메일</dt>
              <dd style={{ ...valueStyle, wordBreak: 'break-all', fontWeight: 600 }}>{user.email}</dd>
            </ProfileRow>
            <ProfileRow>
              <dt style={labelStyle}>이메일 인증</dt>
              <dd style={{ ...valueStyle, fontWeight: 700, color: user.emailVerified ? '#166534' : '#b45309' }}>
                {user.emailVerified ? '완료' : '미완료 (로그인하려면 인증이 필요해요)'}
              </dd>
            </ProfileRow>
            <ProfileRow>
              <dt style={labelStyle}>계정 유형</dt>
              <dd style={valueStyle}>{KIND_LABEL[user.accountKind]}</dd>
            </ProfileRow>
            {user.accountKind === 'STUDENT' && (
              <ProfileRow>
                <dt style={labelStyle}>학생증 인증</dt>
                <dd style={valueStyle}>
                  {user.studentVerifiedAt ? (
                    <>완료{user.verifiedSchoolName ? ` · ${user.verifiedSchoolName}` : ''}</>
                  ) : (
                    <>
                      미완료 ·{' '}
                      <Link
                        href="/account/verify"
                        style={{ color: ink, textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: 800 }}
                      >
                        인증하러 가기
                      </Link>
                    </>
                  )}
                </dd>
              </ProfileRow>
            )}
            <ProfileRow isLast>
              <dt style={labelStyle}>가입일</dt>
              <dd style={{ ...valueStyle, fontWeight: 600, fontSize: '15px' }}>{formatJoined(user.createdAt)}</dd>
            </ProfileRow>
          </dl>
        </div>

        <div style={{ ...cardShell, marginTop: '16px', padding: '24px 22px 26px' }}>
          {user.isAdmin ? (
            <p style={{ margin: 0, fontSize: '14px', color: inkMuted, lineHeight: 1.65, fontWeight: 500 }}>
              관리자 계정은 이 화면에서 탈퇴할 수 없어요.
            </p>
          ) : (
            <>
              <h2 style={{ margin: '0 0 14px', fontSize: '17px', fontWeight: 900, color: ink, letterSpacing: '-0.3px' }}>
                회원 탈퇴
              </h2>
              <p style={{ margin: '0 0 22px', fontSize: '14px', lineHeight: 1.65, color: inkMuted, fontWeight: 500 }}>
                탈퇴하면 계정과 연결된 커뮤니티 글·댓글·시험 후기가 삭제되며 되돌릴 수 없어요.
                <br />
                이메일 인증이 완료된 계정만 탈퇴할 수 있어요.
              </p>
              {!canWithdraw ? (
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#b45309', lineHeight: 1.6 }}>
                  이메일 인증을 마친 뒤 탈퇴할 수 있어요.
                </p>
              ) : (
                <>
                  <label
                    style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: ink, marginBottom: '8px' }}
                  >
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    className="ui-input"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="현재 비밀번호"
                    style={{
                      width: '100%',
                      maxWidth: '360px',
                      boxSizing: 'border-box',
                      marginBottom: '14px',
                      fontSize: '15px',
                      borderColor: 'rgba(17, 24, 39, 0.14)',
                      background: cardBg,
                    }}
                  />
                  {message ? (
                    <p style={{ margin: '0 0 14px', fontSize: '14px', color: '#b91c1c', fontWeight: 600, lineHeight: 1.5 }}>
                      {message}
                    </p>
                  ) : null}
                  <Button type="button" variant="danger" disabled={loading} onClick={() => void handleAccountWithdraw()}>
                    {loading ? '처리 중…' : '탈퇴하기'}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
