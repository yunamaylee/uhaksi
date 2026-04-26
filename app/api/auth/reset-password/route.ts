import { NextRequest, NextResponse } from 'next/server'
import { resetPassword } from '@/lib/services/user'
import { ValidationError, httpStatusFromError } from '@/lib/services/errors'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()
    const rawToken = typeof token === 'string' ? token.trim() : ''
    const rawPassword = typeof password === 'string' ? password : ''

    if (!rawToken) {
      return NextResponse.json({ error: '유효하지 않은 링크예요.' }, { status: 400 })
    }
    if (rawPassword.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 해요.' }, { status: 400 })
    }

    await resetPassword(rawToken, rawPassword)

    return NextResponse.json({ message: '비밀번호가 변경됐어요. 로그인해주세요.' })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: httpStatusFromError(e) })
    }
    console.error('POST /api/auth/reset-password 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
