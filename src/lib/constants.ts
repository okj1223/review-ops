// TODO: 실제 이름으로 변경하세요
export const REVIEWER_NAMES = ['경준', '상대방이름'] as const

export const DROPDOWNS = {
  target:      ['Episode Review', 'Pick', 'Place'],
  result:      ['Clean', 'Dirty', 'Fail', 'None'],
  reason_code: ['Result mismatch', 'Frame mismatch', 'Wrong target', 'Missed frame', 'Other'],
  route:       ['Reviewer Agreement', 'Waiting Lead', 'Lead Finalized'],
} as const
