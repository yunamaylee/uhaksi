'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { LOGIN_ID_RE, normalizeLoginId } from '@/lib/loginId'

type IdCheck = 'idle' | 'short' | 'invalid' | 'checking' | 'available' | 'taken' | 'error'

function LoginPageInner() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginId, setLoginId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [accountKind, setAccountKind] = useState<'STUDENT' | 'OTHER' | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [idCheck, setIdCheck] = useState<IdCheck>('idle')
  const checkSeq = useRef(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified')
  const error = searchParams.get('error')
  const resetOk = searchParams.get('reset')

  useEffect(() => {
    if (mode !== 'register') {
      setIdCheck('idle')
      return
    }
    const raw = loginId.trim()
    if (!raw) {
      setIdCheck('idle')
      return
    }
    const norm = normalizeLoginId(loginId)
    if (norm.length < 4) {
      setIdCheck('short')
      return
    }
    if (!LOGIN_ID_RE.test(norm)) {
      setIdCheck('invalid')
      return
    }

    setIdCheck('checking')
    const seq = ++checkSeq.current
    const t = setTimeout(async () => {
      if (seq !== checkSeq.current) return
      try {
        const r = await fetch('/api/auth/check-login-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId: raw }),
        })
        let d: { available?: boolean; reason?: string }
        try {
          d = await r.json()
        } catch {
          if (seq === checkSeq.current) setIdCheck('error')
          return
        }
        if (seq !== checkSeq.current) return
        if (d.available === true) {
          setIdCheck('available')
          return
        }
        if (d.reason === 'taken') {
          setIdCheck('taken')
          return
        }
        if (d.reason === 'format' || d.reason === 'empty') {
          setIdCheck('invalid')
          return
        }
        setIdCheck('error')
      } catch {
        if (seq === checkSeq.current) setIdCheck('error')
      }
    }, 420)
    return () => {
      clearTimeout(t)
    }
  }, [loginId, mode])

  const handleLogin = async () => {
    setLoading(true)
    const result = await signIn('credentials', {
      loginId: loginId.trim(),
      password,
      redirect: false,
    })

    if (result?.ok) {
      const raw = searchParams.get('callbackUrl')
      const safe =
        raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
      router.push(safe)
      setLoading(false)
      return
    }
    setMessage('아이디 또는 비밀번호가 올바르지 않습니다. (이메일 인증을 마쳤는지도 확인해주세요.)')
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: loginId.trim(),
        email: email.trim(),
        password,
        name: name.trim(),
        accountKind,
      }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage('인증 이메일을 발송했습니다. 이메일을 확인해주세요.')
      setLoading(false)
      return
    }
    setMessage(data.error)
    setLoading(false)
  }

  const inputStyle = {
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box' as const,
  }

  return (
    <main
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        background: 'var(--pastel-blue)',
        padding: '24px',
      }}
    >
      <div className="ui-card" style={{ padding: '28px', width: '100%', maxWidth: '420px', boxShadow: 'var(--ui-shadow-lg)' }}>
        <h1 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 1000, marginBottom: '8px', letterSpacing: '-0.4px' }}>
          {mode === 'login' ? '로그인' : '회원가입'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '22px', lineHeight: 1.6 }}>
          {mode === 'login'
            ? '우리학교시험에 오신걸 환영해요'
            : '아이디·이메일로 가입하고, 이메일로 인증을 완료해 주세요'}
        </p>

        {verified && (
          <div
            style={{
              background: 'var(--pastel-mint)',
              border: '1px solid rgba(17, 24, 39, 0.08)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: 'var(--text)',
              fontSize: '14px',
            }}
          >
            이메일 인증이 완료됐어요! 로그인해주세요.
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(180, 35, 24, 0.08)',
              border: '1px solid rgba(180, 35, 24, 0.18)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            유효하지 않은 인증 링크입니다.
          </div>
        )}

        {resetOk === 'ok' && (
          <div
            style={{
              background: 'var(--pastel-mint)',
              border: '1px solid rgba(17, 24, 39, 0.08)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: 'var(--text)',
              fontSize: '14px',
            }}
          >
            비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                className="ui-input"
                type="text"
                placeholder="이름 (예: 홍길동)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--muted)', fontWeight: 500 }}>
                이름은 <b style={{ color: 'var(--text)' }}>본명</b>을 사용해 주세요. 이후 학생증 인증 시 가입 정보와
                같아야 해요.
              </p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <input
              className="ui-input"
              type="text"
              placeholder={mode === 'login' ? '아이디' : '아이디 (소문자·숫자, 4~20자)'}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={inputStyle}
            />
            {mode === 'register' ? (
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  minHeight: '17px',
                  lineHeight: 1.45,
                  color:
                    idCheck === 'available'
                      ? '#15803d'
                      : idCheck === 'taken' || idCheck === 'invalid'
                        ? '#b91c1c'
                        : idCheck === 'error'
                          ? '#b45309'
                          : 'var(--muted)',
                  fontWeight:
                    idCheck === 'available' || idCheck === 'taken' || idCheck === 'error' ? 600 : 500,
                }}
              >
                {idCheck === 'idle' ? '\u00a0' : null}
                {idCheck === 'short' ? '아이디는 4자 이상 입력해주세요.' : null}
                {idCheck === 'invalid'
                  ? '영문 소문자와 숫자만 4~20자로 입력해 주세요. (밑줄 _ 은 넣어도 되고 생략해도 돼요.)'
                  : null}
                {idCheck === 'checking' ? '아이디 확인 중…' : null}
                {idCheck === 'available' ? '사용할 수 있는 아이디예요.' : null}
                {idCheck === 'taken' ? '이미 사용 중인 아이디예요.' : null}
                {idCheck === 'error'
                  ? '아이디 확인에 실패했어요. 잠시 후 다시 시도해 주세요.'
                  : null}
              </p>
            ) : null}
          </div>
          {mode === 'register' && (
            <input
              className="ui-input"
              type="email"
              placeholder="이메일 주소 (인증·비밀번호 찾기에 사용)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          )}
          {mode === 'register' && (
            <div style={{ marginTop: '4px', width: '100%' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
                계정 유형
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  fontSize: '11px',
                  color: 'var(--text)',
                  lineHeight: 1.45,
                  marginBottom: '8px',
                }}
              >
                <input
                  type="radio"
                  name="accountKind"
                  checked={accountKind === 'STUDENT'}
                  onChange={() => setAccountKind('STUDENT')}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <span style={{ wordBreak: 'keep-all', minWidth: 0, flex: 1 }}>
                  <b>학생</b> (중·고등학교){' '}
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                    — 커뮤니티 이용 가능, 가입 후 학생증 인증이 필요해요.
                  </span>
                </span>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  fontSize: '11px',
                  color: 'var(--text)',
                  lineHeight: 1.45,
                }}
              >
                <input
                  type="radio"
                  name="accountKind"
                  checked={accountKind === 'OTHER'}
                  onChange={() => setAccountKind('OTHER')}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <span style={{ wordBreak: 'keep-all', minWidth: 0, flex: 1 }}>
                  <b>그 외</b>{' '}
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                    — 시험 정보 검색·이용은 가능하고, 학생 커뮤니티는 이용할 수 없어요.
                  </span>
                </span>
              </label>
            </div>
          )}
          <input
            className="ui-input"
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
            style={inputStyle}
          />
        </div>

        {mode === 'register' && (
          <p style={{ margin: '-8px 0 16px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
            <b>아이디</b>는 우리 서비스용이며 <b>이메일</b>은 인증용으로 사용됩니다.
          </p>
        )}

        {message && (
          <p style={{ color: 'var(--accent-strong)', fontSize: '14px', marginBottom: '16px' }}>
            {message}
          </p>
        )}

        <Button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={
            loading ||
            (mode === 'register' &&
              (idCheck !== 'available' ||
                !name.trim() ||
                !email.trim().includes('@') ||
                password.length < 8 ||
                accountKind === null))
          }
          variant="primary"
          style={{ width: '100%', padding: '12px', fontSize: '15px', marginBottom: '16px' }}
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </Button>

        {mode === 'login' && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.6 }}>
            <Link href="/forgot?tab=id" style={{ color: 'var(--accent-strong)', fontWeight: 800, textDecoration: 'none' }}>
              아이디 찾기
            </Link>
            <span style={{ margin: '0 10px', opacity: 0.45 }}>|</span>
            <Link href="/forgot?tab=password" style={{ color: 'var(--accent-strong)', fontWeight: 800, textDecoration: 'none' }}>
              비밀번호 찾기
            </Link>
          </p>
        )}

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
          {mode === 'login' ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setMessage('')
              if (mode === 'login') {
                setIdCheck('idle')
                setAccountKind(null)
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-strong)', cursor: 'pointer', fontSize: '14px', fontWeight: 900 }}
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
