import { useCallback, useEffect, useState } from 'react'
import type { Paginated } from '../data/query'

interface ListState<T> {
  data: Paginated<T>
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const EMPTY: Paginated<unknown> = { items: [], totalCount: 0, page: 1, pageSize: 20 }

/**
 * 목록 조회 훅 — useEffect + 레이스 컨디션 cleanup을 한 곳에 모은다(화면들이 공유).
 *
 * 계약 전제(DATA_CONTRACT.md): loader 는 `async (params) => Paginated<T>`.
 * → 나중에 React Query로 갈 때 **이 훅 내부만** useQuery로 교체하면 화면은 무수정.
 *   (queryKey ≈ 여기의 JSON.stringify(params), queryFn ≈ loader)
 *
 * params 는 값이 바뀔 때만 재조회한다(객체 참조가 매 렌더 새로 생겨도 안전 — 직렬화 키 사용).
 * 그래서 호출부에서 params 를 useMemo로 감쌀 필요가 없다.
 */
export function useListData<T, P>(
  loader: (params: P) => Promise<Paginated<T>>,
  params: P,
): ListState<T> {
  const [data, setData] = useState<Paginated<T>>(EMPTY as Paginated<T>)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)

  const key = JSON.stringify(params)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    loader(params)
      .then(res => { if (!cancelled) { setData(res); setIsLoading(false) } })
      .catch((e: unknown) => { if (!cancelled) { setError(e as Error); setIsLoading(false) } })
    return () => { cancelled = true }
    // key 가 params 값을, nonce 가 refetch 를 대신한다(loader 는 모듈 상수로 안정).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  const refetch = useCallback(() => setNonce(n => n + 1), [])
  return { data, isLoading, error, refetch }
}
