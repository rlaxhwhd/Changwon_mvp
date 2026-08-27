import {
  LuCheck, LuCircleHelp, LuClipboardCheck,
  LuInfo, LuPaperclip, LuTrash2,
  LuUser, LuUserCheck, LuUserPlus, LuUsers, LuUserX,
} from 'react-icons/lu'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import type { ProgramTabContext } from './ProgramShell'
import {
  updateProgram,
  removeProgram,
  setApplicantsStatus,
  setApplicantsOutcome,
  addApplicant,
  selectionOf,
  pendingApplicants,
  selectedApplicants,
} from '../data/programs'
import { PROGRAM_STATUSES, SELECTION_STATUSES, SELECTED_ACTIONS } from '../data/schema/program'
import { ROADMAP_ENTRY_LABEL } from '../../src_v2/data/schema/roadmap'
import type {
  ProgramStatus,
  SelectionStatus,
  SelectedAction,
} from '../data/schema/program'
import { studentLiteOf, collegeOf, enrollStatusClass, studentTypeClass } from '../data/studentRoster'
// 6유형 표시명은 단일소스에서 받는다 — 한글 리터럴을 화면에 박지 않는다.
import { typeLabel } from '../../src_v2/data/careerProcess'
import { getPenaltyTotal } from '../data/penalties'
import EmptyState from '../components/EmptyState'
import StudentPicker from '../components/StudentPicker'

type Mode = 'applicants' | 'selected'

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function selectionChipClass(status: SelectionStatus): string {
  switch (status) {
    case '선발': return 'admin-chip-ok'
    case '탈락': return 'admin-chip-cancel'
    case '취소': return 'admin-chip-done'
    default: return 'admin-chip-wait'
  }
}

function outcomeChipClass(status: string): string {
  if (status === '수료' || status === '참석' || status === '선발') return 'admin-chip-ok'
  if (status === '미수료') return 'admin-chip-done'
  if (status.startsWith('불참')) return 'admin-chip-cancel'
  return 'admin-chip-wait'
}

