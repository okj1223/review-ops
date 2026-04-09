import type { Entry, ComputedFields } from './types'

export function computeRow(e: Entry): ComputedFields {
  const r1Touched = !!e.r1_result
  const r2Touched = !!e.r2_result

  // ── Conflict 감지 ─────────────────────────────────────────
  const conflictParts: string[] = []
  if (e.r1_result && e.r2_result && e.r1_result !== e.r2_result)
    conflictParts.push('Result')
  if (e.r1_pick && e.r2_pick && e.r1_pick !== e.r2_pick)
    conflictParts.push('Pick')
  if (e.r1_place && e.r2_place && e.r1_place !== e.r2_place)
    conflictParts.push('Place')
  if (e.r1_frame3 && e.r2_frame3 && e.r1_frame3 !== e.r2_frame3)
    conflictParts.push('Frame3')
  const conflict = conflictParts.join(', ')

  // ── 누락 필드 체크 ────────────────────────────────────────
  let r1Missing = ''
  if (r1Touched && !e.r1_result) r1Missing = 'Result'

  let r2Missing = ''
  if (r2Touched && !e.r2_result) r2Missing = 'Result'

  let finalMissing = ''
  if (conflict) {
    const parts: string[] = []
    if (conflict.includes('Result') && !e.final_result) parts.push('Final Result')
    if (conflict.includes('Pick')   && !e.final_pick)   parts.push('Final Pick')
    if (conflict.includes('Place')  && !e.final_place)  parts.push('Final Place')
    if (conflict.includes('Frame3') && !e.final_frame3) parts.push('Final Frame3')
    if (!e.reason_code)                                 parts.push('Reason Code')
    if (!e.route)                                       parts.push('Route')
    finalMissing = parts.join(' / ')
  }

  const hasResolutionFields = !!(
    e.final_result || e.final_pick    || e.final_place || e.final_frame3 ||
    e.reason_code  || e.reason_detail || e.response_detail || e.route
  )
  const stale = !conflict && hasResolutionFields

  // ── Action 상태 ───────────────────────────────────────────
  let action = ''
  if (!e.episode) {
    action = ''
  } else if (!r1Touched && !r2Touched) {
    action = 'Ready to review'
  } else if (conflict) {
    if (finalMissing) {
      action = `Conflict | Need ${finalMissing}`
    } else if (e.route === 'Waiting Lead') {
      action = 'Waiting Lead'
    } else {
      action = 'Resolved'
    }
  } else if (r1Missing) {
    action = `Need R1 ${r1Missing}`
  } else if (r2Missing) {
    action = `Need R2 ${r2Missing}`
  } else {
    action = stale ? 'Clear stale resolution fields' : 'OK'
  }

  return { conflict, action }
}
