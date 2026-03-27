'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { computeRow } from '@/lib/logic'
import { DEFAULT_CONFIG } from '@/lib/constants'
import type { Entry, EntryWithComputed, WorkDayConfig, FrameKey } from '@/lib/types'

interface Props {
  entry: EntryWithComputed
  workDate: string
  editorName: string
  r1Name: string
  r2Name: string
  config?: WorkDayConfig
  onSave: (
    updates: Partial<EntryWithComputed> & { work_date: string; episode: string },
    originalEpisode?: string
  ) => void
  onInsertBefore: () => void
  onDelete: () => void
  onSetBanner: () => void
  isBannerHere: boolean
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

const RESULT_BG: Record<string, string> = {
  Clean: 'text-emerald-700 bg-emerald-50',
  Dirty: 'text-amber-700 bg-amber-50',
  Fail:  'text-red-700 bg-red-50',
  None:  'text-slate-500 bg-slate-100',
}

const RESULT_SHORTCUT: Record<string, string> = { c: 'Clean', d: 'Dirty', f: 'Fail', n: 'None' }

function ResultSelect({
  value, onChange, disabled, options,
}: { value: string; onChange: (v: string) => void; disabled?: boolean; options: string[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null)
  const btnRef      = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < 160
    setPos({ top: openUp ? r.top : r.bottom, left: r.left, openUp })
    setOpen(p => !p)
  }

  if (disabled) {
    return (
      <span className={['w-20 inline-block text-xs font-medium rounded px-1 py-1 opacity-30', value ? RESULT_BG[value] ?? '' : ''].join(' ')}>
        {value || ''}
      </span>
    )
  }

  const dropdown = open && pos && createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.openUp ? undefined : pos.top + 2,
        bottom: pos.openUp ? window.innerHeight - pos.top + 2 : undefined,
        left: pos.left,
        zIndex: 9999,
      }}
      ref={dropdownRef}
      className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden min-w-[80px]"
    >
      <button onClick={() => { onChange(''); setOpen(false) }}
        className="w-full text-left px-2 py-1 text-xs text-slate-400 hover:bg-slate-50">—</button>
      {options.map(v => (
        <button key={v} onClick={() => { onChange(v); setOpen(false) }}
          className={`w-full text-left px-2 py-1 text-xs font-medium hover:brightness-95 ${RESULT_BG[v] ?? ''}`}>
          {v}
        </button>
      ))}
    </div>,
    document.body
  )

  return (
    <div className="relative w-20">
      <button
        ref={btnRef}
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={e => {
          const mapped = RESULT_SHORTCUT[e.key.toLowerCase()]
          if (mapped && options.includes(mapped)) {
            e.preventDefault()
            onChange(mapped)
            setOpen(false)
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        className={[
          'w-full text-left text-xs font-medium rounded px-1 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors',
          value ? RESULT_BG[value] ?? 'border-slate-200' : 'border-slate-200 text-slate-300',
        ].join(' ')}
      >
        {value || '—'}
      </button>
      {dropdown}
    </div>
  )
}

function FrameInput({
  value, onChange, onFocus, onBlur, disabled, placeholder = '—',
}: {
  value: string; onChange: (v: string) => void
  onFocus: () => void; onBlur: () => void
  disabled?: boolean; placeholder?: string
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

function SelectCell({
  value, onChange, options, disabled, width = 'w-full',
}: {
  value: string; onChange: (v: string) => void
  options: readonly string[]; disabled?: boolean; width?: string
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

function ExpandingTextarea({
  value, onChange, onFocus, onBlur, disabled,
}: {
  value: string; onChange: (v: string) => void
  onFocus: () => void; onBlur: () => void; disabled?: boolean
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

export function EntryRow({ entry, workDate, editorName, r1Name, r2Name, config = DEFAULT_CONFIG, onSave, onInsertBefore, onDelete, onSetBanner, isBannerHere }: Props) {
  const focusedField = useRef<string | null>(null)
  const [local, setLocal]       = useState(entry)
  const latestLocal             = useRef(entry)   // tracks latest local value synchronously (prevents stale-closure in handleTextBlur)
  const originalEpisode         = useRef(entry.episode)

  useEffect(() => {
    setLocal(prev => {
      const next = focusedField.current
        ? { ...entry, [focusedField.current]: prev[focusedField.current as keyof EntryWithComputed] }
        : { ...entry }
      if (!focusedField.current) latestLocal.current = next as EntryWithComputed
      return next
    })
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
    const updated: EntryWithComputed = { ...raw, ...computeRow(raw as Entry) }
    latestLocal.current = updated
    setLocal(updated)
    save(updated)
  }

  const handleTextBlur = () => {
    focusedField.current = null
    const latest = latestLocal.current
    const withComputed: EntryWithComputed = { ...latest, ...computeRow(latest as Entry) }
    setLocal(withComputed)
    latestLocal.current = withComputed
    save(latest)
  }

  // 동적 프레임 필드 접근 헬퍼
  const getFrame = (prefix: string, key: string): string =>
    (local as unknown as Record<string, string>)[`${prefix}_${key}`] ?? ''

  const setFrame = (prefix: string, key: string, value: string) => {
    const field = `${prefix}_${key}`
    latestLocal.current = { ...latestLocal.current, [field]: value }
    setLocal(p => ({ ...p, [field]: value }))
  }

  // conflict 표시용 레이블 (frame key → config label 매핑)
  const conflictLabel = (part: string) => {
    if (part === 'Result') return 'Result'
    const frame = config.frames.find(f => f.key === part.toLowerCase() as FrameKey)
    return frame?.label ?? part
  }

  const hasConflict = !!local.conflict

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

      {/* Controls */}
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
            onClick={onSetBanner}
            title={isBannerHere ? '교차검수 배너 위치 (클릭 시 제거)' : '교차검수 시작 지점으로 설정'}
            className={[
              'flex-1 w-full flex items-center justify-center transition-all text-xs leading-none',
              isBannerHere
                ? 'text-violet-500 opacity-100'
                : 'text-slate-300 hover:text-violet-500 opacity-0 group-hover:opacity-100',
            ].join(' ')}
          >
            ⚑
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

      {/* Episode */}
      <td className={cell('sticky left-8 z-10 bg-white group-hover:bg-slate-50 w-20')}>
        <div className="flex flex-col items-start gap-0.5">
          <input
            className="w-16 text-xs font-mono border border-transparent hover:border-slate-200 focus:border-blue-300 focus:bg-blue-50 focus:outline-none rounded px-1 py-1 bg-transparent text-slate-800"
            value={local.episode}
            onFocus={() => { focusedField.current = 'episode' }}
            onChange={e => {
              latestLocal.current = { ...latestLocal.current, episode: e.target.value }
              setLocal(p => ({ ...p, episode: e.target.value }))
            }}
            onBlur={handleTextBlur}
          />
          {local.target && (
            <span className={[
              'text-[9px] font-bold px-1.5 py-px rounded-full leading-tight',
              local.target === r1Name ? 'bg-blue-100 text-blue-600' :
              local.target === r2Name ? 'bg-emerald-100 text-emerald-600' :
              'bg-slate-100 text-slate-500',
            ].join(' ')}>
              {local.target === r1Name ? 'R1' : local.target === r2Name ? 'R2' : local.target}
            </span>
          )}
        </div>
      </td>

      {/* Action */}
      <td className={cell('sticky left-28 z-10 bg-white group-hover:bg-slate-50 min-w-[11rem]')}>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${getActionStyle(local.action)}`}>
          {local.action || '—'}
        </span>
      </td>

      {/* R1 Result */}
      <td className={cell('bg-blue-50/50')}>
        <ResultSelect value={local.r1_result} onChange={v => handleSelect('r1_result', v)} options={config.dropdowns.result} />
      </td>
      {/* R1 frames */}
      {config.frames.map(frame => (
        <td key={`r1_${frame.key}`} className={cell('bg-blue-50/50')}>
          <FrameInput
            value={getFrame('r1', frame.key)}
            onFocus={() => { focusedField.current = `r1_${frame.key}` }}
            onChange={v => setFrame('r1', frame.key, v)}
            onBlur={handleTextBlur}
          />
        </td>
      ))}

      {/* R2 Result */}
      <td className={cell('bg-emerald-50/50')}>
        <ResultSelect value={local.r2_result} onChange={v => handleSelect('r2_result', v)} options={config.dropdowns.result} />
      </td>
      {/* R2 frames */}
      {config.frames.map(frame => (
        <td key={`r2_${frame.key}`} className={cell('bg-emerald-50/50')}>
          <FrameInput
            value={getFrame('r2', frame.key)}
            onFocus={() => { focusedField.current = `r2_${frame.key}` }}
            onChange={v => setFrame('r2', frame.key, v)}
            onBlur={handleTextBlur}
          />
        </td>
      ))}

      {/* Conflict */}
      <td className={cell('min-w-[7rem]')}>
        {local.conflict && (
          <div className="flex flex-col gap-0.5">
            {local.conflict.split(', ').map(c => (
              <span key={c} className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap w-fit">
                {conflictLabel(c)}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Final Result */}
      <td className={cell(hasConflict ? 'bg-amber-50/60' : 'bg-slate-50/50')}>
        <ResultSelect value={local.final_result} onChange={v => handleSelect('final_result', v)} disabled={!hasConflict} options={config.dropdowns.result} />
      </td>
      {/* Final frames */}
      {config.frames.map(frame => (
        <td key={`final_${frame.key}`} className={cell(hasConflict ? 'bg-amber-50/60' : 'bg-slate-50/50')}>
          <FrameInput
            value={getFrame('final', frame.key)}
            onFocus={() => { focusedField.current = `final_${frame.key}` }}
            onChange={v => setFrame('final', frame.key, v)}
            onBlur={handleTextBlur}
            disabled={!hasConflict}
          />
        </td>
      ))}

      {/* Reason Code */}
      <td className={cell('min-w-[9rem]')}>
        <SelectCell
          value={local.reason_code}
          onChange={v => handleSelect('reason_code', v)}
          options={config.dropdowns.reason_code}
          disabled={!hasConflict}
        />
      </td>

      {/* Reason Detail */}
      <td className={cell('min-w-[12rem]')}>
        <ExpandingTextarea
          value={local.reason_detail}
          disabled={!hasConflict}
          onFocus={() => { focusedField.current = 'reason_detail' }}
          onChange={v => {
            latestLocal.current = { ...latestLocal.current, reason_detail: v }
            setLocal(p => ({ ...p, reason_detail: v }))
          }}
          onBlur={handleTextBlur}
        />
      </td>

      {/* Response Detail */}
      <td className={cell('min-w-[12rem]')}>
        <ExpandingTextarea
          value={local.response_detail}
          disabled={!hasConflict}
          onFocus={() => { focusedField.current = 'response_detail' }}
          onChange={v => {
            latestLocal.current = { ...latestLocal.current, response_detail: v }
            setLocal(p => ({ ...p, response_detail: v }))
          }}
          onBlur={handleTextBlur}
        />
      </td>

      {/* Route */}
      <td className={cell('min-w-[10rem]')}>
        <SelectCell
          value={local.route}
          onChange={v => handleSelect('route', v)}
          options={config.dropdowns.route}
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
