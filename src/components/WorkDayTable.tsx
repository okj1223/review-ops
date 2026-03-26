'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { EntryRow } from './EntryRow'
import { useEntries } from '@/hooks/useEntries'
import type { Entry, EntryWithComputed } from '@/lib/types'

interface Props {
  workDate: string
  r1Name: string
  r2Name: string
  editorName: string
}

// 교차검수 시작지점: 두 검수자 모두 데이터가 있는 첫 번째 에피소드
function findCrossStartIdx(entries: EntryWithComputed[]): number {
  return entries.findIndex(e => {
    const r1 = !!(e.r1_result || e.r1_pick || e.r1_place)
    const r2 = !!(e.r2_result || e.r2_pick || e.r2_place)
    return r1 && r2
  })
}

// 삽입 행 컴포넌트
function InsertRow({ totalCols, onConfirm, onCancel }: {
  totalCols: number
  onConfirm: (ep: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState('')
  return (
    <tr className="bg-blue-50 border-y border-blue-200">
      <td colSpan={totalCols} className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-500 font-medium">에피소드 번호 삽입:</span>
          <input
            autoFocus
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && val.trim()) { onConfirm(val.trim()); setVal('') }
              if (e.key === 'Escape') onCancel()
            }}
            placeholder="번호 입력 후 Enter"
            className="border border-blue-300 rounded px-2 py-0.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
          <span className="text-[10px] text-blue-400">Esc로 취소</span>
        </div>
      </td>
    </tr>
  )
}

const TOTAL_COLS = 19 // controls + episode + action + 3×r1 + 3×r2 + conflict + 3×final + reason_code + reason_detail + response_detail + route + last_updated

type GroupKey = 'ctrl' | 'r1' | 'r2' | 'final' | 'computed' | ''

