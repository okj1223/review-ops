'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { NameSelector } from '@/components/NameSelector'
import { WorkDayTable } from '@/components/WorkDayTable'
import { useUserName } from '@/hooks/useUserName'
import type { WorkDay } from '@/lib/types'

export default function DatePage() {
  const { date } = useParams<{ date: string }>()
  const router = useRouter()
  const { name } = useUserName()
  const [workDay, setWorkDay] = useState<WorkDay | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('work_days')
      .select('*')
      .eq('date', date)
      .single()
      .then(({ data }) => {
        if (!data) router.push('/')
        else { setWorkDay(data as WorkDay); setLoading(false) }
      })
  }, [date, router])

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
  }
  if (!workDay) return null

  return (
    <main className="px-4 py-5 min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
            ← 목록
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{workDay.date}</h1>
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            R1: {workDay.r1_name}
          </span>
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            R2: {workDay.r2_name}
          </span>
        </div>
        <NameSelector />
      </div>

      {/* 이름 미설정 시 안내 */}
      {!name ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          먼저 오른쪽 상단에서 이름을 설정해주세요.
        </div>
      ) : (
        <WorkDayTable
          workDate={date}
          r1Name={workDay.r1_name}
          r2Name={workDay.r2_name}
          editorName={name}
        />
      )}
    </main>
  )
}
