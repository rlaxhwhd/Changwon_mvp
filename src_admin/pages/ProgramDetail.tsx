import type { IconType } from 'react-icons'
import {
  LuCheck, LuCircleCheck, LuCircleHelp, LuClipboardCheck,
  LuFrown, LuGraduationCap, LuInfo, LuList, LuPaperclip, LuPencil, LuTrash2,
  LuUser, LuUserCheck, LuUsers, LuUserX, LuX,
} from 'react-icons/lu'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getProgramById,
  setAttendance,
  updateProgram,
  removeProgram,
  setApplicantsStatus,
  removeApplicant,
} from '../data/programs'
import { PROGRAM_STATUSES, SELECTION_STATUSES } from '../data/schema/program'
import type {
  AttendanceStatus,
  ProgramApplicant,
  ProgramStatus,
  SelectionStatus,
} from '../data/schema/program'
import { NOSHOW_PENALTY_POINTS } from '../data/schema/penalty'
import { studentLiteOf, collegeOf, enrollStatusClass } from '../data/studentRoster'
import EmptyState from '../components/EmptyState'

type Mode = 'applicants' | 'selected'

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; icon: IconType; cls: string }[] = [
  { value: '미확인', label: '미확인', icon: LuCircleHelp, cls: '' },
  { value: '출석', label: '출석', icon: LuCircleCheck, cls: 'is-present' },
  { value: '노쇼', label: '노쇼', icon: LuUserX, cls: 'is-noshow' },
]

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const statusOf = (a: ProgramApplicant): SelectionStatus => a.selectionStatus ?? '대기'

function selectionChipClass(status: SelectionStatus): string {
  switch (status) {
    case '선발': return 'admin-chip-ok'
    case '탈락': return 'admin-chip-cancel'
    case '취소': return 'admin-chip-done'
    default: return 'admin-chip-wait'
  }
}

