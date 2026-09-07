import { useRef, useState } from 'react'
import Modal from './Modal'
import ResumeSheet from './ResumeSheet'
import { getActiveStudent } from '../data/students'
// 포트폴리오는 데이터층 단일소스에서 읽는다 — 마이페이지·교직원 학생상세와 같은 값이다.
import {
  buildProfile,
  INITIAL_SKILLS, INITIAL_CERTS, INITIAL_LANGS, INITIAL_AWARDS, INITIAL_PROJECTS, INITIAL_RESUMES,
} from '../data/portfolio'
import type { ApplyAttachment, ApplyAttachmentKind } from '../../src_admin/data/jobApplications'
import './JobApplyModal.css'

// ─────────────────────────────────────────────────────────────────────────
// 추천채용 지원 모달 — 제출 서류를 고르고 지원한다.
//
// 현행 `ReAppD` 지원 프로세스 대응(SPEC.md §3-6 S16). 서류 없이 지원되던 것을
// 두 갈래로 나눈다:
//   ① 드림캐치 포트폴리오 — 「마이페이지 > 포트폴리오 > 이력서」를 그대로 제출.
//      고르면 아래에 그 이력서가 펼쳐진다(읽기 전용 — 편집 콜백을 넘기지 않는다).
//   ② 개별 이력서       — 학생이 따로 만든 파일. 파일명만 남는다(백엔드 없음).
//
// ⚠ 이력서 뷰를 여기서 다시 만들지 않는다. ResumeSheet 한 벌을 학생 마이페이지 ·
//   교직원 학생상세 포트폴리오 탭 · 이 모달이 같이 쓴다(CLAUDE.md 12조).
// ⚠ 첨부 성립 여부의 최종 판정은 로더(applyToJob)다. 여기 버튼 활성화는 편의일 뿐이다.
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  company: string
  role: string
  onSubmit: (attachment: ApplyAttachment) => void
}

export default function JobApplyModal({ open, onClose, company, role, onSubmit }: Props) {
  const me = getActiveStudent()
  const [kind, setKind] = useState<ApplyAttachmentKind | ''>('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setKind(''); setFileName('') }
  const handleClose = () => { reset(); onClose() }

  const canSubmit = kind === 'PORTFOLIO' || (kind === 'RESUME_FILE' && fileName !== '')

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(kind === 'PORTFOLIO' ? { kind } : { kind: 'RESUME_FILE', fileName })
    reset()
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
          className={`jam-choice${kind === 'PORTFOLIO' ? ' is-on' : ''}`}
          onClick={() => setKind('PORTFOLIO')}
        >
          <i className="fa-regular fa-id-card" />
          <span>
            <strong>드림캐치 포트폴리오 첨부</strong>
            <small>마이페이지에 작성한 이력서를 그대로 제출합니다</small>
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
            <small>직접 작성한 이력서 파일을 올립니다</small>
          </span>
        </button>
      </div>

      {/* 파일 선택기는 ②를 고를 때만 열린다 — 펼침 영역은 ①에만 둔다. */}
      <input
        ref={fileRef}
        type="file"
        className="jam-file-input"
        accept=".pdf,.doc,.docx,.hwp,.hwpx"
        onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
      />

      {kind === 'RESUME_FILE' && (
        <p className="jam-file-picked">
          {fileName
            ? <><i className="fa-regular fa-circle-check" /> {fileName}</>
            : <><i className="fa-regular fa-circle" /> 선택된 파일이 없습니다. 다시 눌러 파일을 고르세요.</>}
        </p>
      )}

      {/* ── ①을 고르면 포트폴리오 이력서가 여기 펼쳐진다 ── */}
      {kind === 'PORTFOLIO' && (
        <section className="jam-portfolio" aria-label="제출할 드림캐치 포트폴리오">
          <p className="jam-portfolio-note">
            <i className="fa-solid fa-circle-info" />
            아래 내용 그대로 제출됩니다. 고치려면 마이페이지 &gt; 포트폴리오에서 수정하세요.
          </p>
          <ResumeSheet
            profile={buildProfile(me)}
            skills={INITIAL_SKILLS}
            certs={INITIAL_CERTS}
            langs={INITIAL_LANGS}
            awards={INITIAL_AWARDS}
            projects={INITIAL_PROJECTS}
            resumes={INITIAL_RESUMES}
          />
        </section>
      )}

      <div className="jam-actions">
        <button type="button" className="jam-btn-ghost" onClick={handleClose}>닫기</button>
        <button type="button" className="jam-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          지원하기
        </button>
      </div>
    </Modal>
  )
}
