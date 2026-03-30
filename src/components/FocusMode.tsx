'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EntryWithComputed, WorkDayConfig } from '@/lib/types'

interface Props {
  entries: EntryWithComputed[]
  reviewer: 'r1' | 'r2'
  direction: 'down' | 'up'
  r1Name: string
  r2Name: string
  config: WorkDayConfig
  onSave: (updates: Partial<EntryWithComputed> & { work_date: string; episode: string }) => void
  onExit: () => void
  eventWindow?: Window & typeof globalThis
}

const SHORTCUT: Record<string, string> = { c: 'Clean', d: 'Dirty', f: 'Fail', n: 'None' }

const RESULT_STYLE: Record<string, string> = {
  Clean: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
  Dirty: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
  Fail:  'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30',
  None:  'bg-slate-600/40 text-slate-300 border-slate-500/40 hover:bg-slate-600/60',
}

const RESULT_BADGE: Record<string, string> = {
  Clean: 'bg-emerald-500/20 text-emerald-400',
  Dirty: 'bg-amber-500/20 text-amber-400',
  Fail:  'bg-red-500/20 text-red-400',
  None:  'bg-slate-600/40 text-slate-400',
}

function findStartIdx(entries: EntryWithComputed[], reviewer: 'r1' | 'r2', direction: 'down' | 'up'): number {
  const field = reviewer === 'r1' ? 'r1_result' : 'r2_result'
  if (direction === 'down') {
    const idx = entries.findIndex(e => !e[field])
    return idx === -1 ? 0 : idx
  } else {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (!entries[i][field]) return i
    }
    return entries.length - 1
  }
}

