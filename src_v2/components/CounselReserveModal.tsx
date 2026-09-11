import { useState } from 'react'
import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import type { CounselIntakeAnswer } from '../data/counselIntake'
import './CounselReserveModal.css'

// ─────────────────────────────────────────────────────────────────────────
// 상담 예약 신청서 — 두 포털이 같이 쓴다(공용).
//   · 학생 포털(/v2/counsel/*) : 입력 모드 — 목적·문진표를 적어 신청한다.
//   · 교직원 포털(/admin)      : 읽기 모드 — 학생이 낸 신청서를 그대로 확인한다.
// 같은 서식을 두 벌로 만들면 학생이 본 화면과 상담사가 읽는 화면이 갈린다.
//
// ⚠️ admin 에는 v2 토큰이 11개 없다(--color-navy·--violet·--mint 등).
//    CSS 는 var(--x, 폴백) 형태여야 한다 — 폴백이 없으면 admin 에서 조용히 투명해진다.
// ─────────────────────────────────────────────────────────────────────────

/** 표 상단 「학생 기본정보」. 넘기지 않으면 활성 학생(학생 포털 기준)으로 채운다. */
export interface ReserveStudent {
  name: string
  studentNo: string
  major: string
  grade: string
  gender: string
  contact: string
  enrollmentStatus: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** 표에 표시할 역할 라벨 — "상담사" | "교수" */
  roleLabel: string
  /** 상담사/교수 전체 표시명 (예: "김지연 상담사") */
  counselorName: string
  date: string
  time: string
  room: string
  phone: string
  /** 문진표 질문 — 넘기면 「상담 목적」 아래에 답변칸이 붙는다(진로취업 전용).
   *  없으면 이 모달은 지금까지와 똑같이 동작한다. */
  questions?: string[]
  topicOptions?: { code: string; label: string }[]
  /** 신청 완료 안내 — 넘기면 제출 후 이 모달이 완료 화면으로 바뀐다.
   *  이때 부모는 모달을 닫지 않는다(닫으면 완료 화면이 안 보인다). */
  completion?: { title: string; desc: string }
  /** 학생 기본정보 — 교직원 포털은 신청 스냅샷을 넘긴다. 없으면 활성 학생. */
  student?: ReserveStudent
  /**
   * 읽기 모드 — 제출된 신청서를 그대로 보여 준다(상담사가 상담 전에 읽는 화면).
   * 질문 문구는 답변에 함께 저장돼 있어 템플릿을 다시 참조하지 않는다 —
   * 템플릿이 바뀌어도 그때 무엇을 물었는지가 남아야 한다(CLAUDE.md 규칙 2).
   */
  submitted?: { purpose: string; intake: CounselIntakeAnswer[] }
  onSubmit?: (purpose: string, answers: string[], topicCode?: string) => void | Promise<void>
}

