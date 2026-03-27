export type FrameKey = 'pick' | 'place' | 'frame3'

export interface FrameConfig {
  key: FrameKey
  label: string
}

export interface DropdownConfig {
  result: string[]
  reason_code: string[]
  route: string[]
}

export interface WorkDayConfig {
  dropdowns: DropdownConfig
  frames: FrameConfig[]
}

export interface WorkDay {
  id: string
  date: string
  r1_name: string
  r2_name: string
  created_at: string
  config: WorkDayConfig
  cross_banner_episode?: string | null
  completed_at?: string | null
}

export interface Entry {
  id: string
  work_day_id: string
  work_date: string
  episode: string
  target: string
  sort_order?: number | null
  r1_result: string
  r1_pick: string
  r1_place: string
  r1_frame3: string
  r2_result: string
  r2_pick: string
  r2_place: string
  r2_frame3: string
  final_result: string
  final_pick: string
  final_place: string
  final_frame3: string
  reason_code: string
  reason_detail: string
  response_detail: string
  route: string
  last_editor: string
  last_updated: string
}

export interface ComputedFields {
  conflict: string
  action: string
}

export type EntryWithComputed = Entry & ComputedFields
