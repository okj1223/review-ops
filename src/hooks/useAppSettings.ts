'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_CONFIG } from '@/lib/constants'
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
    if (data?.value) setSettings(data.value as WorkDayConfig)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const saveSettings = async (config: WorkDayConfig) => {
    await supabase.from('app_settings').upsert({
      key: 'global',
      value: config,
      updated_at: new Date().toISOString(),
    })
    setSettings(config)
  }

  return { settings, loading, saveSettings }
}