export default function ProgramDetail({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // localStorage 단일소스. 변경 후 refresh 로 재조회해 화면에 반영(전체 reload 대신).
  const [program, setProgram] = useState(() => (id ? getProgramById(id) : undefined))
  const refresh = () => setProgram(id ? getProgramById(id) : undefined)

  const [status, setStatus] = useState<ProgramStatus | ''>(program?.status ?? '')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<SelectionStatus>('선발')

  // 신청자/선발자 페이지 전환 시 선택 초기화
  useEffect(() => { setChecked(new Set()) }, [mode])

  if (!program) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">프로그램 상세</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon={LuFrown}
            message="해당 프로그램을 찾을 수 없습니다."
            action={{ label: '프로그램 목록으로', onClick: () => navigate('/programs/manage') }}
          />
        </section>
      </div>
    )
  }

  const applicants = program.applicants
  const selectedList = applicants.filter(a => statusOf(a) === '선발')
  const currentList = mode === 'applicants' ? applicants : selectedList

  const waitingCount = applicants.filter(a => statusOf(a) === '대기').length
  const rejectedCount = applicants.filter(a => statusOf(a) === '탈락').length

  const allChecked = currentList.length > 0 && currentList.every(a => checked.has(a.studentId))

  const toggleCheck = (studentId: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(currentList.map(a => a.studentId)))
  }

  const applyBulkStatus = () => {
    if (checked.size === 0) return
    setApplicantsStatus(program.id, [...checked], bulkStatus)
    setChecked(new Set())
    refresh()
  }

  const handleAttendance = (studentId: string, value: AttendanceStatus) => {
    setAttendance(program.id, studentId, value)
    refresh()
  }

  const handleRemoveApplicant = (studentId: string, name: string) => {
    if (!window.confirm(`'${name}' 학생의 신청을 삭제할까요?`)) return
    removeApplicant(program.id, studentId)
    setChecked(prev => {
      const next = new Set(prev)
      next.delete(studentId)
      return next
    })
    refresh()
  }

  const handleStatusSave = () => {
    if (!status || status === program.status) return
    updateProgram(program.id, { status })
    refresh()
  }

  const handleDeleteProgram = () => {
    if (!window.confirm(`'${program.title}' 프로그램을 삭제할까요? 신청자·출석 기록도 함께 사라집니다.`)) return
    removeProgram(program.id)
    navigate('/programs/manage')
  }

  const rosterClass = mode === 'applicants' ? 'admin-applicant-mgmt-roster' : 'admin-selected-mgmt-roster'

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuGraduationCap /> {program.title}
          </h1>
          <p className="admin-page-desc">
            <span className="admin-tag admin-tag-soft">{program.category}</span>{' '}
            {program.startDate} ~ {program.endDate} · {program.location || '장소 미정'} · 정원 {program.capacity}명
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to={`/programs/${program.id}/edit`} className="admin-btn admin-btn-ghost">
            <LuPencil /> 공고 수정
          </Link>
          <Link to="/programs/manage" className="admin-btn admin-btn-ghost">
            <LuList /> 목록
          </Link>
          <Link to="/programs/blacklist" className="admin-btn admin-btn-ghost">
            <LuUserX /> 블랙리스트
          </Link>
        </div>
      </header>

      {/* 신청/선발 요약 + 모집상태 변경 */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><LuClipboardCheck /> 신청 현황</h2>
        </div>
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-icon"><LuUsers /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">신청자</span>
              <span className="admin-stat-value">{applicants.length}<em>명</em></span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon success"><LuUserCheck /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">선발</span>
              <span className="admin-stat-value">{selectedList.length}<em>명</em></span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon info"><LuCircleHelp /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">대기</span>
              <span className="admin-stat-value">{waitingCount}<em>명</em></span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon accent"><LuUserX /></span>
            <div className="admin-stat-body">
              <span className="admin-stat-label">탈락</span>
              <span className="admin-stat-value">{rejectedCount}<em>명</em></span>
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
            <LuCheck /> 상태 저장
          </button>
          <button className="admin-btn admin-btn-danger-ghost sm admin-program-delete" onClick={handleDeleteProgram}>
            <LuTrash2 /> 프로그램 삭제
          </button>
        </div>
      </section>

      {/* 신청자 관리 / 선발자 관리 — 별도 페이지(라우트) 서브내비 */}
      <section className="admin-card">
        <div className="admin-tabs admin-participant-tabs">
          <Link
            to={`/programs/${program.id}/applicants`}
            className={`admin-tab${mode === 'applicants' ? ' active' : ''}`}
          >
            <LuUsers /> 신청자 관리 <span className="admin-tab-count">{applicants.length}</span>
          </Link>
          <Link
            to={`/programs/${program.id}/selected`}
            className={`admin-tab${mode === 'selected' ? ' active' : ''}`}
          >
            <LuUserCheck /> 선발자 관리 <span className="admin-tab-count">{selectedList.length}</span>
          </Link>
        </div>

        {checked.size > 0 && (
          <div className="admin-bulkbar">
            <span className="admin-bulkbar-count"><strong>{checked.size}</strong>명 선택됨</span>
            <select
              className="admin-bulk-select"
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as SelectionStatus)}
              aria-label="변경할 상태"
            >
              {SELECTION_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn-primary sm" onClick={applyBulkStatus}>
              <LuCheck /> 상태변경
            </button>
          </div>
        )}

        {currentList.length === 0 ? (
          <EmptyState
            icon={LuUser}
            message={
              mode === 'applicants'
                ? '아직 신청자가 없습니다.'
                : '아직 선발된 학생이 없습니다. 신청자 관리에서 학생을 체크한 뒤 상태를 선발로 변경하세요.'
            }
          />
        ) : (
          <div className={`admin-roster admin-participant-roster ${rosterClass}`}>
            <div className="admin-roster-head">
              <span className="admin-check-cell">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
              </span>
              <span>번호</span>
              <span>차수</span>
              <span>이름</span>
              <span>학번</span>
              <span>대학</span>
              <span>학과</span>
              <span>학년</span>
              <span>학적구분</span>
              <span>상태</span>
              <span>신청일</span>
              <span>첨부파일</span>
              <span>삭제</span>
              {mode === 'selected' && <span>출석</span>}
            </div>
            {currentList.map((a, index) => {
              const lite = studentLiteOf(a.studentId)
              const name = lite?.name ?? a.studentName
              const studentNo = lite?.studentNo ?? a.studentId
              const major = lite?.major ?? a.studentMajor
              const grade = lite?.grade
              const enroll = lite?.status
              const sel = statusOf(a)
              return (
                <div key={a.studentId} className="admin-roster-row admin-participant-row">
                  <span className="admin-roster-cell admin-check-cell">
                    <input
                      type="checkbox"
                      checked={checked.has(a.studentId)}
                      onChange={() => toggleCheck(a.studentId)}
                      aria-label={`${name} 선택`}
                    />
                  </span>
                  <span className="admin-roster-cell">{index + 1}</span>
                  <span className="admin-roster-cell">{a.round ?? 1}차</span>
                  <span className="admin-roster-cell"><strong>{name}</strong></span>
                  <span className="admin-roster-cell">{studentNo}</span>
                  <span className="admin-roster-cell">{collegeOf(major)}</span>
                  <span className="admin-roster-cell">{major}</span>
                  <span className="admin-roster-cell">{grade ? `${grade}학년` : '—'}</span>
                  <span className="admin-roster-cell">
                    {enroll ? <span className={enrollStatusClass(enroll)}>{enroll}</span> : <small>—</small>}
                  </span>
                  <span className="admin-roster-cell">
                    <span className={`admin-chip ${selectionChipClass(sel)}`}>{sel}</span>
                  </span>
                  <span className="admin-roster-cell"><small>{fmtDateTime(a.appliedAt)}</small></span>
                  <span className="admin-roster-cell admin-attach-cell" title="첨부파일 없음"><LuPaperclip /></span>
                  <span className="admin-roster-cell admin-del-cell">
                    <button
                      type="button"
                      className="admin-icon-del"
                      onClick={() => handleRemoveApplicant(a.studentId, name)}
                      aria-label={`${name} 신청 삭제`}
                    >
                      <LuX />
                    </button>
                  </span>
                  {mode === 'selected' && (
                    <span className="admin-attendance-toggle" role="group" aria-label={`${name} 출석 상태`}>
                      {ATTENDANCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`admin-att-btn ${opt.cls}${a.attendance === opt.value ? ' active' : ''}`}
                          aria-pressed={a.attendance === opt.value}
                          onClick={() => handleAttendance(a.studentId, opt.value)}
                        >
                          {(() => { const Icon = opt.icon; return <Icon /> })()} {opt.label}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'selected' && selectedList.length > 0 && (
          <div className="admin-editor-hint">
            <LuInfo />
            출석을 <strong>노쇼</strong>로 표시하면 해당 학생에게 자동으로 벌점 {NOSHOW_PENALTY_POINTS}점이 부여되어 <Link to="/programs/blacklist" className="admin-inline-link">블랙리스트</Link>에 반영됩니다. 노쇼를 해제하면 벌점이 회수됩니다.
          </div>
        )}
      </section>
    </div>
  )
}
