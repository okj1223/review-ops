'use client'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { useEffect, useRef } from 'react'

interface Props {
  pipWindow: Window & typeof globalThis
  onClose: () => void
  children: (pipWindow: Window & typeof globalThis) => React.ReactNode
}

export function PiPWindow({ pipWindow: pw, onClose, children }: Props) {
  const rootRef        = useRef<Root | null>(null)
  const containerRef   = useRef<HTMLDivElement | null>(null)
  const readyRef       = useRef(false)
  const closeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCloseRef     = useRef(onClose)
  onCloseRef.current   = onClose

  useEffect(() => {
    // Strict Mode 이중 실행 시 예약된 close 취소
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    // 이미 setup된 경우 재실행 방지
    if (readyRef.current) return

    // <link rel="stylesheet"> 복사
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(el => {
      const link = pw.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = el.href
      pw.document.head.appendChild(link)
    })

    // <style> 인라인 CSS 복사
    document.querySelectorAll('style').forEach(el => {
      const style = pw.document.createElement('style')
      style.textContent = el.textContent
      pw.document.head.appendChild(style)
    })

    pw.document.body.style.margin     = '0'
    pw.document.body.style.padding    = '0'
    pw.document.body.style.background = '#0f172a'

    pw.addEventListener('pagehide', () => {
      readyRef.current = false
      const root = rootRef.current
      rootRef.current      = null
      containerRef.current = null
      setTimeout(() => root?.unmount(), 0)
      onCloseRef.current()
    })

    const container = pw.document.createElement('div')
    pw.document.body.appendChild(container)
    containerRef.current = container

    const root = createRoot(container)
    rootRef.current  = root
    readyRef.current = true

    return () => {
      readyRef.current = false
      const root      = rootRef.current
      const container = containerRef.current
      rootRef.current      = null
      containerRef.current = null

      // 100ms 후 실제 닫기 — Strict Mode 재실행 시 취소됨
      closeTimerRef.current = setTimeout(() => {
        root?.unmount()
        container?.remove()
        try { pw.close() } catch { /* 이미 닫힘 */ }
      }, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 매 렌더마다 PiP 내용 동기화
  useEffect(() => {
    if (readyRef.current && rootRef.current) {
      rootRef.current.render(<>{children(pw)}</>)
    }
  })

  return null
}
