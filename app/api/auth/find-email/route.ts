import { NextRequest, NextResponse } from 'next/server'
import { findLoginId } from '@/lib/services/user'
import { NotFoundError, httpStatusFromError } from '@/lib/services/errors'

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json()
    const rawName = typeof name === 'string' ? name.trim() : ''
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!rawName) {
      return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
    }
    if (!emailNorm || !emailNorm.includes('@')) {
      return NextResponse.json({ error: '가입 시 등록한 이메일 주소를 입력해주세요.' }, { status: 400 })
    }

    const loginId = await findLoginId(rawName, emailNorm)
    return NextResponse.json({ ok: true, loginId })
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: httpStatusFromError(e) })
    }
    console.error('POST /api/auth/find-email 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
