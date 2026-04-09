'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_CONFIG, normalizeWorkDayConfig } from '@/lib/constants'
import type { WorkDayConfig } from '@/lib/types'

export function useAppSettings() {
  const [settings, setSettings] = useState<WorkDayConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'global')
      .single()
    if (data?.value) setSettings(normalizeWorkDayConfig(data.value))
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void fetchSettings() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchSettings])

  const saveSettings = async (config: WorkDayConfig) => {
    const normalized = normalizeWorkDayConfig(config)
    await supabase.from('app_settings').upsert({
      key: 'global',
      value: normalized,
      updated_at: new Date().toISOString(),
    })
    setSettings(normalized)
  }

  return { settings, loading, saveSettings }
}
