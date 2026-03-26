'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'review_ops_name'

export function useUserName() {
  const [name, setName] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setName(stored)
  }, [])

  const saveName = (n: string) => {
    const trimmed = n.trim()
    localStorage.setItem(STORAGE_KEY, trimmed)
    setName(trimmed)
  }

  return { name, saveName }
}
