import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from './Modal'
import { uploadJobFile } from '../../src_admin/data/jobsSource'
import type { ApplyAttachment } from '../../src_admin/data/jobApplications'
import { jobCapability } from '../../shared/jobStore'
import { PORTFOLIO_EVENT, portfolioList, reloadPortfolios } from '../../shared/portfolioStore'
import { useStore } from '../../shared/useRoadmapStore'
import { getCounselorCards } from '../data/counselorsRead'
import { getActiveStudentId } from '../data/students'
import type { ApplyAttachmentKind } from '../../src_admin/data/schema/jobApplication'
import './JobApplyModal.css'

// ─────────────────────────────────────────────────────────────────────────
// 추천채용 지원 모달 — 제출 서류를 고르고 지원한다.
//
// 현행 `ReAppD` 지원 프로세스 대응(SPEC.md §3-6 S16). 서류 없이 지원되던 것을
// 두 갈래로 나눈다:
//   ① 드림캐치 포트폴리오 — 학생이 만든 한 벌을 고른다. 서버가 회차별 불변 스냅샷으로 남긴다.
//   ② 개별 이력서 — 실제 파일을 서버 볼륨에 올린다. 저장 이름은 서버가 부여하고
//      다운로드는 권한을 확인하는 API 로만 나간다(DB.md #41).
//
// ⚠ 첨부 성립 여부의 최종 판정은 서버다. 여기 버튼 활성화는 편의일 뿐이다.
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  company: string
  role: string
  /** 고른 서류와 추천 선생님(없음이면 null)을 넘긴다 — 지원 트랜잭션이 회차에 귀속시킨다. */
  onSubmit: (attachment: ApplyAttachment, recommenderId: string | null) => void | Promise<void>
}

export default function JobApplyModal({ open, onClose, company, role, onSubmit }: Props) {
  const capability = jobCapability()
  const [kind, setKind] = useState<ApplyAttachmentKind | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [recommenderId, setRecommenderId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const studentId = getActiveStudentId()
  const [portfolioId, setPortfolioId] = useState('')
  const [portfolioError, setPortfolioError] = useState('')
  useStore(PORTFOLIO_EVENT)
  const portfolios = portfolioList(studentId)
  const chosen = portfolios.find(row => row.id === portfolioId && row.complete)

  // 고를 때만 읽는다. 공고 상세를 여는 것만으로 호출을 늘리지 않는다.
  useEffect(() => {
    if (kind !== 'PORTFOLIO') return
    reloadPortfolios(studentId)
      .then(() => setPortfolioError(''))
      .catch(() => setPortfolioError('포트폴리오 목록을 불러오지 못했습니다.'))
  }, [kind, studentId])

  const reset = () => { setKind(''); setFile(null); setPortfolioId(''); setRecommenderId(''); setError('') }
  const handleClose = () => { reset(); onClose() }

  const canSubmit = !busy && (kind === 'RESUME_FILE' ? !!file : kind === 'PORTFOLIO' && !!chosen)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      if (kind === 'PORTFOLIO' && chosen) {
        await onSubmit({ kind, portfolioId: chosen.id, expectedPortfolioVersion: chosen.version }, recommenderId || null)
      } else if (file) {
        const stored = await uploadJobFile('RESUME', file)
        await onSubmit({ kind: 'RESUME_FILE', fileId: stored.id }, recommenderId || null)
      }
      reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '지원하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="채용 지원" size="lg">
      <p className="jam-intro">
        <strong>{company} · {role}</strong> 에 지원합니다. 제출할 서류를 선택하세요.
      </p>

      {/* ── 서류 선택 ── */}
      <div className="jam-choices" role="radiogroup" aria-label="제출 서류 선택">
        <button
          type="button"
          role="radio"
          aria-checked={kind === 'PORTFOLIO'}
          disabled={!capability.canApplyWithPortfolio}
          className={`jam-choice${kind === 'PORTFOLIO' ? ' is-on' : ''}`}
          onClick={() => setKind('PORTFOLIO')}
        >
          <i className="fa-regular fa-id-card" />
          <span>
            <strong>드림캐치 포트폴리오 첨부</strong>
            <small>마이페이지에서 만든 포트폴리오 중 하나를 제출합니다</small>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={kind === 'RESUME_FILE'}
          className={`jam-choice${kind === 'RESUME_FILE' ? ' is-on' : ''}`}
          onClick={() => { setKind('RESUME_FILE'); fileRef.current?.click() }}
        >
          <i className="fa-regular fa-file-lines" />
          <span>
            <strong>개별 이력서 첨부</strong>
            <small>직접 작성한 이력서 파일을 올립니다 (pdf · doc · docx · hwp · hwpx, 파일당 10MB 이하)</small>
          </span>
        </button>
      </div>

      {kind === 'PORTFOLIO' && (
        <div className="jam-portfolio">
          <p className="jam-portfolio-note">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            제출하면 연락처를 포함한 포트폴리오 내용이 지원자 관리 담당 교직원에게 공개됩니다.
          </p>
          {portfolioError && <p className="jam-file-picked" role="alert">{portfolioError}</p>}
          {portfolios.length === 0 ? (
            <p className="jam-file-picked">
              아직 만든 포트폴리오가 없습니다. <Link to="/mypage/portfolio?tab=versions">포트폴리오 만들기</Link>
            </p>
          ) : (
            <ul className="jam-portfolio-list">
              {portfolios.map(row => (
                <li key={row.id}>
                  <label className={!row.complete ? 'is-off' : ''}>
                    <input
                      type="radio"
                      name="jam-portfolio"
                      disabled={!row.complete}
                      checked={portfolioId === row.id}
                      onChange={() => setPortfolioId(row.id)}
                    />
                    <span>{row.title}</span>
                  </label>
                  {!row.complete && (
                    <small>
                      이메일·휴대폰 등 필수 항목이 비어 있습니다. <Link to={`/mypage/portfolio?tab=versions&edit=${row.id}`}>편집하기</Link>
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 포트폴리오 카드와 같은 폭으로 그 밑에 놓는다. 선택지는 서버 상담사 목록이고 기본은 없음이다. */}
      <label className="jam-recommender">
        <span>추천 선생님</span>
        <select value={recommenderId} onChange={e => setRecommenderId(e.target.value)}>
          <option value="">없음</option>
          {getCounselorCards('career').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <input
        ref={fileRef}
        type="file"
        className="jam-file-input"
        accept=".pdf,.doc,.docx,.hwp,.hwpx"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
      />

      {kind === 'RESUME_FILE' && (
        <p className="jam-file-picked">
          {file
            ? <><i className="fa-regular fa-circle-check" /> {file.name}</>
            : <><i className="fa-regular fa-circle" /> 선택된 파일이 없습니다. 다시 눌러 파일을 고르세요.</>}
        </p>
      )}

      {error && <p className="jam-file-picked" role="alert">{error}</p>}

      <div className="jam-actions">
        <button type="button" className="jam-btn-ghost" onClick={handleClose}>닫기</button>
        <button type="button" className="jam-btn-primary" onClick={() => void handleSubmit()} disabled={!canSubmit}>
          {busy ? '제출 중…' : '지원하기'}
        </button>
      </div>
    </Modal>
  )
}
