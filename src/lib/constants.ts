import type { WorkDayConfig } from './types'

export const REVIEWER_NAMES = ['경준', '상대방이름'] as const

export const DEFAULT_CONFIG: WorkDayConfig = {
  dropdowns: {
    result:      ['Clean', 'Dirty', 'Fail', 'None'],
    reason_code: ['Result mismatch', 'Frame mismatch', 'Wrong target', 'Missed frame', 'Other'],
    route:       ['Reviewer Agreement', 'Waiting Lead', 'Lead Finalized'],
  },
  frames: [
    { key: 'pick',  label: 'Pick' },
    { key: 'place', label: 'Place' },
  ],
}

// 하위 호환용
export const DROPDOWNS = {
  target:      ['Episode Review', 'Pick', 'Place'],
  result:      DEFAULT_CONFIG.dropdowns.result,
  reason_code: DEFAULT_CONFIG.dropdowns.reason_code,
  route:       DEFAULT_CONFIG.dropdowns.route,
}
