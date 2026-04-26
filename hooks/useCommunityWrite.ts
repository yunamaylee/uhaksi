'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CommunityCategory } from '@/types/communityCategory'

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
  initialCategory: CommunityCategory
}

export function useCommunityWrite(props: Props) {
  const { initialCategory } = props
  const router = useRouter()
  const [tab, setTab] = useState<CommunityCategory>(initialCategory)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (): Promise<void> => {
    setSubmitMessage('')
    const trimmed = body.trim()
    if (!trimmed) {
      setSubmitMessage('내용을 입력해 주세요.')
      return
    }
    if (tab === 'STUDY_PROOF' && !imageFile) {
      setSubmitMessage('공부 인증에는 사진이 필요해요.')
      return
    }

    setSubmitting(true)
    try {
      let imageData = ''
      if (tab === 'STUDY_PROOF' && imageFile) {
        imageData = await fileToDataUrl(imageFile)
      }

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: tab,
          title: title.trim() || undefined,
          body: trimmed,
          imageData: imageData || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitMessage(typeof data.error === 'string' ? data.error : '등록에 실패했어요.')
        setSubmitting(false)
        return
      }
      const newId = typeof data.post?.id === 'number' ? data.post.id : null
      const redirectPath = newId != null ? `/community/post/${newId}` : `/community?category=${tab}`
      router.push(redirectPath)
    } catch {
      setSubmitMessage('네트워크 오류가 났어요.')
    }
    setSubmitting(false)
  }

  return {
    tab,
    setTab,
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
