import { useRef, useState } from 'react'

export function useAsyncAction() {
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const run = async (operation: () => Promise<void>): Promise<void> => {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    try { await operation() }
    catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.') }
    finally { busy.current = false; setSaving(false) }
  }
  return { run, saving, error }
}
