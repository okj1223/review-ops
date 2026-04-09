'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const COLOR_PALETTE = [
  { style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',  styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-400' },
  { style: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',          styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-amber-500/20  hover:text-amber-300  hover:border-amber-500/40',  badge: 'bg-amber-500/20 text-amber-400'   },
  { style: 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30',                  styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-red-500/20    hover:text-red-300    hover:border-red-500/40',    badge: 'bg-red-500/20 text-red-400'       },
  { style: 'bg-slate-600/40 text-slate-300 border-slate-500/40 hover:bg-slate-600/60',          styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-slate-600/40  hover:text-slate-300  hover:border-slate-500/40',  badge: 'bg-slate-600/40 text-slate-400'   },
  { style: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',              styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-blue-500/20   hover:text-blue-300   hover:border-blue-500/40',   badge: 'bg-blue-500/20 text-blue-400'     },
  { style: 'bg-violet-500/20 text-violet-300 border-violet-500/40 hover:bg-violet-500/30',      styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-violet-500/20  hover:text-violet-300 hover:border-violet-500/40',  badge: 'bg-violet-500/20 text-violet-400' },
  { style: 'bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30',              styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-pink-500/20    hover:text-pink-300   hover:border-pink-500/40',   badge: 'bg-pink-500/20 text-pink-400'     },
  { style: 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30',              styleDim: 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-teal-500/20    hover:text-teal-300   hover:border-teal-500/40',   badge: 'bg-teal-500/20 text-teal-400'     },
]

function buildShortcuts(results: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  const used = new Set<string>()
  for (const r of results) {
    let assigned = false
    for (const ch of r.toLowerCase()) {
      if (ch < 'a' || ch > 'z') continue
      if (!used.has(ch)) { map[ch] = r; used.add(ch); assigned = true; break }
    }
    if (!assigned) {
      for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(97 + i)
        if (!used.has(ch)) { map[ch] = r; used.add(ch); break }
      }
    }
  }
  return map
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

// RowCard를 모듈 최상단에 선언 — FocusMode 내부 선언 시 매 렌더마다 새 타입으로 인식되어 unmount/remount 발생
interface RowCardProps {
  entry: EntryWithComputed | null
  role: 'past' | 'current' | 'next'
  resultField: string
  results: string[]
  shortcuts: Record<string, string>  // key → result
  noteValue: string
  setNoteValue: (v: string) => void
  noteRef: React.RefObject<HTMLTextAreaElement | null>
  onResult: (r: string) => void
}

function RowCard({ entry, role, resultField, results, shortcuts, noteValue, setNoteValue, noteRef, onResult }: RowCardProps) {
  if (!entry) return <div className="h-12" />
  const val    = entry[resultField as keyof EntryWithComputed] as string
  const isMain = role === 'current'
  const shortcutKey = (r: string) => Object.entries(shortcuts).find(([, v]) => v === r)?.[0]?.toUpperCase()
  const palette = (r: string) => COLOR_PALETTE[results.indexOf(r) % COLOR_PALETTE.length] ?? COLOR_PALETTE[0]
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
            <span className="text-[10px] text-slate-500" aria-label={entry.note ?? '메모 있음'}>✎</span>
          )}
          {val
            ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${palette(val).badge}`}>{val}</span>
            : isMain && <span className="text-xs text-slate-500">미입력</span>
          }
        </div>
      </div>

      {isMain && (
        <>
          <div className="flex gap-2 mt-3">
            {results.map(r => {
              const key = shortcutKey(r)
              return (
                <button
                  key={r}
                  onClick={() => onResult(r)}
                  className={`flex-1 py-2.5 rounded-lg border font-medium text-sm transition-all ${palette(r).style}`}
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

export function FocusMode({ entries, reviewer, direction, r1Name, r2Name, config, onSave, onExit, eventWindow }: Props) {
  const [currentReviewer, setCurrentReviewer] = useState<'r1' | 'r2'>(reviewer)

  const toggleReviewer = useCallback(() => {
    setCurrentReviewer(r => r === 'r1' ? 'r2' : 'r1')
  }, [])
  const resultField = currentReviewer === 'r1' ? 'r1_result' : 'r2_result'
  const results   = config.dropdowns.result
  const shortcuts = useMemo(() => buildShortcuts(results), [results])
  const [currentIdx, setCurrentIdx] = useState(() => findStartIdx(entries, reviewer, direction))
  const [noteValue, setNoteValue]   = useState('')
  const [flashResult, setFlashResult] = useState<string | null>(null)
  const noteRef    = useRef<HTMLTextAreaElement>(null)
  const prevIdxRef = useRef(currentIdx)

  const step = direction === 'down' ? 1 : -1

  // 행이 바뀔 때만 메모 초기화
  useEffect(() => {
    if (prevIdxRef.current !== currentIdx) {
      prevIdxRef.current = currentIdx
      setNoteValue(entries[currentIdx]?.note ?? '')
    }
  }, [currentIdx, entries])

  // 최초 메모 초기화
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
    setFlashResult(value)
    setTimeout(() => { setFlashResult(null); advance() }, 250)
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
    const handler = (e: KeyboardEvent) => {
      const tag = ((e.target as HTMLElement)?.tagName ?? '').toLowerCase()
      const isTextInput = tag === 'input' || tag === 'textarea' || tag === 'select'
      if (e.key === 'Escape') { if (!isTextInput) onExit(); return }
      if (isTextInput) return
      if (e.key === 'Tab')       { e.preventDefault(); toggleReviewer(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); handleNavigate(1); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); handleNavigate(-1); return }
      const result = shortcuts[e.key.toLowerCase()]
      if (result) { e.preventDefault(); handleResult(result) }
    }
    const target = eventWindow ?? window
    target.addEventListener('keydown', handler)
    return () => target.removeEventListener('keydown', handler)
  }, [handleResult, handleNavigate, toggleReviewer, onExit, shortcuts, eventWindow])

  const filledCnt = entries.filter(e => e.r1_result || e.r2_result).length
  const remainCnt = entries.length - filledCnt

  const aboveIdx  = currentIdx - 1
  const belowIdx  = currentIdx + 1
  const pastEntry = aboveIdx >= 0 && aboveIdx < entries.length ? entries[aboveIdx] : null
  const currEntry = entries[currentIdx] ?? null
  const nextEntry = belowIdx >= 0 && belowIdx < entries.length ? entries[belowIdx] : null

  // PiP 컴팩트 모드
  if (eventWindow) {
    const MiniRow = ({ ep, result, dim, onClick }: { ep: string; result: string; dim: boolean; onClick?: () => void }) => (
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-1 transition-colors ${dim ? 'opacity-35 hover:opacity-60' : ''} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className="text-slate-400 text-[11px] font-mono">Ep.{ep}</span>
        {result && (
          <span className={`text-[10px] font-medium px-1.5 py-px rounded-full ${(COLOR_PALETTE[results.indexOf(result) % COLOR_PALETTE.length] ?? COLOR_PALETTE[0]).badge}`}>{result}</span>
        )}
      </button>
    )

    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col">
        {/* 이전 행 */}
        {pastEntry
          ? <MiniRow ep={pastEntry.episode} result={pastEntry[resultField as keyof EntryWithComputed] as string} dim onClick={() => handleNavigate(-1)} />
          : <div className="h-6" />
        }

        {/* 현재 행 */}
        <div className="flex items-center gap-1 px-2 py-1">
          <button
            onClick={toggleReviewer}
            aria-label="R1 또는 R2 전환"
            className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
              currentReviewer === 'r1'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}>
            {currentReviewer === 'r1' ? r1Name : r2Name}
          </button>
          <span className="text-white text-xs font-mono shrink-0 min-w-[3.5rem]">Ep.{currEntry?.episode ?? '—'}</span>
          <span className="text-slate-500 text-[10px] shrink-0">{filledCnt}/{entries.length}</span>
          <div className="flex gap-1 flex-1">
            {currEntry ? results.map(r => {
              const current  = flashResult ?? (currEntry[resultField as keyof EntryWithComputed] as string)
              const isOther  = !!current && current !== r
              const p        = COLOR_PALETTE[results.indexOf(r) % COLOR_PALETTE.length] ?? COLOR_PALETTE[0]
              return (
                <button key={r} onClick={() => handleResult(r)}
                  className={`flex-1 py-1 rounded text-[11px] font-semibold border transition-all ${isOther ? p.styleDim : p.style}`}>
                  {r}
                </button>
              )
            }) : (
              <button onClick={onExit} className="flex-1 py-1 rounded text-[11px] bg-white/10 text-white border border-white/20">나가기</button>
            )}
          </div>
        </div>

        {/* 메모 */}
        <div className="px-2 pb-1">
          <textarea
            ref={noteRef}
            value={noteValue}
            onChange={e => setNoteValue(e.target.value)}
            placeholder="메모..."
            rows={1}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />
        </div>

        {/* 다음 행 */}
        {nextEntry
          ? <MiniRow ep={nextEntry.episode} result={nextEntry[resultField as keyof EntryWithComputed] as string} dim onClick={() => handleNavigate(1)} />
          : <div className="h-6" />
        }
      </div>
    )
  }

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/97 flex flex-col items-center justify-center gap-3 px-4">

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-slate-500 text-xs">{reviewerName}</span>
        <span className="text-slate-400 text-xs font-medium">{progress}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => handleNavigate(-1)} aria-label="이전 행"
            className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors">↑</button>
          <button onClick={() => handleNavigate(1)} aria-label="다음 행"
            className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors">↓</button>
        </div>
        <button onClick={onExit}
          className="text-slate-500 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors">
          Esc 나가기
        </button>
      </div>

      {/* 3줄 */}
      <div className="flex flex-col gap-2 w-full max-w-md">
        <RowCard entry={pastEntry} role="past" resultField={resultField} results={results} shortcuts={shortcuts}
          noteValue={noteValue} setNoteValue={setNoteValue} noteRef={noteRef} onResult={handleResult} />
        <RowCard entry={currEntry} role="current" resultField={resultField} results={results} shortcuts={shortcuts}
          noteValue={noteValue} setNoteValue={setNoteValue} noteRef={noteRef} onResult={handleResult} />
        <RowCard entry={nextEntry} role="next" resultField={resultField} results={results} shortcuts={shortcuts}
          noteValue={noteValue} setNoteValue={setNoteValue} noteRef={noteRef} onResult={handleResult} />
      </div>

      {/* 단축키 안내 */}
      <div className="flex gap-4 mt-2">
        {Object.entries(shortcuts).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300">{key.toUpperCase()}</kbd>
            <span className="text-slate-500 text-xs">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
