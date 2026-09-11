import { useRef, useState } from 'react'
import Modal from './Modal'
import { uploadJobFile } from '../../src_admin/data/jobsSource'
import { jobCapability } from '../../shared/jobStore'
import type { ApplyAttachmentKind } from '../../src_admin/data/schema/jobApplication'
import './JobApplyModal.css'

// ─────────────────────────────────────────────────────────────────────────
// 추천채용 지원 모달 — 제출 서류를 고르고 지원한다.
//
// 현행 `ReAppD` 지원 프로세스 대응(SPEC.md §3-6 S16). 서류 없이 지원되던 것을
// 두 갈래로 나눈다:
//   ① 드림캐치 포트폴리오 — 학생별 영속 저장소(DB.md §8-3 #4)가 아직 없다.
//      **없는 제출을 성공한 것처럼 만들지 않는다** — 이유를 적고 비활성으로 둔다.
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
  /** 업로드까지 마친 파일 id 를 넘긴다 — 지원 트랜잭션이 이 파일을 회차에 귀속시킨다. */
  onSubmit: (fileId: string) => void | Promise<void>
}

export default function JobApplyModal({ open, onClose, company, role, onSubmit }: Props) {
  const capability = jobCapability()
  const [kind, setKind] = useState<ApplyAttachmentKind | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setKind(''); setFile(null); setError('') }
  const handleClose = () => { reset(); onClose() }

  const portfolioReason = capability.unavailable
    .find(u => u.code === 'PORTFOLIO_SERVICE_UNAVAILABLE')?.message
    ?? '드림캐치 포트폴리오 제출은 아직 준비 중입니다.'
  const canSubmit = kind === 'RESUME_FILE' && !!file && !busy

  const handleSubmit = async () => {
    if (!canSubmit || !file) return
    setBusy(true)
    setError('')
    try {
      const stored = await uploadJobFile('RESUME', file)
      await onSubmit(stored.id)
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
          aria-checked={false}
          aria-disabled
          disabled={!capability.canApplyWithPortfolio}
          className="jam-choice"
          onClick={() => { /* 준비 전이라 고를 수 없다 */ }}
        >
          <i className="fa-regular fa-id-card" />
          <span>
            <strong>드림캐치 포트폴리오 첨부</strong>
            <small>{portfolioReason}</small>
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
            <small>직접 작성한 이력서 파일을 올립니다 (pdf · doc · docx · hwp · hwpx)</small>
          </span>
        </button>
      </div>

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
