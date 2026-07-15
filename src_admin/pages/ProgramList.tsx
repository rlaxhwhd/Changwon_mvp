import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPrograms, countPrograms } from '../data/programs'
import type { ProgramStatus } from '../data/programs'
import { PROGRAM_CATEGORIES } from '../data/schema/program'
import type { ProgramCategory } from '../data/schema/program'
import EmptyState from '../components/EmptyState'

const ALL = '전체'

function statusChip(status: ProgramStatus): string {
  switch (status) {
    case '모집중':
      return 'admin-chip-done'
    case '모집마감':
      return 'admin-chip-wait'
    case '종료':
      return 'admin-chip-cancel'
  }
}

export default function ProgramList() {
  const navigate = useNavigate()
  const all = useMemo(() => getPrograms(), [])
  const counts = useMemo(() => countPrograms(), [])

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProgramCategory | typeof ALL>(ALL)
  const [status, setStatus] = useState<ProgramStatus | typeof ALL>(ALL)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter(p => {
        if (category !== ALL && p.category !== category) return false
        if (status !== ALL && p.status !== status) return false
        if (q && !`${p.title} ${p.desc} ${p.location}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [all, query, category, status])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">비교과 프로그램</h1>
          <p className="admin-page-desc">
            등록 {counts.total}건 · 모집중 {counts.모집중} — 학생 비교과 신청의 공급 측. 신청자·출석을 관리합니다.
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs/blacklist" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-user-slash" /> 블랙리스트
          </Link>
          <Link to="/programs/new" className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-plus" /> 프로그램 등록
          </Link>
        </div>
      </header>

      <div className="admin-filterbar">
        <div className="admin-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="프로그램명·장소 검색"
          />
        </div>
        <label className="admin-select">
          <span>분류</span>
          <select value={category} onChange={e => setCategory(e.target.value as ProgramCategory | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            {PROGRAM_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          <span>상태</span>
          <select value={status} onChange={e => setStatus(e.target.value as ProgramStatus | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            <option value="모집중">모집중</option>
            <option value="모집마감">모집마감</option>
            <option value="종료">종료</option>
          </select>
        </label>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">검색 결과 {list.length}건</span>
      </div>

      <section className="admin-card">
        {all.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-graduation-cap"
            title="등록된 비교과 프로그램이 없습니다"
            message="프로그램을 등록하면 학생 비교과 신청 화면의 공급 목록에 노출됩니다."
            action={{ label: '프로그램 등록하기', onClick: () => navigate('/programs/new') }}
          />
        ) : list.length === 0 ? (
          <EmptyState icon="fa-regular fa-face-frown" message="조건에 맞는 프로그램이 없습니다." />
        ) : (
          <div className="admin-roster admin-program-roster">
            <div className="admin-roster-head">
              <span>프로그램</span>
              <span>분류</span>
              <span>신청기간</span>
              <span>장소</span>
              <span>신청 / 정원</span>
              <span>상태</span>
            </div>
            {list.map(p => {
              const noshow = p.applicants.filter(a => a.attendance === '노쇼').length
              return (
                <button
                  key={p.id}
                  type="button"
                  className="admin-roster-row"
                  onClick={() => navigate(`/programs/${p.id}`)}
                >
                  <span className="admin-roster-cell">
                    <strong>{p.title}</strong>
                    <small>{p.desc}</small>
                  </span>
                  <span className="admin-roster-cell">
                    <span className="admin-tag admin-tag-soft">{p.category}</span>
                  </span>
                  <span className="admin-roster-cell">
                    {p.startDate}
                    <small>~ {p.endDate}</small>
                  </span>
                  <span className="admin-roster-cell">{p.location || '—'}</span>
                  <span className="admin-roster-cell">
                    <strong>{p.applicants.length} / {p.capacity}</strong>
                    {noshow > 0 && <small className="admin-focus-inline"><i className="fa-solid fa-user-slash" /> 노쇼 {noshow}</small>}
                  </span>
                  <span className="admin-roster-cell">
                    <span className={`admin-chip ${statusChip(p.status)}`}>{p.status}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
