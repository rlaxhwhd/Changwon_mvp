import { useAsyncAction } from '../../shared/useAsyncAction'
import { LuCalendarDays, LuCalendarX, LuChevronUp, LuFilter, LuListChecks } from 'react-icons/lu'
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuDownload, LuRotateCcw, LuSearch } from 'react-icons/lu'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminModal from '../components/AdminModal'
import StudentDetailModal from '../components/StudentDetailModal'
import { getEventsByRequest } from '../data/counselEvents'
import { getActiveCounselor, getCounselorById, getReassignableCounselors } from '../data/counselors'
import { buildDaySchedule, confirmRequest, formatRelativeTime, getCounselStudentProfile, getRequestsByAssignee, pickReferenceDate, reassignRequest, rejectRequest, rescheduleRequest, splitMajorGrade } from '../data/counselRequests'
import type { CounselRequest, CounselRequestStatus, CounselSlot } from '../data/counselRequests'
import { getOpenHours } from '../data/availability'
import type { WeekdayKey } from '../data/schema/availability'
import type { CounselRequestType } from '../data/schema/counselRequest'
import { enrollStatusClass, studentTypeClass } from '../data/studentRoster'
// 6유형 표시명·틴트는 단일소스에서 받는다 — 한글 리터럴·새 색을 만들지 않는다.
import { typeLabel } from '../../src_v2/data/careerProcess'
// 진로취업 상담의 트랙(일반 / CARE 7+ 연계)도 단일소스에서 받는다.
import { CARE_TRACK_LABEL, isCare7 } from '../../src_v2/data/counselTrack'
// 문진표는 학생이 신청할 때 본 서식 그대로 보여 준다 — 서식을 두 벌로 만들지 않는다.
import CounselReserveModal from '../../src_v2/components/CounselReserveModal'
import type { ReserveStudent } from '../../src_v2/components/CounselReserveModal'

type RequestTab = '전체' | CounselRequestStatus
type ModalTab = 'schedule' | 'reassign' | 'intake'
/** 목록 카드가 무엇을 그리는가 — 신청 목록 / 그날의 상담 일정. */
type RequestView = 'list' | 'schedule'
// 접수함이 다루는 상태만 탭으로 둔다 — 완료 건은 「상담일지」가 맡는다.
// counts 는 '완료' 키를 그대로 유지한다(요청 상태를 그대로 세는 자리라 키가 빠지면 집계가 깨진다).
const TABS: RequestTab[] = ['전체', '대기', '확정', '취소']
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const ROADMAP_STATUS: Record<string, string> = { done: '완료', active: '진행 중', upcoming: '예정' }

const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
function requestDate(req: CounselRequest) { if (req.slot?.date) return req.slot.date; const date = new Date(req.requestedAt); return Number.isNaN(date.getTime()) ? req.requestedAt.slice(0, 10) : dateKey(date) }
function requestTime(req: CounselRequest) { if (req.slot?.start) return req.slot.start; const date = new Date(req.requestedAt); return Number.isNaN(date.getTime()) ? req.requestedAt.slice(11, 16) : `${pad(date.getHours())}:${pad(date.getMinutes())}` }
function formatSelectedDate(value: string) { const [year, month, day] = value.split('-').map(Number); return `${year}.${pad(month)}.${pad(day)} (${WEEKDAYS[new Date(year, month - 1, day).getDay()]})` }
function weekdayOf(value: string): WeekdayKey { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day).getDay() as WeekdayKey }
function statusClass(status: CounselRequestStatus) { return status === '대기' ? 'is-waiting' : status === '확정' ? 'is-confirmed' : status === '완료' ? 'is-complete' : 'is-cancelled' }
function requestTypeLabel(req: CounselRequest) { return req.type === '심리' ? '심리상담' : '진로취업 상담' }
// 트랙은 진로취업 상담에만 있다 — 심리 상담에는 이 축이 없어 배지를 달지 않는다.
function careTrackKey(req: CounselRequest) { return isCare7(req.careTrack) ? 'care7' as const : 'general' as const }
function careTrackLabel(req: CounselRequest) { return CARE_TRACK_LABEL[careTrackKey(req)].staff }
function calendarDays(month: Date) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const current = new Date(start); current.setDate(start.getDate() + index); return { key: dateKey(current), day: current.getDate(), inMonth: current.getMonth() === month.getMonth() } }) }

