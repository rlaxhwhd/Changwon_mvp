import { LuChevronLeft, LuChevronRight, LuFrown, LuLoaderCircle, LuSearch } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { getActiveUser } from '../data/staff'
import type { Assistant } from '../data/assistants'
import {
  queryStudentRoster,
  getRosterFilterOptions,
  getRosterSummary,
  collegeOf,
  enrollStatusClass,
} from '../data/studentRoster'
import type { RosterStudent } from '../data/studentRoster'
import { totalPages } from '../data/query'
import { useListData } from '../hooks/useListData'
import EmptyState from '../components/EmptyState'
import AdminModal from '../components/AdminModal'

// ─────────────────────────────────────────────────────────────────────────
// 조교 담당 학과 학생 현황 (SPEC §3-2①) — 번호·이름·학번·학년·대학·학과·상태·학생정보(보기).
// 범위는 화면에서 filter하지 않고 조교 배정(departments)을 로더에 넘겨 데이터 층에서 좁힌다.
// 학생 상세는 읽기 전용 모달로만 열람(조교는 로드맵·IAP 수정 불가).
// ─────────────────────────────────────────────────────────────────────────
const ALL = '전체'
const PAGE_SIZE = 10

export default function AssistantStudents() {
  const user = getActiveUser()
  const depts = user.role === 'assistant' ? (user as Assistant).departments : []
  const deptKey = depts.join(',')

  const [query, setQuery] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RosterStudent | null>(null)

  // 필터 옵션·집계는 전체 담당 집합에서 파생(현재 페이지가 아니라)
  const options = useMemo(() => getRosterFilterOptions(depts), [deptKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => getRosterSummary(depts), [deptKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 서버(목업) 조회 — useListData가 useEffect+레이스 cleanup 담당. DB 전환 시 훅 내부만 교체.
  const { data: result, isLoading: loading } = useListData(queryStudentRoster, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments: depts,
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

  const items = result.items
  const totalCount = result.totalCount
  const pages = totalPages(result)
  const startIndex = (page - 1) * PAGE_SIZE

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">담당 학과 학생 현황</h1>
          <p className="admin-page-desc">{user.dept} · 담당 학과 · 총 {summary.total}명</p>
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
        {loading && items.length === 0 ? (
          <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다." />
        ) : (
          <>
            <div className="admin-roster admin-asst-roster">
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
                  <span className="admin-roster-cell">{collegeOf(s.major)}</span>
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
        <AdminModal title="학생 정보" size="md" onClose={() => setSelected(null)}>
          <dl className="admin-kv">
            <div><dt>이름</dt><dd>{selected.name}</dd></div>
            <div><dt>학번</dt><dd>{selected.studentNo}</dd></div>
            <div><dt>대학</dt><dd>{collegeOf(selected.major)}</dd></div>
            <div><dt>학과</dt><dd>{selected.major}</dd></div>
            <div><dt>학년</dt><dd>{selected.grade}학년</dd></div>
            <div><dt>학적</dt><dd>{selected.status}</dd></div>
            <div><dt>진단 유형</dt><dd>{selected.studentType}</dd></div>
            <div><dt>IAP</dt><dd>{selected.iap}</dd></div>
            <div><dt>로드맵 진행률</dt><dd>{selected.progress}%</dd></div>
          </dl>
          <p className="admin-field-hint">조교는 학생 정보를 열람만 할 수 있습니다.</p>
        </AdminModal>
      )}
    </div>
  )
}
