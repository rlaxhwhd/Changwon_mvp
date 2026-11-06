import { useEffect, useState } from 'react'
import { PORTFOLIO_EVENT, ensurePortfolios } from './portfolioStore'
import { useStore } from './useRoadmapStore'

/** 이 학생의 포트폴리오 목록을 적재하고 구독한다. 탭을 열 때만 부른다. */
export function usePortfolios(studentId: string): { revision: number; error: string } {
  const revision = useStore(PORTFOLIO_EVENT)
  const [error, setError] = useState('')
  useEffect(() => {
    ensurePortfolios(studentId)
      .then(() => setError(''))
      .catch(() => setError('포트폴리오 목록을 불러오지 못했습니다.'))
  }, [studentId])
  return { revision, error }
}
