'use client'
import { useState } from 'react'
import type { WorkDayConfig, FrameKey } from '@/lib/types'

interface Props {
  settings: WorkDayConfig
  onSave: (config: WorkDayConfig) => void
  onClose: () => void
}

function TagList({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !items.includes(v)) { onChange([...items, v]); setInput('') }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={item} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
            {item}
            <button onClick={() => onChange(items.filter(i => i !== item))} className="text-slate-400 hover:text-red-500 leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="추가 후 Enter"
          className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        <button onClick={add} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors">추가</button>
      </div>
    </div>
  )
}

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<WorkDayConfig>(JSON.parse(JSON.stringify(settings)))
  const [tab, setTab] = useState<'dropdowns' | 'frames'>('dropdowns')
  const [newFrameLabel, setNewFrameLabel] = useState('')

  const hasFrame3 = draft.frames.some(f => f.key === 'frame3')

  const updateDropdown = (key: keyof WorkDayConfig['dropdowns'], items: string[]) => {
    setDraft(d => ({ ...d, dropdowns: { ...d.dropdowns, [key]: items } }))
  }

  const updateFrameLabel = (key: FrameKey, label: string) => {
    setDraft(d => ({ ...d, frames: d.frames.map(f => f.key === key ? { ...f, label } : f) }))
  }

  const addFrame3 = () => {
    const label = newFrameLabel.trim() || 'Frame3'
    setDraft(d => ({ ...d, frames: [...d.frames, { key: 'frame3', label }] }))
    setNewFrameLabel('')
  }

  const removeFrame3 = () => {
    setDraft(d => ({ ...d, frames: d.frames.filter(f => f.key !== 'frame3') }))
  }

  const tabCls = (t: string) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[460px] max-h-[85vh] flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">설정</h2>
          <p className="text-xs text-slate-400 mt-0.5">다음 새 작업일부터 적용됩니다</p>
        </div>

        <div className="flex gap-1.5">
          <button className={tabCls('dropdowns')} onClick={() => setTab('dropdowns')}>드롭다운 옵션</button>
          <button className={tabCls('frames')} onClick={() => setTab('frames')}>프레임 열 설정</button>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-4">
          {tab === 'dropdowns' && (
            <>
              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-600">Result 옵션</p>
                <TagList items={draft.dropdowns.result} onChange={v => updateDropdown('result', v)} />
              </section>
              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-600">Reason Code 옵션</p>
                <TagList items={draft.dropdowns.reason_code} onChange={v => updateDropdown('reason_code', v)} />
              </section>
              <section className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-600">Route 옵션</p>
                <TagList items={draft.dropdowns.route} onChange={v => updateDropdown('route', v)} />
              </section>
            </>
          )}

          {tab === 'frames' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-400">Pick, Place 열 이름 변경 및 3번째 프레임 열 추가/제거</p>

              {draft.frames.map(frame => (
                <div key={frame.key} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500 w-14">{frame.key === 'frame3' ? 'Frame3' : frame.key === 'pick' ? 'Pick' : 'Place'}</span>
                  <input
                    value={frame.label}
                    onChange={e => updateFrameLabel(frame.key, e.target.value)}
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  {frame.key === 'frame3' && (
                    <button onClick={removeFrame3} className="text-slate-300 hover:text-red-500 text-sm font-bold">×</button>
                  )}
                </div>
              ))}

              {!hasFrame3 && (
                <div className="flex items-center gap-2 border border-dashed border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400 w-14">Frame3</span>
                  <input
                    value={newFrameLabel}
                    onChange={e => setNewFrameLabel(e.target.value)}
                    placeholder="열 이름 (예: Score)"
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <button
                    onClick={addFrame3}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded transition-colors"
                  >
                    + 추가
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
          <button
            onClick={() => { onSave(draft); onClose() }}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