function ScheduleAction({ request, onClose }: { request: CounselRequest; onClose: () => void }) {
  const action = useAsyncAction()
  const [date, setDate] = useState(request.slot?.date ?? requestDate(request)); const [start, setStart] = useState(request.slot?.start ?? requestTime(request)); const [end, setEnd] = useState(request.slot?.end ?? ''); const [place, setPlace] = useState(request.slot?.place ?? '')
  // 취소는 사유가 필수다(SPEC §3-1-②). 버튼 → 사유 입력 → 확정 2단계로 받는다.
  const [cancelling, setCancelling] = useState(false); const [cancelReason, setCancelReason] = useState('')
  const valid = Boolean(date && start && end && start < end)
  const save = () => action.run(async () => {
    if (!valid) return
    const slot: CounselSlot = { date, start, end, place: place.trim() || undefined }
    if (request.status === '확정') await rescheduleRequest(request.id, slot)
    else await confirmRequest(request.id, slot)
    window.location.reload()
  })
  const cancel = () => action.run(async () => {
    if (!cancelReason.trim()) return
    await rejectRequest(request.id, cancelReason.trim())
    window.location.reload()
  })
  return <div className="counsel-modal-action">{action.error && <p role="alert">{action.error}</p>}<div className="counsel-request-detail-grid"><label><span>날짜</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label><span>시작</span><input type="time" value={start} onChange={e => setStart(e.target.value)} /></label><label><span>종료</span><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label><label className="is-wide"><span>장소 / 링크</span><input value={place} onChange={e => setPlace(e.target.value)} /></label>{cancelling && <label className="is-wide"><span>취소 사유 <em className="counsel-required">필수</em></span><textarea rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="취소 사유를 입력하세요. 처리 이력에 기록됩니다." /></label>}</div><div className="counsel-request-detail-actions">{request.status === '대기' && (cancelling ? <><button type="button" className="counsel-outline-btn" onClick={() => { setCancelling(false); setCancelReason('') }}>취소 중단</button><button type="button" className="counsel-outline-btn is-danger" disabled={!cancelReason.trim() || action.saving} onClick={cancel}>취소 확정</button></> : <button type="button" className="counsel-outline-btn is-danger" onClick={() => setCancelling(true)}>신청 취소</button>)}<button type="button" className="counsel-outline-btn" onClick={onClose}>닫기</button><button type="button" className="counsel-primary-btn" disabled={!valid || action.saving} onClick={save}>{request.status === '확정' ? '일정 변경' : '상담 확정'}</button></div></div>
}

function ReassignAction({ request, onClose }: { request: CounselRequest; onClose: () => void }) {
  const action = useAsyncAction()
  const candidates = getReassignableCounselors(request.assignedCounselorId ?? ''); const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? ''); const [reason, setReason] = useState('')
  if (!candidates.length) return <div className="counsel-modal-action"><p className="counsel-request-detail-empty">재배정할 다른 상담사가 없습니다.</p></div>
  return <div className="counsel-modal-action">{action.error && <p role="alert">{action.error}</p>}<div className="counsel-request-detail-grid"><label className="is-wide"><span>재배정할 상담사</span><select value={selectedId} onChange={e => setSelectedId(e.target.value)}>{candidates.map(c => <option key={c.id} value={c.id}>{c.name} · {c.roleLabel}</option>)}</select></label><label className="is-wide"><span>재배정 사유 <em className="counsel-optional">선택</em></span><textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="이관 사유를 남기면 처리 이력에 함께 기록됩니다." /></label></div><div className="counsel-request-detail-actions"><button type="button" className="counsel-outline-btn" onClick={onClose}>닫기</button><button type="button" className="counsel-primary-btn" disabled={!selectedId || action.saving} onClick={() => action.run(async () => { await reassignRequest(request.id, selectedId, reason); window.location.reload() })}>재배정</button></div></div>
}

