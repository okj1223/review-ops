'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { computeRow } from '@/lib/logic'
import { NameSelector } from '@/components/NameSelector'
import { CreateWorkDayModal } from '@/components/CreateWorkDayModal'
import { SettingsModal } from '@/components/SettingsModal'
import { useAppSettings } from '@/hooks/useAppSettings'
import type { WorkDay, Entry } from '@/lib/types'

type Status = 'done' | 'in_progress' | 'not_started'
interface Summary { status: Status; range: string }

const TODAY       = new Date().toISOString().slice(0, 10)
const TWO_WEEKS   = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)

export default function HomePage() {
  const [workDays, setWorkDays]         = useState<WorkDay[]>([])
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
  const [dateFrom, setDateFrom]         = useState(TWO_WEEKS)
  const [dateTo, setDateTo]             = useState(TODAY)

  const fetchWorkDays = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('work_days').select('*')
    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo)   q = q.lte('date', dateTo)
    q = q.order('date', { ascending: sortAsc })
    const { data } = await q
    if (data) setWorkDays(data as WorkDay[])
    setLoading(false)
  }, [dateFrom, dateTo, sortAsc])

  const fetchSummaries = useCallback(async (days: WorkDay[]) => {
    if (days.length === 0) return
    const { data } = await supabase
      .from('entries')
      .select('work_date, episode, r1_result, r2_result, r1_pick, r2_pick, r1_place, r2_place, r1_frame3, r2_frame3, final_result, final_pick, final_place, final_frame3, reason_code, route, reason_detail, response_detail, target')
      .in('work_date', days.map(d => d.date))
    if (!data) return

    const byDate: Record<string, Entry[]> = {}
    data.forEach(e => {
      if (!byDate[e.work_date]) byDate[e.work_date] = []
      byDate[e.work_date].push(e as Entry)
    })

    const result: Record<string, Summary> = {}
    days.forEach(wd => {
      const entries = byDate[wd.date] ?? []
      if (entries.length === 0) { result[wd.date] = { status: 'not_started', range: '' }; return }
      const allDone = entries.every(e => {
        const { action } = computeRow(e)
        return action === 'OK' || action === 'Resolved'
      })
      const nums = entries.map(e => parseFloat(e.episode)).filter(n => !isNaN(n))
      const min  = nums.length ? Math.min(...nums) : null
      const max  = nums.length ? Math.max(...nums) : null
      const range = min !== null && max !== null
        ? (min === max ? `Ep. ${min}` : `Ep. ${min} ~ ${max}`) : ''
      result[wd.date] = { status: allDone ? 'done' : 'in_progress', range }
    })
    setSummaries(result)
  }, [])

  useEffect(() => {
    fetchWorkDays()
    const channel = supabase
      .channel('work_days_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_days' }, fetchWorkDays)
      .subscribe()
    const poll = setInterval(fetchWorkDays, 30000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetchWorkDays])

  useEffect(() => {
    if (workDays.length > 0) fetchSummaries(workDays)
    const poll = setInterval(() => { if (workDays.length > 0) fetchSummaries(workDays) }, 10000)
    return () => clearInterval(poll)
  }, [workDays, fetchSummaries])

  const handleDelete = async (id: string) => {
    await supabase.from('work_days').delete().eq('id', id)
    setWorkDays(prev => prev.filter(w => w.id !== id))
    setDeletingDate(null)
  }

  const filteredWorkDays = workDays.filter(wd => {
    if (statusFilter !== 'all') {
      const sum = summaries[wd.date]
      if (!sum || sum.status !== statusFilter) return false
    }
    if (reviewerFilter) {
      const rf = reviewerFilter.toLowerCase()
      if (!wd.r1_name.toLowerCase().includes(rf) && !wd.r2_name.toLowerCase().includes(rf)) return false
    }
    return true
  })

  const StatusBadge = ({ status }: { status: Status }) => {
    if (status === 'not_started') return null
    return status === 'done'
      ? <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">완료</span>
      : <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">진행중</span>
  }

  const sBtnCls = (s: string) =>
    `px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${statusFilter === s ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`

  const isDefaultRange = dateFrom === TWO_WEEKS && dateTo === TODAY

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Ops</h1>
          <p className="text-xs text-slate-400 mt-0.5">교차 검수 작업 관리 시스템</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/archive" className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">
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

      {showGuide && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs text-slate-600">
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">사용 가이드</span>
            <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="p-4 flex flex-col gap-4">

            {/* 기본 프로세스 */}
            <section>
              <p className="font-semibold text-slate-700 mb-2">기본 작업 흐름</p>
              <ol className="flex flex-col gap-1 pl-1">
                {[
                  '새 작업일 생성 — 날짜, R1/R2 이름 설정',
                  '에피소드 범위 추가 — 오퍼레이터 선택 후 시작~끝 번호 입력',
                  'R1은 위에서부터, R2는 아래에서부터 Result 입력',
                  '결과가 일치하면 → OK 자동 처리',
                  '결과가 다르면 → Conflict 발생, Final + Reason Code + Route 입력',
                  'Final까지 입력 완료되면 → Resolved',
                  '모든 에피소드가 OK 또는 Resolved가 되면 작업일 완료 처리',
                ].map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400 shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="w-full h-px bg-slate-200" />

            {/* Action 상태 */}
            <section>
              <p className="font-semibold text-slate-700 mb-2">Action 상태 기준</p>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Ready to review',  desc: '아직 아무도 입력하지 않음',                            cls: 'text-slate-400' },
                  { label: 'OK',               desc: 'R1과 R2 결과가 완전히 일치',                         cls: 'text-emerald-600 font-medium' },
                  { label: 'Conflict | Need …', desc: '결과가 달라 Final / Reason Code / Route 입력 필요',   cls: 'text-red-500 font-medium' },
                  { label: 'Resolved',          desc: 'Conflict 해소 완료 (Final + Reason + Route 모두 입력)', cls: 'text-blue-600 font-medium' },
                  { label: 'Waiting Lead',      desc: 'Route를 Waiting Lead로 설정한 보류 상태',             cls: 'text-violet-600 font-medium' },
                  { label: 'Need R1/R2 Result', desc: '일부 필드를 입력했지만 Result가 빠져 있음',            cls: 'text-amber-600 font-medium' },
                ].map(({ label, desc, cls }) => (
                  <div key={label} className="flex gap-2">
                    <span className={`w-40 shrink-0 ${cls}`}>{label}</span>
                    <span className="text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="w-full h-px bg-slate-200" />

            {/* 교차검수 배너 */}
            <section>
              <p className="font-semibold text-slate-700 mb-2">교차검수 배너</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <p>R1이 위에서, R2가 아래에서 Result를 채워오면 처음 만나는 지점에 <span className="text-violet-600 font-medium">⚑ 교차검수 시작 지점</span> 배너가 자동 생성됩니다.</p>
                <p className="mt-1"><span className="font-medium text-slate-600">▲▼</span> 버튼으로 배너 위치를 수동 이동할 수 있으며, 이동한 위치는 저장되어 새로고침 후에도 유지됩니다.</p>
                <p><span className="font-medium text-slate-600">↺</span> 버튼을 누르면 자동 계산 위치로 초기화됩니다.</p>
              </div>
            </section>

            <div className="w-full h-px bg-slate-200" />

            {/* 단축키 */}
            <section>
              <p className="font-semibold text-slate-700 mb-2">Result 입력 단축키</p>
              <p className="text-slate-500 mb-2">Result 셀을 클릭한 후 키를 누르면 즉시 입력됩니다.</p>
              <div className="flex gap-4">
                {[['C', 'Clean'], ['D', 'Dirty'], ['F', 'Fail'], ['N', 'None']].map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-700 shadow-sm">{key}</kbd>
                    <span className="text-slate-500">{val}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="w-full h-px bg-slate-200" />

            {/* 전체 보관함 */}
            <section>
              <p className="font-semibold text-slate-700 mb-2">전체 보관함 필터</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <p>Conflict / Action / Result 각 항목 내에서는 <span className="font-medium text-slate-600">OR</span> 다중 선택이 가능합니다.</p>
                <p>항목들 사이는 <span className="font-medium text-slate-600">AND</span>로 결합됩니다. (예: Conflict=있음 AND Result=Dirty)</p>
                <p className="mt-1">Result 필터 기준: R1·R2 모두 입력된 경우 <span className="font-medium text-slate-600">Final Result</span> 값 기준, 한 명만 입력된 경우 해당 값 기준입니다.</p>
              </div>
            </section>

          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">작업일</h2>
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
            className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
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
            className="text-xs border border-slate-200 rounded-full px-2.5 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
          <span className="text-slate-300 text-xs">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
          {!isDefaultRange && (
            <button
              onClick={() => { setDateFrom(TWO_WEEKS); setDateTo(TODAY) }}
              className="text-[10px] text-blue-500 hover:text-blue-700 px-1.5"
            >
              초기화
            </button>
          )}
        </div>
      </div>

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
        <ul className="flex flex-col gap-2">
          {filteredWorkDays.map(wd => {
            const sum = summaries[wd.date]
            return (
              <li key={wd.id}>
                {deletingDate === wd.id ? (
                  <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-700 font-medium">
                      <span className="font-bold">{wd.date}</span> 삭제할까요? (에피소드 전체 삭제됨)
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(wd.id)} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors">삭제</button>
                      <button onClick={() => setDeletingDate(null)} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors">취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <Link
                      href={`/${wd.id}`}
                      className="flex-1 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{wd.date}</p>
                          {sum && <StatusBadge status={sum.status} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400">R1: {wd.r1_name} · R2: {wd.r2_name}</p>
                          {sum?.range && <span className="text-[10px] text-slate-400 font-mono">{sum.range}</span>}
                        </div>
                      </div>
                      <span className="text-slate-300 text-lg">›</span>
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

      {showModal    && <CreateWorkDayModal onClose={() => { setShowModal(false); fetchWorkDays() }} />}
      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
    </main>
  )
}
