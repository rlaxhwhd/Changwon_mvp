import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActiveCounselor, getActiveCounselorId } from '../data/counselors'
import { handledRequestTypes } from '../data/schema/counselor'
import {
  getRequestsByAssignee,
  completeRequest,
} from '../data/counselRequests'
import type { CounselRequest } from '../data/counselRequests'
import { getRecordsByStudent, getRecordByRequest, upsertRecord } from '../data/counselRecords'
import type { CounselRecord } from '../data/counselRecords'
import { STUDENTS, getStudentIap } from '../../src_v2/data/students'
import type { StudentData } from '../../src_v2/data/students'
import EmptyState from '../components/EmptyState'
import StudentDiagnosticDetail from '../components/StudentDiagnosticDetail'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 좌측 — 학생 진단결과·프로필 (src_v2 학생 데이터 공유 읽기) */
function StudentPanel({ student }: { student: StudentData }) {
  const iap = getStudentIap(student)
  return (
    <div className="admin-session-student">
      <div className="admin-session-student-head">
        <span className="admin-student-avatar lg"></span>
        <div>
          <strong>{student.name}</strong>
          <small>
            {student.grade}학년 · {student.major}
          </small>
          <div className="admin-session-tags">
            <span className="admin-tag admin-tag-soft">{student.studentType}</span>
            <span className="admin-tag">{iap.iapType}</span>
          </div>
        </div>
      </div>

      <dl className="admin-kv">
        <div>
          <dt>학점</dt>
          <dd>{student.gpa}</dd>
        </div>
        <div>
          <dt>어학</dt>
          <dd>{student.language}</dd>
        </div>
        <div>
          <dt>목표 직무</dt>
          <dd>{student.targetRole}</dd>
        </div>
        <div>
          <dt>목표 기업</dt>
          <dd>
            {student.targetCompany.name} <em>({student.targetCompany.matchScore}%)</em>
          </dd>
        </div>
      </dl>

      <div className="admin-session-block">
        <h4>IAP 방향</h4>
        <p className="admin-session-note">
          <strong>{iap.goal}</strong>
          <br />
          {iap.focus}
        </p>
      </div>
    </div>
  )
}

