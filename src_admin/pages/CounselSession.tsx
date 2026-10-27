import { studentDisplayName } from '../../shared/studentDisplayName'
import { LuArrowLeft, LuCheck, LuChevronLeft, LuChevronRight, LuClipboardCheck, LuFileText, LuQuote, LuSquarePen, LuUserX } from 'react-icons/lu'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getActiveCounselor, getActiveCounselorId } from '../data/counselors'
import { handledRequestTypes } from '../data/schema/counselor'
import {
  getCounselRequests,
  completeRequest,
} from '../data/counselRequests'
import type { CounselRequest } from '../data/counselRequests'
import { buildRecord, nextPsychSession, upsertRecord } from '../data/counselRecords'
import type { CounselRecord } from '../data/counselRecords'
import { STUDENTS } from '../../src_v2/data/students'
import { loadStudentProfile } from '../../shared/profileStore'
import type { StudentData } from '../../src_v2/data/students'
import { roadmapEnvelope } from '../../shared/roadmapStore'
import { useRoadmap, useStore } from '../../shared/useRoadmapStore'
import { isCare7 } from '../../src_v2/data/counselTrack'
import EmptyState from '../components/EmptyState'
import StudentDetailView, { type TabKey } from '../components/StudentDetailView'
import CounselRecordFields from '../components/CounselRecordFields'
import PsychJournalFields from '../components/PsychJournalFields'
import CounselRecordPreview from '../components/CounselRecordPreview'
import CounselRecordContext, { type RecordContext } from '../components/CounselRecordContext'
import { counselContent, counselTemplateErrors, emptyCounselTemplate } from '../data/schema/counselTemplate'
import { emptyPsychJournal, psychJournalErrors } from '../data/schema/psychJournal'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 우측 — 상담 기록지 작성 폼 */
function RecordForm({
  request,
  student,
  context,
  onCompleted,
}: {
  request: CounselRequest
  student: StudentData
  context: RecordContext
  /** 완료 처리가 끝났다 — 다음 단계(로드맵 생성)로 화면을 옮긴다. */
  onCompleted: () => void
}) {
  const counselor = getActiveCounselor()
  const counselorId = getActiveCounselorId()
  useRoadmap(student.id)
  const [existing, setExisting] = useState(context.record ?? undefined)
  const career = request.type === '진로취업'
  const care7 = career && isCare7(request.careTrack)
  const [template, setTemplate] = useState(() => existing?.template ?? emptyCounselTemplate(request.method, request.slot?.date ?? todayISO(), request.slot?.start))

  const [psychJournal, setPsychJournal] = useState(() => existing?.psychJournal
    ?? emptyPsychJournal(request.method, request.slot?.date ?? todayISO(), request.slot?.start, nextPsychSession(student.id, request.id), existing?.summary ?? ''))
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // 완료된 상담은 complete 를 다시 부를 수 없다 — 기록 수정은 상담일지 저장 경로(상태 완료 유지)로 간다.
  // 로드맵을 만들며 학생과 더 나눈 이야기를 코멘트·정성진단에 반영하는 자리다. 최종 유형은 서버가 잠근다.
  const done = request.status === '완료'

  const recordSummary = career ? counselContent(template) : psychJournal.content
  const formErrors = career ? counselTemplateErrors(template, care7, context.typeLocked, comment) : psychJournalErrors(psychJournal, comment)
  const canComplete = formErrors.length === 0 && recordSummary.trim() !== '' && comment.trim() !== ''

  // 조립은 데이터층 한 곳이다 — 상담일지 대장도 같은 함수로 쓴다.
  const draft = (status: CounselRecord['status']): CounselRecord =>
    buildRecord(
      {
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
      },
      { summary: recordSummary, comment, followUp: existing?.followUp ?? '', template: career ? template : undefined, psychJournal: career ? undefined : psychJournal },
      status,
      existing,
    )

  const handleSave = async (status: CounselRecord['status']) => {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      const result = await upsertRecord(draft(status))
      setExisting(result)
      if (result.template) setTemplate(value => ({ ...value, legacySummary: result.template?.legacySummary }))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '기록을 저장하지 못했습니다.')
    } finally { setSaving(false) }
  }

  const handleComplete = async () => {
    if (!canComplete || saving) return
    setSaving(true)
    setSaveError('')
    try {
      // 로드맵은 완료의 선행조건이 아니다 — 완료 뒤 로드맵 진행 탭에서 이 상담을 근거로 생성한다.
      // 재상담으로 미리 재생성해 둔 초안이 이 상담을 가리키면 완료가 그 초안을 함께 확정한다.
      const plan = roadmapEnvelope(student.id)?.roadmap
      const draftForThis = care7 && plan && !plan.confirmed && plan.counselRequestId === request.id ? plan : undefined
      await completeRequest(request.id, { summary: recordSummary, comment, followUp: existing?.followUp, template: career ? template : undefined, psychJournal: career ? undefined : psychJournal, expectedRecordVersion: existing?.version ?? 0 }, care7 ? template.finalType : undefined,
        draftForThis ? { expectedRoadmapVersion: draftForThis.roadmapVersion, expectedRoadmapLockVersion: draftForThis.version } : undefined)
      onCompleted()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '완료 처리하지 못했습니다.')
    } finally { setSaving(false) }
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
        <LuQuote /> {request.topic}
      </div>
      {request.desiredCompany && <p className="admin-record-company"><b>희망기업</b> {request.desiredCompany}</p>}

      {career ? <>
        {existing?.summary && !existing.template && <details className="admin-editor-hint"><summary>기존 상담내용 확인</summary><p style={{ whiteSpace: 'pre-wrap' }}>{existing.summary}</p><p>기존 기록을 참고해 아래 항목으로 나누어 작성해 주세요.</p></details>}
        <CounselRecordFields value={template} onChange={setTemplate} comment={comment} onCommentChange={setComment}
          requestId={request.id}
          diagnosisType={context.diagnosisType} care7={care7} disabled={saving} typeLocked={context.typeLocked} required />
      </> : <>
        {existing?.summary && !existing.psychJournal && <p className="admin-editor-hint">양식 도입 전에 쓴 상담내용을 「상담내용」 칸으로 옮겨 두었습니다. 나머지 항목을 채워 주세요.</p>}
        <PsychJournalFields value={psychJournal} onChange={setPsychJournal} comment={comment} onCommentChange={setComment}
          people={{ counselor: counselor.name, client: student.name, studentNo: student.studentNo ?? '' }} disabled={saving} />
        {formErrors.length > 0 && <p className="admin-form-hint">{formErrors.join(' ')}</p>}
      </>}

      <div className="admin-form-actions">
        {saveError && <p role="alert">{saveError}</p>}
        {saved && <span className="admin-save-hint"><LuCheck /> {done ? '저장됨' : '임시 저장됨'}</span>}
        <CounselRecordPreview template={career ? template : undefined} psychJournal={career ? undefined : psychJournal} summary={recordSummary} comment={comment} followUp={existing?.followUp ?? ''} disabled={saving} />
        {done ? (
          <button type="button" className="admin-btn admin-btn-primary" disabled={!canComplete || saving} onClick={() => handleSave('완료')}>
            <LuClipboardCheck /> 기록 수정 저장
          </button>
        ) : <>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => handleSave('작성중')} disabled={saving}>
            임시 저장
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!canComplete || saving}
            onClick={handleComplete}
          >
            <LuClipboardCheck /> 저장 후 완료 처리
          </button>
        </>}
      </div>
      {!canComplete && (
        <p className="admin-form-hint">{done ? '저장하려면' : '완료 처리하려면'} 상담내용과 학생 공개 코멘트를 입력해 주세요.</p>
      )}
      {done && care7 && (
        <p className="admin-form-hint">상담이 완료되었습니다. 좌측 「로드맵 진행」 탭에서 이 상담을 근거로 로드맵을 생성·확정하세요.</p>
      )}
    </form>
  )
}

