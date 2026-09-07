import type { IconType } from 'react-icons'
import { LuBan, LuBellRing, LuCircleCheck, LuHourglass, LuInbox, LuPencilRuler, LuRoute, LuX } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getRoadmapRequests,
  countRoadmapRequests,
  rejectRoadmapRequests,
} from '../data/roadmapRequests'
import type { RoadmapChangeRequest, RoadmapRequestStatus } from '../data/roadmapRequests'
import { getLatestNudges, sendDiagnosisNudge } from '../data/diagnosisAttempts'
import { getActiveCounselor } from '../data/counselors'
import { getModule } from '../../src_v2/data/careerProcess'
import { axisLabel } from '../../src_v2/data/schema/roadmap'
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

export default function RoadmapRequests() {
  const [tab, setTab] = useState<RoadmapRequestStatus>('대기')
  // 권유를 보내면 스토어를 다시 읽어야 한다(로컬 오버레이라 리로드 없이 갱신).
  const [version, setVersion] = useState(0)
  const [checked, setChecked] = useState<Set<string>>(new Set())
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

  // 반려는 대기 건에만 걸린다 — 선택도 대기 건만 받는다.
  const selectable = list.filter(r => r.status === '대기').map(r => r.id)
  const selected = selectable.filter(id => checked.has(id))
  const allChecked = selectable.length > 0 && selected.length === selectable.length

  const toggle = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(selectable))

  const switchTab = (key: RoadmapRequestStatus) => {
    setTab(key)
    setChecked(new Set())
  }

  const rejectSelected = () => {
    if (selected.length === 0) return
    if (!window.confirm(`선택한 ${selected.length}건을 반려합니다. 계속할까요?`)) return
    rejectRoadmapRequests(selected)
    window.location.reload()
  }

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
            onClick={() => switchTab(t.key)}
          >
            {(() => { const Icon = t.icon; return <Icon /> })()} {t.label}
            <span className="admin-tab-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">{tab} {list.length}건</span>
        {selectable.length > 0 && (
          <div className="admin-toolbar-actions">
            <button
              type="button"
              className="admin-btn admin-btn-danger-ghost sm"
              disabled={selected.length === 0}
              onClick={rejectSelected}
            >
              <LuX /> 선택 반려 ({selected.length})
            </button>
          </div>
        )}
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState icon={LuInbox} message={`${tab} 상태의 변경 요청이 없습니다.`} />
        ) : (
          <div className="admin-roster admin-rmreq-roster">
            <div className="admin-roster-head">
              <span className="admin-check-cell">
                <input
                  type="checkbox"
                  checked={allChecked}
                  disabled={selectable.length === 0}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                />
              </span>
              <span>번호</span>
              <span>이름</span>
              <span>학번</span>
              <span>학과</span>
              <span>신청사항</span>
              <span>신청일</span>
              <span>상태</span>
              <span>처리</span>
            </div>
            {list.map((req, index) => (
              <RequestRow
                key={req.id}
                req={req}
                no={list.length - index}
                checked={checked.has(req.id)}
                onToggle={() => toggle(req.id)}
                nudgedAt={nudges.get(`${req.studentId}::${CCORE.testId}`)?.sentAt}
                onNudge={onNudge}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RequestRow({ req, no, checked, onToggle, nudgedAt, onNudge }: {
  req: RoadmapChangeRequest
  no: number
  checked: boolean
  onToggle: () => void
  /** 이 학생에게 C-CORE 진단을 이미 요청한 시각 (없으면 미요청) */
  nudgedAt?: string
  onNudge: (studentId: string) => void
}) {
  const waiting = req.status === '대기'

  return (
    <div className="admin-roster-row">
      <span className="admin-roster-cell admin-check-cell">
        <input
          type="checkbox"
          checked={checked}
          disabled={!waiting}
          onChange={onToggle}
          aria-label={`${req.studentName}(${req.studentNo}) 요청 선택`}
        />
      </span>
      <span className="admin-roster-cell">{no}</span>
      <span className="admin-roster-cell"><strong>{req.studentName}</strong></span>
      {/* 동명이인은 학번으로만 갈린다 — 이름 옆 보조 텍스트가 아니라 독립 열로 둔다. */}
      <span className="admin-roster-cell">{req.studentNo}</span>
      <span className="admin-roster-cell">{req.studentMajor}</span>
      <span className="admin-roster-cell admin-rmreq-detail" title={req.reason}>
        <b>
          {req.title}
          {req.axis && <span className="admin-tag admin-tag-soft">{axisLabel(req.axis)}</span>}
        </b>
        <small>{req.reason}</small>
      </span>
      <span className="admin-roster-cell">
        {fmt(req.requestedAt)}
        {req.handledAt && <small>처리 {fmt(req.handledAt)}</small>}
      </span>
      <span className="admin-roster-cell">
        <span className={`admin-chip ${statusChip(req.status)}`}>{req.status}</span>
      </span>
      <span className="admin-roster-cell admin-rmreq-actions">
        {waiting ? (
          <>
            <Link to={`/roadmap/${req.studentId}`} className="admin-btn admin-btn-primary sm">
              <LuPencilRuler /> 편집기 반영
            </Link>
            {/* 로드맵을 고치기 전에 유형부터 다시 봐야 할 때 — 학생에게 C-CORE 재응시를 요청한다.
                권유는 append-only 이벤트(dc_diag_nudges)로 쌓인다. */}
            <button
              type="button"
              className="admin-icon-btn"
              disabled={!!nudgedAt}
              title={nudgedAt ? `C-CORE 진단 요청됨 · ${fmt(nudgedAt)}` : 'C-CORE 진단 요청'}
              aria-label={nudgedAt ? `C-CORE 진단 요청됨 ${fmt(nudgedAt)}` : 'C-CORE 진단 요청'}
              onClick={() => onNudge(req.studentId)}
            >
              <LuBellRing />
            </button>
            <button
              type="button"
              className="admin-icon-btn danger"
              title="반려"
              aria-label={`${req.studentName} 요청 반려`}
              onClick={() => {
                if (!window.confirm(`${req.studentName}(${req.studentNo}) 님의 요청을 반려합니다. 계속할까요?`)) return
                rejectRoadmapRequests([req.id])
                window.location.reload()
              }}
            >
              <LuX />
            </button>
          </>
        ) : (
          <Link to={`/roadmap/${req.studentId}`} className="admin-btn admin-btn-ghost sm">
            <LuRoute /> 로드맵 보기
          </Link>
        )}
      </span>
    </div>
  )
}
