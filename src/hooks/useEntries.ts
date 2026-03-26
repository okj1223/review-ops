'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { computeRow } from '@/lib/logic'
import type { Entry, EntryWithComputed } from '@/lib/types'

/** 에피소드 번호를 숫자로 파싱 (순수 숫자면 숫자 정렬, 아니면 문자열 정렬) */
function episodeSort(a: Entry, b: Entry): number {
  const na = parseFloat(a.episode)
  const nb = parseFloat(b.episode)
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return a.episode.localeCompare(b.episode)
}

export function useEntries(workDate: string) {
  const [entries, setEntries] = useState<EntryWithComputed[]>([])
  const [loading, setLoading] = useState(true)

  const enrich = (rows: Entry[]): EntryWithComputed[] =>
    [...rows].sort(episodeSort).map(r => ({ ...r, ...computeRow(r) }))

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('work_date', workDate)
    if (data) setEntries(enrich(data as Entry[]))
    setLoading(false)
  }, [workDate])

  useEffect(() => {
    fetchEntries()

    const channel = supabase
      .channel(`entries_${workDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries', filter: `work_date=eq.${workDate}` },
        () => fetchEntries()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workDate, fetchEntries])

  /** 단일 row 저장 (upsert) */
  const upsert = async (
    entry: Omit<Partial<Entry>, 'work_date' | 'episode'> & { work_date: string; episode: string },
    editorName: string
  ) => {
    // conflict, action은 클라이언트 계산 필드 — DB 컬럼이 아니므로 제거 후 전송
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conflict: _c, action: _a, ...dbEntry } = entry as Record<string, unknown>
    await supabase.from('entries').upsert(
      { ...dbEntry, last_editor: editorName, last_updated: new Date().toISOString() },
      { onConflict: 'work_date,episode' }
    )
    // 패널 즉시 반영: realtime 왕복 대기 없이 낙관적으로 entries 갱신
    const id = (entry as { id?: string }).id
    if (id) {
      setEntries(prev => prev.map(e =>
        e.id === id ? { ...e, ...(entry as EntryWithComputed) } : e
      ))
    }
  }

  /** 에피소드 번호 변경 (삭제 후 재삽입) */
  const renameEpisode = async (
    oldId: string,
    newEpisode: string,
    data: Partial<Entry>,
    editorName: string
  ) => {
    await supabase.from('entries').delete().eq('id', oldId)
    await supabase.from('entries').insert({
      work_date:       workDate,
      episode:         newEpisode,
      target:          data.target          ?? '',
      r1_result:       data.r1_result       ?? '', r1_pick:   data.r1_pick   ?? '', r1_place:   data.r1_place   ?? '',
      r2_result:       data.r2_result       ?? '', r2_pick:   data.r2_pick   ?? '', r2_place:   data.r2_place   ?? '',
      final_result:    data.final_result    ?? '', final_pick: data.final_pick ?? '', final_place: data.final_place ?? '',
      reason_code:     data.reason_code     ?? '', reason_detail: data.reason_detail ?? '', response_detail: data.response_detail ?? '',
      route:           data.route           ?? '',
      last_editor:     editorName,
      last_updated:    new Date().toISOString(),
    })
  }

  /** 단일 row 추가 — insert 후 즉시 state 반영 (realtime race condition 방지) */
  const addRow = async (episode: string, editorName: string) => {
    const { data, error } = await supabase.from('entries').insert({
      work_date: workDate, episode,
      target: '',
      r1_result: '', r1_pick: '', r1_place: '',
      r2_result: '', r2_pick: '', r2_place: '',
      final_result: '', final_pick: '', final_place: '',
      reason_code: '', reason_detail: '', response_detail: '',
      route: '',
      last_editor: editorName,
      last_updated: new Date().toISOString(),
    }).select().single()
    if (data && !error) {
      const enriched: EntryWithComputed = { ...(data as Entry), ...computeRow(data as Entry) }
      setEntries(prev => {
        const without = prev.filter(e => !(e.work_date === workDate && e.episode === episode))
        return [...without, enriched].sort(episodeSort)
      })
    }
  }

  /** 범위 일괄 추가 (이미 존재하는 에피소드는 건너뜀) */
  const addRows = async (episodes: string[], editorName: string) => {
    const now = new Date().toISOString()
    const rows = episodes.map(episode => ({
      work_date: workDate, episode,
      target: '',
      r1_result: '', r1_pick: '', r1_place: '',
      r2_result: '', r2_pick: '', r2_place: '',
      final_result: '', final_pick: '', final_place: '',
      reason_code: '', reason_detail: '', response_detail: '',
      route: '',
      last_editor: editorName,
      last_updated: now,
    }))
    await supabase.from('entries').upsert(rows, { onConflict: 'work_date,episode', ignoreDuplicates: true })
    // 일괄 추가는 fetch로 동기화
    await fetchEntries()
  }

  /** 단일 row 삭제 */
  const deleteRow = async (id: string) => {
    await supabase.from('entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return { entries, loading, upsert, addRow, addRows, renameEpisode, deleteRow }
}