/**
 * 문진표 — 학생이 신청 단계에서 낸 답변을 그대로 보여 준다(읽기 전용).
 * 질문 문구는 저장된 답변에 함께 들어 있다. 여기서 템플릿을 다시 참조하지 않는다 —
 * 템플릿이 바뀌어도 그때 무엇을 물었는지가 남아야 하기 때문이다.
 */
function IntakePane({ request }: { request: CounselRequest }) {
  const intake = request.intake ?? []
  if (intake.length === 0) {
    return (
      <div className="counsel-modal-action">
        <p className="counsel-request-detail-empty">
          이 신청에는 문진표가 없습니다. 문진표는 진로취업 상담 신청에서만 받습니다.
        </p>
      </div>
    )
  }
  return (
    <div className="counsel-modal-action">
      <ol className="counsel-intake">
        {intake.map((row, index) => (
          <li key={row.question}>
            <p className="counsel-intake-q"><span>{index + 1}</span>{row.question}</p>
            <p className="counsel-intake-a">{row.answer || '답변 없음'}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * 문진표 확인 — 학생이 신청할 때 본 서식(CounselReserveModal)을 읽기 모드로 연다.
 * 신청서를 상담사용으로 다시 그리지 않는다 — 학생이 낸 화면과 상담사가 읽는 화면이
 * 갈리면 "학생이 뭘 보고 답했는지"를 상담사가 알 수 없게 된다.
 *
 * 학생 기본정보는 로스터(owner)에서 온다. 성별은 학사 데이터에 없어 '-' 로 둔다 —
 * 학생 화면과 같은 자리이고, 없는 값을 지어내지 않는다.
 */
function IntakeReserveModal({ request, onClose }: { request: CounselRequest; onClose: () => void }) {
  const profile = getCounselStudentProfile(request.studentId)
  const counselor = getCounselorById(request.assignedCounselorId ?? '')
  const slot = request.slot

  const student: ReserveStudent = {
    name: profile?.name ?? request.studentName,
    studentNo: profile?.studentNo ?? request.studentNo,
    major: profile ? profile.major : splitMajorGrade(request.studentMajor).major,
    grade: profile ? `${profile.grade}학년` : (splitMajorGrade(request.studentMajor).grade ?? '—'),
    gender: '-',
    contact: profile?.phone ?? '—',
    enrollmentStatus: profile?.enrollmentStatus ?? request.studentEnrollmentStatus,
  }

  return (
    <CounselReserveModal
      open
      onClose={onClose}
      roleLabel="상담사"
      counselorName={counselor ? `${counselor.name} ${counselor.roleLabel}` : '미배정'}
      date={slot ? formatSelectedDate(slot.date) : '미정'}
      time={slot ? `${slot.start}–${slot.end}` : ''}
      room={slot?.place ?? ''}
      phone=""
      student={student}
      submitted={{ purpose: request.topic, intake: request.intake ?? [] }}
    />
  )
}

/** 처리 이력 — 확정·일정변경·재배정·취소·완료가 일어난 순서대로. append-only 스토어를 그대로 읽는다. */
function EventTrail({ requestId }: { requestId: string }) {
  const events = getEventsByRequest(requestId)
  if (events.length === 0) return <p className="counsel-request-detail-empty">아직 처리 이력이 없습니다.</p>
  const slotText = (slot?: CounselSlot) => slot ? `${slot.date} ${slot.start}–${slot.end}` : '미정'
  return <ol className="counsel-event-trail">{events.map(event => <li key={event.id}><span className={`counsel-event-kind is-${event.kind}`}>{event.kind}</span><div><strong>{event.kind === '재배정' ? `${getCounselorById(event.fromCounselorId)?.name ?? '미배정'} → ${getCounselorById(event.toCounselorId)?.name ?? '미배정'}` : event.kind === '일정변경' ? `${slotText(event.fromSlot)} → ${slotText(event.toSlot)}` : event.kind === '확정' ? slotText(event.toSlot) : '—'}</strong>{event.reason && <p>{event.reason}</p>}<small>{event.byName} · {event.at.slice(0, 16).replace('T', ' ')}</small></div></li>)}</ol>
}

/**
 * 상담 주제 칸 — 두 줄까지 보여 주고, 넘치면 「더보기」로 전문을 아래에 편다.
 * 칸 자체는 항상 2줄로 잠가 둔다(펼쳤다고 풀면 넘침 판정이 뒤집혀 버튼이 사라진다).
 * 넘침은 글자 수로 어림잡지 않고 실제 렌더 높이로 판정한다 — 칸 폭이 화면마다 다르기 때문.
 */
function TopicCell({ topic, expanded, onToggle }: { topic: string; expanded: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [topic])

  return (
    <div className="counsel-request-cell counsel-request-topic-cell">
      <p ref={ref} className="counsel-request-topic-text">{topic}</p>
      {overflowing && (
        <button type="button" className="counsel-topic-toggle" aria-expanded={expanded} onClick={onToggle}>
          {expanded ? '접기' : '더보기'}
          {expanded ? <LuChevronUp aria-hidden="true" /> : <LuChevronDown aria-hidden="true" />}
        </button>
      )}
    </div>
  )
}

function RequestModal({ request, initialTab, onClose }: { request: CounselRequest; initialTab: ModalTab; onClose: () => void }) {
  const [actionTab, setActionTab] = useState<ModalTab>(initialTab); const profile = getCounselStudentProfile(request.studentId); if (!profile) return null
  const canAct = request.status === '대기' || request.status === '확정'; const canReassign = request.status === '확정'; const slot = request.slot; const assignee = getCounselorById(request.assignedCounselorId)
  return <AdminModal title="상담 처리" onClose={onClose} size="lg"><div className="counsel-profile-heading"><div><strong>{profile.name}</strong><span>{profile.studentNo}</span></div><span className={enrollStatusClass(profile.enrollmentStatus)}>{profile.enrollmentStatus}</span></div><section className="counsel-modal-section"><h3>학생 기본 정보</h3><dl className="counsel-profile-grid"><div><dt>학과 · 학년</dt><dd>{profile.major}</dd></div><div><dt>휴대폰</dt><dd>{profile.phone}</dd></div><div><dt>성적</dt><dd>{profile.gpa}</dd></div><div><dt>어학</dt><dd>{profile.language}</dd></div><div className="is-wide"><dt>목표 기업</dt><dd>{profile.targetCompanySummary}</dd></div></dl></section><section className="counsel-modal-section"><h3>진단 유형</h3><dl className="counsel-profile-grid"><div><dt>진단 유형</dt><dd>{typeLabel(profile.studentType)}</dd></div><div><dt>후속진단</dt><dd>{(profile.typeMeta?.followUpTest ?? "-")}</dd></div></dl></section><section className="counsel-modal-section"><h3>이번 상담 요청</h3><dl className="counsel-profile-grid"><div><dt>상담 유형</dt><dd><span className={`counsel-type-badge ${request.type === '심리' ? 'is-psych' : ''}`}>{requestTypeLabel(request)}</span>{request.type === '진로취업' && <span className={`counsel-care-track is-${careTrackKey(request)}`}>{careTrackLabel(request)}</span>}</dd></div><div><dt>상태</dt><dd><span className={`counsel-status-badge ${statusClass(request.status)}`}>{request.status}</span></dd></div><div className="is-wide"><dt>주제</dt><dd>{request.topic}</dd></div><div><dt>신청 일시</dt><dd>{formatRelativeTime(request.requestedAt)} 신청</dd></div><div><dt>일정</dt><dd>{slot ? `${slot.date} ${slot.start}–${slot.end}${slot.place ? ` · ${slot.place}` : ''}` : '미확정'}</dd></div><div className="is-wide"><dt>담당 상담사</dt><dd>{assignee?.name ?? '미배정'}</dd></div></dl></section><section className="counsel-modal-section"><h3>처리 이력</h3><EventTrail requestId={request.id} /></section>{/* 로드맵은 CARE 7+ 진로 경로의 것이다 — 심리상담 건에서는 보이지 않는다. */}{request.type !== '심리' && <section className="counsel-modal-section"><h3>로드맵</h3>{profile.detailed ? <ol className="counsel-roadmap-phases">{profile.detailed.phases.map(phase => <li key={phase.num}><strong>{phase.num}단계 {phase.title}</strong><span>{ROADMAP_STATUS[phase.status] ?? phase.status} · {phase.period}</span></li>)}</ol> : <p className="counsel-roadmap-summary">{profile.roadmapSummary}</p>}</section>}{canAct && <section className="counsel-modal-actions">{/* 탭 줄은 '확정'일 때만 뜨던 것을 항상 띄운다 — 문진표는 '대기' 단계에서 읽어야 확정 판단에 쓸 수 있다. */}<div className="counsel-modal-action-tabs" role="tablist"><button type="button" role="tab" aria-selected={actionTab === 'schedule'} className={actionTab === 'schedule' ? 'active' : ''} onClick={() => setActionTab('schedule')}>일정 변경</button>{canReassign && <button type="button" role="tab" aria-selected={actionTab === 'reassign'} className={actionTab === 'reassign' ? 'active' : ''} onClick={() => setActionTab('reassign')}>재배정</button>}<button type="button" role="tab" aria-selected={actionTab === 'intake'} className={actionTab === 'intake' ? 'active' : ''} onClick={() => setActionTab('intake')}>문진표{request.intake?.length ? <em className="counsel-tab-count">{request.intake.length}</em> : null}</button></div>{actionTab === 'intake' ? <IntakePane request={request} /> : actionTab === 'reassign' && canReassign ? <ReassignAction request={request} onClose={onClose} /> : <ScheduleAction request={request} onClose={onClose} />}</section>}{request.status === '완료' && <Link to="/counsel/records" className="counsel-record-link">기록 보기</Link>}</AdminModal>
}

export default function CounselRequests() {
  const counselor = getActiveCounselor(); const all = useMemo(() => getRequestsByAssignee(counselor.id), [counselor.id]); // 기본 표시일 — 오늘 → 가장 가까운 예정일 → 가장 최근 지난 날 (규칙은 데이터층 단일 소스).
const initialKey = useMemo(() => pickReferenceDate(all.map(requestDate), dateKey(new Date())), [all])
  const [tab, setTab] = useState<RequestTab>('전체'); const [query, setQuery] = useState(''); const [typeFilter, setTypeFilter] = useState<'전체' | CounselRequestType>('전체'); const [selectedDate, setSelectedDate] = useState(initialKey); const [month, setMonth] = useState(() => { const [year, value] = initialKey.split('-').map(Number); return new Date(year, value - 1, 1) }); const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => new Set()); const [modalRequest, setModalRequest] = useState<CounselRequest | null>(null); const [modalTab, setModalTab] = useState<ModalTab>('schedule')
  // 학생 상세 모달 — 홈 '학생정보' 버튼과 같은 공용 컴포넌트(StudentDetailModal)를 쓴다.
  // 상담 처리(일정·재배정)와는 다른 관심사라 모달을 나눈다.
  const [infoId, setInfoId] = useState<string | null>(null)
  // 문진표 모달 — 학생이 신청할 때 본 서식 그대로(공용 CounselReserveModal 읽기 모드).
  const [intakeReq, setIntakeReq] = useState<CounselRequest | null>(null)
  // 같은 카드 안에서 신청 목록 ↔ 그날의 상담 일정을 갈아 끼운다. 캘린더·상태 탭·검색은
  // 두 뷰가 공유한다 — 「일정·예약」 화면으로 나가지 않고 확정·진행까지 여기서 끝낸다.
  const [view, setView] = useState<RequestView>('list')
  const counts = useMemo(() => { const result: Record<RequestTab, number> = { 전체: all.length, 대기: 0, 확정: 0, 완료: 0, 취소: 0 }; all.forEach(req => result[req.status] += 1); return result }, [all]); const dateCounts = useMemo(() => { const result = new Map<string, number>(); all.forEach(req => result.set(requestDate(req), (result.get(requestDate(req)) ?? 0) + 1)); return result }, [all]); const days = useMemo(() => calendarDays(month), [month]); // 상태 탭·유형·검색어는 두 뷰가 똑같이 쓴다. 다른 것은 날짜 기준뿐 —
  // 목록은 신청 대표일(requestDate), 일정은 실제로 잡힌 슬롯 날짜다.
  const matchesFilters = (req: CounselRequest) => (tab === '전체' || req.status === tab) && (typeFilter === '전체' || req.type === typeFilter) && (!query.trim() || req.studentName.toLowerCase().includes(query.trim().toLowerCase()) || req.studentNo.toLowerCase().includes(query.trim().toLowerCase()))
  const list = useMemo(() => all.filter(req => requestDate(req) === selectedDate).filter(matchesFilters).sort((a,b) => requestTime(a).localeCompare(requestTime(b))), [all, selectedDate, tab, typeFilter, query])
  // 그날의 일정 — 슬롯 없는 신청은 시간축에 올릴 근거가 없어 빠진다. 축은 가능 시간대가 깐다.
  const daySchedule = useMemo(() => buildDaySchedule(all.filter(req => req.slot?.date === selectedDate).filter(matchesFilters), getOpenHours(counselor.id, weekdayOf(selectedDate))), [all, selectedDate, tab, typeFilter, query, counselor.id])
  const dayCount = useMemo(() => daySchedule.reduce((sum, row) => sum + row.items.length, 0), [daySchedule])
  const updateSelectedDate = (value: string) => { setSelectedDate(value); const [year, valueMonth] = value.split('-').map(Number); setMonth(new Date(year, valueMonth - 1, 1)) }; const openModal = (request: CounselRequest, nextTab: ModalTab = 'schedule') => { setModalRequest(request); setModalTab(nextTab) }; const toggleTopic = (id: string) => setExpandedTopics(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const downloadCsv = () => { const header = ['상담시간','학생명','학과','상담유형','트랙','상담주제','상태']; const rows = list.map(req => [requestTime(req), req.studentName, req.studentMajor, requestTypeLabel(req), req.type === '진로취업' ? careTrackLabel(req) : '-', req.topic, req.status]); const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `상담신청_${selectedDate}.csv`; anchor.click(); URL.revokeObjectURL(url) }
  return <div className="admin-page counsel-requests-page"><header className="admin-page-head"><div><h1 className="admin-page-title">신청 접수함</h1><p className="admin-page-desc">학생들이 신청한 상담 요청을 확인하고 관리할 수 있습니다.</p></div></header><form className="counsel-filter-bar" onSubmit={event => event.preventDefault()}><label className="counsel-filter-search"><LuSearch aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="이름, 학번 검색" aria-label="이름 또는 학번 검색" /></label><select className="counsel-filter-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value as '전체' | CounselRequestType)} aria-label="상담 유형"><option value="전체">전체 유형</option><option value="진로취업">진로취업 상담</option><option value="심리">심리상담</option></select><input type="date" className="counsel-filter-date" value={selectedDate} onChange={event => updateSelectedDate(event.target.value)} aria-label="상담 신청 날짜" /><button type="submit" className="counsel-primary-btn"><LuSearch /> 검색</button><button type="button" className="counsel-outline-btn" onClick={() => { setQuery(''); setTypeFilter('전체'); setTab('전체'); updateSelectedDate(initialKey) }}><LuRotateCcw /> 초기화</button></form><div className="counsel-status-tabs" role="tablist" aria-label="상담 신청 상태">{TABS.map(item => <button key={item} type="button" role="tab" aria-selected={tab === item} className={`tab-${item}${tab === item ? ' active' : ''}`} onClick={() => setTab(item)}><span>{item}</span><strong>{counts[item]}</strong></button>)}</div><div className="counsel-requests-layout"><section className="counsel-calendar-card" aria-label="상담 신청 달력"><h2>상담 신청 캘린더</h2><div className="counsel-calendar-toolbar"><div className="counsel-calendar-nav"><button type="button" aria-label="이전 달" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><LuChevronLeft /></button><button type="button" aria-label="다음 달" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><LuChevronRight /></button></div><strong>{month.getFullYear()}년 {month.getMonth() + 1}월</strong><button type="button" className="counsel-today-btn" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(dateKey(today)) }}>오늘</button></div><div className="counsel-calendar-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div><div className="counsel-calendar-grid">{days.map(day => { const count = dateCounts.get(day.key) ?? 0; return <button key={day.key} type="button" className={`${day.inMonth ? '' : 'is-muted'}${day.key === selectedDate ? ' is-selected' : ''}`} onClick={() => updateSelectedDate(day.key)}><span>{day.day}</span>{count > 0 && <em>{count}</em>}</button> })}</div><p className="counsel-calendar-legend"><span /> 해당 날짜의 상담 신청 건수</p></section><section className="counsel-request-table-card"><header className="counsel-request-table-head"><h2>{formatSelectedDate(selectedDate)} <span>{view === 'schedule' ? '상담 일정' : '상담 신청 목록'}</span> <em>{view === 'schedule' ? dayCount : list.length}건</em></h2><div><button type="button" className={`counsel-outline-btn${view === 'schedule' ? ' is-active' : ''}`} aria-pressed={view === 'schedule'} onClick={() => setView(current => (current === 'schedule' ? 'list' : 'schedule'))}>{view === 'schedule' ? <><LuListChecks /> 신청 목록</> : <><LuCalendarDays /> 상담일정</>}</button><button type="button" className="counsel-outline-btn"><LuFilter /> 필터</button><button type="button" className="counsel-outline-btn" onClick={downloadCsv}><LuDownload /> 엑셀 다운로드</button></div></header>{view === 'schedule' ? <div className="counsel-day-schedule">{daySchedule.length === 0 ? <div className="counsel-request-empty"><LuCalendarX /><strong>이 날짜에 잡힌 상담 일정이 없습니다.</strong><span>예약이 잡히거나 가능 시간대를 설정하면 이곳에 시간순으로 나타납니다.</span></div> : daySchedule.map(row => (
              <div key={row.time} className={`counsel-day-row${row.items.length === 0 ? ' is-free' : ''}`}>
                <span className="counsel-day-time">{row.time}</span>
                {row.items.length === 0 ? <p className="counsel-day-free">예약 없음</p> : (
                  <div className="counsel-day-items">
                    {row.items.map(req => (
                      <article key={req.id} className="counsel-day-item">
                        <div className="counsel-day-main">
                          {/* 시간은 왼쪽 counsel-day-time 이 이미 말한다 — 여기선 학과만. */}
                          <strong>{req.studentName}</strong>
                          <small>{splitMajorGrade(req.studentMajor).major}</small>
                          <p>{req.topic}</p>
                        </div>
                        <div className="counsel-day-side">
                          <span className={`counsel-type-badge ${req.type === '심리' ? 'is-psych' : ''}`}>{requestTypeLabel(req)}</span>
                          <span className={`counsel-status-badge ${statusClass(req.status)}`}>{req.status}</span>
                          <button type="button" className="counsel-detail-btn" onClick={() => setInfoId(req.studentId)}>상세 보기</button>
                          {/* 학생이 낸 신청서를 상담 전에 읽는다 — 학생이 본 서식 그대로(공용 모달). */}
                          <button type="button" className="counsel-detail-btn" onClick={() => setIntakeReq(req)}>문진표 확인</button>
                          {/* 대기는 확정부터 — 목록의 「상담 처리」와 같은 모달을 연다(처리 경로를 둘로 만들지 않는다). */}
                          {req.status === '대기' && <button type="button" className="counsel-detail-btn" onClick={() => openModal(req)}>확정하기</button>}
                          {req.status === '확정' && <Link to={`/counsel/session/${req.studentId}`} className="counsel-detail-btn">상담 진행</Link>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ))}</div> : <><div className="counsel-request-table-scroll"><div className="counsel-request-table"><div className="counsel-request-columns" aria-hidden="true"><span>신청 시간</span><span>학생 정보/학번</span><span>학과/재학</span><span>유형/상태</span><span>상담 유형</span><span>상담 주제</span><span>상세 보기/상담 처리</span></div>{list.length === 0 ? <div className="counsel-request-empty"><LuCalendarX /><strong>선택한 날짜에 상담 신청이 없습니다.</strong><span>다른 날짜 또는 상태를 선택해 주세요.</span></div> : list.map(req => {
              const expanded = expandedTopics.has(req.id)
              const canAct = req.status === '대기' || req.status === '확정'
              const { major, grade } = splitMajorGrade(req.studentMajor)
              return (
                <div className="counsel-request-row-wrap" key={req.id}>
                  <article className="counsel-request-row">
                    <div className="counsel-request-cell counsel-request-time">
                      <strong>{requestTime(req)}</strong>
                      <small>{formatRelativeTime(req.requestedAt)} 신청</small>
                    </div>

                    <div className="counsel-request-cell counsel-request-person">
                      <strong>{req.studentName}</strong>
                      <small>{req.studentNo}</small>
                    </div>

                    <div className="counsel-request-cell counsel-request-major">
                      <span>{major}</span>
                      <small>
                        <span className={enrollStatusClass(req.studentEnrollmentStatus)}>{req.studentEnrollmentStatus}</span>
                        {grade && <em>{grade}</em>}
                      </small>
                    </div>

                    {/* 유형/상태 — 학생의 6유형 아래에 이 신청의 진행 상태를 쌓는다.
                        유형이 없는 학생(진단 전)은 studentTypeClass 가 중립 배지를 준다. */}
                    <div className="counsel-request-cell counsel-request-type-cell">
                      <span className={studentTypeClass(req.studentType)}><b>{req.studentType}</b>{typeLabel(req.studentType)}</span>
                      <span className={`counsel-status-badge ${statusClass(req.status)}`}>{req.status}</span>
                    </div>

                    {/* 상담 유형 — 배지 아래에 진로취업 상담의 트랙을 붙인다.
                        상담사가 로드맵을 만들 상담인지(CARE 7+ 연계) 여기서 가른다. */}
                    <div className="counsel-request-cell counsel-request-status-cell">
                      <span className={`counsel-type-badge ${req.type === '심리' ? 'is-psych' : ''}`}>{requestTypeLabel(req)}</span>
                      {req.type === '진로취업' && (
                        <span className={`counsel-care-track is-${careTrackKey(req)}`}>{careTrackLabel(req)}</span>
                      )}
                    </div>

                    <TopicCell topic={req.topic} expanded={expanded} onToggle={() => toggleTopic(req.id)} />

                    {/* 재배정은 「상담 처리」 모달의 탭에 있다 — 목록에 중복해 두지 않는다. */}
                    <div className="counsel-request-cell counsel-request-manage">
                      <button type="button" className="counsel-detail-btn" onClick={() => setInfoId(req.studentId)}>상세 보기</button>
                      {canAct && <button type="button" className="counsel-detail-btn" onClick={() => openModal(req)}>상담 처리</button>}
                    </div>
                  </article>
                  {expanded && <div className="counsel-topic-full">{req.topic}</div>}
                </div>
              )
            })}</div></div><footer className="counsel-request-table-footer"><span>총 {list.length}건</span><button type="button">10개씩 보기 <LuChevronDown /></button><nav aria-label="상담 신청 페이지"><button type="button" disabled><LuChevronLeft /></button><button type="button" className="active">1</button><button type="button" disabled><LuChevronRight /></button></nav></footer></>}</section></div>{modalRequest && <RequestModal request={modalRequest} initialTab={modalTab} onClose={() => setModalRequest(null)} />}{infoId && <StudentDetailModal studentId={infoId} role={counselor.role} onClose={() => setInfoId(null)} />}{intakeReq && <IntakeReserveModal request={intakeReq} onClose={() => setIntakeReq(null)} />}</div>
}
