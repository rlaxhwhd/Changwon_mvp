import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getPenaltyList,
  waivePenalty,
  clearPenalty,
} from '../data/penalties'
import type { StudentPenalty, PenaltyEntry } from '../data/penalties'
import { penaltyLevel } from '../data/schema/penalty'
import EmptyState from '../components/EmptyState'

const KIND_LABEL: Record<PenaltyEntry['kind'], { label: string; icon: string }> = {
  noshow: { label: '노쇼 벌점', icon: 'fa-user-slash' },
  manual: { label: '수동 부여', icon: 'fa-hand' },
  waive: { label: '차감·해제', icon: 'fa-rotate-left' },
}

function toneChip(tone: 'ok' | 'warn' | 'danger'): string {
  switch (tone) {
    case 'danger':
      return 'admin-chip-cancel'
    case 'warn':
      return 'admin-chip-wait'
    case 'ok':
      return 'admin-chip-done'
  }
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function BlacklistCard({ record }: { record: StudentPenalty }) {
  const level = penaltyLevel(record.total)
  const [waivePts, setWaivePts] = useState('')
  const [waiveReason, setWaiveReason] = useState('')

  const canWaive = Number(waivePts) > 0 && waiveReason.trim() !== ''

  const handleWaive = () => {
    if (!canWaive) return
    waivePenalty(record.studentId, Number(waivePts), waiveReason.trim())
    window.location.reload()
  }

  const handleClear = () => {
    if (!window.confirm(`${record.studentName} 학생의 벌점 이력을 전부 해제할까요?`)) return
    clearPenalty(record.studentId)
    window.location.reload()
  }

  return (
    <li className="admin-request-card">
      <div className="admin-request-top">
        <span className="admin-request-student">
          <span className="admin-student-avatar sm"></span>
          <div>
            <strong>{record.studentName}</strong>
            <small>{record.studentMajor}</small>
          </div>
        </span>
        <span className="admin-blacklist-total">
          <em>{record.total}</em>점
        </span>
        <span className={`admin-chip ${toneChip(level.tone)}`}>{level.label}</span>
      </div>

      {/* 벌점 이력 */}
      <ul className="admin-penalty-history">
        {[...record.entries].reverse().map(e => (
          <li key={e.id} className={`admin-penalty-entry${e.points < 0 ? ' is-waive' : ''}`}>
            <span className="admin-penalty-entry-kind">
              <i className={`fa-solid ${KIND_LABEL[e.kind].icon}`} /> {KIND_LABEL[e.kind].label}
            </span>
            <span className="admin-penalty-entry-reason">{e.reason}</span>
            <span className={`admin-penalty-entry-points${e.points < 0 ? ' minus' : ''}`}>
              {e.points > 0 ? `+${e.points}` : e.points}
            </span>
            <span className="admin-penalty-entry-at">{fmtDateTime(e.at)}</span>
          </li>
        ))}
      </ul>

      {/* 차감·해제 */}
      <div className="admin-blacklist-actions">
        <label className="admin-field admin-blacklist-pts">
          <span>차감 점수</span>
          <input
            type="number"
            min={1}
            value={waivePts}
            onChange={e => setWaivePts(e.target.value)}
            placeholder="예: 10"
          />
        </label>
        <label className="admin-field admin-blacklist-reason">
          <span>차감·해제 사유</span>
          <input
            type="text"
            value={waiveReason}
            onChange={e => setWaiveReason(e.target.value)}
            placeholder="예: 소명 인정 — 병결 확인"
          />
        </label>
        <button className="admin-btn admin-btn-ghost sm" disabled={!canWaive} onClick={handleWaive}>
          <i className="fa-solid fa-rotate-left" /> 차감
        </button>
        <button className="admin-btn admin-btn-danger-ghost sm" onClick={handleClear}>
          <i className="fa-solid fa-trash" /> 전체 해제
        </button>
      </div>
    </li>
  )
}

export default function ProgramBlacklist() {
  const list = useMemo(() => getPenaltyList(), [])
  const totalPoints = list.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">블랙리스트 관리</h1>
          <p className="admin-page-desc">
            비교과 프로그램 신청 후 미참여(노쇼)한 학생의 누적 벌점을 관리합니다. 대상 {list.length}명 · 누적 {totalPoints}점
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-list" /> 프로그램 목록
          </Link>
        </div>
      </header>

      <div className="admin-editor-hint">
        <i className="fa-solid fa-circle-info" />
        벌점은 프로그램 상세의 <strong>출석 체크(노쇼)</strong>에서 자동 부여됩니다. 여기서는 부여된 벌점을 차감·해제하고 사유를 기록합니다. 누적 벌점·사유는 학생 화면에도 반영됩니다.
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-user-check"
            title="블랙리스트가 비어 있습니다"
            message="노쇼로 처리된 학생이 아직 없습니다. 프로그램 상세에서 출석을 '노쇼'로 체크하면 여기 자동으로 추가됩니다."
          />
        ) : (
          <ul className="admin-request-list">
            {list.map(record => (
              <BlacklistCard key={record.studentId} record={record} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
