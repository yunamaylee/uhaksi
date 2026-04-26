'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export function useAccountWithdraw() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const withdraw = async (password: string): Promise<boolean> => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(typeof data.error === 'string' ? data.error : '탈퇴 처리에 실패했어요.')
        setLoading(false)
        return false
      }
      await signOut({ callbackUrl: '/' })
      return true
    } catch {
      setMessage('네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요.')
    }
    setLoading(false)
    return false
  }

  return { loading, message, withdraw }
}
