'use client'
import { useCallback, useEffect, useState } from 'react'
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

export function FocusMode({ entries, reviewer, direction, r1Name, r2Name, config, onSave, onExit }: Props) {
  const resultField = reviewer === 'r1' ? 'r1_result' : 'r2_result'
  const [currentIdx, setCurrentIdx] = useState(() => findStartIdx(entries, reviewer, direction))
  const [done, setDone] = useState(0)

  const step = direction === 'down' ? 1 : -1

  const advance = useCallback(() => {
    setCurrentIdx(prev => {
      const next = prev + step
      if (next < 0 || next >= entries.length) return prev
      return next
    })
    setDone(prev => prev + 1)
  }, [step, entries.length])

  const handleResult = useCallback((value: string) => {
    const entry = entries[currentIdx]
    if (!entry) return
    onSave({ ...entry, [resultField]: value, work_date: entry.work_date })
    advance()
  }, [entries, currentIdx, resultField, onSave, advance])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.key === 'Escape') { onExit(); return }
      const result = SHORTCUT[e.key.toLowerCase()]
      if (result && config.dropdowns.result.includes(result)) {
        e.preventDefault()
        handleResult(result)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleResult, onExit, config.dropdowns.result])

  const pastIdx = currentIdx - step
  const nextIdx = currentIdx + step
  const pastEntry = pastIdx >= 0 && pastIdx < entries.length ? entries[pastIdx] : null
  const currEntry = entries[currentIdx] ?? null
  const nextEntry = nextIdx >= 0 && nextIdx < entries.length ? entries[nextIdx] : null

  if (!currEntry) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/97 flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">🎉</p>
        <p className="text-white text-xl font-bold">모두 완료!</p>
        <p className="text-slate-400 text-sm">{done}개 입력 완료</p>
        <button onClick={onExit} className="mt-2 bg-white text-slate-900 px-6 py-2 rounded-xl font-medium hover:bg-slate-100 transition-colors">
          나가기
        </button>
      </div>
    )
  }

  const reviewerName = reviewer === 'r1' ? r1Name : r2Name
  const dirLabel = direction === 'down' ? '↓ 위→아래' : '↑ 아래→위'
  const progress = `${done}개 완료 · ${entries.length - done}개 남음`

  const RowCard = ({ entry, role }: { entry: EntryWithComputed | null; role: 'past' | 'current' | 'next' }) => {
    if (!entry) return <div className="h-12" />
    const val = entry[resultField]
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
          {val && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_BADGE[val] ?? 'text-slate-400'}`}>
              {val}
            </span>
          )}
          {isMain && !val && <span className="text-xs text-slate-500">미입력</span>}
        </div>

        {isMain && (
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
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/97 flex flex-col items-center justify-center gap-3 px-4">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-slate-500 text-xs">{reviewerName} · {dirLabel}</span>
        <span className="text-slate-400 text-xs font-medium">{progress}</span>
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