export function FocusMode({ entries, reviewer, direction, r1Name, r2Name, config, onSave, onExit, eventWindow }: Props) {
  const resultField = reviewer === 'r1' ? 'r1_result' : 'r2_result'
  const [currentIdx, setCurrentIdx] = useState(() => findStartIdx(entries, reviewer, direction))
  const [noteValue, setNoteValue] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const prevIdxRef = useRef(currentIdx)

  const step = direction === 'down' ? 1 : -1

  // Reset note only when row changes (not on entries re-render)
  useEffect(() => {
    if (prevIdxRef.current !== currentIdx) {
      prevIdxRef.current = currentIdx
      setNoteValue(entries[currentIdx]?.note ?? '')
    }
  })

  // Initialize note for first row
  useEffect(() => {
    setNoteValue(entries[currentIdx]?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = useCallback(() => {
    setCurrentIdx(prev => {
      const next = prev + step
      if (next < 0 || next >= entries.length) return prev
      return next
    })
  }, [step, entries.length])

  const handleResult = useCallback((value: string) => {
    const entry = entries[currentIdx]
    if (!entry) return
    const note = noteRef.current?.value ?? noteValue
    onSave({ ...entry, [resultField]: value, note: note || null, work_date: entry.work_date })
    advance()
  }, [entries, currentIdx, resultField, noteValue, onSave, advance])

  const handleNavigate = useCallback((delta: number) => {
    const entry = entries[currentIdx]
    if (entry) {
      const note = noteRef.current?.value ?? noteValue
      if (note !== (entry.note ?? '')) {
        onSave({ ...entry, note: note || null, work_date: entry.work_date })
      }
    }
    setCurrentIdx(prev => {
      const next = prev + delta
      if (next < 0 || next >= entries.length) return prev
      return next
    })
  }, [entries, currentIdx, noteValue, onSave])

  useEffect(() => {
    const target = eventWindow ?? window
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return }
      const tag = (target.document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.key === 'ArrowDown') { e.preventDefault(); handleNavigate(1); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); handleNavigate(-1); return }
      const result = SHORTCUT[e.key.toLowerCase()]
      if (result && config.dropdowns.result.includes(result)) {
        e.preventDefault()
        handleResult(result)
      }
    }
    target.addEventListener('keydown', handler)
    return () => target.removeEventListener('keydown', handler)
  }, [handleResult, handleNavigate, onExit, config.dropdowns.result, eventWindow])

  const filledCnt = entries.filter(e => e.r1_result || e.r2_result).length
  const remainCnt = entries.length - filledCnt

  const pastIdx  = currentIdx - step
  const nextIdx  = currentIdx + step
  const pastEntry = pastIdx >= 0 && pastIdx < entries.length ? entries[pastIdx] : null
  const currEntry = entries[currentIdx] ?? null
  const nextEntry = nextIdx >= 0 && nextIdx < entries.length ? entries[nextIdx] : null

  if (!currEntry) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/97 flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">🎉</p>
        <p className="text-white text-xl font-bold">모두 완료!</p>
        <p className="text-slate-400 text-sm">{filledCnt}개 완료</p>
        <button onClick={onExit} className="mt-2 bg-white text-slate-900 px-6 py-2 rounded-xl font-medium hover:bg-slate-100 transition-colors">
          나가기
        </button>
      </div>
    )
  }

  const reviewerName = reviewer === 'r1' ? r1Name : r2Name
  const progress     = `${filledCnt}개 완료 · ${remainCnt}개 남음`

  const RowCard = ({ entry, role }: { entry: EntryWithComputed | null; role: 'past' | 'current' | 'next' }) => {
    if (!entry) return <div className="h-12" />
    const val    = entry[resultField as keyof EntryWithComputed] as string
    const isMain = role === 'current'
    return (
      <div className={[
        'rounded-xl border px-4 transition-all',
        isMain
          ? 'py-4 border-blue-500/60 bg-slate-800 shadow-xl shadow-blue-500/10'
          : 'py-2.5 border-slate-700/50 bg-slate-900/60 opacity-40',
      ].join(' ')}>
        <div className="flex items-center justify-between">
          <span className={`font-mono font-bold ${isMain ? 'text-white text-base' : 'text-slate-400 text-sm'}`}>
            Ep. {entry.episode}
          </span>
          <div className="flex items-center gap-2">
            {entry.note && !isMain && (
              <span className="text-[10px] text-slate-500" title={entry.note}>✎</span>
            )}
            {val
              ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_BADGE[val] ?? 'text-slate-400'}`}>{val}</span>
              : isMain && <span className="text-xs text-slate-500">미입력</span>
            }
          </div>
        </div>

        {isMain && (
          <>
            <div className="flex gap-2 mt-3">
              {config.dropdowns.result.map(r => {
                const key = Object.entries(SHORTCUT).find(([, v]) => v === r)?.[0]?.toUpperCase()
                return (
                  <button
                    key={r}
                    onClick={() => handleResult(r)}
                    className={`flex-1 py-2.5 rounded-lg border font-medium text-sm transition-all ${RESULT_STYLE[r] ?? 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'}`}
                  >
                    {r}
                    {key && <span className="block text-[10px] opacity-50 mt-0.5">{key}</span>}
                  </button>
                )
              })}
            </div>
            <textarea
              ref={noteRef}
              value={noteValue}
              onChange={e => setNoteValue(e.target.value)}
              placeholder="메모 (선택 · 결과 선택 시 함께 저장)"
              rows={1}
              className="mt-3 w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-400 resize-none"
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/97 flex flex-col items-center justify-center gap-3 px-4">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-slate-500 text-xs">{reviewerName}</span>
        <span className="text-slate-400 text-xs font-medium">{progress}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleNavigate(-1)}
            title="이전 행 (↑)"
            className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => handleNavigate(1)}
            title="다음 행 (↓)"
            className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ↓
          </button>
        </div>
        <button
          onClick={onExit}
          className="text-slate-500 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Esc 나가기
        </button>
      </div>

      {/* 3줄 */}
      <div className="flex flex-col gap-2 w-full max-w-md">
        <RowCard entry={pastEntry} role="past" />
        <RowCard entry={currEntry} role="current" />
        <RowCard entry={nextEntry} role="next" />
      </div>

      {/* 단축키 안내 */}
      <div className="flex gap-4 mt-2">
        {Object.entries(SHORTCUT).map(([key, val]) => (
          config.dropdowns.result.includes(val) && (
            <div key={key} className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300">{key.toUpperCase()}</kbd>
              <span className="text-slate-500 text-xs">{val}</span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
