'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { computeRow } from '@/lib/logic'
import type { Entry, EntryWithComputed } from '@/lib/types'

type EntryWithNames = EntryWithComputed & { r1_name: string; r2_name: string }

function effectiveResult(e: EntryWithNames): string {
  if (e.r1_result && e.r2_result) return e.final_result   // 둘 다 있으면 파이널
  return e.r1_result || e.r2_result                        // 한 명만 있으면 그 값
}

const TODAY     = new Date().toISOString().slice(0, 10)
const TWO_WEEKS = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)

function MultiPillGroup({ label, options, selected, onToggle, onClear }: {
  label: string
  options: { key: string; label: string }[]
  selected: Set<string>
  onToggle: (key: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map(o => (
          <button key={o.key} onClick={() => onToggle(o.key)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              selected.has(o.key) ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >{o.label}</button>
        ))}
        {selected.size > 0 && (
          <button onClick={onClear} className="px-2.5 py-1 text-xs rounded-full font-medium bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">전체</button>
        )}
      </div>
    </div>
  )
}

export default function ArchivePage() {
  const [entries, setEntries] = useState<EntryWithNames[]>([])
  const [loading, setLoading] = useState(true)

  const [episodeSearch, setEpisodeSearch]   = useState('')
  const [operatorSearch, setOperatorSearch] = useState('')
  const [taskSearch, setTaskSearch]         = useState('')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [dateFrom, setDateFrom]             = useState(TWO_WEEKS)
  const [dateTo, setDateTo]                 = useState(TODAY)
  const [conflictFilter, setConflictFilter] = useState<Set<string>>(new Set())
  const [actionFilter, setActionFilter]     = useState<Set<string>>(new Set())
  const [resultFilter, setResultFilter]     = useState<Set<string>>(new Set())

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (val: string) =>
    setter(prev => {
      const s = new Set(prev)
      if (s.has(val)) s.delete(val)
      else s.add(val)
      return s
    })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: wdData } = await supabase
      .from('work_days').select('date, r1_name, r2_name')
      .gte('date', dateFrom || '2000-01-01')
      .lte('date', dateTo   || TODAY)

    if (!wdData || wdData.length === 0) { setEntries([]); setLoading(false); return }

    const nameMap: Record<string, { r1_name: string; r2_name: string }> = {}
    wdData.forEach(w => { nameMap[w.date] = { r1_name: w.r1_name, r2_name: w.r2_name } })

    const { data: entryData } = await supabase
      .from('entries').select('*')
      .in('work_date', wdData.map(w => w.date))
      .order('work_date', { ascending: false })

    if (!entryData) { setLoading(false); return }
    setEntries(
      entryData.map(e => ({
        ...(e as Entry),
        ...computeRow(e as Entry),
        r1_name: nameMap[e.work_date]?.r1_name ?? '',
        r2_name: nameMap[e.work_date]?.r2_name ?? '',
      }))
    )
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void fetchData() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchData])

  // Result 옵션 동적 도출 (effectiveResult 기준)
  const resultOptions = useMemo(() => {
    const vals = new Set<string>()
    entries.forEach(e => { const r = effectiveResult(e); if (r) vals.add(r) })
    return Array.from(vals).sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (episodeSearch && !e.episode.includes(episodeSearch)) return false
      if (operatorSearch && !e.target.toLowerCase().includes(operatorSearch.toLowerCase())) return false
      if (taskSearch && !(e.task ?? '').toLowerCase().includes(taskSearch.toLowerCase())) return false
      if (reviewerFilter) {
        const rf = reviewerFilter.toLowerCase()
        if (!e.r1_name.toLowerCase().includes(rf) && !e.r2_name.toLowerCase().includes(rf)) return false
      }
      // Conflict — OR within, AND with others
      if (conflictFilter.size > 0) {
        const has = conflictFilter.has('yes') && !!e.conflict || conflictFilter.has('no') && !e.conflict
        if (!has) return false
      }
      // Action — OR within, AND with others
      if (actionFilter.size > 0) {
        const actionMatch =
          (actionFilter.has('ok')         && e.action === 'OK')           ||
          (actionFilter.has('resolved')   && e.action === 'Resolved')     ||
          (actionFilter.has('waiting')    && e.action === 'Waiting Lead') ||
          (actionFilter.has('processing') && e.action !== 'OK' && e.action !== 'Resolved' && e.action !== 'Ready to review' && !!e.action)
        if (!actionMatch) return false
      }
      // Result — OR within, AND with others
      if (resultFilter.size > 0 && !resultFilter.has(effectiveResult(e))) return false
      return true
    })
  }, [entries, episodeSearch, operatorSearch, taskSearch, reviewerFilter, conflictFilter, actionFilter, resultFilter])

  const handleExport = () => {
    const headers = ['날짜', '에피소드', 'Operator', 'Task', 'R1', 'R2', 'R1 Result', 'R2 Result', 'Conflict', 'Action', 'Final Result', 'Reason Code', 'Reason Detail', 'Response Detail', 'Route', 'Last Editor', 'Last Updated']
    const rows = filtered.map(e => [
      e.work_date, e.episode, e.target, e.task ?? '', e.r1_name, e.r2_name,
      e.r1_result, e.r2_result, e.conflict, e.action,
      e.final_result, e.reason_code, e.reason_detail, e.response_detail,
      e.route, e.last_editor,
      e.last_updated ? new Date(e.last_updated).toLocaleString('ko-KR') : '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 20 }, { wch: 28 }, { wch: 12 }, { wch: 22 },
      { wch: 40 }, { wch: 40 }, { wch: 25 }, { wch: 14 }, { wch: 20 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'archive')
    XLSX.writeFile(wb, `archive_${dateFrom}_${dateTo}.xlsx`)
  }

  const isDefaultRange = dateFrom === TWO_WEEKS && dateTo === TODAY

  return (
    <main className="px-4 py-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">← 목록</Link>
          <h1 className="text-xl font-bold text-slate-900">전체 보관함</h1>
        </div>
        <button
          onClick={handleExport}
          disabled={loading || filtered.length === 0}
          className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          ↓ Excel {!loading && filtered.length > 0 && `(${filtered.length.toLocaleString()}건)`}
        </button>
      </div>

      {/* 필터 바 */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 flex flex-col gap-3 shadow-sm">
        {/* 텍스트 검색 + 날짜 */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={episodeSearch}
            onChange={e => setEpisodeSearch(e.target.value)}
            placeholder="에피소드 검색"
            className="border border-slate-200 rounded-full px-2.5 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <input
            value={operatorSearch}
            onChange={e => setOperatorSearch(e.target.value)}
            placeholder="오퍼레이터"
            className="border border-slate-200 rounded-full px-2.5 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <input
            type="text"
            autoComplete="off"
            value={taskSearch}
            onChange={e => setTaskSearch(e.target.value)}
            placeholder="task 검색"
            className="border border-slate-200 rounded-full px-2.5 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <input
            value={reviewerFilter}
            onChange={e => setReviewerFilter(e.target.value)}
            placeholder="검수자 이름"
            className="border border-slate-200 rounded-full px-2.5 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <div className="h-3.5 w-px bg-slate-200" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
          <span className="text-slate-300 text-xs">~</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
          {!isDefaultRange && (
            <button onClick={() => { setDateFrom(TWO_WEEKS); setDateTo(TODAY) }} className="text-[10px] text-blue-500 hover:text-blue-700">초기화</button>
          )}
          <span className="ml-auto text-[10px] text-slate-400">
            {loading ? '로딩 중...' : `${filtered.length.toLocaleString()}건`}
          </span>
        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* 독립 필터 (카테고리 내 OR, 카테고리 간 AND) */}
        <MultiPillGroup
          label="Conflict"
          options={[{ key: 'yes', label: '있음' }, { key: 'no', label: '없음' }]}
          selected={conflictFilter}
          onToggle={toggle(setConflictFilter)}
          onClear={() => setConflictFilter(new Set())}
        />
        <MultiPillGroup
          label="Action"
          options={[
            { key: 'ok',         label: 'OK' },
            { key: 'resolved',   label: 'Resolved' },
            { key: 'waiting',    label: 'Waiting Lead' },
            { key: 'processing', label: '처리중' },
          ]}
          selected={actionFilter}
          onToggle={toggle(setActionFilter)}
          onClear={() => setActionFilter(new Set())}
        />
        <MultiPillGroup
          label="Result"
          options={resultOptions.map(v => ({ key: v, label: v }))}
          selected={resultFilter}
          onToggle={toggle(setResultFilter)}
          onClear={() => setResultFilter(new Set())}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin mb-2" />
          <p>불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">결과가 없습니다.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                {['날짜', '에피소드', 'Operator', 'Task', 'R1', 'R2', 'R1 Result', 'R2 Result', 'Conflict', 'Action', 'Final', 'Reason Code'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(e => {
                const actionCls =
                  e.action === 'OK'       ? 'text-emerald-600 font-medium' :
                  e.action === 'Resolved' ? 'text-blue-600 font-medium'    :
                  e.conflict              ? 'text-red-500 font-medium'      : 'text-slate-500'
                return (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link href={`/${e.work_day_id}`} className="font-mono text-blue-600 hover:underline">{e.work_date}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">{e.episode}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{e.target || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{e.task || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{e.r1_name}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{e.r2_name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.r1_result || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.r2_result || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.conflict ? <span className="text-red-500">{e.conflict}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap ${actionCls}`}>{e.action}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.final_result || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.reason_code || <span className="text-slate-300">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
