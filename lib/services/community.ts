import * as communityRepo from '@/lib/repositories/community'
import { communityAuthorSchool } from '@/lib/communityDisplay'
import { detectExamPaperInImage } from '@/lib/visionModeration'
import { parseDataUrlImage } from '@/lib/dataUrlImage'
import { getCommunityPostsForFeed } from '@/lib/communityFeed'
import { getCommunityPostDetail } from '@/lib/communityPostDetail'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/services/errors'
import type { CommunityCategory } from '@/types/communityCategory'
import type { Session } from 'next-auth'

export type CreatePostParams = {
  category: CommunityCategory
  title: string
  body: string
  imageData: string
}

// 커뮤니티 피드 조회
export async function getCommunityFeed(session: Session | null, category: CommunityCategory) {
  return getCommunityPostsForFeed(session, category)
}

// 커뮤니티 게시글 상세 조회
export async function getCommunityPost(session: Session | null, postId: number) {
  return getCommunityPostDetail(session, postId)
}

// 게시글 작성
export async function createCommunityPost(params: CreatePostParams, userId: number) {
  const { category, title, body, imageData } = params

  let imageToStore: string | null = null

  if (category !== 'STUDY_PROOF' && imageData) {
    throw new ValidationError('이 카테고리에는 사진을 첨부할 수 없어요.')
  }

  if (category === 'STUDY_PROOF') {
    if (!imageData || imageData.length > 2_500_000) {
      throw new ValidationError('공부 인증에는 사진이 필요해요.')
    }
    const parsed = parseDataUrlImage(imageData)
    if (!parsed) throw new ValidationError('이미지 형식이 올바르지 않아요.')

    const examCheck = await detectExamPaperInImage(parsed.base64, parsed.mediaType)
    if (examCheck.blocked) throw new ValidationError('시험지는 올릴 수 없어요. 공부 인증용 사진만 올려 주세요.')

    imageToStore = imageData
  }

  const created = await communityRepo.createPost({
    userId,
    category,
    title: title || null,
    body,
    imageData: imageToStore,
  })

  return {
    id: created.id,
    category: created.category,
    title: created.title,
    body: created.body,
    imageData: created.imageData,
    createdAt: created.createdAt,
    authorSchool: communityAuthorSchool(created.user),
  }
}

export type UpdatePostParams = {
  title?: string | null
  body?: string
  imageData?: string
}

// 게시글 수정
export async function updateCommunityPost(postId: number, userId: number, params: UpdatePostParams) {
  const existing = await communityRepo.findPostById(postId)
  if (!existing) throw new NotFoundError('글을 찾을 수 없어요.')
  if (existing.userId !== userId) throw new ForbiddenError('본인 글만 수정할 수 있어요.')

  const data: { title?: string | null; body?: string; imageData?: string | null } = {}

  if ('title' in params) data.title = params.title ?? null
  if ('body' in params) data.body = params.body

  if ('imageData' in params && params.imageData !== undefined) {
    if (existing.category !== 'STUDY_PROOF') {
      throw new ValidationError('이 카테고리에는 사진을 바꿀 수 없어요.')
    }
    const imageData = params.imageData
    if (!imageData || imageData.length > 2_500_000) {
      throw new ValidationError('공부 인증에는 사진이 필요해요.')
    }
    const parsed = parseDataUrlImage(imageData)
    if (!parsed) throw new ValidationError('이미지 형식이 올바르지 않아요.')

    const examCheck = await detectExamPaperInImage(parsed.base64, parsed.mediaType)
    if (examCheck.blocked) throw new ValidationError('시험지는 올릴 수 없어요. 공부 인증용 사진만 올려 주세요.')

    data.imageData = imageData
  }

  if (Object.keys(data).length === 0) throw new ValidationError('수정할 내용을 보내주세요.')

  const updated = await communityRepo.updatePost(postId, data)

  return {
    id: updated.id,
    category: updated.category,
    title: updated.title,
    body: updated.body,
    imageData: updated.imageData,
    createdAt: updated.createdAt,
    authorSchool: communityAuthorSchool(updated.user),
    isAuthor: true,
  }
}

// 게시글 삭제
export async function deleteCommunityPost(postId: number, userId: number) {
  const existing = await communityRepo.findPostById(postId)
  if (!existing) throw new NotFoundError('글을 찾을 수 없어요.')
  if (existing.userId !== userId) throw new ForbiddenError('본인 글만 삭제할 수 있어요.')

  await communityRepo.deletePost(postId)
}

// 댓글 작성
export async function createCommunityComment(postId: number, userId: number, body: string) {
  const post = await communityRepo.findPostExistsById(postId)
  if (!post) throw new NotFoundError('글을 찾을 수 없어요.')

  const row = await communityRepo.createComment(postId, userId, body)

  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    authorSchool: communityAuthorSchool(row.user),
  }
}

// 댓글 수정
export async function updateCommunityComment(commentId: number, postId: number, userId: number, body: string) {
  const row = await communityRepo.findCommentByIdAndPostId(commentId, postId)
  if (!row) throw new NotFoundError('댓글을 찾을 수 없어요.')
  if (row.userId !== userId) throw new ForbiddenError('본인 댓글만 수정할 수 있어요.')

  const updated = await communityRepo.updateComment(commentId, body)

  return {
    id: updated.id,
    body: updated.body,
    createdAt: updated.createdAt,
    authorSchool: communityAuthorSchool(updated.user),
    isAuthor: true,
  }
}

// 댓글 삭제
export async function deleteCommunityComment(commentId: number, postId: number, userId: number) {
  const row = await communityRepo.findCommentByIdAndPostId(commentId, postId)
  if (!row) throw new NotFoundError('댓글을 찾을 수 없어요.')
  if (row.userId !== userId) throw new ForbiddenError('본인 댓글만 삭제할 수 있어요.')

  await communityRepo.deleteComment(commentId)
}
