import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/services/user'
import { MailDeliveryError, httpStatusFromError } from '@/lib/services/errors'

const GENERIC_MESSAGE = '입력하신 이메일로 안내가 필요하면 메일을 보냈어요. 받은편지함을 확인해주세요.'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalized || !normalized.includes('@')) {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 })
    }

    await sendPasswordResetEmail(normalized)

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (e) {
    if (e instanceof MailDeliveryError) {
      return NextResponse.json({ error: e.message }, { status: httpStatusFromError(e) })
    }
    console.error('POST /api/auth/forgot-password 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
