import { useEffect, useRef, useState } from 'react'
import { loadStudentDiagnoses } from './diagnosisStore'

/** 저장된 이력 조회 전용. 외부검사 결과 가져오기와 AI 생성은 기존 결과 화면에서 처리한다. */
export function useDiagnosisHistory(studentId: string) {
  const request = useRef<{ studentId: string; promise: ReturnType<typeof loadStudentDiagnoses> } | null>(null)
  const [state, setState] = useState<{ studentId: string; data?: Awaited<ReturnType<typeof loadStudentDiagnoses>>; error?: string }>()
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let live = true
    if (!request.current || request.current.studentId !== studentId) {
      request.current = { studentId, promise: loadStudentDiagnoses(studentId) }
    }
    request.current.promise.then(data => { if (live) setState({ studentId, data }) })
      .catch(error => { if (live) setState({ studentId, error: error instanceof Error ? error.message : '진단 이력을 불러오지 못했습니다.' }) })
    return () => { live = false }
  }, [studentId, revision])
  function retry() { request.current = null; setState(undefined); setRevision(value => value + 1) }
  return { data: state?.studentId === studentId ? state.data : undefined, error: state?.studentId === studentId ? state.error : undefined, retry }
}