export function WorkDayTable({ workDate, r1Name, r2Name, editorName }: Props) {
  const { entries, loading, upsert, addRow, addRows, renameEpisode, deleteRow } = useEntries(workDate)

  // 범위 추가 상태
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeError, setRangeError] = useState('')

  // 줄 끼워넣기 상태
  const [insertBeforeId, setInsertBeforeId] = useState<string | null>(null)

  // 맨 아래 추가 입력
  const newEpisodeRef = useRef<HTMLInputElement>(null)

  // 상단 스크롤바 미러
  const containerRef = useRef<HTMLDivElement>(null)
  const mirrorRef    = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const update = () => setContentWidth(container.scrollWidth)
    update()
    const table = container.querySelector('table')
    if (!table) return
    const ro = new ResizeObserver(update)
    ro.observe(table)
    return () => ro.disconnect()
  }, [loading])

  const onMirrorScroll = () => {
    if (containerRef.current && mirrorRef.current)
      containerRef.current.scrollLeft = mirrorRef.current.scrollLeft
  }
  const onContainerScroll = () => {
    if (containerRef.current && mirrorRef.current)
      mirrorRef.current.scrollLeft = containerRef.current.scrollLeft
  }

  const handleSave = async (
    updates: Partial<EntryWithComputed> & { work_date: string; episode: string },
    originalEpisode?: string
  ) => {
    if (originalEpisode && originalEpisode !== updates.episode) {
      await renameEpisode(updates.id!, updates.episode, updates as Partial<Entry>, editorName)
    } else {
      await upsert(updates, editorName)
    }
  }

  const handleAddRow = async (episode: string) => {
    await addRow(episode, editorName)
  }

  const handleAddRange = async () => {
    setRangeError('')
    const from = parseInt(rangeFrom)
    const to   = parseInt(rangeTo)
    if (isNaN(from) || isNaN(to)) { setRangeError('숫자를 입력하세요'); return }
    if (from > to)                 { setRangeError('시작 번호가 끝 번호보다 큽니다'); return }
    if (to - from > 500)           { setRangeError('한 번에 최대 500개까지 추가 가능합니다'); return }
    setRangeLoading(true)
    const episodes = Array.from({ length: to - from + 1 }, (_, i) => String(from + i))
    await addRows(episodes, editorName)
    setRangeLoading(false)
    setRangeFrom('')
    setRangeTo('')
  }

  const crossStartIdx  = findCrossStartIdx(entries)
  // OK / Resolved / Ready to review / 빈 값 제외 — 나머지는 처리 필요
  const needsActionEntries = entries.filter(e =>
    e.action && e.action !== 'OK' && e.action !== 'Resolved' && e.action !== 'Ready to review'
  )

  const headers: { label: string; group?: GroupKey; sticky?: boolean; stickyLeft?: string }[] = [
    { label: '',             group: 'ctrl',  sticky: true, stickyLeft: 'left-0' },
    { label: 'Episode',      sticky: true, stickyLeft: 'left-8' },
    { label: 'Action',       group: 'computed', sticky: true, stickyLeft: 'left-28' },
    { label: `${r1Name} Result`, group: 'r1' },
    { label: `${r1Name} Pick`,   group: 'r1' },
    { label: `${r1Name} Place`,  group: 'r1' },
    { label: `${r2Name} Result`, group: 'r2' },
    { label: `${r2Name} Pick`,   group: 'r2' },
    { label: `${r2Name} Place`,  group: 'r2' },
    { label: 'Conflict',     group: 'computed' },
    { label: 'Final Result', group: 'final' },
    { label: 'Final Pick',   group: 'final' },
    { label: 'Final Place',  group: 'final' },
    { label: 'Reason Code' },
    { label: 'Reason Detail' },
    { label: 'Response Detail' },
    { label: 'Route' },
    { label: 'Last Updated' },
  ]

  const groupBg: Record<string, string> = {
    ctrl:     'bg-slate-50',
    r1:       'bg-blue-100',
    r2:       'bg-emerald-100',
    final:    'bg-amber-100',
    computed: 'bg-slate-200',
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm">
        <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin mb-2" />
        <p>불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 범위 일괄 추가 */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-wrap">
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">범위 추가</span>
        <input
          type="number"
          value={rangeFrom}
          onChange={e => setRangeFrom(e.target.value)}
          placeholder="시작 번호"
          className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-900"
        />
        <span className="text-slate-400 text-sm">—</span>
        <input
          type="number"
          value={rangeTo}
          onChange={e => setRangeTo(e.target.value)}
          placeholder="끝 번호"
          onKeyDown={e => e.key === 'Enter' && handleAddRange()}
          className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-900"
        />
        <button
          onClick={handleAddRange}
          disabled={rangeLoading}
          className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {rangeLoading ? '추가 중...' : '일괄 추가'}
        </button>
        {rangeError && <span className="text-xs text-red-500">{rangeError}</span>}
        <span className="text-xs text-slate-400 ml-auto">에피소드 행을 클릭하면 왼쪽 + 버튼으로 사이에 행 삽입 가능</span>
      </div>

      {/* 처리 필요 패널 — OK / Resolved 아닌 항목 실시간 표시 */}
      {needsActionEntries.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-semibold text-amber-800">처리 필요</span>
            <span className="ml-1 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
              {needsActionEntries.length}건
            </span>
          </div>
          <div className="divide-y divide-amber-50">
            {needsActionEntries.map(e => {
              const isConflict = e.action.startsWith('Conflict')
              const isWaiting  = e.action === 'Waiting Lead'
              const actionCls  = isConflict
                ? 'text-red-700 bg-red-50 ring-1 ring-red-200'
                : isWaiting
                ? 'text-violet-700 bg-violet-50 ring-1 ring-violet-200'
                : 'text-amber-700 bg-amber-50 ring-1 ring-amber-200'
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-amber-50/40 transition-colors">
                  <span className="font-mono font-bold text-slate-700 w-16 shrink-0">
                    Ep. {e.episode}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${actionCls}`}>
                    {e.action}
                  </span>
                  {e.conflict && (
                    <span className="text-slate-400 text-[10px]">({e.conflict})</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 테이블 래퍼 (상단 스크롤바 + 테이블 묶음) */}
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white">
        {/* 상단 스크롤바 미러 — 수직 스크롤 시 화면 상단에 고정 */}
        <div
          ref={mirrorRef}
          className="sticky top-0 z-30 overflow-x-auto border-b border-slate-100 bg-slate-50 rounded-t-xl"
          style={{ height: 14 }}
          onScroll={onMirrorScroll}
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>

        {/* 테이블 */}
      <div ref={containerRef} className="overflow-x-auto" onScroll={onContainerScroll}>
        <table className="border-collapse text-sm w-max min-w-full">
          <thead>
            <tr className="border-b-2 border-slate-300">
              {headers.map((h) => (
                <th
                  key={h.label || '__ctrl'}
                  className={[
                    'px-2 py-2.5 text-xs font-semibold text-slate-600 text-left whitespace-nowrap border-r border-slate-200',
                    h.sticky ? `sticky ${h.stickyLeft} z-20` : '',
                    h.group ? groupBg[h.group] : 'bg-slate-100',
                  ].join(' ')}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <Fragment key={entry.id}>
                {/* 줄 끼워넣기 입력 행 */}
                {insertBeforeId === entry.id && (
                  <InsertRow
                    totalCols={TOTAL_COLS}
                    onConfirm={async (ep) => { await handleAddRow(ep); setInsertBeforeId(null) }}
                    onCancel={() => setInsertBeforeId(null)}
                  />
                )}

                {/* 교차검수 시작지점 표시 */}
                {crossStartIdx === idx && idx > 0 && (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="bg-violet-50 border-y-2 border-violet-300 px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                          ⚑ 교차검수 시작 지점
                        </span>
                        <span className="text-[10px] text-violet-400">
                          — 이 에피소드부터 두 검수자 모두 진행됨
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                <EntryRow
                  entry={entry}
                  workDate={workDate}
                  editorName={editorName}
                  onSave={handleSave}
                  onInsertBefore={() => setInsertBeforeId(entry.id)}
                  onDelete={() => deleteRow(entry.id)}
                />
              </Fragment>
            ))}

            {/* 맨 아래 에피소드 추가 */}
            <tr className="border-t border-slate-100">
              <td className="sticky left-0 bg-white z-10 w-8 border-r border-slate-100" />
              <td colSpan={TOTAL_COLS - 1} className="px-2 py-1">
                <input
                  ref={newEpisodeRef}
                  className="text-sm text-slate-400 placeholder-slate-300 px-1 py-1 w-full focus:outline-none focus:text-slate-800"
                  placeholder="+ 에피소드 번호 직접 입력 후 Enter..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) { handleAddRow(val); (e.target as HTMLInputElement).value = '' }
                    }
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
