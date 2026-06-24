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
  onSubmit: (purpose: string) => void
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

  const handleSubmit = () => {
    if (!purpose.trim()) return
    onSubmit(purpose.trim())
    setPurpose('')
  }

  const handleClose = () => {
    setPurpose('')
    onClose()
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

      <div className="crm-actions">
        <button className="crm-btn-ghost" onClick={handleClose}>취소</button>
        <button className="crm-btn-primary" onClick={handleSubmit} disabled={!purpose.trim()}>
          예약 신청하기
        </button>
      </div>
    </Modal>
  )
}
