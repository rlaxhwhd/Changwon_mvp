import type { IconType } from 'react-icons'
import {
  LuChevronLeft, LuChevronRight, LuFrown, LuLoaderCircle, LuRocket, LuRoute, LuSearch, LuTriangleAlert,
} from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import { STUDENTS } from '../../src_v2/data/students'
import {
  queryStudentRoster,
  getRosterFilterOptions,
  getRosterSummary,
  rosterTierClass,
  enrollStatusClass,
  studentTypeClass,
} from '../data/studentRoster'
import type { RosterTier } from '../data/studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'
import { totalPages } from '../data/query'
import { useListData } from '../hooks/useListData'
import EmptyState from '../components/EmptyState'

const ALL = '전체'
const PAGE_SIZE = 20

const TIER_ICON: Record<RosterTier, IconType> = {
  중간: LuRoute,
  하위: LuTriangleAlert,
  상위: LuRocket,
}

export default function StudentList() {
  const counselor = getActiveCounselor()
  const navigate = useNavigate()
  const depts = counselor.departments
  const deptKey = depts.join(',')

  const [query, setQuery] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [tier, setTier] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [page, setPage] = useState(1)

  // 필터 옵션·헤더 집계는 전체 집합에서(현재 페이지가 아니라). DB 전환 시 별도 집계 엔드포인트.
  const options = useMemo(() => getRosterFilterOptions(depts), [deptKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => getRosterSummary(depts), [deptKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const detailedIds = useMemo(() => new Set(STUDENTS.map(s => s.id)), [])

  // 서버(목업) 조회 — useListData가 useEffect+레이스 cleanup을 담당. DB 전환 시 훅 내부만 교체.
  const { data: result, isLoading: loading } = useListData(queryStudentRoster, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments: depts,
    filters: {
      major: major === ALL ? undefined : major,
      grade: grade === ALL ? undefined : grade,
      studentType: type === ALL ? undefined : type,
      tier: tier === ALL ? undefined : tier,
      status: status === ALL ? undefined : status,
    },
  })

  // 필터 변경 시 항상 1페이지부터
  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(1)
  }

  const items = result.items
  const totalCount = result.totalCount
  const pages = totalPages(result)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">담당 학생 목록</h1>
          <p className="admin-page-desc">
            {counselor.dept} · {counselor.scope} · 총 {summary.total}명
            {summary.focusCount > 0 && (
              <>
                {' '}· <span className="admin-focus-inline"><LuTriangleAlert /> 집중관리 {summary.focusCount}명</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* 필터/검색 — 옵션은 전체 담당 집합에서 파생 */}
      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="이름·학과·유형 검색"
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
          <span>유형</span>
          <select value={type} onChange={e => onFilter(setType)(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.types.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>계층</span>
          <select value={tier} onChange={e => onFilter(setTier)(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.tiers.map(t => <option key={t} value={t}>{t}</option>)}
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
        {loading && items.length === 0 ? (
          <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다." />
        ) : (
          <>
            <div className="admin-roster">
              <div className="admin-roster-head">
                <span>학생</span>
                <span>학과 · 학년</span>
                <span>진단 유형</span>
                <span>계층</span>
                <span>학적</span>
                <span>진행률</span>
              </div>
              {items.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="admin-roster-row"
                  onClick={() => navigate(`/students/${s.id}`)}
                >
                  <span className="admin-roster-student">
                    <strong>{s.name}</strong>
                    {detailedIds.has(s.id) && <span className="admin-tag admin-tag-soft">상세</span>}
                  </span>
                  <span className="admin-roster-cell">
                    {s.major}
                    <small>{s.grade}학년</small>
                  </span>
                  <span className="admin-roster-cell">
                    <span className={studentTypeClass(s.studentType)}>{typeLabel(s.studentType)}</span>
                    <small>{s.studentType}</small>
                  </span>
                  <span className="admin-roster-cell">
                    <span className={`admin-track ${rosterTierClass(s.tier)}`}>
                      {(() => { const Icon = TIER_ICON[s.tier]; return <Icon /> })()} {s.tier}
                    </span>
                  </span>
                  <span className="admin-roster-cell">
                    <span className={enrollStatusClass(s.status)}>{s.status}</span>
                  </span>
                  <span className="admin-roster-progress">
                    <span className="admin-progress-track">
                      <span className="admin-progress-fill" style={{ width: `${s.progress}%` }} />
                    </span>
                    <em>{s.progress}%</em>
                  </span>
                </button>
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
    </div>
  )
}
