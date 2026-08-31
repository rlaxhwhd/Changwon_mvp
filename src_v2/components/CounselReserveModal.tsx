import { useState } from 'react'
import Modal from './Modal'
import { getActiveStudent } from '../data/students'
import './CounselReserveModal.css'

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
  /** 신청 완료 안내 — 넘기면 제출 후 이 모달이 완료 화면으로 바뀐다.
   *  이때 부모는 모달을 닫지 않는다(닫으면 완료 화면이 안 보인다). */
  completion?: { title: string; desc: string }
  onSubmit: (purpose: string, answers: string[]) => void
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
  completion,
  onSubmit,
}: Props) {
  const active = getActiveStudent()
  /** 학생 기본정보 (활성 학생 기준 + 일부 mock) */
  const STUDENT = {
    name: active.name,
    dept: active.major,
    gender: '-',
    status: '재학',
    studentId: '20250001',
    grade: `${active.grade}학년`,
    contact: '010-1234-5678',
  }
  const [purpose, setPurpose] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const ask = questions ?? []
  const answerAt = (index: number) => answers[index] ?? ''
  const setAnswerAt = (index: number, value: string) =>
    setAnswers(prev => { const next = [...prev]; next[index] = value; return next })

  // 문진표가 있으면 모든 문항이 채워져야 신청할 수 있다.
  const canSubmit = purpose.trim().length > 0 && ask.every((_, i) => answerAt(i).trim().length > 0)

  const reset = () => { setPurpose(''); setAnswers([]); setDone(false) }

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(purpose.trim(), ask.map((_, i) => answerAt(i).trim()))
    if (completion) setDone(true)
    else reset()
  }

  const handleClose = () => {
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
    <Modal open={open} onClose={handleClose} title="상담 예약 신청" size="md">
      {/* 학생 기본정보 */}
      <div className="crm-section">
        <div className="crm-section-title">
          <i className="fa-regular fa-user" /> 학생 기본정보
        </div>
        <table className="crm-table">
          <tbody>
            <tr>
              <th>이름</th><td>{STUDENT.name}</td>
              <th>학번</th><td>{STUDENT.studentId}</td>
            </tr>
            <tr>
              <th>소속</th><td>{STUDENT.dept}</td>
              <th>학년</th><td>{STUDENT.grade}</td>
            </tr>
            <tr>
              <th>성별</th><td>{STUDENT.gender}</td>
              <th>연락처</th><td>{STUDENT.contact}</td>
            </tr>
            <tr>
              <th>학적상태</th><td colSpan={3}>{STUDENT.status}</td>
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
              <th>상담실 위치</th><td>{room}</td>
              <th>상담 전화</th><td>{phone}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 상담 목적 */}
      <div className="crm-section">
        <label className="crm-section-title" htmlFor="crm-purpose">
          <i className="fa-regular fa-pen-to-square" /> 상담 목적 <span className="crm-req">*</span>
        </label>
        <textarea
          id="crm-purpose"
          className="crm-textarea"
          value={purpose}
          onChange={event => setPurpose(event.target.value)}
          placeholder="상담을 통해 어떤 도움을 받고 싶은지 자유롭게 작성해 주세요."
        />
      </div>

      {/* 상담 문진표 — 질문은 data/counselIntake.ts 가 준다. 여기 문구를 박지 않는다. */}
      {ask.length > 0 && (
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
        <button className="crm-btn-ghost" onClick={handleClose}>취소</button>
        <button className="crm-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {ask.length > 0 ? '상담 신청' : '예약 신청하기'}
        </button>
      </div>
    </Modal>
  )
}
