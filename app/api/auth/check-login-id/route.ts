import { NextRequest, NextResponse } from 'next/server'
import { checkLoginIdAvailability } from '@/lib/services/user'

// POST { loginId } — 회원가입 시 아이디 사용 가능 여부 확인
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ available: false, reason: 'bad_request' as const }, { status: 400 })
  }

  const raw = typeof (body as { loginId?: unknown }).loginId === 'string'
    ? (body as { loginId: string }).loginId
    : ''

  try {
    const result = await checkLoginIdAvailability(raw)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ available: false, reason: 'server' as const }, { status: 500 })
  }
}
