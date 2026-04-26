'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type School = {
  id: number
  name: string
  address?: string | null
}

export function useSchoolSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<School[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (query.length < 1 || isNavigating) {
      setNotFound(false)
      return
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isNavigating])

  const select = (school: School) => {
    setIsNavigating(true)
    setShowDropdown(false)
    setResults([])
    setQuery('')
    router.push(`/school/${school.id}`)
  }

  const search = async () => {
    if (!query.trim()) return
    setShowDropdown(false)
    setNotFound(false)

    if (results.length > 0) {
      select(results[0])
      return
    }

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()

    if (data.length > 0) {
      select(data[0])
      return
    }
    setNotFound(true)
  }

  return { query, setQuery, results, showDropdown, setShowDropdown, isNavigating, notFound, select, search }
}
