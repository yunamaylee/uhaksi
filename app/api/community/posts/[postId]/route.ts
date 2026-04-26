import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessStudentCommunity } from '@/lib/communityAccess'
import { getCommunityPost, updateCommunityPost, deleteCommunityPost } from '@/lib/services/community'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'

type Params = { params: Promise<{ postId: string }> }

function sessionUserId(session: { user?: { id?: string } } | null): number | null {
  const raw = session?.user?.id
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    const { postId: raw } = await params
    const id = Number(raw)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: '잘못된 글입니다.' }, { status: 400 })
    }

    const result = await getCommunityPost(session, id)
    if (!result.ok) {
      if (result.code === 'FORBIDDEN') {
        return NextResponse.json(
          { error: '인증된 학생만 글을 볼 수 있어요.', code: 'COMMUNITY_FORBIDDEN' },
          { status: 403 },
        )
      }
      return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 })
    }

    return NextResponse.json({ post: result.post })
  } catch (e) {
    console.error('GET /api/community/posts/[postId] 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
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

    const { postId: raw } = await params
    const id = Number(raw)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: '잘못된 글입니다.' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: '요청 본문이 올바르지 않아요.' }, { status: 400 })
    }

    const patchParams: { title?: string | null; body?: string; imageData?: string } = {}
    if ('title' in body) {
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
      patchParams.title = title || null
    }
    if ('body' in body) {
      const text = typeof body.body === 'string' ? body.body.trim() : ''
      if (!text || text.length > 8000) {
        return NextResponse.json({ error: '내용은 1자 이상 8000자 이하로 입력해 주세요.' }, { status: 400 })
      }
      patchParams.body = text
    }
    if ('imageData' in body && body.imageData !== undefined) {
      patchParams.imageData = typeof body.imageData === 'string' ? body.imageData.trim() : ''
    }

    const post = await updateCommunityPost(id, userId, patchParams)

    return NextResponse.json({ post })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('PATCH /api/community/posts/[postId] 에러:', e)
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

    const { postId: raw } = await params
    const id = Number(raw)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: '잘못된 글입니다.' }, { status: 400 })
    }

    await deleteCommunityPost(id, userId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error('DELETE /api/community/posts/[postId] 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
