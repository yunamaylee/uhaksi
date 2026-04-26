import { prisma } from '@/lib/prisma'
import type { CommunityCategory } from '@/types/communityCategory'

export type CreatePostInput = {
  userId: number
  category: string
  title: string | null
  body: string
  imageData: string | null
}

export type UpdatePostData = {
  title?: string | null
  body?: string
  imageData?: string | null
}

// 게시글 단건 조회 (소유권 확인용)
export async function findPostById(id: number) {
  return prisma.studentCommunityPost.findUnique({
    where: { id },
    select: { userId: true, category: true, imageData: true },
  })
}

// 게시글 존재 확인
export async function findPostExistsById(id: number) {
  return prisma.studentCommunityPost.findUnique({
    where: { id },
    select: { id: true },
  })
}

// 게시글 생성
export async function createPost(data: CreatePostInput) {
  return prisma.studentCommunityPost.create({
    data,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      imageData: true,
      createdAt: true,
      user: { select: { isAdmin: true, verifiedSchoolName: true } },
    },
  })
}

// 게시글 업데이트
export async function updatePost(id: number, data: UpdatePostData) {
  return prisma.studentCommunityPost.update({
    where: { id },
    data,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      imageData: true,
      createdAt: true,
      userId: true,
      user: { select: { isAdmin: true, verifiedSchoolName: true } },
    },
  })
}

// 게시글 삭제
export async function deletePost(id: number) {
  return prisma.studentCommunityPost.delete({ where: { id } })
}

// 댓글 단건 조회 (소유권 확인용)
export async function findCommentByIdAndPostId(commentId: number, postId: number) {
  return prisma.studentCommunityComment.findFirst({
    where: { id: commentId, postId },
    select: { id: true, userId: true },
  })
}

// 댓글 생성
export async function createComment(postId: number, userId: number, body: string) {
  return prisma.studentCommunityComment.create({
    data: { postId, userId, body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { isAdmin: true, verifiedSchoolName: true } },
    },
  })
}

// 댓글 업데이트
export async function updateComment(commentId: number, body: string) {
  return prisma.studentCommunityComment.update({
    where: { id: commentId },
    data: { body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      userId: true,
      user: { select: { isAdmin: true, verifiedSchoolName: true } },
    },
  })
}

// 댓글 삭제
export async function deleteComment(commentId: number) {
  return prisma.studentCommunityComment.delete({ where: { id: commentId } })
}

// 피드용 게시글 목록 조회 (카테고리별, 최신 100건)
export async function findPostsForFeed(category: CommunityCategory) {
  return prisma.studentCommunityPost.findMany({
    where: { category },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      imageData: true,
      createdAt: true,
      user: { select: { isAdmin: true, verifiedSchoolName: true } },
    },
  })
}

// 게시글 상세 조회 (댓글 포함, 최대 200건)
export async function findPostDetailById(postId: number) {
  return prisma.studentCommunityPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      imageData: true,
      createdAt: true,
      userId: true,
      user: { select: { isAdmin: true, verifiedSchoolName: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: {
          id: true,
          body: true,
          createdAt: true,
          userId: true,
          user: { select: { isAdmin: true, verifiedSchoolName: true } },
        },
      },
    },
  })
}
