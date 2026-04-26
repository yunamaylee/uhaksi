import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessStudentCommunity } from '@/lib/communityAccess'
import { getCommunityFeed, createCommunityPost } from '@/lib/services/community'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'
import type { CommunityCategory } from '@/types/communityCategory'

const CATEGORIES: CommunityCategory[] = ['QA', 'STUDY_TIP', 'STUDY_PROOF']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const categoryParam = request.nextUrl.searchParams.get('category')

    if (!categoryParam || !CATEGORIES.includes(categoryParam as CommunityCategory)) {
      return NextResponse.json({ error: '유효한 category가 필요합니다.' }, { status: 400 })
    }

    const result = await getCommunityFeed(session, categoryParam as CommunityCategory)
    if (!result.ok) {
      if (result.code === 'FORBIDDEN') {
        return NextResponse.json(
          { error: '인증된 학생만 커뮤니티를 볼 수 있어요.', code: 'COMMUNITY_FORBIDDEN' },
          { status: 403 },
        )
      }
      return NextResponse.json({ error: '유효한 category가 필요합니다.' }, { status: 400 })
    }

    return NextResponse.json({ posts: result.posts })
  } catch (e) {
    console.error('GET /api/community/posts 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!canAccessStudentCommunity(session.user)) {
      return NextResponse.json(
        { error: '인증된 학생만 글을 쓸 수 있어요.', code: 'COMMUNITY_FORBIDDEN' },
        { status: 403 },
      )
    }

    const userId = Number(session.user.id)
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: '세션이 올바르지 않습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const categoryRaw = body?.category
    if (!categoryRaw || !CATEGORIES.includes(categoryRaw as CommunityCategory)) {
      return NextResponse.json({ error: '유효한 카테고리를 선택해 주세요.' }, { status: 400 })
    }

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
    const textBody = typeof body.body === 'string' ? body.body.trim() : ''
    const imageData = typeof body.imageData === 'string' ? body.imageData.trim() : ''

    if (!textBody || textBody.length > 8000) {
      return NextResponse.json({ error: '내용은 1자 이상 8000자 이하로 입력해 주세요.' }, { status: 400 })
    }

    const post = await createCommunityPost(
      { category: categoryRaw as CommunityCategory, title, body: textBody, imageData },
      userId,
    )

    return NextResponse.json({ post })
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    console.error('POST /api/community/posts 에러:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
