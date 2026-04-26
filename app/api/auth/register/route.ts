import { NextRequest, NextResponse } from 'next/server'
import { LOGIN_ID_RE, normalizeLoginId } from '@/lib/loginId'
import { registerUser } from '@/lib/services/user'
import { ValidationError, httpStatusFromError } from '@/lib/services/errors'
import type { AccountKind } from '@/types/accountKind'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loginId, email, password, name } = body

    const accountKind: AccountKind = body?.accountKind === 'STUDENT' ? 'STUDENT' : 'OTHER'
    const rawName = typeof name === 'string' ? name.trim() : ''
    const loginNorm = typeof loginId === 'string' ? normalizeLoginId(loginId) : ''
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!rawName || !loginNorm || !emailNorm || !password) {
      return NextResponse.json({ error: '아이디, 이름, 이메일, 비밀번호를 모두 입력해주세요.' }, { status: 400 })
    }
    if (!LOGIN_ID_RE.test(loginNorm)) {
      return NextResponse.json(
        { error: '아이디는 영문 소문자와 숫자로 4~20자로 만들어 주세요. (밑줄 _ 은 선택)' },
        { status: 400 },
      )
    }
    if (!emailNorm.includes('@')) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }

    await registerUser({ loginId: loginNorm, email: emailNorm, password, name: rawName, accountKind })

    return NextResponse.json({ message: '인증 이메일을 발송했습니다.' })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: httpStatusFromError(e) })
    }
    console.error('POST /api/auth/register 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