export default function CounselSession() {
  const { studentId } = useParams<{ studentId: string }>()
  return <CounselSessionContent key={studentId} studentId={studentId} />
}

function CounselSessionContent({ studentId }: { studentId?: string }) {
  const counselor = getActiveCounselor()
  const myType = handledRequestTypes(counselor.role)[0]

  const [student, setStudent] = useState<StudentData | undefined>(() => STUDENTS.find(s => s.id === studentId))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    if (!studentId) { setLoading(false); return }
    loadStudentProfile(studentId).then(value => { if (!cancelled) setStudent(value) })
      .catch(error => { if (!cancelled) { setStudent(undefined); setLoadError(error.message) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [studentId, retry])

  // 이 학생의 내 담당 상담 중 진행 대상 = 확정 → 대기 → 최근 완료(로드맵을 마저 만들러 돌아온 경우) → 나머지.
  // 대상은 페이지를 연 시점에 한 번 고정한다 — 완료 처리 뒤 다른 대기 건으로 넘어가 버리면
  // 로드맵 생성 근거(counselRequestId)와 기록지가 방금 끝낸 상담을 잃는다.
  useStore('dc:counsel-updated')
  const mine = getCounselRequests().filter(r => r.studentId === (student?.id ?? studentId))
  const [targetId] = useState(() => (
    mine.find(r => r.status === '확정') ??
    mine.find(r => r.status === '대기') ??
    [...mine].filter(r => r.status === '완료').sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0] ??
    mine[0]
  )?.id)
  const targetRequest = mine.find(r => r.id === targetId)
  // 완료 처리 직후 로드맵 진행 탭을 연다 — 새로고침 없이 같은 화면에서 이어진다.
  const [detailTab, setDetailTab] = useState<TabKey | undefined>()
  const navigate = useNavigate()
  // 상담 기록지를 왼쪽으로 펼친다 — 학생 상세는 줄어들지 않고 기록지 아래에 깔린다(2026-10-27).
  const [recordExpanded, setRecordExpanded] = useState(false)
  const openRoadmapTab = () => {
    setRecordExpanded(false)
    setDetailTab('roadmap')
    document.querySelector('.admin-session-left')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <p role="status">학생 정보를 불러오는 중입니다…</p>
  if (loadError) return <section className="admin-card"><p role="alert">{loadError}</p>
    <button type="button" className="admin-btn" onClick={() => setRetry(n => n + 1)}>다시 시도</button>
    <Link to="/counsel/requests" className="admin-btn">접수함</Link></section>
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
            icon={LuUserX}
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
            {studentDisplayName(student.name, student.id)} · {targetRequest?.type ?? myType} 상담 · 좌측 진단결과를 참고해 기록지를 작성합니다.
          </p>
        </div>
        <Link to="/counsel/requests" className="admin-btn admin-btn-ghost">
          <LuArrowLeft /> 접수함
        </Link>
      </header>

      <div className="admin-session-split">
        {/* 좌측: 학생 상세 — 학생관리 상세 페이지·조교 '보기' 모달과 같은 공용 뷰다.
            진단·상담·로드맵·비교과를 이 한 컴포넌트가 소유한다(화면별 복붙 금지). */}
        <aside className="admin-session-left">
          <StudentDetailView
            studentId={student.id}
            role={counselor.role}
            counselRequestId={targetRequest?.id}
            initialTab={detailTab}
            headerAction={
              <Link to={`/students/${student.id}`} className="admin-btn admin-btn-ghost">
                학생 상세 <LuChevronRight />
              </Link>
            }
          />
        </aside>

        {/* 우측: 상담 기록지 */}
        <section className={`admin-card admin-session-right${recordExpanded ? ' is-expanded' : ''}`}>
          <div className="admin-session-toggle-rail">
            <button type="button" className="admin-session-toggle" aria-expanded={recordExpanded}
              aria-label={recordExpanded ? '상담 기록지 접기' : '상담 기록지 펼치기'} title={recordExpanded ? '상담 기록지 접기' : '상담 기록지 펼치기'}
              onClick={() => setRecordExpanded(value => !value)}>
              {recordExpanded ? <LuChevronRight /> : <LuChevronLeft />}
            </button>
          </div>
          <div className="admin-card-head">
            <h2>
              <LuSquarePen /> 상담 기록지
            </h2>
          </div>
          {/* key 에 상태를 넣어 완료 직후 기록·유형 잠금을 서버에서 다시 읽고 폼을 새로 연다.
              완료 후 로드맵 탭은 진로취업만 연다 — 심리상담은 로드맵이 없으니 홈으로 돌아간다(2026-10-26). */}
          {targetRequest ? (
            <CounselRecordContext key={`${targetRequest.id}:${targetRequest.status}`} requestId={targetRequest.id}>
              {context => <RecordForm request={targetRequest} student={student} context={context} onCompleted={targetRequest.type === '진로취업' ? openRoadmapTab : () => navigate('/')} />}
            </CounselRecordContext>
          ) : (
            <EmptyState
              icon={LuFileText}
              title="연결된 상담 신청 없음"
              message="이 학생의 진행 가능한 상담 신청이 없습니다. 접수함에서 확정 후 진행해주세요."
            />
          )}
        </section>
      </div>
    </div>
  )
}
