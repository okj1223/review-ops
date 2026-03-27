'use client'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { EntryRow } from './EntryRow'
import { useEntries } from '@/hooks/useEntries'
import { DEFAULT_CONFIG } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Entry, EntryWithComputed, WorkDayConfig } from '@/lib/types'

interface Props {
  workDayId: string
  workDate: string
  r1Name: string
  r2Name: string
  editorName: string
  config?: WorkDayConfig
  initialBannerEpisode?: string | null
}


function InsertRow({ totalCols, onConfirm, onCancel }: {
  totalCols: number; onConfirm: (ep: string) => void; onCancel: () => void
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

type GroupKey = 'ctrl' | 'r1' | 'r2' | 'final' | 'computed' | ''
type HistoryItem = { prev: Entry; editor: string }

export function WorkDayTable({ workDayId, workDate, r1Name, r2Name, editorName, config = DEFAULT_CONFIG, initialBannerEpisode = null }: Props) {
  const { entries, loading, upsert, addRow, addRows, renameEpisode, deleteRow, deleteRows } = useEntries(workDayId, workDate)

  const [rangeFrom, setRangeFrom]         = useState('')
  const [rangeTo, setRangeTo]             = useState('')
  const [rangeOperator, setRangeOperator] = useState(r1Name)
  const [rangeLoading, setRangeLoading]   = useState(false)
  const [rangeError, setRangeError]       = useState('')

  const [delFrom, setDelFrom]             = useState('')
  const [delTo, setDelTo]                 = useState('')
  const [delConfirm, setDelConfirm]       = useState(false)
  const [delLoading, setDelLoading]       = useState(false)
  const [delError, setDelError]           = useState('')
  const [insertBeforeId, setInsertBeforeId] = useState<string | null>(null)
  const [bannerEpisode, setBannerEpisode] = useState<string | null>(initialBannerEpisode)


  const saveBannerEpisode = async (episode: string | null) => {
    setBannerEpisode(episode)
    await supabase.from('work_days').update({ cross_banner_episode: episode }).eq('id', workDayId)
  }

  const newEpisodeRef = useRef<HTMLInputElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const mirrorRef     = useRef<HTMLDivElement>(null)
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

  // ── Undo 히스토리 (editorName 기준, 세션 내) ─────────────────
  const historyStack             = useRef<HistoryItem[]>([])
  const [myUndoCount, setMyUndoCount] = useState(0)

  const pushHistory = useCallback((prev: Entry) => {
    historyStack.current.push({ prev, editor: editorName })
    if (historyStack.current.length > 200) historyStack.current.shift()
    setMyUndoCount(historyStack.current.filter(h => h.editor === editorName).length)
  }, [editorName])

  const handleUndo = useCallback(async () => {
    const stack = historyStack.current
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].editor === editorName) {
        const [item] = stack.splice(i, 1)
        setMyUndoCount(stack.filter(h => h.editor === editorName).length)
        await upsert({ ...item.prev, work_date: workDate }, editorName)
        return
      }
    }
  }, [editorName, upsert, workDate])

  // Ctrl+Z (입력 필드 외부에서만)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo])

  const handleSave = async (
    updates: Partial<EntryWithComputed> & { work_date: string; episode: string },
    originalEpisode?: string
  ) => {
    // 저장 전 현재 상태를 히스토리에 push (entry rename 제외)
    if (updates.id && !originalEpisode) {
      const current = entries.find(e => e.id === updates.id)
      if (current) pushHistory(current)
    }
    if (originalEpisode && originalEpisode !== updates.episode) {
      await renameEpisode(updates.id!, updates.episode, updates as Partial<Entry>, editorName)
    } else {
      await upsert(updates, editorName)
    }
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
    await addRows(episodes, rangeOperator)
    setRangeLoading(false)
    setRangeFrom('')
    setRangeTo('')
  }

  const handleDeleteRange = async () => {
    setDelError('')
    const from = parseInt(delFrom)
    const to   = parseInt(delTo)
    if (isNaN(from) || isNaN(to)) { setDelError('숫자를 입력하세요'); return }
    if (from > to)                 { setDelError('시작 번호가 끝 번호보다 큽니다'); return }
    if (!delConfirm) { setDelConfirm(true); return }
    setDelLoading(true)
    await deleteRows(from, to)
    setDelLoading(false)
    setDelFrom('')
    setDelTo('')
    setDelConfirm(false)
  }

  // ── Excel 다운로드 ───────────────────────────────────────────
  const handleExport = () => {
    const frameKeys = config.frames.map(f => f.key)

    const headerRow = [
      'Episode',
      `${r1Name} Result`,
      ...config.frames.map(f => `${r1Name} ${f.label}`),
      `${r2Name} Result`,
      ...config.frames.map(f => `${r2Name} ${f.label}`),
      'Conflict',
      'Action',
      'Final Result',
      ...config.frames.map(f => `Final ${f.label}`),
      'Reason Code',
      'Reason Detail',
      'Response Detail',
      'Route',
      'Last Editor',
      'Last Updated',
    ]

    const dataRows = entries.map(e => {
      const row: (string | undefined)[] = [
        e.episode,
        e.r1_result,
        ...frameKeys.map(k => (e as unknown as Record<string, string>)[`r1_${k}`] ?? ''),
        e.r2_result,
        ...frameKeys.map(k => (e as unknown as Record<string, string>)[`r2_${k}`] ?? ''),
        e.conflict,
        e.action,
        e.final_result,
        ...frameKeys.map(k => (e as unknown as Record<string, string>)[`final_${k}`] ?? ''),
        e.reason_code,
        e.reason_detail,
        e.response_detail,
        e.route,
        e.last_editor,
        e.last_updated ? new Date(e.last_updated).toLocaleString('ko-KR') : '',
      ]
      return row
    })

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])

    // 컬럼 너비 설정
    const fixedWidths = [
      { wch: 10 }, // Episode
      { wch: 10 }, // R1 Result
      ...config.frames.map(() => ({ wch: 10 })),
      { wch: 10 }, // R2 Result
      ...config.frames.map(() => ({ wch: 10 })),
      { wch: 20 }, // Conflict
      { wch: 28 }, // Action
      { wch: 10 }, // Final Result
      ...config.frames.map(() => ({ wch: 10 })),
      { wch: 22 }, // Reason Code
      { wch: 40 }, // Reason Detail
      { wch: 40 }, // Response Detail
      { wch: 25 }, // Route
      { wch: 14 }, // Last Editor
      { wch: 20 }, // Last Updated
    ]
    ws['!cols'] = fixedWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, workDate)
    XLSX.writeFile(wb, `${workDate}.xlsx`)
  }

  const crossStartIdx     = bannerEpisode != null ? entries.findIndex(e => e.episode === bannerEpisode) : -1
  const crossStartId      = crossStartIdx !== -1 ? entries[crossStartIdx]?.id : null
  const needsActionEntries = entries.filter(e =>
    e.action && e.action !== 'OK' && e.action !== 'Resolved' && e.action !== 'Ready to review'
  )

  // 동적 헤더
  const headers: { label: string; group?: GroupKey; sticky?: boolean; stickyLeft?: string }[] = [
    { label: '',        group: 'ctrl',     sticky: true, stickyLeft: 'left-0' },
    { label: 'Episode',                    sticky: true, stickyLeft: 'left-8' },
    { label: 'Action',  group: 'computed', sticky: true, stickyLeft: 'left-28' },
    { label: `${r1Name} Result`, group: 'r1' },
    ...config.frames.map(f => ({ label: `${r1Name} ${f.label}`, group: 'r1' as GroupKey })),
    { label: `${r2Name} Result`, group: 'r2' },
    ...config.frames.map(f => ({ label: `${r2Name} ${f.label}`, group: 'r2' as GroupKey })),
    { label: 'Conflict', group: 'computed' },
    { label: 'Final Result', group: 'final' },
    ...config.frames.map(f => ({ label: `Final ${f.label}`, group: 'final' as GroupKey })),
    { label: 'Reason Code' },
    { label: 'Reason Detail' },
    { label: 'Response Detail' },
    { label: 'Route' },
    { label: 'Last Updated' },
  ]
  const TOTAL_COLS = headers.length

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
      {/* 범위 일괄 추가 + 범위 삭제 + Excel 다운로드 */}
      <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        {/* 범위 추가 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">범위 추가</span>
          <select
            value={rangeOperator}
            onChange={e => setRangeOperator(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-700"
          >
            <option value={r1Name}>{r1Name} (R1)</option>
            <option value={r2Name}>{r2Name} (R2)</option>
          </select>
          <input
            type="number"
            value={rangeFrom}
            onChange={e => setRangeFrom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRange()}
            placeholder="시작"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-900"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="number"
            value={rangeTo}
            onChange={e => setRangeTo(e.target.value)}
            placeholder="끝"
            onKeyDown={e => e.key === 'Enter' && handleAddRange()}
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-900"
          />
          <button
            onClick={handleAddRange}
            disabled={rangeLoading}
            className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rangeLoading ? '추가 중...' : '일괄 추가'}
          </button>
          {(!rangeFrom || !rangeTo) && <span className="text-xs text-slate-400">숫자를 입력해주세요</span>}
          {rangeError && <span className="text-xs text-red-500">{rangeError}</span>}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">행 hover → + 버튼으로 사이에 삽입</span>
            <button
              onClick={handleUndo}
              disabled={myUndoCount === 0}
              title={myUndoCount > 0 ? `내 변경 ${myUndoCount}단계 되돌리기 (Ctrl+Z)` : '되돌릴 내용 없음'}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
            >
              ↩ 되돌리기{myUndoCount > 0 && <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 font-bold">{myUndoCount}</span>}
            </button>
            <button
              onClick={handleExport}
              className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              ↓ Excel
            </button>
          </div>
        </div>

        {/* 범위 삭제 */}
        <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-2">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">범위 삭제</span>
          <input
            type="number"
            value={delFrom}
            onChange={e => { setDelFrom(e.target.value); setDelConfirm(false) }}
            onKeyDown={e => e.key === 'Enter' && handleDeleteRange()}
            placeholder="시작"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white text-slate-900"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="number"
            value={delTo}
            onChange={e => { setDelTo(e.target.value); setDelConfirm(false) }}
            placeholder="끝"
            onKeyDown={e => e.key === 'Enter' && handleDeleteRange()}
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white text-slate-900"
          />
          {delConfirm ? (
            <>
              <span className="text-xs text-red-600 font-medium">정말 삭제할까요?</span>
              <button
                onClick={handleDeleteRange}
                disabled={delLoading}
                className="bg-red-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {delLoading ? '삭제 중...' : '삭제 확인'}
              </button>
              <button
                onClick={() => setDelConfirm(false)}
                className="text-xs text-slate-500 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={handleDeleteRange}
              className="text-red-500 border border-red-200 text-sm px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              범위 삭제
            </button>
          )}
          {delError && <span className="text-xs text-red-500">{delError}</span>}
        </div>
      </div>

      {/* 처리 필요 패널 */}
      {needsActionEntries.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-semibold text-amber-800">처리 필요</span>
            <span className="ml-1 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
              {needsActionEntries.length}건
            </span>
          </div>
          <div className="divide-y divide-amber-50 overflow-y-auto max-h-[160px]">
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
                  <span className="font-mono font-bold text-slate-700 w-16 shrink-0">Ep. {e.episode}</span>
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

      {/* 테이블 래퍼 */}
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white">
        {/* 상단 스크롤바 미러 */}
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
                {headers.map((h, i) => (
                  <th
                    key={`${h.label}_${i}`}
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
              {entries.map((entry) => (
                <Fragment key={entry.id}>
                  {insertBeforeId === entry.id && (
                    <InsertRow
                      totalCols={TOTAL_COLS}
                      onConfirm={async (ep) => { await addRow(ep, editorName, editorName); setInsertBeforeId(null) }}
                      onCancel={() => setInsertBeforeId(null)}
                    />
                  )}

                  {crossStartId === entry.id && (
                    <tr>
                      <td colSpan={TOTAL_COLS} className="bg-violet-50 border-y-2 border-violet-300 px-4 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { const ni = crossStartIdx - 1; if (ni >= 0) saveBannerEpisode(entries[ni].episode) }}
                              disabled={crossStartIdx <= 0}
                              className="text-violet-400 hover:text-violet-600 disabled:opacity-30 px-1 text-xs"
                              title="위로 이동"
                            >▲</button>
                            <button
                              onClick={() => { const ni = crossStartIdx + 1; if (ni < entries.length) saveBannerEpisode(entries[ni].episode) }}
                              disabled={crossStartIdx >= entries.length - 1}
                              className="text-violet-400 hover:text-violet-600 disabled:opacity-30 px-1 text-xs"
                              title="아래로 이동"
                            >▼</button>
                            <button
                              onClick={() => saveBannerEpisode(null)}
                              className="text-violet-300 hover:text-red-400 px-1 text-xs"
                              title="배너 제거"
                            >×</button>
                          </div>
                          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">⚑ 교차검수 시작 지점</span>
                          <span className="text-[10px] text-violet-400">— 이 에피소드부터 두 검수자 모두 진행됨</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  <EntryRow
                    entry={entry}
                    workDate={workDate}
                    editorName={editorName}
                    r1Name={r1Name}
                    r2Name={r2Name}
                    config={config}
                    onSave={handleSave}
                    onInsertBefore={() => setInsertBeforeId(entry.id)}
                    onDelete={() => deleteRow(entry.id)}
                    onSetBanner={() => bannerEpisode === entry.episode ? saveBannerEpisode(null) : saveBannerEpisode(entry.episode)}
                    isBannerHere={bannerEpisode === entry.episode}
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
                        if (val) { addRow(val, editorName); (e.target as HTMLInputElement).value = '' }
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
