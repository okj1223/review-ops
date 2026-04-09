import type { FrameKey, WorkDayConfig } from './types'

export const REVIEWER_NAMES = ['경준', '상대방이름'] as const

export const DEFAULT_CONFIG: WorkDayConfig = {
  dropdowns: {
    result:      ['Clean', 'Dirty', 'Fail', 'None'],
    reason_code: ['Result mismatch', 'Frame mismatch', 'Wrong target', 'Missed frame', 'Other'],
    route:       ['Reviewer Agreement', 'Waiting Lead', 'Lead Finalized'],
    task:        ['Episode Review', 'Pick', 'Place'],
  },
  frames: [
    { key: 'pick',  label: 'Pick' },
    { key: 'place', label: 'Place' },
  ],
}

const FRAME_KEYS: FrameKey[] = ['pick', 'place', 'frame3']

function normalizeStringList(input: unknown, fallback: string[], allowEmpty = false): string[] {
  if (!Array.isArray(input)) return [...fallback]
  const normalized = Array.from(
    new Set(
      input
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
    )
  )
  if (normalized.length === 0 && !allowEmpty) return [...fallback]
  return normalized
}

export function normalizeWorkDayConfig(raw: unknown): WorkDayConfig {
  const config = (raw ?? {}) as Partial<WorkDayConfig>
  const dropdowns = (config.dropdowns ?? {}) as Partial<WorkDayConfig['dropdowns']>

  const srcFrames = Array.isArray(config.frames) ? config.frames : DEFAULT_CONFIG.frames
  const normalizedFrames = srcFrames.slice(0, 3).map((frame, idx) => {
    const label = typeof frame?.label === 'string' && frame.label.trim()
      ? frame.label.trim()
      : DEFAULT_CONFIG.frames[idx]?.label ?? `Frame ${idx + 1}`
    return { key: FRAME_KEYS[idx], label }
  })

  return {
    dropdowns: {
      result: normalizeStringList(dropdowns.result, DEFAULT_CONFIG.dropdowns.result),
      reason_code: normalizeStringList(dropdowns.reason_code, DEFAULT_CONFIG.dropdowns.reason_code),
      route: normalizeStringList(dropdowns.route, DEFAULT_CONFIG.dropdowns.route),
      task: normalizeStringList(dropdowns.task, DEFAULT_CONFIG.dropdowns.task, true),
    },
    frames: normalizedFrames.length > 0 ? normalizedFrames : [...DEFAULT_CONFIG.frames],
  }
}

// 하위 호환용
export const DROPDOWNS = {
  target:      ['Episode Review', 'Pick', 'Place'],
  result:      DEFAULT_CONFIG.dropdowns.result,
  reason_code: DEFAULT_CONFIG.dropdowns.reason_code,
  route:       DEFAULT_CONFIG.dropdowns.route,
  task:        DEFAULT_CONFIG.dropdowns.task,
}
