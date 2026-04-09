'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { computeRow } from '@/lib/logic'
import { NameSelector } from '@/components/NameSelector'
import { CreateWorkDayModal } from '@/components/CreateWorkDayModal'
import { SettingsModal } from '@/components/SettingsModal'
import { GuideModal } from '@/components/GuideModal'
import { useAppSettings } from '@/hooks/useAppSettings'
import type { WorkDay, Entry } from '@/lib/types'

type Status = 'done' | 'in_progress' | 'not_started'
interface Summary { status: Status; range: string; total: number; doneCnt: number }
type InsightResult = 'Clean' | 'Dirty' | 'Fail' | 'None'

const INSIGHT_RESULTS: InsightResult[] = ['Clean', 'Dirty', 'Fail', 'None']
const TODAY = new Date().toISOString().slice(0, 10)
const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)

function effectiveResult(e: Entry): InsightResult {
  const result = e.r1_result && e.r2_result
    ? (e.final_result || 'None')
    : (e.r1_result || e.r2_result || 'None')
  if (result === 'Clean' || result === 'Dirty' || result === 'Fail' || result === 'None') return result
  return 'None'
}

export default function HomePage() {
  const [workDays, setWorkDays]         = useState<WorkDay[]>([])
  const [entriesByWorkDay, setEntriesByWorkDay] = useState<Record<string, Entry[]>>({})
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [deletingDate, setDeletingDate] = useState<string | null>(null) // stores id
  const [summaries, setSummaries]       = useState<Record<string, Summary>>({})
  const { settings, saveSettings }      = useAppSettings()

  const [showGuide, setShowGuide]       = useState(false)
  const [sortAsc, setSortAsc]           = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'in_progress'>('all')
  const [reviewerFilter, setReviewerFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState(TWO_WEEKS_AGO)
  const [dateTo, setDateTo]             = useState(TODAY)
  const [showInsights, setShowInsights] = useState(false)
  const [insightDateFrom, setInsightDateFrom] = useState('')
  const [insightDateTo, setInsightDateTo] = useState('')
  const [insightEpisodeFrom, setInsightEpisodeFrom] = useState('')
  const [insightEpisodeTo, setInsightEpisodeTo] = useState('')
  const [insightOperatorSearch, setInsightOperatorSearch] = useState('')
  const [insightTaskSearch, setInsightTaskSearch] = useState('')
  const [insightResultFilter, setInsightResultFilter] = useState<Set<InsightResult>>(new Set(['Clean', 'Dirty', 'Fail', 'None']))

  const fetchWorkDays = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('work_days').select('*').order('date', { ascending: sortAsc })
    const { data } = await q
    if (data) setWorkDays(data as WorkDay[])
    setLoading(false)
  }, [sortAsc])

  const fetchSummaries = useCallback(async (days: WorkDay[]) => {
    if (days.length === 0) return
    const { data } = await supabase
      .from('entries')
      .select('work_day_id, episode, r1_result, r2_result, r1_pick, r2_pick, r1_place, r2_place, r1_frame3, r2_frame3, final_result, final_pick, final_place, final_frame3, reason_code, route, reason_detail, response_detail, target, task')
      .in('work_day_id', days.map(d => d.id))
    if (!data) return

    const byId: Record<string, Entry[]> = {}
    data.forEach(e => {
      if (!byId[e.work_day_id]) byId[e.work_day_id] = []
      byId[e.work_day_id].push(e as Entry)
    })
    setEntriesByWorkDay(byId)

    const result: Record<string, Summary> = {}
    days.forEach(wd => {
      const entries = byId[wd.id] ?? []
      if (entries.length === 0) { result[wd.id] = { status: 'not_started', range: '', total: 0, doneCnt: 0 }; return }
      const doneCnt = entries.filter(e => { const { action } = computeRow(e); return action === 'OK' || action === 'Resolved' }).length
      const nums = entries.map(e => parseFloat(e.episode)).filter(n => !isNaN(n))
      const min  = nums.length ? Math.min(...nums) : null
      const max  = nums.length ? Math.max(...nums) : null
      const range = min !== null && max !== null
        ? (min === max ? `Ep. ${min}` : `Ep. ${min} ~ ${max}`) : ''
      result[wd.id] = { status: doneCnt === entries.length ? 'done' : 'in_progress', range, total: entries.length, doneCnt }
    })
    setSummaries(result)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void fetchWorkDays() }, 0)
    const channel = supabase
      .channel('work_days_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_days' }, fetchWorkDays)
      .subscribe()
    const poll = setInterval(() => { void fetchWorkDays() }, 30000)
    return () => { window.clearTimeout(timeoutId); supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetchWorkDays])

  useEffect(() => {
    if (workDays.length === 0) return
    const timeoutId = window.setTimeout(() => { void fetchSummaries(workDays) }, 0)
    const poll = setInterval(() => { void fetchSummaries(workDays) }, 10000)
    return () => { window.clearTimeout(timeoutId); clearInterval(poll) }
  }, [workDays, fetchSummaries])

  const handleDelete = async (id: string) => {
    await supabase.from('work_days').delete().eq('id', id)
    setWorkDays(prev => prev.filter(w => w.id !== id))
    setDeletingDate(null)
  }


  const statusReviewerFilteredWorkDays = useMemo(() => {
    return workDays.filter(wd => {
      if (statusFilter !== 'all') {
        const sum = summaries[wd.id]
        if (!sum || sum.status !== statusFilter) return false
      }
      if (reviewerFilter) {
        const rf = reviewerFilter.toLowerCase()
        if (!wd.r1_name.toLowerCase().includes(rf) && !wd.r2_name.toLowerCase().includes(rf)) return false
      }
      return true
    })
  }, [workDays, statusFilter, summaries, reviewerFilter])

  const filteredWorkDays = useMemo(() => {
    return statusReviewerFilteredWorkDays.filter(wd => {
      if (dateFrom && wd.date < dateFrom) return false
      if (dateTo && wd.date > dateTo) return false
      return true
    })
  }, [statusReviewerFilteredWorkDays, dateFrom, dateTo])

  const insightEntries = useMemo(() => {
    const rows: Entry[] = []
    statusReviewerFilteredWorkDays.forEach(wd => {
      if (insightDateFrom && wd.date < insightDateFrom) return
      if (insightDateTo && wd.date > insightDateTo) return
      const dayRows = entriesByWorkDay[wd.id] ?? []
      dayRows.forEach(row => rows.push(row))
    })
    return rows
  }, [statusReviewerFilteredWorkDays, entriesByWorkDay, insightDateFrom, insightDateTo])

  const filteredInsightEntries = useMemo(() => {
    const fromRaw = insightEpisodeFrom.trim()
    const toRaw = insightEpisodeTo.trim()
    const fromParsed = fromRaw ? Number(fromRaw) : null
    const toParsed = toRaw ? Number(toRaw) : null
    const fromNum = fromParsed !== null && Number.isFinite(fromParsed) ? Math.max(0, fromParsed) : null
    const toNum = toParsed !== null && Number.isFinite(toParsed) ? Math.max(0, toParsed) : null
    const rangeStart = fromNum !== null && toNum !== null ? Math.min(fromNum, toNum) : fromNum
    const rangeEnd = fromNum !== null && toNum !== null ? Math.max(fromNum, toNum) : toNum
    const opQ = insightOperatorSearch.trim().toLowerCase()
    const taskQ = insightTaskSearch.trim().toLowerCase()

    return insightEntries.filter(e => {
      if (rangeStart !== null || rangeEnd !== null) {
        const epNum = parseFloat(e.episode)
        if (Number.isNaN(epNum)) return false
        if (rangeStart !== null && epNum < rangeStart) return false
        if (rangeEnd !== null && epNum > rangeEnd) return false
      }
      if (opQ && !e.target.toLowerCase().includes(opQ)) return false
      if (taskQ && !(e.task ?? '').toLowerCase().includes(taskQ)) return false
      const result = effectiveResult(e)
      if (insightResultFilter.size > 0 && !insightResultFilter.has(result)) return false
      return true
    })
  }, [insightEntries, insightEpisodeFrom, insightEpisodeTo, insightOperatorSearch, insightTaskSearch, insightResultFilter])

  const insightResultCounts = useMemo(() => {
    const counts: Record<InsightResult, number> = { Clean: 0, Dirty: 0, Fail: 0, None: 0 }
    filteredInsightEntries.forEach(e => { counts[effectiveResult(e)] += 1 })
    return counts
  }, [filteredInsightEntries])

  const totalFilteredCount = filteredInsightEntries.length
  const successCount = insightResultCounts.Clean + insightResultCounts.Dirty
  const overallSuccessRate = totalFilteredCount > 0 ? Math.round((successCount / totalFilteredCount) * 1000) / 10 : 0
  const cleanSuccessRate = totalFilteredCount > 0 ? Math.round((insightResultCounts.Clean / totalFilteredCount) * 1000) / 10 : 0
  const dirtySuccessRate = totalFilteredCount > 0 ? Math.round((insightResultCounts.Dirty / totalFilteredCount) * 1000) / 10 : 0
  const visibleInsightResults = INSIGHT_RESULTS.filter(result => insightResultFilter.has(result))

  const taskStats = useMemo(() => {
    const map = new Map<string, { total: number }>()
    filteredInsightEntries.forEach(e => {
      const task = (e.task ?? '').trim() || '(미지정)'
      const existing = map.get(task) ?? { total: 0 }
      existing.total += 1
      map.set(task, existing)
    })
    return Array.from(map.entries())
      .map(([task, stat]) => ({ task, total: stat.total }))
      .sort((a, b) => b.total - a.total)
  }, [filteredInsightEntries])

  const toggleInsightResult = (result: InsightResult) => {
    setInsightResultFilter(prev => {
      const next = new Set(prev)
      if (next.has(result)) next.delete(result)
      else next.add(result)
      return next
    })
  }

  const StatusBadge = ({ status }: { status: Status }) => {
    if (status === 'not_started') return null
    return status === 'done'
      ? <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">완료</span>
      : <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">진행중</span>
  }

  const sBtnCls = (s: string) =>
    `px-2.5 py-1 text-sm rounded-full font-medium transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`

  const isDefaultRange = dateFrom === TWO_WEEKS_AGO && dateTo === TODAY
  const isInsightDefaultDateRange = !insightDateFrom && !insightDateTo

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 flex flex-col text-sm text-slate-700">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Ops</h1>
          <p className="text-sm text-slate-400 mt-0.5">교차 검수 작업 관리 시스템</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/archive" className="text-sm text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">
            전체 보관함
          </Link>
          <button
            onClick={() => setShowGuide(p => !p)}
            title="사용 가이드"
            className={`text-sm px-2 py-1 rounded-lg transition-colors ${showGuide ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            ?
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="설정"
            className="text-slate-400 hover:text-slate-600 text-lg px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ⚙
          </button>
          <NameSelector />
        </div>
      </div>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">작업일</h2>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 새 작업일
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-col gap-2.5 mb-4 bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSortAsc(p => !p)}
            className="text-sm text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {sortAsc ? '오래된순 ↑' : '최신순 ↓'}
          </button>
          <div className="h-3.5 w-px bg-slate-200" />
          <div className="flex gap-1">
            <button className={sBtnCls('all')}         onClick={() => setStatusFilter('all')}>전체</button>
            <button className={sBtnCls('done')}        onClick={() => setStatusFilter('done')}>완료</button>
            <button className={sBtnCls('in_progress')} onClick={() => setStatusFilter('in_progress')}>진행중</button>
          </div>
          <div className="h-3.5 w-px bg-slate-200" />
          <input
            value={reviewerFilter}
            onChange={e => setReviewerFilter(e.target.value)}
            placeholder="검수자 이름"
            className="text-sm border border-slate-200 rounded-full px-2.5 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
          <span className="text-slate-300 text-sm">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
          {!isDefaultRange && (
            <button
              onClick={() => { setDateFrom(TWO_WEEKS_AGO); setDateTo(TODAY) }}
              className="text-[10px] text-blue-500 hover:text-blue-700 px-1.5"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      <div className="order-3 mt-4 w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <button
          onClick={() => setShowInsights(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">인사이트</p>
            <p className="text-sm text-slate-400 mt-0.5">필터/검색 기준으로 결과와 task 분포를 동적으로 확인합니다</p>
          </div>
          <span className="text-sm text-slate-400">{showInsights ? '접기 ↑' : '펼치기 ↓'}</span>
        </button>

        {showInsights && (
          <div className="border-t border-slate-100 px-3 py-3 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={0}
                value={insightEpisodeFrom}
                onChange={e => setInsightEpisodeFrom(e.target.value)}
                placeholder="에피소드 시작"
                className="text-sm border border-slate-200 rounded-full px-2.5 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <span className="text-slate-300 text-sm">~</span>
              <input
                type="number"
                min={0}
                value={insightEpisodeTo}
                onChange={e => setInsightEpisodeTo(e.target.value)}
                placeholder="에피소드 끝"
                className="text-sm border border-slate-200 rounded-full px-2.5 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <input
                type="date"
                value={insightDateFrom}
                onChange={e => setInsightDateFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              />
              <span className="text-slate-300 text-sm">~</span>
              <input
                type="date"
                value={insightDateTo}
                onChange={e => setInsightDateTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              />
              <input
                type="text"
                value={insightOperatorSearch}
                onChange={e => setInsightOperatorSearch(e.target.value)}
                placeholder="오퍼레이터 검색"
                className="text-sm border border-slate-200 rounded-full px-2.5 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <input
                type="text"
                value={insightTaskSearch}
                onChange={e => setInsightTaskSearch(e.target.value)}
                placeholder="task 검색"
                className="text-sm border border-slate-200 rounded-full px-2.5 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <button
                onClick={() => setInsightResultFilter(new Set<InsightResult>(['Clean', 'Dirty', 'Fail', 'None']))}
                className="text-[10px] text-blue-500 hover:text-blue-700 px-1.5"
              >
                결과필터 초기화
              </button>
              {!isInsightDefaultDateRange && (
                <button
                  onClick={() => { setInsightDateFrom(''); setInsightDateTo('') }}
                  className="text-[10px] text-blue-500 hover:text-blue-700 px-1.5"
                >
                  날짜 초기화
                </button>
              )}
            </div>

            <div className="flex gap-1 flex-wrap">
              {INSIGHT_RESULTS.map(result => (
                <button
                  key={result}
                  onClick={() => toggleInsightResult(result)}
                  className={`px-2.5 py-1 text-sm rounded-full font-medium transition-colors ${
                    insightResultFilter.has(result)
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {result}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">에피소드</p>
                <p className="text-lg font-bold text-slate-900">{filteredInsightEntries.length.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">전체 성공률</p>
                <p className="text-lg font-bold text-slate-900">{overallSuccessRate}%</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Clean 성공률</p>
                <p className="text-lg font-bold text-emerald-700">{cleanSuccessRate}%</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                <p className="text-[10px] text-amber-600 uppercase tracking-wider">Dirty 성공률</p>
                <p className="text-lg font-bold text-amber-700">{dirtySuccessRate}%</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 p-2.5">
              <p className="text-sm font-semibold text-slate-600 mb-2">결과 분포</p>
              {visibleInsightResults.length === 0 ? (
                <p className="text-[11px] text-slate-400">선택된 결과 필터가 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {visibleInsightResults.map(result => {
                    const count = insightResultCounts[result]
                    const total = filteredInsightEntries.length || 1
                    const width = Math.max(2, Math.round((count / total) * 100))
                    const barColor =
                      result === 'Clean' ? 'bg-emerald-400' :
                      result === 'Dirty' ? 'bg-amber-400' :
                      result === 'Fail'  ? 'bg-red-400'    : 'bg-slate-300'
                    return (
                      <div key={result} className="flex items-center gap-2">
                        <span className="w-10 text-[11px] text-slate-500">{result}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${width}%` }} />
                        </div>
                        <span className="w-10 text-right text-[11px] text-slate-500">{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-100 p-2.5">
              <p className="text-sm font-semibold text-slate-600 mb-2">Task 분포 (전체 대비)</p>
              {taskStats.length === 0 ? (
                <p className="text-[11px] text-slate-400">조건에 맞는 task 데이터가 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {taskStats.slice(0, 8).map(stat => {
                    const sharePct = totalFilteredCount > 0 ? Math.round((stat.total / totalFilteredCount) * 1000) / 10 : 0
                    return (
                      <div key={stat.task} className="flex items-center gap-2">
                        <span className="w-24 truncate text-[11px] text-slate-600" title={stat.task}>{stat.task}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-indigo-400" style={{ width: `${sharePct}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0">{stat.total}건 · 전체대비 {sharePct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="order-2 w-full max-w-4xl mx-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : filteredWorkDays.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {workDays.length === 0 ? (
              <>
                <p className="mb-2">기간 내 작업일이 없습니다.</p>
                <button onClick={() => setShowModal(true)} className="text-blue-500 underline text-sm hover:text-blue-700">
                  새 작업일 만들기
                </button>
              </>
            ) : (
              <p>필터 조건에 맞는 작업일이 없습니다.</p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2 items-center">
            {filteredWorkDays.map(wd => {
              const sum = summaries[wd.id]
              return (
                <li key={wd.id} className="w-full">
                  {deletingDate === wd.id ? (
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-sm text-red-700 font-medium">
                        <span className="font-bold">{wd.date}</span> 삭제할까요? (에피소드 전체 삭제됨)
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(wd.id)} className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors">삭제</button>
                        <button onClick={() => setDeletingDate(null)} className="text-sm bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors">취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <Link
                        href={`/${wd.id}`}
                        className="flex-1 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-blue-300 transition-all"
                      >
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{wd.date}</p>
                            {sum && <StatusBadge status={sum.status} />}
                            {wd.completed_at && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                ✓ {new Date(wd.completed_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} 완료
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-400">R1: {wd.r1_name} · R2: {wd.r2_name}</p>
                            {sum?.range && <span className="text-[10px] text-slate-400 font-mono">{sum.range}</span>}
                          </div>
                          {sum && sum.total > 0 && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${Math.round(sum.doneCnt / sum.total * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">{sum.doneCnt}/{sum.total}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-slate-300 text-lg ml-3">›</span>
                      </Link>
                      <button
                        onClick={() => setDeletingDate(wd.id)}
                        title="작업일 삭제"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 text-lg px-2 py-3"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="order-2 w-full max-w-4xl mx-auto my-4 border-t border-slate-200" aria-hidden />

      {showModal    && <CreateWorkDayModal onClose={() => { setShowModal(false); fetchWorkDays() }} />}
      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
    </main>
  )
}
