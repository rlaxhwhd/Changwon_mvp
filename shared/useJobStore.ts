import { useEffect, useReducer } from 'react'
import { JOB_EVENT } from './jobStore'

/**
 * 채용 스토어 구독. 값이 바뀌면 리렌더하고, useMemo 의존성에 넣을 버전을 돌려준다.
 * 화면이 저장 뒤에 스스로 다시 읽지 않아도 되도록 — 스토어가 서버에서 다시 읽어
 * 발행하면 그때 갱신된다(programStore·counselStore 와 같은 규약).
 */
export function useJobStore(): number {
  const [version, bump] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const update = () => bump()
    window.addEventListener(JOB_EVENT, update)
    return () => window.removeEventListener(JOB_EVENT, update)
  }, [])
  return version
}
