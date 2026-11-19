import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminModal from './AdminModal'
import { loadJobWishers } from '../data/jobsSource'
import type { JobPosting, JobWisher } from '../data/jobsSource'

// ─────────────────────────────────────────────────────────────────────────
// 공고별 찜한 학생 목록 (교직원 전용) — GET /jobs/{id}/wishers.
// 학생 화면은 카드의 「찜 N명」만 본다. 누가 찜했는지는 이 모달에서만 보인다(2026-11-19 사용자 확정).
// 범위는 서버가 정한다 — 상담사는 전 학생, 그 밖의 교직원은 담당 범위 학생만 내려온다.
// ─────────────────────────────────────────────────────────────────────────

function wishedDate(value: string): string {
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? value.slice(0, 10) : at.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

export default function JobWishersModal({ job, onClose }: { job: JobPosting; onClose: () => void }) {
  const [rows, setRows] = useState<JobWisher[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    loadJobWishers(job.id)
      .then(items => { if (alive) setRows(items) })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : '목록을 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [job.id])

  return (
    <AdminModal title={`찜한 학생 — ${job.company} · ${job.role}`} onClose={onClose} size="lg">
      {error && <p className="admin-field-hint" role="alert">{error}</p>}
      {!error && rows === null && <p className="admin-loading" role="status">불러오는 중입니다…</p>}
      {rows && rows.length === 0 && <p className="admin-loading">아직 이 공고를 찜한 학생이 없습니다.</p>}
      {rows && rows.length > 0 && (
        <table className="dc-list-table">
          <thead>
            <tr><th>번호</th><th>이름</th><th>학번</th><th>대학</th><th>학과</th><th>학년</th><th>찜한 날</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.studentId}>
                <td>{index + 1}</td>
                <td className="cs-name-cell"><Link to={`/students/${encodeURIComponent(row.studentId)}`} onClick={onClose}>{row.name}</Link></td>
                <td>{row.studentNo ?? '—'}</td>
                <td>{row.college ?? '—'}</td>
                <td>{row.department ?? '—'}</td>
                <td>{row.grade ? `${row.grade}학년` : '—'}</td>
                <td>{wishedDate(row.wishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminModal>
  )
}