export default function CounselReserveModal({
  open,
  onClose,
  roleLabel,
  counselorName,
  date,
  time,
  room,
  phone,
  questions,
  topicOptions,
  completion,
  student,
  submitted,
  onSubmit,
}: Props) {
  const active = student ? null : getActiveStudent()
  /** 학생 기본정보 — 넘어온 값 우선, 없으면 활성 학생 기준 + 일부 mock */
  const STUDENT = student ?? {
    name: active!.name,
    major: active!.major,
    gender: '-',
    enrollmentStatus: active!.enrollmentStatus,
    studentNo: active!.studentNo,
    grade: `${active!.grade}학년`,
    contact: active!.phone,
  }
  const readOnly = Boolean(submitted)
  const [purpose, setPurpose] = useState('')
  const [topicCode, setTopicCode] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const ask = questions ?? []
  const answerAt = (index: number) => answers[index] ?? ''
  const setAnswerAt = (index: number, value: string) =>
    setAnswers(prev => { const next = [...prev]; next[index] = value; return next })

  // 문진표가 있으면 모든 문항이 채워져야 신청할 수 있다.
  const canSubmit = purpose.trim().length > 0 && (!topicOptions || topicOptions.some(topic => topic.code === topicCode)) && ask.every((_, i) => answerAt(i).trim().length > 0)

  const reset = () => { setPurpose(''); setTopicCode(''); setAnswers([]); setDone(false) }

  const handleSubmit = async () => {
    if (!canSubmit || !onSubmit || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await onSubmit(purpose.trim(), ask.map((_, i) => answerAt(i).trim()), topicCode || undefined)
      if (completion) setDone(true)
      else reset()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '신청을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    setSaveError('')
    reset()
    onClose()
  }

  if (done && completion) {
    return (
      <Modal open={open} onClose={handleClose} title="상담 신청 완료" size="md">
        <div className="crm-done" role="status" aria-live="polite">
          <span className="crm-done-mark"><i className="fa-solid fa-check" /></span>
          <h3 className="crm-done-title">{completion.title}</h3>
          <p className="crm-done-desc">{completion.desc}</p>
          <button className="crm-btn-primary crm-done-btn" onClick={handleClose}>확인</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={readOnly ? '상담 문진표' : '상담 예약 신청'} size="md">
      {/* 학생 기본정보 */}
      <div className="crm-section">
        <div className="crm-section-title">
          <i className="fa-regular fa-user" /> 학생 기본정보
        </div>
        <table className="crm-table">
          <tbody>
            <tr>
              <th>이름</th><td>{STUDENT.name}</td>
              <th>학번</th><td>{STUDENT.studentNo}</td>
            </tr>
            <tr>
              <th>소속</th><td>{STUDENT.major}</td>
              <th>학년</th><td>{STUDENT.grade}</td>
            </tr>
            <tr>
              <th>성별</th><td>{STUDENT.gender}</td>
              <th>연락처</th><td>{STUDENT.contact}</td>
            </tr>
            <tr>
              <th>학적상태</th><td colSpan={3}>{STUDENT.enrollmentStatus}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 상담 정보 */}
      <div className="crm-section">
        <div className="crm-section-title">
          <i className="fa-regular fa-calendar-check" /> 상담 정보
        </div>
        <table className="crm-table">
          <tbody>
            <tr>
              <th>{roleLabel}명</th><td>{counselorName}</td>
              <th>상담 일시</th><td>{date}{date && time ? ' · ' : ''}{time}</td>
            </tr>
            <tr>
              {/* 값이 없으면 빈 칸을 남기지 않는다 — 읽기 모드는 없는 항목이 생긴다(상담 전화 등) */}
              <th>상담실 위치</th><td>{room || '—'}</td>
              <th>상담 전화</th><td>{phone || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 상담 목적 */}
      <div className="crm-section">
        <label className="crm-section-title" htmlFor="crm-purpose">
          <i className="fa-regular fa-pen-to-square" /> 상담 목적 {!readOnly && <span className="crm-req">*</span>}
        </label>
        {readOnly
          ? <p className="crm-value">{submitted!.purpose || '작성된 내용이 없습니다.'}</p>
          : (
            <textarea
              id="crm-purpose"
              className="crm-textarea"
              value={purpose}
              onChange={event => setPurpose(event.target.value)}
              placeholder="상담을 통해 어떤 도움을 받고 싶은지 자유롭게 작성해 주세요."
            />
          )}
      </div>

      {!readOnly && topicOptions && <div className="crm-section">
        <label htmlFor="crm-topic" className="crm-section-title">상담 주제</label>
        <select id="crm-topic" className="crm-textarea" value={topicCode} onChange={e => setTopicCode(e.target.value)} disabled={saving}>
          <option value="">상담 주제를 선택하세요</option>
          {topicOptions.map(topic => <option key={topic.code} value={topic.code}>{topic.label}</option>)}
        </select>
      </div>}
      {/* 상담 문진표 — 질문은 입력 모드에선 data/counselIntake.ts, 읽기 모드에선 답변에 붙어 온다. */}
      {readOnly ? (
        <div className="crm-section">
          <div className="crm-section-title">
            <i className="fa-regular fa-clipboard" /> 상담 문진표
          </div>
          {submitted!.intake.length === 0 ? (
            <p className="crm-value is-empty">
              이 신청에는 문진표가 없습니다. 문진표는 진로취업 상담 신청에서만 받습니다.
            </p>
          ) : (
            <ol className="crm-intake">
              {submitted!.intake.map((row, index) => (
                <li key={row.question}>
                  <p className="crm-intake-q">
                    <span className="crm-intake-no">{index + 1}</span>{row.question}
                  </p>
                  <p className="crm-value">{row.answer || '답변 없음'}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : ask.length > 0 && (
        <div className="crm-section">
          <div className="crm-section-title">
            <i className="fa-regular fa-clipboard" /> 상담 문진표 <span className="crm-req">*</span>
          </div>
          <p className="crm-intake-hint">상담사가 미리 읽고 준비합니다. 편하게 적어 주세요.</p>
          <ol className="crm-intake">
            {ask.map((question, index) => (
              <li key={question}>
                <label htmlFor={`crm-intake-${index}`}>
                  <span className="crm-intake-no">{index + 1}</span>{question}
                </label>
                <textarea
                  id={`crm-intake-${index}`}
                  className="crm-textarea crm-intake-answer"
                  value={answerAt(index)}
                  onChange={event => setAnswerAt(index, event.target.value)}
                  placeholder="답변을 입력해 주세요."
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="crm-actions">
        {readOnly ? (
          <button className="crm-btn-primary" onClick={handleClose}>닫기</button>
        ) : (
          <>
            <button className="crm-btn-ghost" onClick={handleClose}>취소</button>
            {saveError && <p role="alert">{saveError}</p>}
            <button className="crm-btn-primary" onClick={handleSubmit} disabled={!canSubmit || saving} aria-busy={saving}>
              {ask.length > 0 ? '상담 신청' : '예약 신청하기'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
