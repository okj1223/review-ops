'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { NameSelector } from '@/components/NameSelector'
import { CreateWorkDayModal } from '@/components/CreateWorkDayModal'
import type { WorkDay } from '@/lib/types'

export default function HomePage() {
  const [workDays, setWorkDays] = useState<WorkDay[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchWorkDays = async () => {
    const { data } = await supabase
      .from('work_days')
      .select('*')
      .order('date', { ascending: false })
    if (data) setWorkDays(data as WorkDay[])
    setLoading(false)
  }

  useEffect(() => { fetchWorkDays() }, [])

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Ops</h1>
          <p className="text-xs text-slate-400 mt-0.5">교차 검수 작업 관리 시스템</p>
        </div>
        <NameSelector />
      </div>

      {/* 작업일 목록 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">작업일</h2>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 새 작업일
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : workDays.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <p className="mb-2">작업일이 없습니다.</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-blue-500 underline text-sm hover:text-blue-700"
          >
            첫 작업일 만들기
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {workDays.map(wd => (
            <li key={wd.date}>
              <Link
                href={`/${wd.date}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div>
                  <p className="font-semibold text-slate-900">{wd.date}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    R1: {wd.r1_name} · R2: {wd.r2_name}
                  </p>
                </div>
                <span className="text-slate-300 text-lg">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <CreateWorkDayModal
          onClose={() => { setShowModal(false); fetchWorkDays() }}
        />
      )}
    </main>
  )
}
