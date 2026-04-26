import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessStudentCommunity } from '@/lib/communityAccess'
import { updateCommunityComment, deleteCommunityComment } from '@/lib/services/community'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'

type Params = { params: Promise<{ postId: string; commentId: string }> }

function sessionUserId(session: { user?: { id?: string } } | null): number | null {
  const raw = session?.user?.id
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!canAccessStudentCommunity(session.user)) {
      return NextResponse.json({ error: '권한이 없어요.', code: 'COMMUNITY_FORBIDDEN' }, { status: 403 })
    }

    const userId = sessionUserId(session)
    if (userId === null) {
      return NextResponse.json({ error: '세션이 올바르지 않습니다.' }, { status: 401 })
    }

    const { postId: postRaw, commentId: commentRaw } = await params
    const postId = Number(postRaw)
    const commentId = Number(commentRaw)
    if (!Number.isFinite(postId) || !Number.isFinite(commentId)) {
      return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const text = body && typeof body.body === 'string' ? body.body.trim() : ''
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: '댓글은 1자 이상 2000자 이하로 입력해 주세요.' }, { status: 400 })
    }

    const comment = await updateCommunityComment(commentId, postId, userId, text)

    return NextResponse.json({ comment })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('PATCH /api/community/posts/[postId]/comments/[commentId] 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!canAccessStudentCommunity(session.user)) {
      return NextResponse.json({ error: '권한이 없어요.', code: 'COMMUNITY_FORBIDDEN' }, { status: 403 })
    }

    const userId = sessionUserId(session)
    if (userId === null) {
      return NextResponse.json({ error: '세션이 올바르지 않습니다.' }, { status: 401 })
    }

    const { postId: postRaw, commentId: commentRaw } = await params
    const postId = Number(postRaw)
    const commentId = Number(commentRaw)
    if (!Number.isFinite(postId) || !Number.isFinite(commentId)) {
      return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
    }

    await deleteCommunityComment(commentId, postId, userId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error('DELETE /api/community/posts/[postId]/comments/[commentId] 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
