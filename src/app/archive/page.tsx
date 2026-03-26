'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { computeRow } from '@/lib/logic'
import type { Entry, EntryWithComputed } from '@/lib/types'

type EntryWithNames = EntryWithComputed & { r1_name: string; r2_name: string }
type ConflictFilter = 'all' | 'yes' | 'no'
type ActionFilter   = 'all' | 'ok' | 'resolved' | 'waiting' | 'processing'

const TODAY     = new Date().toISOString().slice(0, 10)
const TWO_WEEKS = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map(o => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              value === o.key
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ArchivePage() {
  const [entries, setEntries]   = useState<EntryWithNames[]>([])
  const [loading, setLoading]   = useState(true)
  const [hitLimit, setHitLimit] = useState(false)

  const [episodeSearch, setEpisodeSearch]   = useState('')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [dateFrom, setDateFrom]             = useState(TWO_WEEKS)
  const [dateTo, setDateTo]                 = useState(TODAY)
  const [conflictFilter, setConflictFilter] = useState<ConflictFilter>('all')
  const [actionFilter, setActionFilter]     = useState<ActionFilter>('all')
  const [resultFilter, setResultFilter]     = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: wdData } = await supabase
      .from('work_days').select('date, r1_name, r2_name')
      .gte('date', dateFrom || '2000-01-01')
      .lte('date', dateTo   || TODAY)

    if (!wdData || wdData.length === 0) { setEntries([]); setLoading(false); return }

    const nameMap: Record<string, { r1_name: string; r2_name: string }> = {}
    wdData.forEach(w => { nameMap[w.date] = { r1_name: w.r1_name, r2_name: w.r2_name } })

    const LIMIT = 1000
    const { data: entryData } = await supabase
      .from('entries').select('*')
      .in('work_date', wdData.map(w => w.date))
      .order('work_date', { ascending: false })
      .limit(LIMIT)

    if (!entryData) { setLoading(false); return }
    setHitLimit(entryData.length >= LIMIT)
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

  useEffect(() => { fetchData() }, [fetchData])

  // Result 옵션 동적 도출
  const resultOptions = useMemo(() => {
    const vals = new Set<string>()
    entries.forEach(e => {
      if (e.r1_result) vals.add(e.r1_result)
      if (e.r2_result) vals.add(e.r2_result)
    })
    return [
      { key: 'all', label: '전체' },
      ...Array.from(vals).sort().map(v => ({ key: v, label: v })),
    ]
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (episodeSearch && !e.episode.includes(episodeSearch)) return false
      if (reviewerFilter) {
        const rf = reviewerFilter.toLowerCase()
        if (!e.r1_name.toLowerCase().includes(rf) && !e.r2_name.toLowerCase().includes(rf)) return false
      }
      // Conflict (AND)
      if (conflictFilter === 'yes' && !e.conflict)  return false
      if (conflictFilter === 'no'  &&  e.conflict)  return false
      // Action (AND)
      if (actionFilter === 'ok'         && e.action !== 'OK')           return false
      if (actionFilter === 'resolved'   && e.action !== 'Resolved')     return false
      if (actionFilter === 'waiting'    && e.action !== 'Waiting Lead') return false
      if (actionFilter === 'processing' &&
          (e.action === 'OK' || e.action === 'Resolved' || e.action === 'Ready to review' || !e.action))
        return false
      // Result (AND) — R1 또는 R2 결과에 포함
      if (resultFilter !== 'all' && e.r1_result !== resultFilter && e.r2_result !== resultFilter) return false
      return true
    })
  }, [entries, episodeSearch, reviewerFilter, conflictFilter, actionFilter, resultFilter])

  const handleExport = () => {
    const headers = ['날짜', '에피소드', 'R1', 'R2', 'R1 Result', 'R2 Result', 'Conflict', 'Action', 'Final Result', 'Reason Code', 'Reason Detail', 'Response Detail', 'Route', 'Last Editor', 'Last Updated']
    const rows = filtered.map(e => [
      e.work_date, e.episode, e.r1_name, e.r2_name,
      e.r1_result, e.r2_result, e.conflict, e.action,
      e.final_result, e.reason_code, e.reason_detail, e.response_detail,
      e.route, e.last_editor,
      e.last_updated ? new Date(e.last_updated).toLocaleString('ko-KR') : '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 28 },
      { wch: 12 }, { wch: 22 }, { wch: 40 }, { wch: 40 },
      { wch: 25 }, { wch: 14 }, { wch: 20 },
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
          ↓ Excel
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
            {loading ? '로딩 중...' : (
              <>
                {filtered.length.toLocaleString()}건
                {hitLimit && <span className="text-amber-500 ml-1">(최대 1,000건 — 날짜 범위를 좁혀보세요)</span>}
              </>
            )}
          </span>
        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* 독립 필터 (AND 조합) */}
        <PillGroup<ConflictFilter>
          label="Conflict"
          value={conflictFilter}
          onChange={setConflictFilter}
          options={[
            { key: 'all', label: '전체' },
            { key: 'yes', label: '있음' },
            { key: 'no',  label: '없음' },
          ]}
        />
        <PillGroup<ActionFilter>
          label="Action"
          value={actionFilter}
          onChange={setActionFilter}
          options={[
            { key: 'all',        label: '전체' },
            { key: 'ok',         label: 'OK' },
            { key: 'resolved',   label: 'Resolved' },
            { key: 'waiting',    label: 'Waiting Lead' },
            { key: 'processing', label: '처리중' },
          ]}
        />
        <PillGroup<string>
          label="Result"
          value={resultFilter}
          onChange={setResultFilter}
          options={resultOptions}
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
                {['날짜', '에피소드', 'R1', 'R2', 'R1 Result', 'R2 Result', 'Conflict', 'Action', 'Final', 'Reason Code'].map(h => (
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
                      <Link href={`/${e.work_date}`} className="font-mono text-blue-600 hover:underline">{e.work_date}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">{e.episode}</td>
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
