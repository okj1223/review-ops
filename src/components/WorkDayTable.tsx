'use client'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { EntryRow } from './EntryRow'
import { FocusMode } from './FocusMode'
import { PiPWindow } from './PiPWindow'
import { useEntries } from '@/hooks/useEntries'
import { DEFAULT_CONFIG } from '@/lib/constants'
import {
  ACTION_COL_WIDTH,
  CONFLICT_COL_WIDTH,
  DETAIL_COL_WIDTH,
  EPISODE_COL_WIDTH,
  FRAME_COL_WIDTH,
  getWorkDayColumnWidths,
  LAST_UPDATED_COL_WIDTH,
  REASON_CODE_COL_WIDTH,
  RESULT_COL_WIDTH,
  ROUTE_COL_WIDTH,
  STICKY_ACTION_LEFT,
  STICKY_COL_WIDTH,
  STICKY_CONTROL_LEFT,
  STICKY_EPISODE_LEFT,
  TASK_COL_WIDTH,
} from '@/lib/tableLayout'
import { supabase } from '@/lib/supabase'
import type { Entry, EntryWithComputed, WorkDayConfig } from '@/lib/types'

interface Props {
  workDayId: string
  workDate: string
  r1Name: string
  r2Name: string
  editorName: string
  config?: WorkDayConfig
  taskOptions?: string[]
  initialBannerEpisode?: string | null
}


function InsertRow({ totalCols, r1Name, r2Name, onConfirm, onCancel }: {
  totalCols: number; r1Name: string; r2Name: string; onConfirm: (ep: string, operator: string) => void; onCancel: () => void
}) {
  const [val, setVal] = useState('')
  const [operator, setOperator] = useState('')
  return (
    <tr className="bg-blue-50 border-y border-blue-200">
      <td colSpan={totalCols} className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-500 font-medium">에피소드 번호 삽입:</span>
          <input
            autoFocus
            type="number"
            min={0}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && val.trim()) {
                const parsed = Number(val)
                if (Number.isFinite(parsed)) {
                  onConfirm(parsed < 0 ? '0' : val.trim(), operator)
                  setVal('')
                  setOperator('')
                }
              }
              if (e.key === 'Escape') onCancel()
            }}
            placeholder="번호 입력 후 Enter"
            className="border border-blue-300 rounded px-2 py-0.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />
          <select
            value={operator}
            onChange={e => setOperator(e.target.value)}
            className="border border-blue-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          >
            <option value="">오퍼레이터 선택</option>
            <option value={r1Name}>{r1Name} (R1)</option>
            <option value={r2Name}>{r2Name} (R2)</option>
          </select>
          <span className="text-[10px] text-blue-400">Esc로 취소</span>
        </div>
      </td>
    </tr>
  )
}

type GroupKey = 'ctrl' | 'r1' | 'r2' | 'final' | 'computed' | ''
type HistoryItem = { prev: Entry; editor: string }
type ReportResult = 'Clean' | 'Dirty' | 'Fail'
type FocusHostWindow = Window & typeof globalThis
type FocusLaunchMode = 'pip' | 'popup' | 'overlay'

interface FocusLaunchResult {
  hostWindow: FocusHostWindow | null
  mode: FocusLaunchMode
  reason?: string
}

const REPORT_RESULTS: ReportResult[] = ['Clean', 'Dirty', 'Fail']
const FOCUS_POPUP_NAME = 'review-ops-focus-mode'
const FOCUS_POPUP_FEATURES = 'popup=yes,width=440,height=260,resizable=yes,scrollbars=no'

function effectiveResultForReport(entry: Entry): ReportResult | 'None' {
  const result = entry.r1_result && entry.r2_result
    ? (entry.final_result || 'None')
    : (entry.r1_result || entry.r2_result || 'None')
  if (result === 'Clean' || result === 'Dirty' || result === 'Fail') return result
  return 'None'
}

