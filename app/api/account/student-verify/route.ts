import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyStudentAccount } from '@/lib/services/user'
import { NotFoundError, ForbiddenError, ValidationError, httpStatusFromError } from '@/lib/services/errors'

const MAX_BYTES = 5 * 1024 * 1024

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

    const formData = await request.formData()
    const file = formData.get('image')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: '학생증 사진을 올려주세요.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 해요.' }, { status: 400 })
    }

    const type = (file as File).type
    if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') {
      return NextResponse.json({ error: 'JPG, PNG, WEBP 이미지만 업로드할 수 있어요.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mediaType = type as 'image/jpeg' | 'image/png' | 'image/webp'

    const result = await verifyStudentAccount(userId, base64, mediaType)

    return NextResponse.json({ ok: true, schoolName: result.schoolName })
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ForbiddenError || e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: httpStatusFromError(e) })
    }
    console.error('POST /api/account/student-verify 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
