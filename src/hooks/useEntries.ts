'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { computeRow } from '@/lib/logic'
import type { Entry, EntryWithComputed } from '@/lib/types'

function episodeSort(a: Entry, b: Entry): number {
  const na = parseFloat(a.episode)
  const nb = parseFloat(b.episode)
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return a.episode.localeCompare(b.episode)
}

export function useEntries(workDayId: string, workDate: string) {
  const [entries, setEntries] = useState<EntryWithComputed[]>([])
  const [loading, setLoading] = useState(true)

  const enrich = (rows: Entry[]): EntryWithComputed[] =>
    [...rows].sort(episodeSort).map(r => ({ ...r, ...computeRow(r) }))

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('work_day_id', workDayId)
    if (data) setEntries(enrich(data as Entry[]))
    setLoading(false)
  }, [workDayId])

  useEffect(() => {
    fetchEntries()

    const channel = supabase
      .channel(`entries_${workDayId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => fetchEntries())
      .subscribe()

    const poll = setInterval(fetchEntries, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [workDayId, fetchEntries])

  const upsert = async (
    entry: Omit<Partial<Entry>, 'work_day_id' | 'work_date' | 'episode'> & { work_date: string; episode: string },
    editorName: string
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conflict: _c, action: _a, ...dbEntry } = entry as Record<string, unknown>
    await supabase.from('entries').upsert(
      { ...dbEntry, work_day_id: workDayId, last_editor: editorName, last_updated: new Date().toISOString() },
      { onConflict: 'work_day_id,episode' }
    )
    const id = (entry as { id?: string }).id
    if (id) {
      setEntries(prev => prev.map(e =>
        e.id === id ? { ...e, ...(entry as EntryWithComputed) } : e
      ))
    }
  }

  const renameEpisode = async (
    oldId: string,
    newEpisode: string,
    data: Partial<Entry>,
    editorName: string
  ) => {
    await supabase.from('entries').delete().eq('id', oldId)
    await supabase.from('entries').insert({
      work_day_id:     workDayId,
      work_date:       workDate,
      episode:         newEpisode,
      target:          data.target          ?? '',
      r1_result:       data.r1_result       ?? '', r1_pick:   data.r1_pick   ?? '', r1_place:   data.r1_place   ?? '', r1_frame3: data.r1_frame3 ?? '',
      r2_result:       data.r2_result       ?? '', r2_pick:   data.r2_pick   ?? '', r2_place:   data.r2_place   ?? '', r2_frame3: data.r2_frame3 ?? '',
      final_result:    data.final_result    ?? '', final_pick: data.final_pick ?? '', final_place: data.final_place ?? '', final_frame3: data.final_frame3 ?? '',
      reason_code:     data.reason_code     ?? '', reason_detail: data.reason_detail ?? '', response_detail: data.response_detail ?? '',
      route:           data.route           ?? '',
      last_editor:     editorName,
      last_updated:    new Date().toISOString(),
    })
  }

  const addRow = async (episode: string, editorName: string, operator?: string) => {
    const { data, error } = await supabase.from('entries').insert({
      work_day_id: workDayId, work_date: workDate, episode,
      target: operator ?? editorName,
      r1_result: '', r1_pick: '', r1_place: '', r1_frame3: '',
      r2_result: '', r2_pick: '', r2_place: '', r2_frame3: '',
      final_result: '', final_pick: '', final_place: '', final_frame3: '',
      reason_code: '', reason_detail: '', response_detail: '',
      route: '',
      last_editor: editorName,
      last_updated: new Date().toISOString(),
    }).select().single()
    if (data && !error) {
      const enriched: EntryWithComputed = { ...(data as Entry), ...computeRow(data as Entry) }
      setEntries(prev => {
        const without = prev.filter(e => !(e.work_day_id === workDayId && e.episode === episode))
        return [...without, enriched].sort(episodeSort)
      })
    }
  }

  const addRows = async (episodes: string[], editorName: string) => {
    const now = new Date().toISOString()
    const rows = episodes.map(episode => ({
      work_day_id: workDayId, work_date: workDate, episode,
      target: editorName,
      r1_result: '', r1_pick: '', r1_place: '', r1_frame3: '',
      r2_result: '', r2_pick: '', r2_place: '', r2_frame3: '',
      final_result: '', final_pick: '', final_place: '', final_frame3: '',
      reason_code: '', reason_detail: '', response_detail: '',
      route: '',
      last_editor: editorName,
      last_updated: now,
    }))
    await supabase.from('entries').upsert(rows, { onConflict: 'work_day_id,episode', ignoreDuplicates: true })
    await fetchEntries()
  }

  const deleteRow = async (id: string) => {
    await supabase.from('entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const deleteRows = async (episodeFrom: number, episodeTo: number) => {
    const toDelete = entries.filter(e => {
      const n = parseFloat(e.episode)
      return !isNaN(n) && n >= episodeFrom && n <= episodeTo
    })
    if (toDelete.length === 0) return 0
    await supabase.from('entries').delete().in('id', toDelete.map(e => e.id))
    setEntries(prev => prev.filter(e => {
      const n = parseFloat(e.episode)
      return isNaN(n) || n < episodeFrom || n > episodeTo
    }))
    return toDelete.length
  }

  return { entries, loading, upsert, addRow, addRows, renameEpisode, deleteRow, deleteRows }
}