/** 좌측 하단 — 이전 상담 이력 */
function HistoryPanel({ studentId }: { studentId: string }) {
  const records = getRecordsByStudent(studentId)
  return (
    <div className="admin-session-block">
      <h4>
        <i className="fa-solid fa-clock-rotate-left" /> 이전 상담 이력
      </h4>
      {records.length === 0 ? (
        <p className="admin-session-empty">이전 상담 기록이 없습니다.</p>
      ) : (
        <ul className="admin-history-list">
          {records.map(r => (
            <li key={r.id} className="admin-history-item">
              <div className="admin-history-top">
                <span className="admin-history-date">{r.date}</span>
                <span className="admin-tag admin-tag-soft">{r.type}</span>
              </div>
              <strong className="admin-history-topic">{r.topic}</strong>
              <p className="admin-history-summary">{r.summary}</p>
              {r.comment && (
                <p className="admin-history-comment">
                  <i className="fa-solid fa-comment-dots" /> {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 우측 — 상담 기록지 작성 폼 */
function RecordForm({
  request,
  student,
}: {
  request: CounselRequest
  student: StudentData
}) {
  const counselor = getActiveCounselor()
  const counselorId = getActiveCounselorId()
  const existing = getRecordByRequest(request.id)

  const [summary, setSummary] = useState(existing?.summary ?? '')
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [followUp, setFollowUp] = useState(existing?.followUp ?? '')
  const [saved, setSaved] = useState(false)

  const canComplete = summary.trim() !== '' && comment.trim() !== ''

  const buildRecord = (status: CounselRecord['status']): CounselRecord => {
    const now = new Date().toISOString()
    return {
      id: existing?.id ?? `rec_${request.id}_${Date.now().toString(36)}`,
      requestId: request.id,
      studentId: student.id,
      studentName: student.name,
      studentMajor: student.major,
      type: request.type,
      method: request.method,
      topic: request.topic,
      date: request.slot?.date ?? todayISO(),
      counselorId,
      counselorName: counselor.name,
      summary: summary.trim(),
      comment: comment.trim(),
      followUp: followUp.trim() || undefined,
      status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
  }

  const handleSaveDraft = () => {
    upsertRecord(buildRecord('작성중'))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const handleComplete = () => {
    if (!canComplete) return
    upsertRecord(buildRecord('완료'))
    completeRequest(request.id)
    // 완료 후 완료 내역으로 이동
    window.location.href = '/admin/counsel/records'
  }

  return (
    <form className="admin-record-form" onSubmit={e => e.preventDefault()}>
      <div className="admin-record-meta">
        <span className="admin-tag admin-tag-soft">{request.type}</span>
        <span className="admin-tag">{request.method}</span>
        {request.slot && (
          <span className="admin-tag">
            {request.slot.date} {request.slot.start}–{request.slot.end}
          </span>
        )}
        {existing?.status === '완료' && <span className="admin-chip admin-chip-done">완료됨</span>}
      </div>

      <div className="admin-record-topic">
        <i className="fa-solid fa-quote-left" /> {request.topic}
      </div>

      <label className="admin-field">
        <span>
          상담 소견 <em className="admin-req-mark">*</em>
        </span>
        <textarea
          rows={7}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="상담 진행 내용, 진단 해석, 논의한 방향을 기록합니다. (내부 기록)"
        />
      </label>

      <label className="admin-field">
        <span>
          학생 공개 코멘트 <em className="admin-req-mark">*</em>
        </span>
        <textarea
          rows={4}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="학생 상담 현황에 표시될 코멘트입니다. 격려·요약·다음 과제를 담아주세요."
        />
        <small className="admin-field-hint">이 코멘트는 학생 화면 '상담 현황'에 노출됩니다.</small>
      </label>

      <label className="admin-field">
        <span>후속 조치 / 다음 상담 (선택)</span>
        <input
          type="text"
          value={followUp}
          onChange={e => setFollowUp(e.target.value)}
          placeholder="예: 2주 후 정기 상담, TOEIC 접수 확인"
        />
      </label>

      <div className="admin-form-actions">
        {saved && <span className="admin-save-hint"><i className="fa-solid fa-check" /> 임시 저장됨</span>}
        <button type="button" className="admin-btn admin-btn-ghost" onClick={handleSaveDraft}>
          임시 저장
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={!canComplete}
          onClick={handleComplete}
        >
          <i className="fa-solid fa-clipboard-check" /> 저장 후 완료 처리
        </button>
      </div>
      {!canComplete && (
        <p className="admin-form-hint">완료 처리하려면 소견과 학생 코멘트를 모두 입력하세요.</p>
      )}
    </form>
  )
}

export default function CounselSession() {
  const { studentId } = useParams<{ studentId: string }>()
  const counselor = getActiveCounselor()
  const myType = handledRequestTypes(counselor.role)[0]

  const student = useMemo(() => STUDENTS.find(s => s.id === studentId), [studentId])

  // 이 학생의 내 담당 상담 중 진행 대상 = 확정 우선, 없으면 최근 대기
  const targetRequest = useMemo(() => {
    if (!studentId) return undefined
    const mine = getRequestsByAssignee(counselor.id).filter(r => r.studentId === studentId)
    return (
      mine.find(r => r.status === '확정') ??
      mine.find(r => r.status === '대기') ??
      mine[0]
    )
  }, [studentId, counselor.id])

  if (!student) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div>
            <h1 className="admin-page-title">상담 진행</h1>
            <p className="admin-page-desc">학생 정보를 찾을 수 없습니다.</p>
          </div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon="fa-solid fa-user-slash"
            title="학생을 찾을 수 없음"
            message="해당 학생 데이터가 존재하지 않습니다. 접수함에서 다시 진입해주세요."
            action={{ label: '접수함으로', onClick: () => { window.location.href = '/admin/counsel/requests' } }}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 진행</h1>
          <p className="admin-page-desc">
            {student.name} · {myType} 상담 · 좌측 진단결과를 참고해 기록지를 작성합니다.
          </p>
        </div>
        <Link to="/counsel/requests" className="admin-btn admin-btn-ghost">
          <i className="fa-solid fa-arrow-left" /> 접수함
        </Link>
      </header>

      <div className="admin-session-split">
        {/* 좌측: 학생 진단·프로필·이력 */}
        <aside className="admin-card admin-session-left">
          <div className="admin-card-head">
            <h2>
              <i className="fa-solid fa-id-card" /> 학생 진단결과
            </h2>
            <Link to={`/students`} className="admin-card-more">
              학생 상세 <i className="fa-solid fa-chevron-right" />
            </Link>
          </div>
          <StudentPanel student={student} />
          <StudentDiagnosticDetail student={student} />
          <HistoryPanel studentId={student.id} />
        </aside>

        {/* 우측: 상담 기록지 */}
        <section className="admin-card admin-session-right">
          <div className="admin-card-head">
            <h2>
              <i className="fa-solid fa-pen-to-square" /> 상담 기록지
            </h2>
          </div>
          {targetRequest ? (
            <RecordForm request={targetRequest} student={student} />
          ) : (
            <EmptyState
              icon="fa-regular fa-file-lines"
              title="연결된 상담 신청 없음"
              message="이 학생의 진행 가능한 상담 신청이 없습니다. 접수함에서 확정 후 진행해주세요."
            />
          )}
        </section>
      </div>
    </div>
  )
}
