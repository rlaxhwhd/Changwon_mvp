import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export interface WeeklyTodo {
  id: string
  title: string
  sub: string
  date: string
  dday: number
  to: string
  done: boolean
  state: 'scheduled' | 'elapsed' | 'completed'
  closed: boolean
}
interface Agenda { items: WeeklyTodo[]; weekStart: string; weekEnd: string; today: string }
const koreanDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Load only on agenda pages; calendar rollover never relies on the browser timezone. */
export function useWeeklyTodos(studentId: string) {
  const [result, setResult] = useState<{ key: string; agenda: Agenda | null; error: string } | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(value => value+1), [])
  const key = `${studentId}:${revision}`
  const loading = result?.key !== key
  const agenda = loading ? null : result?.agenda
  const error = loading ? '' : result?.error ?? ''
  useEffect(() => {
    const controller = new AbortController()
    api<Agenda>('/lounge/weekly-todos', { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setResult({ key, agenda: value, error: '' }) })
      .catch(cause => { if (!controller.signal.aborted) setResult({ key, agenda: null, error: cause instanceof Error ? cause.message : '일정을 불러오지 못했습니다.' }) })
    return () => controller.abort()
  }, [key])
  useEffect(() => {
    const events = ['dc_programs_changed', 'dc:counsel-updated', 'dc:survey-submitted']
    events.forEach(event => window.addEventListener(event, reload))
    let date = koreanDate.format(new Date())
    const checkDate = () => {
      const current = koreanDate.format(new Date())
      if (date !== current) { date = current; reload() }
    }
    const timer = window.setInterval(checkDate, 30_000)
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', checkDate)
    return () => {
      events.forEach(event => window.removeEventListener(event, reload))
      window.clearInterval(timer)
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', checkDate)
    }
  }, [reload])
  return { items: agenda?.items ?? [], weekStart: agenda?.weekStart, weekEnd: agenda?.weekEnd, loading, error, reload }
}
