import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../../shared/api'
import type { CounselRecord } from '../data/schema/counselRecord'
import type { StudentType } from '../../src_v2/data/careerProcess'

export interface RecordContext {
  diagnosisType: StudentType | null
  record: CounselRecord | null
  typeLocked: boolean
}

/** Open with current server data so an asynchronously loaded record cannot become an empty form. */
export default function CounselRecordContext({ requestId, children }: {
  requestId: string
  children: (context: RecordContext) => ReactNode
}) {
  const [state, setState] = useState<{ requestId: string; data?: RecordContext; error?: string }>()
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    api<RecordContext>(`/counsel-requests/${encodeURIComponent(requestId)}/record-context`)
      .then(data => { if (active) setState({ requestId, data }) })
      .catch(error => { if (active) setState({ requestId, error: error instanceof Error ? error.message : '상담 기록을 불러오지 못했습니다.' }) })
    return () => { active = false }
  }, [requestId, retry])
  if (state?.requestId === requestId && state.error) return <div role="alert">{state.error} <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setState(undefined); setRetry(n => n + 1) }}>다시 시도</button></div>
  if (state?.requestId !== requestId || !state.data) return <p role="status">상담 기록을 불러오는 중입니다.</p>
  return children(state.data)
}
