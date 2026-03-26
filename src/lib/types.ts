export interface WorkDay {
  date: string
  r1_name: string
  r2_name: string
  created_at: string
}

export interface Entry {
  id: string
  work_date: string
  episode: string
  target: string
  r1_result: string
  r1_pick: string
  r1_place: string
  r2_result: string
  r2_pick: string
  r2_place: string
  final_result: string
  final_pick: string
  final_place: string
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