function formatFocusLaunchError(error: unknown): string {
  if (error instanceof DOMException) {
    return error.message ? `${error.name}: ${error.message}` : error.name
  }
  if (error instanceof Error) {
    return error.message ? `${error.name}: ${error.message}` : error.name
  }
  return '알 수 없는 오류'
}

async function openFocusHostWindow(): Promise<FocusLaunchResult> {
  let pipFailureReason = ''

  if ('documentPictureInPicture' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pw: FocusHostWindow = await (window as any).documentPictureInPicture.requestWindow({ width: 400, height: 140 })
      return { hostWindow: pw, mode: 'pip' }
    } catch (error) {
      pipFailureReason = formatFocusLaunchError(error)
      console.warn('[FocusMode] Document Picture-in-Picture request failed:', error)
    }
  }

  const popup = window.open('', FOCUS_POPUP_NAME, FOCUS_POPUP_FEATURES)
  if (!popup || popup.closed) {
    return { hostWindow: null, mode: 'overlay', reason: pipFailureReason || '브라우저가 외부 팝업을 차단했습니다.' }
  }
  try { popup.focus() } catch { /* ignore */ }
  return { hostWindow: popup as FocusHostWindow, mode: 'popup', reason: pipFailureReason }
}

export function WorkDayTable({ workDayId, workDate, r1Name, r2Name, editorName, config = DEFAULT_CONFIG, taskOptions = [], initialBannerEpisode = null }: Props) {
  const { entries, loading, upsert, addRow, addRows, renameEpisode, deleteRow, deleteRows, reorderEntries, assignTaskRange } = useEntries(workDayId, workDate)
  const [draggedId, setDraggedId]   = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [focusSetup, setFocusSetup] = useState(false)
  const [focusConfig, setFocusConfig] = useState<{ reviewer: 'r1' | 'r2'; direction: 'down' | 'up' } | null>(null)
  const [focusSetupReviewer, setFocusSetupReviewer] = useState<'r1' | 'r2'>('r1')
  const [focusSetupDir, setFocusSetupDir] = useState<'down' | 'up'>('down')
  const [focusWindow, setFocusWindow] = useState<FocusHostWindow | null>(null)
  const [focusLaunchNotice, setFocusLaunchNotice] = useState('')

  const closeFocusMode = useCallback(() => {
    setFocusConfig(null)
    setFocusWindow(null)
  }, [])

  useEffect(() => {
    if (!focusLaunchNotice) return
    const timer = window.setTimeout(() => setFocusLaunchNotice(''), 8000)
    return () => window.clearTimeout(timer)
  }, [focusLaunchNotice])

  const handleStartFocus = async () => {
    const cfg = { reviewer: focusSetupReviewer, direction: focusSetupDir }
    const launch = await openFocusHostWindow()
    setFocusWindow(launch.hostWindow)
    setFocusConfig(cfg)
    setFocusSetup(false)

    if (launch.mode === 'pip') {
      setFocusLaunchNotice('')
      return
    }

    if (launch.mode === 'popup') {
      setFocusLaunchNotice(
        `항상 위 PiP 창을 열지 못해 일반 팝업 창으로 전환했습니다.${launch.reason ? ` 원인: ${launch.reason}` : ''}`
      )
      return
    }

    setFocusLaunchNotice(
      `PiP와 일반 팝업 창을 열지 못해 현재 탭 오버레이로 전환했습니다.${launch.reason ? ` 원인: ${launch.reason}` : ''}`
    )
  }

  const [rangeFrom, setRangeFrom]         = useState('')
  const [rangeTo, setRangeTo]             = useState('')
  const [rangeOperator, setRangeOperator] = useState(r1Name)
  const [rangeLoading, setRangeLoading]   = useState(false)
  const [rangeError, setRangeError]       = useState('')
  const [taskFrom, setTaskFrom]           = useState('')
  const [taskTo, setTaskTo]               = useState('')
  const [rangeTask, setRangeTask]         = useState('')
  const [taskLoading, setTaskLoading]     = useState(false)
  const [taskError, setTaskError]         = useState('')
  const [taskInfo, setTaskInfo]           = useState('')

  const [delFrom, setDelFrom]             = useState('')
  const [delTo, setDelTo]                 = useState('')
  const [delConfirm, setDelConfirm]       = useState(false)
  const [delLoading, setDelLoading]       = useState(false)
  const [delError, setDelError]           = useState('')
  const [reportCopyMessage, setReportCopyMessage] = useState('')
  const [insertBeforeId, setInsertBeforeId] = useState<string | null>(null)
  const [bannerEpisode, setBannerEpisode] = useState<string | null>(initialBannerEpisode)


  const saveBannerEpisode = async (episode: string | null) => {
    setBannerEpisode(episode)
    await supabase.from('work_days').update({ cross_banner_episode: episode }).eq('id', workDayId)
  }

  const newEpisodeRef = useRef<HTMLInputElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const mirrorRef     = useRef<HTMLDivElement>(null)
  const rowRefs       = useRef<Map<string, HTMLTableRowElement>>(new Map())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const scrollToEntry = (id: string) => {
    const el = rowRefs.current.get(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(id)
    setTimeout(() => setHighlightedId(null), 1500)
  }

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
    const rawEpisode = updates.episode.trim()
    const parsedEpisode = Number(rawEpisode)
    if (!Number.isFinite(parsedEpisode)) return
    const normalizedEpisode = parsedEpisode < 0 ? '0' : rawEpisode
    const normalizedUpdates = normalizedEpisode === updates.episode
      ? updates
      : { ...updates, episode: normalizedEpisode }

    // 저장 전 현재 상태를 히스토리에 push (entry rename 제외)
    if (normalizedUpdates.id && !originalEpisode) {
      const current = entries.find(e => e.id === normalizedUpdates.id)
      if (current) pushHistory(current)
    }
    if (originalEpisode && originalEpisode !== normalizedUpdates.episode) {
      await renameEpisode(normalizedUpdates.id!, normalizedUpdates.episode, normalizedUpdates as Partial<Entry>, editorName)
    } else {
      await upsert(normalizedUpdates, editorName)
    }
  }

  const handleAddRange = async () => {
    setRangeError('')
    const from = parseInt(rangeFrom, 10)
    const to   = parseInt(rangeTo, 10)
    if (isNaN(from) || isNaN(to)) { setRangeError('숫자를 입력하세요'); return }
    if (from < 0 || to < 0)        { setRangeError('에피소드는 0 이상만 가능합니다'); return }
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
    const from = parseInt(delFrom, 10)
    const to   = parseInt(delTo, 10)
    if (isNaN(from) || isNaN(to)) { setDelError('숫자를 입력하세요'); return }
    if (from < 0 || to < 0)       { setDelError('에피소드는 0 이상만 가능합니다'); return }
    if (from > to)                 { setDelError('시작 번호가 끝 번호보다 큽니다'); return }
    if (!delConfirm) { setDelConfirm(true); return }
    setDelLoading(true)
    await deleteRows(from, to)
    setDelLoading(false)
    setDelFrom('')
    setDelTo('')
    setDelConfirm(false)
  }

  const handleAssignTaskRange = async () => {
    setTaskError('')
    setTaskInfo('')
    const from = parseInt(taskFrom, 10)
    const to   = parseInt(taskTo, 10)
    const task = (rangeTask || effectiveTaskOptions[0] || '').trim()
    if (!task)                  { setTaskError('task 이름을 입력하세요'); return }
    if (isNaN(from) || isNaN(to)) { setTaskError('숫자를 입력하세요'); return }
    if (from < 0 || to < 0)       { setTaskError('에피소드는 0 이상만 가능합니다'); return }
    if (from > to)                { setTaskError('시작 번호가 끝 번호보다 큽니다'); return }

    try {
      setTaskLoading(true)
      const updated = await assignTaskRange(from, to, task, editorName)
      setTaskInfo(updated > 0 ? `${updated}개 에피소드에 task 적용` : '변경할 대상이 없습니다')
      setTaskLoading(false)
    } catch (err) {
      setTaskLoading(false)
      const msg = err instanceof Error ? err.message : 'task 일괄 적용에 실패했습니다'
      setTaskError(msg)
    }
  }

  // ── Excel 다운로드 ───────────────────────────────────────────
  const handleExport = () => {
    const frameKeys = config.frames.map(f => f.key)

    const headerRow = [
      'Episode',
      'Operator',
      'Task',
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
        e.target,
        e.task ?? '',
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
      { wch: 14 }, // Operator
      { wch: 20 }, // Task
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

  const stats = useMemo(() => ({
    total:    entries.length,
    ok:       entries.filter(e => e.action === 'OK').length,
    resolved: entries.filter(e => e.action === 'Resolved').length,
    waiting:  entries.filter(e => e.action === 'Waiting Lead').length,
    conflict: entries.filter(e => e.conflict && e.action !== 'Resolved' && e.action !== 'Waiting Lead').length,
  }), [entries])

  const resultReport = useMemo(() => {
    const grouped: Record<ReportResult, string[]> = { Clean: [], Dirty: [], Fail: [] }
    entries.forEach(entry => {
      const episode = entry.episode.trim()
      if (!episode) return
      const result = effectiveResultForReport(entry)
      if (result === 'None') return
      grouped[result].push(episode)
    })
    return grouped
  }, [entries])

  const resultReportText = useMemo(() => {
    return REPORT_RESULTS
      .map(result => `${result} (${resultReport[result].length}건): ${resultReport[result].join(', ') || '-'}`)
      .join('\n')
  }, [resultReport])

  const copyResultReport = async () => {
    try {
      await navigator.clipboard.writeText(resultReportText)
      setReportCopyMessage('보고서 복사 완료')
    } catch {
      setReportCopyMessage('복사에 실패했습니다')
    } finally {
      window.setTimeout(() => setReportCopyMessage(''), 1800)
    }
  }

  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragOver  = (id: string) => { if (id !== draggedId) setDragOverId(id) }
  const handleDrop      = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return }
    const ids     = entries.map(e => e.id)
    const fromIdx = ids.indexOf(draggedId)
    const toIdx   = ids.indexOf(targetId)
    const newOrder = [...ids]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedId)
    setDraggedId(null); setDragOverId(null)
    await reorderEntries(newOrder)
  }

  const crossStartIdx     = bannerEpisode != null ? entries.findIndex(e => e.episode === bannerEpisode) : -1
  const crossStartId      = crossStartIdx !== -1 ? entries[crossStartIdx]?.id : null
  const needsActionEntries = entries.filter(e =>
    e.action && e.action !== 'OK' && e.action !== 'Resolved' && e.action !== 'Ready to review'
  )
  const effectiveTaskOptions = Array.from(new Set(
    taskOptions.map(v => v.trim()).filter(Boolean)
  ))

  // 동적 헤더
  const headers: {
    label: string
    group?: GroupKey
    sticky?: boolean
    stickyLeft?: string
    widthClass?: string
    compactTop?: string
    compactBottom?: string
  }[] = [
    { label: '',        group: 'ctrl',     sticky: true, stickyLeft: STICKY_CONTROL_LEFT, widthClass: STICKY_COL_WIDTH },
    { label: 'Episode',                    sticky: true, stickyLeft: STICKY_EPISODE_LEFT, widthClass: EPISODE_COL_WIDTH },
    { label: 'Action',  group: 'computed', sticky: true, stickyLeft: STICKY_ACTION_LEFT, widthClass: ACTION_COL_WIDTH },
    { label: 'Task',    group: 'computed', widthClass: TASK_COL_WIDTH },
    { label: `${r1Name} Result`, group: 'r1', widthClass: RESULT_COL_WIDTH },
    ...config.frames.map(f => ({
      label: `${r1Name} ${f.label}`,
      group: 'r1' as GroupKey,
      widthClass: FRAME_COL_WIDTH,
      compactTop: r1Name,
      compactBottom: f.label,
    })),
    { label: `${r2Name} Result`, group: 'r2', widthClass: RESULT_COL_WIDTH },
    ...config.frames.map(f => ({
      label: `${r2Name} ${f.label}`,
      group: 'r2' as GroupKey,
      widthClass: FRAME_COL_WIDTH,
      compactTop: r2Name,
      compactBottom: f.label,
    })),
    { label: 'Conflict', group: 'computed', widthClass: CONFLICT_COL_WIDTH },
    { label: 'Final Result', group: 'final', widthClass: RESULT_COL_WIDTH },
    ...config.frames.map(f => ({
      label: `Final ${f.label}`,
      group: 'final' as GroupKey,
      widthClass: FRAME_COL_WIDTH,
      compactTop: 'Final',
      compactBottom: f.label,
    })),
    { label: 'Reason Code', widthClass: REASON_CODE_COL_WIDTH },
    { label: 'Reason Detail', widthClass: DETAIL_COL_WIDTH },
    { label: 'Response Detail', widthClass: DETAIL_COL_WIDTH },
    { label: 'Route', widthClass: ROUTE_COL_WIDTH },
    { label: 'Last Updated', widthClass: LAST_UPDATED_COL_WIDTH },
  ]
  const TOTAL_COLS = headers.length

  const groupBg: Record<string, string> = {
    ctrl:     'bg-slate-50',
    r1:       'bg-blue-100',
    r2:       'bg-emerald-100',
    final:    'bg-amber-100',
    computed: 'bg-slate-200',
  }
  const columnWidths = getWorkDayColumnWidths(config.frames.length)
  const tableWidth = `max(100%, calc(${columnWidths.join(' + ')}))`

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

      {/* 집중모드 세팅창 */}
      {focusSetup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-5">
            <h2 className="text-base font-bold text-slate-900">집중모드 설정</h2>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">리뷰어</span>
              <div className="flex gap-2">
                {(['r1', 'r2'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setFocusSetupReviewer(r)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${focusSetupReviewer === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {r === 'r1' ? r1Name : r2Name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">진행 방향</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFocusSetupDir('down')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${focusSetupDir === 'down' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  ↓ 위에서 아래로
                </button>
                <button
                  onClick={() => setFocusSetupDir('up')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${focusSetupDir === 'up' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  ↑ 아래에서 위로
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Chrome / Edge에서는 항상 위 PiP 창을 우선 사용하고, 그 외 환경에서는 별도 팝업 창을 먼저 시도합니다.
                브라우저가 외부 창을 막으면 현재 탭 전체화면 오버레이로 전환됩니다.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setFocusSetup(false)} className="flex-1 border rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50">
                취소
              </button>
              <button
                onClick={handleStartFocus}
                className="flex-1 bg-slate-900 text-white rounded-lg py-2 text-sm hover:bg-slate-800"
              >
                시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 집중모드 오버레이 */}
      {focusConfig && focusWindow ? (
        <PiPWindow hostWindow={focusWindow} onClose={closeFocusMode}>
          {(hostWin) => (
            <FocusMode
              entries={entries}
              reviewer={focusConfig.reviewer}
              direction={focusConfig.direction}
              r1Name={r1Name}
              r2Name={r2Name}
              config={config}
              onSave={e => handleSave(e)}
              onExit={closeFocusMode}
              eventWindow={hostWin}
            />
          )}
        </PiPWindow>
      ) : focusConfig ? (
        <FocusMode
          entries={entries}
          reviewer={focusConfig.reviewer}
          direction={focusConfig.direction}
          r1Name={r1Name}
          r2Name={r2Name}
          config={config}
          onSave={e => handleSave(e)}
          onExit={closeFocusMode}
        />
      ) : null}
      {focusLaunchNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 shadow-sm">
          {focusLaunchNotice}
        </div>
      )}
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
            min={0}
            value={rangeFrom}
            onChange={e => setRangeFrom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRange()}
            placeholder="시작"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-900"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="number"
            min={0}
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
              aria-label={myUndoCount > 0 ? `내 변경 ${myUndoCount}단계 되돌리기` : '되돌릴 내용 없음'}
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
            <button
              onClick={() => setFocusSetup(true)}
              className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              ⊙ 집중모드
            </button>
          </div>
        </div>

        {/* task 범위 일괄 적용 */}
        <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Task 일괄</span>
          <select
            value={rangeTask}
            onChange={e => setRangeTask(e.target.value)}
            className="w-48 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900"
          >
            <option value="">Task 선택</option>
            {effectiveTaskOptions.map(task => <option key={task} value={task}>{task}</option>)}
          </select>
          <input
            type="number"
            min={0}
            value={taskFrom}
            onChange={e => setTaskFrom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAssignTaskRange()}
            placeholder="시작"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="number"
            min={0}
            value={taskTo}
            onChange={e => setTaskTo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAssignTaskRange()}
            placeholder="끝"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900"
          />
          <button
            onClick={handleAssignTaskRange}
            disabled={taskLoading}
            className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {taskLoading ? '적용 중...' : 'Task 적용'}
          </button>
          {taskError && <span className="text-xs text-red-500">{taskError}</span>}
          {taskInfo && <span className="text-xs text-emerald-600">{taskInfo}</span>}
        </div>

        {/* 범위 삭제 */}
        <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-2">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">범위 삭제</span>
          <input
            type="number"
            min={0}
            value={delFrom}
            onChange={e => { setDelFrom(e.target.value); setDelConfirm(false) }}
            onKeyDown={e => e.key === 'Enter' && handleDeleteRange()}
            placeholder="시작"
            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white text-slate-900"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="number"
            min={0}
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

      {/* 통계 요약 패널 */}
      {entries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-1 flex-wrap text-xs">
          <span className="text-slate-400 font-medium mr-1">전체 {stats.total}</span>
          <span className="text-slate-200">|</span>
          <span className="text-emerald-600 font-semibold">OK {stats.ok}</span>
          <span className="text-slate-200">|</span>
          <span className="text-red-500 font-semibold">Conflict {stats.conflict}</span>
          <span className="text-slate-200">|</span>
          <span className="text-blue-600 font-semibold">Resolved {stats.resolved}</span>
          {stats.waiting > 0 && (<>
            <span className="text-slate-200">|</span>
            <span className="text-violet-600 font-semibold">Waiting {stats.waiting}</span>
          </>)}
        </div>
      )}

      {/* 결과 보고서 */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">결과 보고서</p>
          <div className="flex items-center gap-2">
            {reportCopyMessage && (
              <span className={`text-xs ${reportCopyMessage.includes('완료') ? 'text-emerald-600' : 'text-red-500'}`}>
                {reportCopyMessage}
              </span>
            )}
            <button
              onClick={copyResultReport}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              보고서 복사
            </button>
          </div>
        </div>
        <div className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed">
          {REPORT_RESULTS.map(result => (
            <p key={result} className="break-words">
              <span className="font-semibold">{result} ({resultReport[result].length}건):</span> {resultReport[result].join(', ') || '-'}
            </p>
          ))}
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
                <div
                  key={e.id}
                  onClick={() => scrollToEntry(e.id)}
                  className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-amber-100/60 cursor-pointer transition-colors"
                >
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
        {/* 고정 헤더 */}
        <div
          ref={mirrorRef}
          className="sticky top-0 z-30 overflow-x-auto border-b border-slate-100 bg-white rounded-t-xl"
          onScroll={onMirrorScroll}
        >
          <table
            className="table-fixed border-separate border-spacing-0 text-sm"
            style={{ width: tableWidth }}
          >
            <colgroup>
              {columnWidths.map((width, i) => (
                <col key={`sticky_col_${i}`} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b-2 border-slate-300">
                {headers.map((h, i) => (
                  <th
                    key={`sticky_${h.label}_${i}`}
                    className={[
                      'px-2 py-2.5 text-xs font-semibold text-slate-600 text-left whitespace-nowrap border-r border-slate-200',
                      h.compactTop ? 'text-center whitespace-normal leading-tight break-keep px-1 py-1.5' : '',
                      h.widthClass ?? '',
                      h.sticky ? `sticky ${h.stickyLeft} z-20` : 'z-10',
                      h.group ? groupBg[h.group] : 'bg-slate-100',
                    ].join(' ')}
                  >
                    {h.compactTop ? (
                      <span className="block leading-tight">
                        <span className="block text-[10px] font-bold text-slate-500">{h.compactTop}</span>
                        <span className="block text-[11px] font-semibold text-slate-700">{h.compactBottom}</span>
                      </span>
                    ) : (
                      h.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* 테이블 */}
        <div ref={containerRef} className="overflow-x-auto" onScroll={onContainerScroll}>
          <table
            className="table-fixed border-separate border-spacing-0 text-sm"
            style={{ width: tableWidth }}
          >
            <colgroup>
              {columnWidths.map((width, i) => (
                <col key={`body_col_${i}`} style={{ width }} />
              ))}
            </colgroup>
            <tbody>
              {entries.map((entry) => (
                <Fragment key={entry.id}>
                  {insertBeforeId === entry.id && (
                    <InsertRow
                      totalCols={TOTAL_COLS}
                      r1Name={r1Name}
                      r2Name={r2Name}
                      onConfirm={async (ep, operator) => { await addRow(ep, editorName, operator); setInsertBeforeId(null) }}
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
                              aria-label="배너를 위로 이동"
                            >▲</button>
                            <button
                              onClick={() => { const ni = crossStartIdx + 1; if (ni < entries.length) saveBannerEpisode(entries[ni].episode) }}
                              disabled={crossStartIdx >= entries.length - 1}
                              className="text-violet-400 hover:text-violet-600 disabled:opacity-30 px-1 text-xs"
                              aria-label="배너를 아래로 이동"
                            >▼</button>
                            <button
                              onClick={() => saveBannerEpisode(null)}
                              className="text-violet-300 hover:text-red-400 px-1 text-xs"
                              aria-label="배너 제거"
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
                    taskOptions={effectiveTaskOptions}
                    config={config}
                    onSave={handleSave}
                    onInsertBefore={() => setInsertBeforeId(entry.id)}
                    onDelete={() => deleteRow(entry.id)}
                    onSetBanner={() => bannerEpisode === entry.episode ? saveBannerEpisode(null) : saveBannerEpisode(entry.episode)}
                    isBannerHere={bannerEpisode === entry.episode}
                    onDragStart={() => handleDragStart(entry.id)}
                    onDragOver={() => handleDragOver(entry.id)}
                    onDrop={() => handleDrop(entry.id)}
                    isDragOver={dragOverId === entry.id}
                    isDragging={draggedId === entry.id}
                    rowRef={el => { if (el) rowRefs.current.set(entry.id, el); else rowRefs.current.delete(entry.id) }}
                    isHighlighted={highlightedId === entry.id}
                  />
                </Fragment>
              ))}

              {/* 맨 아래 에피소드 추가 */}
              <tr className="border-t border-slate-100">
                <td className={`sticky ${STICKY_CONTROL_LEFT} bg-white z-10 ${STICKY_COL_WIDTH} border-r border-slate-100`} />
                <td colSpan={TOTAL_COLS - 1} className="px-2 py-1">
                  <input
                    ref={newEpisodeRef}
                    type="number"
                    min={0}
                    className="text-sm text-slate-400 placeholder-slate-300 px-1 py-1 w-full focus:outline-none focus:text-slate-800"
                    placeholder="+ 에피소드 번호 직접 입력 후 Enter..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const raw = (e.target as HTMLInputElement).value.trim()
                        const parsed = Number(raw)
                        if (raw && Number.isFinite(parsed)) {
                          void addRow(parsed < 0 ? '0' : raw, editorName)
                          ;(e.target as HTMLInputElement).value = ''
                        }
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
