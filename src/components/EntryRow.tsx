'use client'
import { useEffect, useRef, useState } from 'react'
import { DROPDOWNS } from '@/lib/constants'
import { computeRow } from '@/lib/logic'
import type { Entry, EntryWithComputed } from '@/lib/types'

interface Props {
  entry: EntryWithComputed
  workDate: string
  editorName: string
  onSave: (
    updates: Partial<EntryWithComputed> & { work_date: string; episode: string },
    originalEpisode?: string
  ) => void
  onInsertBefore: () => void
  onDelete: () => void
}

// Action 배지 스타일
const ACTION_STYLE: Record<string, string> = {
  'OK':                            'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200',
  'Resolved':                      'text-blue-700 bg-blue-50 ring-1 ring-blue-200',
  'Waiting Lead':                  'text-violet-700 bg-violet-50 ring-1 ring-violet-200',
  'Ready to review':               'text-slate-400',
  'Need Review Target':            'text-amber-700 bg-amber-50 ring-1 ring-amber-200',
  'Clear stale resolution fields': 'text-yellow-700 bg-yellow-50 ring-1 ring-yellow-200',
}
function getActionStyle(action: string) {
  if (ACTION_STYLE[action]) return ACTION_STYLE[action]
  if (action.startsWith('Conflict')) return 'text-red-700 bg-red-50 ring-1 ring-red-200'
  if (action.startsWith('Need'))     return 'text-amber-700 bg-amber-50 ring-1 ring-amber-200'
  return 'text-slate-400'
}

// Result 드롭다운 배경색
const RESULT_BG: Record<string, string> = {
  Clean: 'text-emerald-700 bg-emerald-50',
  Dirty: 'text-amber-700 bg-amber-50',
  Fail:  'text-red-700 bg-red-50',
  None:  'text-slate-500 bg-slate-100',
}

function ResultSelect({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'w-20 text-xs font-medium rounded px-1 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed bg-transparent border-transparent' : 'border-slate-200',
        !disabled && value ? RESULT_BG[value] ?? '' : '',
      ].join(' ')}
    >
      <option value=""></option>
      {DROPDOWNS.result.map(v => <option key={v}>{v}</option>)}
    </select>
  )
}

function FrameInput({
  value, onChange, onFocus, onBlur, disabled, placeholder = '—',
}: {
  value: string
  onChange: (v: string) => void
  onFocus: () => void
  onBlur: () => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={[
        'w-16 text-xs text-center rounded px-1 py-1 border border-transparent placeholder-slate-300',
        'focus:outline-none focus:border-blue-300 focus:bg-blue-50 bg-transparent transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-slate-200',
      ].join(' ')}
    />
  )
}

function ExpandingTextarea({
  value, onChange, onFocus, onBlur, disabled,
}: {
  value: string
  onChange: (v: string) => void
  onFocus: () => void
  onBlur: () => void
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      rows={focused ? 4 : 1}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => { setFocused(true); onFocus() }}
      onBlur={() => { setFocused(false); onBlur() }}
      disabled={disabled}
      className={[
        'w-44 text-xs border border-transparent rounded px-1 py-1 bg-transparent placeholder-slate-300 resize-none transition-all',
        'focus:outline-none focus:border-blue-300 focus:bg-blue-50',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-slate-200',
      ].join(' ')}
    />
  )
}

function SelectCell({
  value, onChange, options, disabled, width = 'w-full',
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  disabled?: boolean
  width?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={[
        `${width} text-xs rounded px-1 py-1 border border-transparent`,
        'focus:outline-none focus:border-blue-300 focus:bg-blue-50 bg-transparent cursor-pointer transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-slate-200',
      ].join(' ')}
    >
      <option value=""></option>
      {options.map(v => <option key={v}>{v}</option>)}
    </select>
  )
}

