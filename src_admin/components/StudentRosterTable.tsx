import { LuChevronLeft, LuChevronRight, LuFrown, LuLoaderCircle, LuSearch } from 'react-icons/lu'
import { useEffect, useState } from 'react'
import type { StaffRole } from '../data/schema/staff'
import {
  queryStudentRoster,
  fetchRosterMetadata,
  enrollStatusClass,
} from '../data/studentRoster'
import type { RosterStudent } from '../data/studentRoster'
import { totalPages } from '../data/query'
import { useListData } from '../hooks/useListData'
import EmptyState from './EmptyState'
import StudentDetailModal from './StudentDetailModal'

// ─────────────────────────────────────────────────────────────────────────
// 학생현황 목록 표 (조교·교수 공유) — 번호·이름·학번·학년·대학·학과·상태·학생정보(보기).
// '보기'는 공유 StudentDetailView를 xl 모달로 띄운다(상담사 상세 페이지와 동일 화면).
//   - departments: 조회 스코프(데이터 층에서 필터, 화면 filter 금지)
//   - viewerRole: 상세 열람 권한(professor·assistant = 읽기 전용 전탭)
// ─────────────────────────────────────────────────────────────────────────
const ALL = '전체'
const PAGE_SIZE = 10

interface StudentRosterTableProps {
  departments: string[]
  studentIds?: string[]
  title: string
  subtitle: string
  viewerRole: StaffRole
}

export default function StudentRosterTable({ departments, studentIds, title, subtitle, viewerRole }: StudentRosterTableProps) {

  const [query, setQuery] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RosterStudent | null>(null)

  // 필터 옵션·집계는 전체 담당 집합에서 파생(현재 페이지가 아니라)
  const [metadata,setMetadata] = useState<Awaited<ReturnType<typeof fetchRosterMetadata>> | null>(null)
  const [metadataError,setMetadataError] = useState('')
  const [metadataRetry,setMetadataRetry] = useState(0)
  const scopeKey = JSON.stringify([departments,studentIds])
  useEffect(() => {
    let cancelled=false
    setMetadataError('')
    fetchRosterMetadata(departments,studentIds).then(value => { if (!cancelled) setMetadata(value) })
      .catch(e => { if (!cancelled) setMetadataError(e.message) })
    return () => { cancelled=true }
  },[scopeKey,metadataRetry])
  const options = metadata?.options ?? {majors:[],grades:[],types:[],tiers:[],statuses:[]}
  const summary = metadata?.summary

  // 서버(목업) 조회 — useListData가 useEffect+레이스 cleanup 담당. DB 전환 시 훅 내부만 교체.
  const { data: result, isLoading: loading, error, refetch } = useListData(queryStudentRoster, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments,
    studentIds,
    filters: {
      major: major === ALL ? undefined : major,
      grade: grade === ALL ? undefined : grade,
      status: status === ALL ? undefined : status,
    },
  })

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(1)
  }

  useEffect(() => {
    const refresh = () => { refetch(); setMetadataRetry(x => x + 1) }
    window.addEventListener('focus',refresh)
    return () => window.removeEventListener('focus',refresh)
  },[refetch])

  const items = result.items
  const totalCount = result.totalCount
  const pages = totalPages(result)
  const startIndex = (page - 1) * PAGE_SIZE

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">{title}</h1>
          <p className="admin-page-desc">{subtitle} · 총 {summary?.total ?? '…'}명</p>
        </div>
      </header>

      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="이름·학과·학번 검색"
          />
        </div>
        <label className="admin-select">
          <span>학과</span>
          <select value={major} onChange={e => onFilter(setMajor)(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.majors.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학년</span>
          <select value={grade} onChange={e => onFilter(setGrade)(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.grades.map(g => <option key={g} value={String(g)}>{g}학년</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학적</span>
          <select value={status} onChange={e => onFilter(setStatus)(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.statuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </label>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">
          검색 결과 {totalCount}명
          {loading && <LuLoaderCircle className="admin-spin" />}
        </span>
      </div>

      <section className="admin-card">
        {error || metadataError ? <div role="alert">{error?.message ?? metadataError} <button onClick={() => { refetch(); setMetadataRetry(x => x + 1) }}>다시 조회</button></div> : loading && items.length === 0 ? (
          <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다." />
        ) : (
          <>
            <div className="admin-roster admin-student-roster">
              <div className="admin-roster-head">
                <span>번호</span>
                <span>이름</span>
                <span>학번</span>
                <span>학년</span>
                <span>대학</span>
                <span>학과</span>
                <span>상태</span>
                <span>학생정보</span>
              </div>
              {items.map((s, i) => (
                <div key={s.id} className="admin-roster-row">
                  <span className="admin-roster-cell">{startIndex + i + 1}</span>
                  <span className="admin-roster-cell"><strong>{s.name}</strong></span>
                  <span className="admin-roster-cell">{s.studentNo}</span>
                  <span className="admin-roster-cell">{s.grade}</span>
                  <span className="admin-roster-cell">{s.collegeName ?? '코드 미확인'}</span>
                  <span className="admin-roster-cell">{s.major}</span>
                  <span className="admin-roster-cell">
                    <span className={enrollStatusClass(s.status)}>{s.status}</span>
                  </span>
                  <span className="admin-roster-cell">
                    <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setSelected(s)}>
                      보기
                    </button>
                  </span>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="admin-pagination">
                <button type="button" className="admin-page-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <LuChevronLeft />
                </button>
                <span className="admin-page-info">{page} / {pages} 페이지 · 총 {totalCount}명</span>
                <button type="button" className="admin-page-btn" disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>
                  <LuChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selected && (
        <StudentDetailModal studentId={selected.id} role={viewerRole} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
