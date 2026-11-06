import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../shared/api'
import PortfolioSheet from '../../../shared/PortfolioSheet'
import { loadSubmittedPortfolio } from '../../../shared/portfolioStore'
import type { SubmittedPortfolio as Submitted } from '../../../shared/portfolioStore'
import { usePageHead } from '../../components/PageCrumb'
import './MyApplications.css'

/** 제출한 포트폴리오를 읽기 전용으로 본다. 제출 시점의 내용이며 원본을 고쳐도 바뀌지 않는다. */
export default function SubmittedPortfolio() {
  usePageHead('제출한 포트폴리오', '지원할 때 제출한 내용입니다. 원본을 고쳐도 바뀌지 않습니다.')
  const { id = '' } = useParams()
  const [portfolio, setPortfolio] = useState<Submitted | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    loadSubmittedPortfolio(id)
      .then(next => { if (live) setPortfolio(next) })
      .catch((cause: unknown) => {
        if (live) setError(cause instanceof ApiError && cause.status === 404
          ? '열어 볼 수 있는 제출본이 없습니다. 재지원했다면 지금 지원 회차의 서류만 볼 수 있습니다.'
          : '제출본을 불러오지 못했습니다. 다시 시도해 주세요.')
      })
    return () => { live = false }
  }, [id])

  return (
    <div className="v2-page">
      {error && (
        <div data-slot="card" className="ma-empty">
          <i className="fa-regular fa-folder-open" />
          <strong>제출본을 표시할 수 없습니다.</strong>
          <p>{error}</p>
          <Link to="/mypage/applications" className="ma-empty-btn">지원 내역으로</Link>
        </div>
      )}
      {!portfolio && !error && <p role="status">불러오는 중…</p>}
      {portfolio && (
        <>
          <p className="ma-note pfs-no-print">
            «{portfolio.title}» · {portfolio.attemptNo}회차 제출본 · <Link to="/mypage/applications" className="ma-link">지원 내역으로</Link>
          </p>
          <PortfolioSheet document={portfolio.document} files={portfolio.files} />
        </>
      )}
    </div>
  )
}
