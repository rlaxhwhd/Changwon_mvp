// ─────────────────────────────────────────────────────────────────────────
// 스킬트리 화면 상태 — 비동기 로드 · 로딩/빈/에러 · 낙관적 갱신
//
// repository(스왑 지점)가 async 이므로 화면은 처음부터 비동기 흐름이다.
// DB가 붙어도 이 훅과 화면은 바뀌지 않는다 — fetchAcademic 몸통만 바뀐다.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAcademic, saveJobInterest, saveStudentCert,
  AcademicNotFoundError, type AcademicSnapshot,
} from '../data/academic/repository'
import { deriveSkillTree, availableCerts, availableJobs, type SkillTreeData } from '../data/academic'
import { getActiveStudent, getStudentCounselRequests } from '../data/students'

export type SkillTreeStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface UseSkillTree {
  status: SkillTreeStatus
  data: SkillTreeData | null
  /** '직무 추가' 목록 (아직 담지 않은 것) */
  jobOptions: ReturnType<typeof availableJobs>
  /** '자격증 추가' 목록 */
  certOptions: ReturnType<typeof availableCerts>
  studentName: string
  error: Error | null
  reload: () => void
  addJob: (jobId: string) => void
  removeJob: (jobId: string) => void
  addCert: (certId: string) => void
  removeCert: (certId: string) => void
}

export function useSkillTree(): UseSkillTree {
  const student = getActiveStudent()
  const [snap, setSnap] = useState<AcademicSnapshot | null>(null)
  const [status, setStatus] = useState<SkillTreeStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)
  // 늦게 도착한 응답이 최신 상태를 덮지 않게 한다.
  const seq = useRef(0)

  useEffect(() => {
    const my = ++seq.current
    let alive = true
    setStatus('loading')
    setError(null)

    fetchAcademic(student.id)
      .then(next => {
        if (!alive || my !== seq.current) return
        setSnap(next)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (!alive || my !== seq.current) return
        setSnap(null)
        if (e instanceof AcademicNotFoundError) {
          setStatus('empty')
        } else {
          setError(e instanceof Error ? e : new Error(String(e)))
          setStatus('error')
        }
      })

    return () => { alive = false }
  }, [student.id, nonce])

  const reload = useCallback(() => setNonce(n => n + 1), [])

  /** 쓰기 → 저장 후 재조회. 저장이 실패하면 에러 상태로 넘긴다. */
  const mutate = useCallback((run: () => Promise<void>) => {
    run().then(reload).catch((e: unknown) => {
      setError(e instanceof Error ? e : new Error(String(e)))
      setStatus('error')
    })
  }, [reload])

  const addJob = useCallback(
    (jobId: string) => mutate(() => saveJobInterest(student.id, jobId, true)), [mutate, student.id])
  const removeJob = useCallback(
    (jobId: string) => mutate(() => saveJobInterest(student.id, jobId, false)), [mutate, student.id])
  const addCert = useCallback(
    (certId: string) => mutate(() => saveStudentCert(student.id, certId, true)), [mutate, student.id])
  const removeCert = useCallback(
    (certId: string) => mutate(() => saveStudentCert(student.id, certId, false)), [mutate, student.id])

  // 파생은 스냅샷이 바뀔 때만. 매 렌더 새 객체를 만들면 화면의
  // useEffect([data]) 가 매번 깨어난다.
  const data = useMemo(
    () => (snap ? deriveSkillTree(snap, student, getStudentCounselRequests(student.id)) : null),
    [snap, student])
  const jobOptions = useMemo(() => (snap ? availableJobs(snap) : []), [snap])
  const certOptions = useMemo(() => (snap ? availableCerts(snap) : []), [snap])

  return {
    status, data, jobOptions, certOptions,
    studentName: student.name,
    error,
    reload,
    addJob, removeJob, addCert, removeCert,
  }
}