export function EntryRow({ entry, workDate, editorName, onSave, onInsertBefore, onDelete }: Props) {
  const focusedField = useRef<string | null>(null)
  const [local, setLocal]         = useState(entry)
  const originalEpisode           = useRef(entry.episode)

  // realtime 업데이트 수신 시 현재 편집 중인 필드만 로컬 유지
  useEffect(() => {
    setLocal(prev =>
      focusedField.current
        ? { ...entry, [focusedField.current]: prev[focusedField.current as keyof EntryWithComputed] }
        : { ...entry }
    )
  }, [entry])

  const save = (updated: typeof local) => {
    const orig = originalEpisode.current
    if (orig !== updated.episode) {
      originalEpisode.current = updated.episode
      onSave({ ...updated, work_date: workDate }, orig)
    } else {
      onSave({ ...updated, work_date: workDate })
    }
  }

  const handleSelect = (field: keyof EntryWithComputed, value: string) => {
    const raw = { ...local, [field]: value }
    // conflict/action 즉시 재계산 — realtime 대기 없이 바로 반영
    const updated: EntryWithComputed = { ...raw, ...computeRow(raw as Entry) }
    setLocal(updated)
    save(updated)
  }

  const handleTextBlur = () => {
    focusedField.current = null
    const withComputed: EntryWithComputed = { ...local, ...computeRow(local as Entry) }
    setLocal(withComputed)
    save(local)
  }

  const hasConflict = !!local.conflict

  // 타임스탬프 포맷
  const ts = local.last_updated
    ? new Date(local.last_updated).toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  const cell = (extra = '') =>
    `border-r border-slate-100 px-1.5 py-1 ${extra}`

  return (
    <tr className={[
      'border-b border-slate-100 group',
      hasConflict ? 'bg-red-50/20 hover:bg-red-50/40' : 'hover:bg-slate-50/70',
    ].join(' ')}>

      {/* Controls — 줄 끼워넣기 / 삭제 버튼 */}
      <td className="border-r border-slate-100 sticky left-0 z-10 w-8 bg-white group-hover:bg-slate-50 p-0">
        <div className="flex flex-col items-center justify-center h-full w-full">
          <button
            onClick={onInsertBefore}
            title="위에 행 삽입"
            className="flex-1 w-full flex items-center justify-center text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all text-base font-bold leading-none"
          >
            +
          </button>
          <button
            onClick={onDelete}
            title="행 삭제"
            className="flex-1 w-full flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm font-bold leading-none"
          >
            ×
          </button>
        </div>
      </td>

      {/* Episode — sticky */}
      <td className={cell('sticky left-8 z-10 bg-white group-hover:bg-slate-50 w-20')}>
        <input
          className="w-16 text-xs font-mono border border-transparent hover:border-slate-200 focus:border-blue-300 focus:bg-blue-50 focus:outline-none rounded px-1 py-1 bg-transparent text-slate-800"
          value={local.episode}
          onFocus={() => { focusedField.current = 'episode' }}
          onChange={e => setLocal(p => ({ ...p, episode: e.target.value }))}
          onBlur={handleTextBlur}
        />
      </td>

      {/* Action — sticky */}
      <td className={cell('sticky left-28 z-10 bg-white group-hover:bg-slate-50 min-w-[11rem]')}>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${getActionStyle(local.action)}`}>
          {local.action || '—'}
        </span>
      </td>

      {/* R1 그룹 */}
      <td className={cell('bg-blue-50/50')}>
        <ResultSelect value={local.r1_result} onChange={v => handleSelect('r1_result', v)} />
      </td>
      <td className={cell('bg-blue-50/50')}>
        <FrameInput value={local.r1_pick}
          onFocus={() => { focusedField.current = 'r1_pick' }}
          onChange={v => setLocal(p => ({ ...p, r1_pick: v }))}
          onBlur={handleTextBlur} />
      </td>
      <td className={cell('bg-blue-50/50')}>
        <FrameInput value={local.r1_place}
          onFocus={() => { focusedField.current = 'r1_place' }}
          onChange={v => setLocal(p => ({ ...p, r1_place: v }))}
          onBlur={handleTextBlur} />
      </td>

      {/* R2 그룹 */}
      <td className={cell('bg-emerald-50/50')}>
        <ResultSelect value={local.r2_result} onChange={v => handleSelect('r2_result', v)} />
      </td>
      <td className={cell('bg-emerald-50/50')}>
        <FrameInput value={local.r2_pick}
          onFocus={() => { focusedField.current = 'r2_pick' }}
          onChange={v => setLocal(p => ({ ...p, r2_pick: v }))}
          onBlur={handleTextBlur} />
      </td>
      <td className={cell('bg-emerald-50/50')}>
        <FrameInput value={local.r2_place}
          onFocus={() => { focusedField.current = 'r2_place' }}
          onChange={v => setLocal(p => ({ ...p, r2_place: v }))}
          onBlur={handleTextBlur} />
      </td>

      {/* Conflict */}
      <td className={cell('min-w-[5rem]')}>
        {local.conflict && (
          <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
            {local.conflict}
          </span>
        )}
      </td>

      {/* Final 그룹 — conflict 없으면 비활성 */}
      <td className={cell(hasConflict ? 'bg-amber-50/60' : 'bg-slate-50/50')}>
        <ResultSelect value={local.final_result} onChange={v => handleSelect('final_result', v)} disabled={!hasConflict} />
      </td>
      <td className={cell(hasConflict ? 'bg-amber-50/60' : 'bg-slate-50/50')}>
        <FrameInput value={local.final_pick}
          onFocus={() => { focusedField.current = 'final_pick' }}
          onChange={v => setLocal(p => ({ ...p, final_pick: v }))}
          onBlur={handleTextBlur}
          disabled={!hasConflict} />
      </td>
      <td className={cell(hasConflict ? 'bg-amber-50/60' : 'bg-slate-50/50')}>
        <FrameInput value={local.final_place}
          onFocus={() => { focusedField.current = 'final_place' }}
          onChange={v => setLocal(p => ({ ...p, final_place: v }))}
          onBlur={handleTextBlur}
          disabled={!hasConflict} />
      </td>

      {/* Reason Code */}
      <td className={cell('min-w-[9rem]')}>
        <SelectCell
          value={local.reason_code}
          onChange={v => handleSelect('reason_code', v)}
          options={DROPDOWNS.reason_code}
          disabled={!hasConflict}
        />
      </td>

      {/* Reason Detail */}
      <td className={cell('min-w-[12rem]')}>
        <ExpandingTextarea
          value={local.reason_detail}
          disabled={!hasConflict}
          onFocus={() => { focusedField.current = 'reason_detail' }}
          onChange={v => setLocal(p => ({ ...p, reason_detail: v }))}
          onBlur={handleTextBlur}
        />
      </td>

      {/* Response Detail */}
      <td className={cell('min-w-[12rem]')}>
        <ExpandingTextarea
          value={local.response_detail}
          disabled={!hasConflict}
          onFocus={() => { focusedField.current = 'response_detail' }}
          onChange={v => setLocal(p => ({ ...p, response_detail: v }))}
          onBlur={handleTextBlur}
        />
      </td>

      {/* Route */}
      <td className={cell('min-w-[10rem]')}>
        <SelectCell
          value={local.route}
          onChange={v => handleSelect('route', v)}
          options={DROPDOWNS.route}
          disabled={!hasConflict}
        />
      </td>

      {/* Last Updated */}
      <td className="px-2 py-1 text-[10px] text-slate-400 whitespace-nowrap min-w-[7rem]">
        <div className="font-medium text-slate-500">{local.last_editor}</div>
        <div>{ts}</div>
      </td>
    </tr>
  )
}
