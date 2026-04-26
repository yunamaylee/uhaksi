import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessStudentCommunity } from '@/lib/communityAccess'
import { createCommunityComment } from '@/lib/services/community'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'

type Params = { params: Promise<{ postId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!canAccessStudentCommunity(session.user)) {
      return NextResponse.json(
        { error: '인증된 학생만 댓글을 쓸 수 있어요.', code: 'COMMUNITY_FORBIDDEN' },
        { status: 403 },
      )
    }

    const userId = Number(session.user.id)
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: '세션이 올바르지 않습니다.' }, { status: 401 })
    }

    const { postId: postIdRaw } = await params
    const postId = Number(postIdRaw)
    if (!Number.isFinite(postId)) {
      return NextResponse.json({ error: '잘못된 글입니다.' }, { status: 400 })
    }

    const body = await request.json()
    const text = typeof body.body === 'string' ? body.body.trim() : ''
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: '댓글은 1자 이상 2000자 이하로 입력해 주세요.' }, { status: 400 })
    }

    const comment = await createCommunityComment(postId, userId, text)

    return NextResponse.json({ comment })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('POST /api/community/posts/[postId]/comments 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
