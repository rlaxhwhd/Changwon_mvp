import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getProgramById,
  setAttendance,
  updateProgram,
  removeProgram,
} from '../data/programs'
import { PROGRAM_STATUSES } from '../data/schema/program'
import type { AttendanceStatus, ProgramStatus } from '../data/schema/program'
import { NOSHOW_PENALTY_POINTS } from '../data/schema/penalty'
import { getPenaltyTotal } from '../data/penalties'
import EmptyState from '../components/EmptyState'

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; icon: string; cls: string }[] = [
  { value: '미확인', label: '미확인', icon: 'fa-circle-question', cls: '' },
  { value: '출석', label: '출석', icon: 'fa-circle-check', cls: 'is-present' },
  { value: '노쇼', label: '노쇼', icon: 'fa-user-slash', cls: 'is-noshow' },
]

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // getProgramById 는 매 렌더 최신 localStorage 를 읽는다. 출석 변경 후 reload 로 반영.
  const program = useMemo(() => (id ? getProgramById(id) : undefined), [id])

  const [status, setStatus] = useState<ProgramStatus | ''>(program?.status ?? '')

  if (!program) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">프로그램 상세</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon="fa-regular fa-face-frown"
            message="해당 프로그램을 찾을 수 없습니다."
            action={{ label: '프로그램 목록으로', onClick: () => navigate('/programs') }}
          />
        </section>
      </div>
    )
  }

  const present = program.applicants.filter(a => a.attendance === '출석').length
  const noshow = program.applicants.filter(a => a.attendance === '노쇼').length
  const unchecked = program.applicants.filter(a => a.attendance === '미확인').length

  const handleAttendance = (studentId: string, value: AttendanceStatus) => {
    setAttendance(program.id, studentId, value)
    window.location.reload()
  }

  const handleStatusSave = () => {
    if (!status || status === program.status) return
    updateProgram(program.id, { status })
    window.location.reload()
  }

  const handleDelete = () => {
    if (!window.confirm(`'${program.title}' 프로그램을 삭제할까요? 신청자·출석 기록도 함께 사라집니다.`)) return
    removeProgram(program.id)
    navigate('/programs')
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <i className="fa-solid fa-graduation-cap" /> {program.title}
          </h1>
          <p className="admin-page-desc">
            <span className="admin-tag admin-tag-soft">{program.category}</span>{' '}
            {program.startDate} ~ {program.endDate} · {program.location || '장소 미정'} · 정원 {program.capacity}명
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-list" /> 목록
          </Link>
          <Link to="/programs/blacklist" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-user-slash" /> 블랙리스트
          </Link>
        </div>
      </header>

      {program.desc && <p className="admin-detail-note">{program.desc}</p>}

      {/* 출석 요약 + 상태 변경 */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><i className="fa-solid fa-clipboard-check" /> 출석 현황</h2>
        </div>
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-icon"><i className="fa-solid fa-users" /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">신청자</span>
              <span className="admin-stat-value">{program.applicants.length}<em>명</em></span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon success"><i className="fa-solid fa-circle-check" /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">출석</span>
              <span className="admin-stat-value">{present}<em>명</em></span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon accent"><i className="fa-solid fa-user-slash" /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">노쇼</span>
              <span className="admin-stat-value">{noshow}<em>명</em></span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon info"><i className="fa-solid fa-circle-question" /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">미확인</span>
              <span className="admin-stat-value">{unchecked}<em>명</em></span>
            </div>
          </div>
        </div>

        <div className="admin-program-status-row">
          <label className="admin-select">
            <span>모집 상태</span>
            <select value={status} onChange={e => setStatus(e.target.value as ProgramStatus)}>
              {PROGRAM_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            className="admin-btn admin-btn-ghost sm"
            disabled={!status || status === program.status}
            onClick={handleStatusSave}
          >
            <i className="fa-solid fa-check" /> 상태 저장
          </button>
          <button className="admin-btn admin-btn-danger-ghost sm admin-program-delete" onClick={handleDelete}>
            <i className="fa-solid fa-trash" /> 프로그램 삭제
          </button>
        </div>
      </section>

      {/* 신청자 · 출석 체크 */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><i className="fa-solid fa-user-check" /> 신청자 · 출석 관리</h2>
        </div>
        <div className="admin-editor-hint">
          <i className="fa-solid fa-circle-info" />
          출석을 <strong>노쇼</strong>로 표시하면 해당 학생에게 자동으로 벌점 {NOSHOW_PENALTY_POINTS}점이 부여되어 <Link to="/programs/blacklist" className="admin-inline-link">블랙리스트</Link>에 반영됩니다. 노쇼를 해제하면 벌점이 회수됩니다.
        </div>

        {program.applicants.length === 0 ? (
          <EmptyState icon="fa-regular fa-user" message="아직 신청자가 없습니다." />
        ) : (
          <div className="admin-roster admin-applicant-roster">
            <div className="admin-roster-head">
              <span>학생</span>
              <span>학과</span>
              <span>신청 일시</span>
              <span>누적 벌점</span>
              <span>출석 체크</span>
            </div>
            {program.applicants.map(a => {
              const total = getPenaltyTotal(a.studentId)
              return (
                <div key={a.studentId} className="admin-roster-row admin-applicant-row">
                  <span className="admin-roster-student">
                    <span className="admin-student-avatar sm"></span>
                    <strong>{a.studentName}</strong>
                  </span>
                  <span className="admin-roster-cell">{a.studentMajor}</span>
                  <span className="admin-roster-cell">{fmtDateTime(a.appliedAt)}</span>
                  <span className="admin-roster-cell">
                    {total > 0
                      ? <span className="admin-penalty-badge">{total}점</span>
                      : <small>—</small>}
                  </span>
                  <span className="admin-attendance-toggle" role="group" aria-label={`${a.studentName} 출석 상태`}>
                    {ATTENDANCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`admin-att-btn ${opt.cls}${a.attendance === opt.value ? ' active' : ''}`}
                        aria-pressed={a.attendance === opt.value}
                        onClick={() => handleAttendance(a.studentId, opt.value)}
                      >
                        <i className={`fa-solid ${opt.icon}`} /> {opt.label}
                      </button>
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
