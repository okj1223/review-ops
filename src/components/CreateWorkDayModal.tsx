'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Props {
  onClose: () => void
}

export function CreateWorkDayModal({ onClose }: Props) {
  const router = useRouter()
  const today = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD (서울 로컬 기준)
  const [date, setDate] = useState(today)
  const [r1, setR1] = useState('')
  const [r2, setR2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setError('')
    if (!date || !r1.trim() || !r2.trim()) {
      setError('모든 필드를 입력해주세요.')
      return
    }
    if (r1.trim() === r2.trim()) {
      setError('R1과 R2는 다른 이름이어야 합니다.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase
      .from('work_days')
      .insert({ date, r1_name: r1.trim(), r2_name: r2.trim() })
    if (err) {
      setError(err.code === '23505' ? '이미 존재하는 날짜입니다.' : err.message)
      setLoading(false)
      return
    }
    onClose()
    router.push(`/${date}`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">새 작업일 생성</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">날짜</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">R1 이름</label>
          <input
            type="text"
            value={r1}
            onChange={e => setR1(e.target.value)}
            placeholder="R1 담당자"
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">R2 이름</label>
          <input
            type="text"
            value={r2}
            onChange={e => setR2(e.target.value)}
            placeholder="R2 담당자"
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-40 hover:bg-blue-700"
          >
            {loading ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </div>
  )
}
