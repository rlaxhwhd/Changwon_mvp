import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { QuestDashboard } from './quests'
import { missionError } from './missions'

const dayKey = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())

/** Attendance uses the same server record on the main screen and quest board. */
export function useQuestDashboard() {
  const [data, setData] = useState<QuestDashboard | null>(null)
  const [error, setError] = useState(''), [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0), [day, setDay] = useState(dayKey)
  const reload = useCallback(() => setRevision(r => r + 1), [])
  useEffect(() => {
    const refresh = () => { setDay(dayKey()); reload() }
    const timer = window.setInterval(() => setDay(dayKey()), 30000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [reload])
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('')
    api<QuestDashboard>('/quests/sync', { method: 'POST', signal: abort.signal })
      .then(value => { if (!abort.signal.aborted) setData(value) })
      .catch(reason => { if (!abort.signal.aborted) { setData(null); setError(missionError(reason)) } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [revision, day])
  const attended = data?.today === day && data.attendance.today
  async function checkIn() {
    if (loading || saving || attended || !data) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await api<{ duplicate: boolean; grantedXp: number }>('/quests/attendance', { method: 'POST' })
      setMessage(result.duplicate ? '오늘은 이미 출석했습니다.' : `출석을 기록했습니다. ${result.grantedXp.toLocaleString()} XP 지급`)
      reload()
    } catch (reason) { setError(missionError(reason)) } finally { setSaving(false) }
  }
  return { data, attended, loading, saving, error, message, checkIn, reload }
}
