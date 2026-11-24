import { studentDisplayName } from '../../shared/studentDisplayName'
import { useState } from 'react'
import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import { collegeOf } from '../../src_admin/data/colleges'
import './ProgramApplyModal.css'
import { questionsAnswered, type ApplicationAnswers, type ApplicationQuestion } from '../../shared/programContent'
import ProgramApplicationQuestions from '../../shared/components/ProgramApplicationQuestions'
import Button from '../../shared/ui/Button'
import ProgramConsentForm, { PROGRAM_CONSENT_KEYS, type ProgramConsentAnswers } from '../../shared/components/ProgramConsentForm'
import { catalogOptions } from '../data/growthInputCatalog'

interface Props {
  open: boolean
  onClose: () => void
  programTitle: string
  questions?: ApplicationQuestion[]
  saving?: boolean
  onSubmit: (payload: {
    routeCode: string
    motive: string
    /** 동의서 3항목의 예/아니오와 서명 여부 — 상담사가 동의서 항목을 넣은 공고에서만 채워진다. */
    consents: ProgramConsentAnswers
    answers: ApplicationAnswers
  }) => void
}

export default function ProgramApplyModal({ open, onClose, programTitle, onSubmit, questions = [], saving = false }: Props) {
  // 신청서에 뜨는 인적사항은 학사 데이터에서 온다. 없는 값을 지어내지 않는다
  // (CLAUDE.md 규칙 1 — 학사 유래 데이터는 읽기 전용이다).
  const active = getActiveStudent()
  const STUDENT = {
    name: active.name,
    studentId: active.studentNo,
    grade: String(active.grade),
    phone: active.phone || '—',
    email: '—',
    college: collegeOf(active.major),
    dept: active.major,
  }
  // 지원경로 목록은 코드관리(PROGRAM_APPLY_ROUTE)가 정본이다.
  const routes = catalogOptions('PROGRAM_APPLY_ROUTE')
  const [routeCode, setRouteCode] = useState('')
  const [motive, setMotive] = useState('')
  const [consents, setConsents] = useState<ProgramConsentAnswers>({})
  const [answers, setAnswers] = useState<ApplicationAnswers>({})
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    setRouteCode(''); setMotive('')
    setConsents({})
    setAnswers({})
  }

  const handleClose = () => { if (!saving && !uploading) { reset(); onClose() } }

  // 동의서(수집·이용·고유식별·불이익 안내 — 현행 양식 그대로)는 상담사가 「신청 시 추가 정보」에 동의서 항목을 넣은
  // 공고에서만 나온다(2026-11-24 사용자 지시). 세 항목이 모두 「예」면 그 CONSENT 질문의 답을 yes, 하나라도 「아니오」면 no 로 남긴다.
  const consentQuestion = questions.find(q => q.type === 'CONSENT')
  const otherQuestions = questions.filter(q => q.type !== 'CONSENT')
  const changeConsents = (next: ProgramConsentAnswers) => {
    setConsents(next)
    if (!consentQuestion) return
    const done = PROGRAM_CONSENT_KEYS.every(k => next[k])
    setAnswers(prev => {
      const rest = Object.fromEntries(Object.entries(prev).filter(([k]) => k !== consentQuestion.id))
      return done ? { ...rest, [consentQuestion.id]: PROGRAM_CONSENT_KEYS.every(k => next[k] === 'yes') ? 'yes' : 'no' } : rest
    })
  }

  const allAnswered = !consentQuestion || (PROGRAM_CONSENT_KEYS.every(k => consents[k]) && !!consents.signed)
  const canSubmit = routeCode !== '' && motive.trim() !== '' && allAnswered && !saving && !uploading && questionsAnswered(questions, answers)

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      routeCode,
      motive: motive.trim(),
      consents: consentQuestion ? consents : {},
      answers,
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="비교과 프로그램 신청서" size="lg">
      <p className="pam-intro">
        <strong>{programTitle}</strong> 참가 신청을 하세요.
      </p>

      {/* ── 학생 기본정보 ── */}
      <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-user" /> 학생 기본정보
        </div>
        <table className="pam-table">
          <tbody>
            <tr>
              <th>이름</th><td>{studentDisplayName(STUDENT.name, STUDENT.studentId)}</td>
              <th>학번</th><td>{STUDENT.studentId}</td>
            </tr>
            <tr>
              <th>학년</th><td>{STUDENT.grade}</td>
              <th>연락처</th><td>{STUDENT.phone}</td>
            </tr>
            <tr>
              <th>E-Mail</th><td colSpan={3}>{STUDENT.email}</td>
            </tr>
            <tr>
              <th>대학</th><td>{STUDENT.college}</td>
              <th>학부(과)</th><td>{STUDENT.dept}</td>
            </tr>
          </tbody>
        </table>
        <p className="pam-note">
          본인 사용 번호가 아니라면, 와글/개인정보에 전화번호 꼭 변경하세요.
        </p>
      </div>

      {/* ── 지원경로 ── */}
      <div className="pam-section">
        <label className="pam-section-title" htmlFor="pam-path">
          <i className="fa-regular fa-compass" /> 이 프로그램을 어떻게 알게 되었습니까? <span className="pam-req">*</span>
        </label>
        <select
          id="pam-path"
          className="pam-select"
          value={routeCode}
          onChange={e => setRouteCode(e.target.value)}
        >
          <option value="">지원경로를 선택해 주세요</option>
          {routes.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </div>

      {/* ── 지원동기 ── */}
      <div className="pam-section">
        <label className="pam-section-title" htmlFor="pam-motive">
          <i className="fa-regular fa-pen-to-square" /> 이 프로그램에 신청한 동기가 무엇입니까? <span className="pam-req">*</span>
        </label>
        <textarea
          id="pam-motive"
          className="pam-textarea"
          value={motive}
          onChange={e => setMotive(e.target.value)}
          placeholder="지원동기를 자유롭게 작성해 주세요."
        />
      </div>

      {otherQuestions.length > 0 && <div className="pam-section">
        <h3 className="pam-section-title">신청 시 추가정보</h3>
        <ProgramApplicationQuestions questions={otherQuestions} answers={answers} onChange={setAnswers} onBusyChange={setUploading} />
      </div>}

      {consentQuestion && <div className="pam-section">
        <div className="pam-section-title">
          <i className="fa-regular fa-file-lines" /> 개인정보 동의서
        </div>
        {/* 현행 신청 시 추가정보 팝업의 동의서 양식 그대로 — 문구 고정. 예/아니오·모두 동의·서명은 컴포넌트 안에 있다 */}
        <ProgramConsentForm value={consents} onChange={changeConsents} applicantName={studentDisplayName(STUDENT.name, STUDENT.studentId)} />
      </div>}

      <div className="pam-actions">
        <Button onClick={handleClose}>닫기</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
          신청
        </Button>
      </div>
    </Modal>
  )
}
