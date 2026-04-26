'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CommunityEditInitial } from '@/components/CommunityPostEditClient'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('read'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

type Props = {
  postId: number
  initial: CommunityEditInitial | null
}

export function useCommunityPostEdit(props: Props) {
  const { postId, initial } = props
  const router = useRouter()
  const [title, setTitle] = useState(() => initial?.title ?? '')
  const [body, setBody] = useState(() => initial?.body ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (): Promise<void> => {
    if (!initial) return
    setSubmitMessage('')
    const trimmed = body.trim()
    if (!trimmed) {
      setSubmitMessage('내용을 입력해 주세요.')
      return
    }
    if (initial.category === 'STUDY_PROOF' && !initial.imageData && !imageFile) {
      setSubmitMessage('공부 인증에는 사진이 필요해요.')
      return
    }

    setSubmitting(true)
    try {
      const payload: { title?: string; body?: string; imageData?: string } = {
        title: title.trim(),
        body: trimmed,
      }
      if (initial.category === 'STUDY_PROOF' && imageFile) {
        payload.imageData = await fileToDataUrl(imageFile)
      }

      const res = await fetch(`/api/community/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitMessage(typeof data.error === 'string' ? data.error : '저장에 실패했어요.')
        setSubmitting(false)
        return
      }
      router.push(`/community/post/${postId}`)
    } catch {
      setSubmitMessage('네트워크 오류가 났어요.')
    }
    setSubmitting(false)
  }

  return {
    title,
    setTitle,
    body,
    setBody,
    imageFile,
    setImageFile,
    submitMessage,
    submitting,
    submit,
  }
}
