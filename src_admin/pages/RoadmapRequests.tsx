import type { IconType } from 'react-icons'
import { LuBan, LuBellRing, LuCircleCheck, LuHourglass, LuInbox, LuPencilRuler, LuRoute, LuX } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getRoadmapRequests,
  countRoadmapRequests,
  rejectRoadmapRequest,
} from '../data/roadmapRequests'
import type { RoadmapChangeRequest, RoadmapRequestStatus } from '../data/roadmapRequests'
import { getLatestNudges, sendDiagnosisNudge } from '../data/diagnosisAttempts'
import { getActiveCounselor } from '../data/counselors'
import { getModule } from '../../src_v2/data/careerProcess'
import EmptyState from '../components/EmptyState'

/** 재진단을 요청할 검사 — 검사 키는 careerProcess 단일 소스에서 가져온다(문자열을 박지 않는다). */
const CCORE = getModule('CCORE')!

const TABS: { key: RoadmapRequestStatus; label: string; icon: IconType }[] = [
  { key: '대기', label: '대기', icon: LuHourglass },
  { key: '반영완료', label: '반영완료', icon: LuCircleCheck },
  { key: '반려', label: '반려', icon: LuBan },
]

function statusChip(status: RoadmapRequestStatus): string {
  switch (status) {
    case '대기':
      return 'admin-chip-wait'
    case '반영완료':
      return 'admin-chip-done'
    case '반려':
      return 'admin-chip-cancel'
  }
}

function fmt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function RequestCard({ req, nudgedAt, onNudge }: {
  req: RoadmapChangeRequest
  /** 이 학생에게 C-CORE 진단을 이미 요청한 시각 (없으면 미요청) */
  nudgedAt?: string
  onNudge: (studentId: string) => void
}) {
  return (
    <li className="admin-request-card">
      <div className="admin-request-top">
        <span className={`admin-chip ${statusChip(req.status)}`}>{req.status}</span>
        {req.term && <span className="admin-tag admin-tag-soft">{req.term}</span>}
        <span className="admin-request-at">신청 {fmt(req.requestedAt)}</span>
      </div>

      <div className="admin-request-body">
        <div className="admin-request-student">
          <div>
            <strong>{req.studentName}</strong>
            <small>{req.studentMajor}</small>
          </div>
        </div>
        <p className="admin-roadmap-req-title">{req.title}</p>
        <p className="admin-request-topic">{req.reason}</p>
      </div>

      <div className="admin-request-actions">
        {req.status === '대기' ? (
          <>
            <Link to={`/roadmap/${req.studentId}`} className="admin-btn admin-btn-primary sm">
              <LuPencilRuler /> 편집기에서 반영
            </Link>
            {/* 로드맵을 고치기 전에 유형부터 다시 봐야 할 때 — 학생에게 C-CORE 재응시를 요청한다.
                권유는 append-only 이벤트(dc_diag_nudges)로 쌓인다. */}
            {nudgedAt ? (
              <span className="admin-field-hint"><LuBellRing /> C-CORE 요청 {fmt(nudgedAt)}</span>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn-ghost sm"
                onClick={() => onNudge(req.studentId)}
              >
                <LuBellRing /> C-CORE 진단 요청
              </button>
            )}
            <button
              className="admin-btn admin-btn-danger-ghost sm"
              onClick={() => {
                rejectRoadmapRequest(req.id)
                window.location.reload()
              }}
            >
              <LuX /> 반려
            </button>
          </>
        ) : (
          <Link to={`/roadmap/${req.studentId}`} className="admin-btn admin-btn-ghost sm">
            <LuRoute /> 로드맵 보기
          </Link>
        )}
      </div>
    </li>
  )
}

export default function RoadmapRequests() {
  const [tab, setTab] = useState<RoadmapRequestStatus>('대기')
  // 권유를 보내면 스토어를 다시 읽어야 한다(로컬 오버레이라 리로드 없이 갱신).
  const [version, setVersion] = useState(0)
  const counselor = getActiveCounselor()

  const all = useMemo(() => getRoadmapRequests(), [])
  const counts = useMemo(() => countRoadmapRequests(), [])
  const nudges = useMemo(() => getLatestNudges(), [version])

  const onNudge = (studentId: string) => {
    sendDiagnosisNudge({ studentId, testId: CCORE.testId, by: counselor.id })
    setVersion(v => v + 1)
  }

  const list = all
    .filter(r => r.status === tab)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">로드맵 변경 요청함</h1>
          <p className="admin-page-desc">
            학생이 신청한 로드맵 변경 요청을 접수해 편집기에서 반영합니다.
          </p>
        </div>
      </header>

      <div className="admin-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`admin-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {(() => { const Icon = t.icon; return <Icon /> })()} {t.label}
            <span className="admin-tab-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState icon={LuInbox} message={`${tab} 상태의 변경 요청이 없습니다.`} />
        ) : (
          <ul className="admin-request-list">
            {list.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                nudgedAt={nudges.get(`${req.studentId}::${CCORE.testId}`)?.sentAt}
                onNudge={onNudge}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