export default function ProgramDetail({ mode }: { mode: Mode }) {
  const navigate = useNavigate()

  // localStorage 단일소스. 프로그램 1건은 셸이 소유한다 — 변경 후 refresh() 하면
  // 셸이 다시 읽어 이 목록과 탭 카운트가 같이 갱신된다.
  const { program, refresh } = useOutletContext<ProgramTabContext>()

  const [status, setStatus] = useState<ProgramStatus | ''>(program.status)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulkValue, setBulkValue] = useState<string>('선발')
  const [picking, setPicking] = useState(false)

  // 신청자/선발자 페이지 전환 시 선택 초기화
  useEffect(() => { setChecked(new Set()) }, [mode])

  const applicants = program.applicants
  const selectedList = selectedApplicants(program)
  // 선발되면 선발자 관리로 넘어간다 — 신청자 관리에는 남지 않는다.
  const currentList = mode === 'applicants' ? pendingApplicants(program) : selectedList

  const waitingCount = applicants.filter(a => selectionOf(a) === '대기').length
  const rejectedCount = applicants.filter(a => selectionOf(a) === '탈락').length

  const allChecked = currentList.length > 0 && currentList.every(a => checked.has(a.studentId))
  const bulkOptions: readonly string[] = mode === 'applicants' ? SELECTION_STATUSES : SELECTED_ACTIONS

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

  const applyBulk = () => {
    if (checked.size === 0) return
    if (mode === 'applicants') {
      setApplicantsStatus(program.id, [...checked], bulkValue as SelectionStatus)
    } else {
      setApplicantsOutcome(program.id, [...checked], bulkValue as SelectedAction)
    }
    setChecked(new Set())
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

  return (
    <>
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

      {/* 신청자 관리 / 선발자 관리 표 */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>
            {mode === 'applicants' ? <><LuUsers /> 신청자 관리</> : <><LuUserCheck /> 선발자 관리</>}
          </h2>
          {mode === 'applicants' && (
            <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setPicking(true)}>
              <LuUserPlus /> 학생 추가
            </button>
          )}
        </div>

        {checked.size > 0 && (
          <div className="admin-bulkbar">
            <span className="admin-bulkbar-count"><strong>{checked.size}</strong>명 선택됨</span>
            <select
              className="admin-bulk-select"
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              aria-label="변경할 상태"
            >
              {bulkOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn-primary sm" onClick={applyBulk}>
              <LuCheck /> 상태변경
            </button>
          </div>
        )}

        {currentList.length === 0 ? (
          <EmptyState
            icon={LuUser}
            message={
              mode !== 'applicants'
                ? '아직 선발된 학생이 없습니다. 신청자 관리에서 학생을 체크한 뒤 상태를 선발로 변경하세요.'
                : applicants.length === 0
                  ? '아직 신청자가 없습니다.'
                  : '선발을 기다리는 신청자가 없습니다. 선발한 학생은 선발자 관리 탭에 있습니다.'
            }
          />
        ) : (
          <div className={`admin-roster admin-participant-roster admin-applicant-mgmt-roster${mode === 'applicants' ? ' has-cancel-col' : ''}`}>
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
              <span>진단유형</span>
              <span>학년</span>
              <span>학적구분</span>
              <span>상태</span>
              <span>신청일</span>
              {mode === 'applicants' && <span>취소일</span>}
              <span>첨부파일</span>
              <span>벌점</span>
            </div>
            {currentList.map((a, index) => {
              const lite = studentLiteOf(a.studentId)
              const name = lite?.name ?? a.studentName
              const studentNo = lite?.studentNo ?? a.studentId
              const major = lite?.major ?? a.studentMajor
              const grade = lite?.grade
              const enroll = lite?.status
              const studentType = lite?.studentType
              // 누적 벌점 — 블랙리스트 단일소스. 선발 판단에 쓰라고 표에 띄운다.
              const penalty = getPenaltyTotal(a.studentId)
              const label = mode === 'applicants' ? selectionOf(a) : (a.outcomeStatus ?? '선발')
              const chipCls = mode === 'applicants' ? selectionChipClass(selectionOf(a)) : outcomeChipClass(label)
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
                  <span className="admin-roster-cell">
                    {studentType
                      ? <span className={studentTypeClass(studentType)}>{typeLabel(studentType)}</span>
                      : <small>—</small>}
                  </span>
                  <span className="admin-roster-cell">{grade ? `${grade}학년` : '—'}</span>
                  <span className="admin-roster-cell">
                    {enroll ? <span className={enrollStatusClass(enroll)}>{enroll}</span> : <small>—</small>}
                  </span>
                  <span className="admin-roster-cell">
                    <span className={`admin-chip ${chipCls}`}>{label}</span>
                  </span>
                  <span className="admin-roster-cell"><small>{fmtDateTime(a.appliedAt)}</small></span>
                  {mode === 'applicants' && (
                    <span className="admin-roster-cell">
                      {a.canceledAt ? <small>{fmtDateTime(a.canceledAt)}</small> : <small>—</small>}
                    </span>
                  )}
                  <span className="admin-roster-cell admin-attach-cell" title="첨부파일 없음"><LuPaperclip /></span>
                  <span className="admin-roster-cell">
                    {penalty > 0
                      ? <span className="admin-chip admin-chip-penalty">{penalty}점</span>
                      : <small>—</small>}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {mode === 'selected' && selectedList.length > 0 && (
          <div className="admin-editor-hint">
            <LuInfo />
            {/* 안내문은 한 덩어리로 감싼다 — 힌트가 flex row라 인라인 요소가 각각 flex item이 되면 문장이 조각난다. */}
            <span>
              상태를 <strong>불참(벌점1점/2점/3점)</strong>으로 변경하면 해당 학생에게 벌점이 부여되어 <Link to="/programs/blacklist" className="admin-inline-link">블랙리스트</Link>에 반영됩니다. 참석·수료 등으로 되돌리면 벌점이 회수됩니다.
              {program.roadmapEntry && program.roadmapEntry !== 'NONE' && (
                <>
                  {' '}이 프로그램은 <strong>로드맵 편입({ROADMAP_ENTRY_LABEL[program.roadmapEntry]})</strong> 상태입니다 —
                  <strong> 수료</strong>로 변경하면 해당 학생의 <strong>IAP 실행</strong> 칸이 완료 처리되어 이행률이 오릅니다. 선발·출석만으로는 완료되지 않습니다.
                </>
              )}
            </span>
          </div>
        )}
      </section>

      {/* 신청자 직접 추가 — 집단상담 참여자 추가와 같은 학생 검색 피커를 쓴다. */}
      {picking && (
        <StudentPicker
          title="신청 학생 추가"
          excludeIds={applicants.map(a => a.studentId)}
          onClose={() => setPicking(false)}
          onPick={student => {
            addApplicant(program.id, { id: student.id, name: student.name, major: student.major })
            refresh()
          }}
        />
      )}
    </>
  )
}
