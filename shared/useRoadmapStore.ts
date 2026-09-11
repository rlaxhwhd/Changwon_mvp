import { useEffect, useReducer } from 'react'
import { GROWTH_EVENT, ensureGrowth } from './growthStore'
import { ROADMAP_EVENT, ensureRoadmap } from './roadmapStore'

/**
 * 로드맵·성장 스토어 구독. 값이 바뀌면 리렌더하고, useMemo 의존성에 넣을 버전을 돌려준다.
 * 화면이 저장 뒤에 스스로 다시 읽지 않아도 되도록 — 스토어가 서버에서 다시 읽어 발행하면
 * 그때 갱신된다(programStore·jobStore 와 같은 규약).
 */
function useStore(event: string): number {
  const [version, bump] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const update = () => bump()
    window.addEventListener(event, update)
    return () => window.removeEventListener(event, update)
  }, [event])
  return version
}

/** 이 학생의 계획을 적재하고 구독한다. 식별자가 바뀌면 새로 읽는다. */
export function useRoadmap(studentId: string): number {
  const revision = useStore(ROADMAP_EVENT)
  useEffect(() => { ensureRoadmap(studentId) }, [studentId])
  return revision
}

/** 이 학생의 성장 자료를 적재하고 구독한다. */
export function useGrowth(studentId: string): number {
  const revision = useStore(GROWTH_EVENT)
  useEffect(() => { ensureGrowth(studentId) }, [studentId])
  return revision
}

export { useStore }
