'use client'
import { useState } from 'react'
import { useUserName } from '@/hooks/useUserName'

export function NameSelector() {
  const { name, saveName } = useUserName()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const confirm = () => {
    if (draft.trim()) { saveName(draft); setEditing(false) }
  }

  if (!name || editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">내 이름:</span>
        <input
          type="text"
          value={draft}
          placeholder="이름 입력"
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirm()}
          className="border rounded-lg px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={confirm}
          disabled={!draft.trim()}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg disabled:opacity-40 hover:bg-blue-700"
        >
          확인
        </button>
        {editing && (
          <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-600">
            취소
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">사용자:</span>
      <span className="font-semibold text-gray-800">{name}</span>
      <button
        onClick={() => { setDraft(name); setEditing(true) }}
        className="text-xs text-blue-500 underline hover:text-blue-700"
      >
        변경
      </button>
    </div>
  )
}
