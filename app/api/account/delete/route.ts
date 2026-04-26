import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteAccount } from '@/lib/services/user'
import { NotFoundError, ForbiddenError, ValidationError, httpStatusFromError } from '@/lib/services/errors'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: '세션이 올바르지 않습니다.' }, { status: 401 })
    }

    let body: { password?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    const password = typeof body.password === 'string' ? body.password : ''
    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력해 주세요.' }, { status: 400 })
    }

    await deleteAccount(userId, password)

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ForbiddenError || e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: httpStatusFromError(e) })
    }
    console.error('POST /api/account/delete 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
