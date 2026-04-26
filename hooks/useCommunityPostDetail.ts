'use client'

import { useState, useCallback } from 'react'
import type { CommunityPostDetail } from '@/lib/communityPostDetail'

type Props = {
  postId: number
  initialPost: CommunityPostDetail | null
}

export function useCommunityPostDetail(props: Props) {
  const { postId, initialPost } = props
  const [post, setPost] = useState<CommunityPostDetail | null>(initialPost)
  const [loadError, setLoadError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [deletingPost, setDeletingPost] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editCommentDraft, setEditCommentDraft] = useState('')
  const [savingCommentId, setSavingCommentId] = useState<number | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)

  const loadPost = useCallback(async () => {
    if (!Number.isFinite(postId)) {
      setLoadError('잘못된 주소예요.')
      return
    }
    setRefreshing(true)
    setLoadError('')
    try {
      const res = await fetch(`/api/community/posts/${postId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(typeof data.error === 'string' ? data.error : '글을 불러오지 못했어요.')
        setPost(null)
        return
      }
      setPost(data.post as CommunityPostDetail)
    } catch {
      setLoadError('네트워크 오류가 났어요.')
      setPost(null)
    } finally {
      setRefreshing(false)
    }
  }, [postId])

  // 댓글 등록 (성공 시 true 반환)
  const sendComment = async (): Promise<boolean> => {
    const text = commentText.trim()
    if (!text || !Number.isFinite(postId)) return false
    setSending(true)
    setCommentError('')
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCommentError(typeof data.error === 'string' ? data.error : '댓글 등록에 실패했어요.')
        setSending(false)
        return false
      }
      setCommentText('')
      await loadPost()
      return true
    } catch {
      setCommentError('네트워크 오류가 났어요.')
    }
    setSending(false)
    return false
  }

  // 게시글 삭제 (성공 시 이동할 category 반환, 실패 시 null)
  const deletePost = async (): Promise<string | null> => {
    if (!post || !Number.isFinite(postId)) return null
    setDeletingPost(true)
    try {
      const res = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(typeof data.error === 'string' ? data.error : '삭제에 실패했어요.')
        setDeletingPost(false)
        return null
      }
      return post.category
    } catch {
      setLoadError('네트워크 오류가 났어요.')
    }
    setDeletingPost(false)
    return null
  }

  // 댓글 수정 저장 (성공 시 true 반환)
  const saveCommentEdit = async (commentId: number): Promise<boolean> => {
    const text = editCommentDraft.trim()
    if (!text || !Number.isFinite(postId)) return false
    setSavingCommentId(commentId)
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(typeof data.error === 'string' ? data.error : '수정에 실패했어요.')
        setSavingCommentId(null)
        return false
      }
      setEditingCommentId(null)
      setEditCommentDraft('')
      await loadPost()
      return true
    } catch {
      setLoadError('네트워크 오류가 났어요.')
    }
    setSavingCommentId(null)
    return false
  }

  // 댓글 삭제 (성공 시 true 반환)
  const deleteComment = async (commentId: number): Promise<boolean> => {
    if (!Number.isFinite(postId)) return false
    setDeletingCommentId(commentId)
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(typeof data.error === 'string' ? data.error : '삭제에 실패했어요.')
        setDeletingCommentId(null)
        return false
      }
      if (editingCommentId === commentId) {
        setEditingCommentId(null)
        setEditCommentDraft('')
      }
      await loadPost()
      return true
    } catch {
      setLoadError('네트워크 오류가 났어요.')
    }
    setDeletingCommentId(null)
    return false
  }

  return {
    post,
    loadError,
    refreshing,
    commentText,
    setCommentText,
    sending,
    commentError,
    deletingPost,
    editingCommentId,
    setEditingCommentId,
    editCommentDraft,
    setEditCommentDraft,
    savingCommentId,
    deletingCommentId,
    loadPost,
    sendComment,
    deletePost,
    saveCommentEdit,
    deleteComment,
  }
}
