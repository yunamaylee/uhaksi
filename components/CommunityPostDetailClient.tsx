'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import {
  COMMUNITY_TAB_LABELS,
  type CommunityCategory,
  CommunityMetaRow,
  PersonGlyph,
  communityShell as shell,
  formatCommunityDate,
} from '@/components/CommunityShared'
import type { CommunityPostDetail } from '@/lib/communityPostDetail'
import { useCommunityPostDetail } from '@/hooks/useCommunityPostDetail'

function listHrefForCategory(category: CommunityCategory) {
  return `/community?category=${category}`
}

export type CommunityPostDetailGate = 'login' | 'forbidden' | 'error' | 'ok'

type Props = {
  gate: CommunityPostDetailGate
  postId: number
  initialPost: CommunityPostDetail | null
  loadError?: string
}

export default function CommunityPostDetailClient({ gate, postId, initialPost, loadError = '' }: Props) {
  const router = useRouter()

  const {
    post,
    loadError: hookLoadError,
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
    sendComment,
    deletePost,
    saveCommentEdit,
    deleteComment,
  } = useCommunityPostDetail({ postId, initialPost: gate === 'ok' ? initialPost : null })

  const displayLoadError = hookLoadError || loadError

  const handlePostDelete = async () => {
    if (!window.confirm('이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    const category = await deletePost()
    if (category) router.push(listHrefForCategory(category as CommunityCategory))
  }

  const handleCommentDelete = async (commentId: number) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return
    await deleteComment(commentId)
  }

  if (gate === 'login') {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Card pastel="yellow" style={{ padding: '20px' }}>
            <p style={{ margin: 0, fontWeight: 800 }}>로그인이 필요해요</p>
            <Link
              href="/login"
              style={{ marginTop: '12px', display: 'inline-block', fontWeight: 800, color: 'var(--accent-strong)' }}
            >
              로그인하기
            </Link>
          </Card>
        </div>
      </main>
    )
  }

  if (gate === 'forbidden') {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ color: '#6b7280' }}>이 글을 볼 권한이 없어요.</p>
          <Link href="/community" style={{ marginTop: '12px', display: 'inline-block', fontWeight: 700, color: '#374151' }}>
            ← 커뮤니티
          </Link>
        </div>
      </main>
    )
  }

  if (gate === 'error' || displayLoadError || !post) {
    return (
      <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ color: '#dc2626', fontSize: '14px' }}>{displayLoadError || '글을 찾을 수 없어요.'}</p>
          <button
            type="button"
            onClick={() => router.push('/community')}
            style={{
              marginTop: '14px',
              border: 'none',
              background: 'none',
              padding: 0,
              fontWeight: 700,
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← 목록으로
          </button>
        </div>
      </main>
    )
  }

  const displayTitle = post.title?.trim() || '제목 없음'
  const titleMuted = !post.title?.trim()
  const listHref = listHrefForCategory(post.category)

  return (
    <main style={{ minHeight: 'calc(100vh - 64px)', background: shell.pageBg, padding: '28px 20px 48px' }}>
      <div
        style={{ maxWidth: '640px', margin: '0 auto', opacity: refreshing ? 0.72 : 1, transition: 'opacity 0.12s ease' }}
      >
        <div style={{ marginBottom: '18px' }}>
          <Link href={listHref} style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textDecoration: 'none' }}>
            ← {COMMUNITY_TAB_LABELS[post.category]}
          </Link>
        </div>

        <article
          style={{
            background: shell.cardBg,
            border: `1px solid ${shell.line}`,
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#9ca3af' }}>
            {COMMUNITY_TAB_LABELS[post.category]}
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '-0.4px',
              lineHeight: 1.45,
              color: titleMuted ? '#9ca3af' : '#111827',
            }}
          >
            {displayTitle}
          </h1>

          <div
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '10px 14px', marginTop: '6px' }}
          >
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <CommunityMetaRow school={post.authorSchool} date={post.createdAt} tightTop />
            </div>
            {post.isAuthor ? (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '1px' }}>
                <Link
                  href={`/community/post/${postId}/edit`}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-strong)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  수정
                </Link>
                <button
                  type="button"
                  disabled={deletingPost}
                  onClick={() => void handlePostDelete()}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: deletingPost ? '#d1d5db' : '#dc2626',
                    cursor: deletingPost ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deletingPost ? '삭제 중…' : '삭제'}
                </button>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: '20px', fontSize: '15px', lineHeight: 1.8, color: '#1f2937', whiteSpace: 'pre-wrap' }}>
            {post.body}
          </div>

          {post.imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageData}
              alt=""
              style={{
                marginTop: '18px',
                maxWidth: '100%',
                borderRadius: '10px',
                border: `1px solid ${shell.lineSoft}`,
              }}
            />
          ) : null}
        </article>

        <section
          style={{
            marginTop: '16px',
            background: shell.cardBg,
            border: `1px solid ${shell.line}`,
            borderRadius: '14px',
            padding: '22px',
            boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#111827' }}>
            댓글 {post.comments.length}
          </h2>
          {post.comments.length === 0 ? (
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#9ca3af' }}>첫 댓글을 남겨 보세요.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '0 0 18px', padding: 0 }}>
              {post.comments.map((comment, index) => (
                <li
                  key={comment.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: index === post.comments.length - 1 ? 'none' : `1px solid ${shell.lineSoft}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '11px',
                    }}
                  >
                    <div
                      style={{
                        flex: '1 1 140px',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '5px 8px',
                        minWidth: 0,
                      }}
                    >
                      <PersonGlyph size={13} />
                      <span style={{ fontWeight: 700, color: '#4b5563' }}>익명</span>
                      <span style={{ color: '#e5e7eb' }}>|</span>
                      <span style={{ fontWeight: 600, color: '#6b7280' }}>{comment.authorSchool}</span>
                      <span style={{ color: '#e5e7eb' }}>·</span>
                      <time style={{ color: '#9ca3af' }} dateTime={comment.createdAt}>
                        {formatCommunityDate(comment.createdAt)}
                      </time>
                    </div>
                    {comment.isAuthor ? (
                      <div
                        style={{
                          marginLeft: 'auto',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          paddingTop: '1px',
                        }}
                      >
                        {editingCommentId === comment.id ? (
                          <>
                            <button
                              type="button"
                              disabled={savingCommentId === comment.id || !editCommentDraft.trim()}
                              onClick={() => void saveCommentEdit(comment.id)}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                fontSize: '11px',
                                fontWeight: 800,
                                color:
                                  savingCommentId === comment.id || !editCommentDraft.trim()
                                    ? '#d1d5db'
                                    : 'var(--accent-strong)',
                                cursor:
                                  savingCommentId === comment.id || !editCommentDraft.trim() ? 'default' : 'pointer',
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {savingCommentId === comment.id ? '저장 중…' : '저장'}
                            </button>
                            <button
                              type="button"
                              disabled={savingCommentId === comment.id}
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditCommentDraft('')
                              }}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#6b7280',
                                cursor: savingCommentId === comment.id ? 'default' : 'pointer',
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={deletingCommentId === comment.id}
                              onClick={() => {
                                setEditingCommentId(comment.id)
                                setEditCommentDraft(comment.body)
                              }}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                fontSize: '11px',
                                fontWeight: 800,
                                color: deletingCommentId === comment.id ? '#d1d5db' : 'var(--accent-strong)',
                                cursor: deletingCommentId === comment.id ? 'default' : 'pointer',
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              disabled={deletingCommentId === comment.id}
                              onClick={() => void handleCommentDelete(comment.id)}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                fontSize: '11px',
                                fontWeight: 700,
                                color: deletingCommentId === comment.id ? '#d1d5db' : '#dc2626',
                                cursor: deletingCommentId === comment.id ? 'default' : 'pointer',
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {deletingCommentId === comment.id ? '삭제 중…' : '삭제'}
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {editingCommentId === comment.id ? (
                    <textarea
                      className="ui-input"
                      value={editCommentDraft}
                      onChange={(e) => setEditCommentDraft(e.target.value)}
                      rows={3}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        resize: 'vertical',
                        fontSize: '14px',
                        lineHeight: 1.65,
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        border: `1px solid ${shell.line}`,
                        borderRadius: '10px',
                        padding: '10px 12px',
                        background: '#fafafa',
                        color: '#374151',
                      }}
                    />
                  ) : (
                    <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: 1.65, color: '#374151', whiteSpace: 'pre-wrap' }}>
                      {comment.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <textarea
            className="ui-input"
            placeholder="댓글을 입력하세요."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              resize: 'vertical',
              fontSize: '14px',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              border: `1px solid ${shell.line}`,
              borderRadius: '10px',
              padding: '12px 14px',
              background: '#fafafa',
            }}
          />
          {commentError ? <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#dc2626' }}>{commentError}</p> : null}
          <div style={{ marginTop: '12px' }}>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={sending || !commentText.trim()}
              onClick={() => void sendComment()}
            >
              {sending ? '등록 중…' : '댓글 등록'}
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
