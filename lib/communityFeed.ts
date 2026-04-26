import type { Session } from 'next-auth'
import { canAccessStudentCommunity } from '@/lib/communityAccess'
import { communityAuthorSchool } from '@/lib/communityDisplay'
import { findPostsForFeed } from '@/lib/repositories/community'
import type { CommunityCategory } from '@/types/communityCategory'

const CATEGORIES: CommunityCategory[] = ['QA', 'STUDY_TIP', 'STUDY_PROOF']

export type CommunityFeedPost = {
  id: number
  title: string | null
  body: string
  imageData: string | null
  createdAt: string
  authorSchool: string
}

export function parseCommunityCategoryParam(q: string | null | undefined): CommunityCategory {
  if (q === 'STUDY_TIP' || q === 'STUDY_PROOF' || q === 'QA') return q
  return 'QA'
}

export async function getCommunityPostsForFeed(
  session: Session | null,
  category: CommunityCategory,
): Promise<
  { ok: false; code: 'FORBIDDEN' | 'BAD_CATEGORY' } | { ok: true; posts: CommunityFeedPost[] }
> {
  if (!canAccessStudentCommunity(session?.user)) {
    return { ok: false, code: 'FORBIDDEN' }
  }
  if (!CATEGORIES.includes(category)) {
    return { ok: false, code: 'BAD_CATEGORY' }
  }

  const rows = await findPostsForFeed(category)

  const posts: CommunityFeedPost[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    imageData: p.imageData,
    createdAt: p.createdAt.toISOString(),
    authorSchool: communityAuthorSchool(p.user),
  }))

  return { ok: true, posts }
}
