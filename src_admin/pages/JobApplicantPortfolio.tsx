import { useEffect, useState } from 'react'
import { LuArrowLeft, LuPrinter } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../shared/api'
import PortfolioSheet from '../../shared/PortfolioSheet'
import { personalOf } from '../../shared/portfolioSections'
import { loadSubmittedPortfolio } from '../../shared/portfolioStore'
import type { SubmittedPortfolio } from '../../shared/portfolioStore'

/**
 * 지원자 제출본 — 학생이 지원 때 첨부한 포트폴리오의 불변 스냅샷.
 * 레이아웃 밖에 두어 화면 그대로가 인쇄면이 된다. 「PDF 저장」은 브라우저 인쇄다.
 * 열람할 때마다 서버가 감사를 남기므로 캐시하지 않는다.
 */
export default function JobApplicantPortfolio() {
  const { applicationId = '' } = useParams()
  const navigate = useNavigate()
  const [portfolio, setPortfolio] = useState<SubmittedPortfolio | null>(null)
  const [error, setError] = useState('')
  const [photoReady, setPhotoReady] = useState(false)

  useEffect(() => {
    let live = true
    loadSubmittedPortfolio(applicationId)
      .then(next => {
        if (!live) return
        setPortfolio(next)
        document.title = `${personalOf(next.document).name}_${next.title}`
      })
      .catch((cause: unknown) => {
        if (live) setError(cause instanceof ApiError && cause.status === 404
          ? '열람할 수 있는 제출본이 없습니다.'
          : cause instanceof Error ? cause.message : '제출본을 불러오지 못했습니다.')
      })
    return () => { live = false }
  }, [applicationId])

  const photoId = portfolio ? personalOf(portfolio.document).photoFileId : ''
  const waitingPhoto = !!portfolio?.files[photoId] && !photoReady

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => navigate(-1)}><LuArrowLeft /> 돌아가기</button>
        {portfolio && (
          <button type="button" className="admin-btn admin-btn-primary" disabled={waitingPhoto} onClick={() => window.print()}>
            <LuPrinter /> PDF 저장
          </button>
        )}
      </div>
      {error && <p className="print-missing" role="alert">{error}</p>}
      {!portfolio && !error && <p className="print-missing" role="status">불러오는 중…</p>}
      {portfolio && <PortfolioSheet document={portfolio.document} files={portfolio.files} onPhotoSettled={() => setPhotoReady(true)} />}
    </div>
  )
}
