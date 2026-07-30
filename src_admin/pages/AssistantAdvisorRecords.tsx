import { useState } from 'react'
import {
  LuChevronLeft,
  LuChevronRight,
  LuFrown,
  LuLoaderCircle,
  LuSearch,
} from 'react-icons/lu'
import EmptyState from '../components/EmptyState'
import type { Assistant } from '../data/assistants'
import { getAdvisorTabCounts } from '../data/advisorAssigns'
import {
  getAdviseeTabCounts,
  getProfessorStats,
  queryAdviseeCounselStatus,
  sendNudge,
} from '../data/profCounselRecords'
import type { AdviseeTab } from '../data/profCounselRecords'
import { totalPages } from '../data/query'
import { PROF_COUNSEL_CATEGORIES } from '../data/schema/profCounselRecord'
import { getActiveUser } from '../data/staff'
import { getRosterFilterOptions } from '../data/studentRoster'
import { useListData } from '../hooks/useListData'

const ALL = '전체'
const PAGE_SIZE = 10
const formatDate = (value?: string) => value ? value.replaceAll('-', '.') : '—'
const categoryLabels = new Map(
  PROF_COUNSEL_CATEGORIES.map(item => [item.code, item.label]),
)

export default function AssistantAdvisorRecords() {
  const user = getActiveUser()
  const departments = user.role === 'assistant'
    ? (user as Assistant).departments
    : []
  const [tab, setTab] = useState<AdviseeTab>('all')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('재학')
  const [page, setPage] = useState(1)
  const options = getRosterFilterOptions(departments)
  const stats = getProfessorStats(departments)
  const tabs = getAdviseeTabCounts(departments)
  const unassigned = getAdvisorTabCounts(departments).unassigned
  const { data: result, isLoading, refetch } = useListData(
    queryAdviseeCounselStatus,
    {
      page,
      pageSize: PAGE_SIZE,
      q: query,
      departments,
      tab,
      filters: { status: status === ALL ? undefined : status },
    },
  )
  const pages = totalPages(result)
  const start = (result.page - 1) * PAGE_SIZE

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">전담교수 상담 실적</h1>
          <p className="admin-page-desc">
            {user.dept} · 배정 학생 {tabs.all}명 기준
          </p>
          <p className="admin-field-hint">
            미배정 {unassigned}명은 배정 현황에서 관리합니다.
          </p>
        </div>
      </header>

      <div className="admin-card-head"><h2>교수별 실적</h2></div>
      <section className="admin-card">
        {stats.length === 0 ? (
          <EmptyState
            icon={LuFrown}
            message="배정된 전담교수가 없습니다. 배정 현황에서 먼저 배정하세요."
          />
        ) : (
          <div className="admin-roster admin-profstat-roster">
            <div className="admin-roster-head">
              <span>교수</span><span>학과</span><span>배정 학생 수</span>
              <span>상담 건수</span><span>최근 상담일</span>
            </div>
            {stats.map(row => (
              <div className="admin-roster-row" key={row.professorId}>
                <span className="admin-roster-cell">
                  <strong className="admin-advisor-name">{row.professorName}</strong>
                  <small>{row.professorMajor}</small>
                </span>
                <span className="admin-roster-cell">{row.dept}</span>
                <span className="admin-roster-cell">{row.adviseeCount}명</span>
                <span className="admin-roster-cell">{row.recordCount}건</span>
                <span className="admin-roster-cell">
                  {formatDate(row.lastDate)}
                  {!row.lastDate && <small>기록 없음</small>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-card-head"><h2>학생별 현황</h2></div>
      <div className="admin-tabs" role="tablist">
        {([
          ['all', '전체', tabs.all],
          ['none', '미상담', tabs.none],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`admin-tab${tab === value ? ' active' : ''}`}
            onClick={() => {
              setTab(value)
              setPage(1)
            }}
          >
            {label}<span className="admin-tab-count">{count}</span>
          </button>
        ))}
      </div>
      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="이름·학번 검색"
          />
        </div>
        <label className="admin-select">
          <span>학적</span>
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value={ALL}>{ALL}</option>
            {options.statuses.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="admin-toolbar">
        <span className="admin-toolbar-count">
          검색 결과 {result.totalCount}명
          {isLoading && <LuLoaderCircle className="admin-spin" />}
        </span>
      </div>
      <section className="admin-card">
        {isLoading && result.items.length === 0 ? (
          <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
        ) : result.items.length === 0 ? (
          <EmptyState
            icon={LuFrown}
            message={tab === 'none'
              ? '미상담 학생이 없습니다.'
              : '조건에 맞는 학생이 없습니다.'}
          />
        ) : (
          <>
            <div className="admin-roster admin-advisee-roster">
              <div className="admin-roster-head">
                <span>번호</span><span>학번</span><span>이름</span><span>학년</span>
                <span>지도교수</span><span>상담 횟수</span><span>최근 상담일</span>
                <span>최근 상담구분</span><span>독려</span>
              </div>
              {result.items.map((row, index) => (
                <div className="admin-roster-row" key={row.studentId}>
                  <span className="admin-roster-cell">{start + index + 1}</span>
                  <span className="admin-roster-cell">{row.studentNo}</span>
                  <span className="admin-roster-cell"><strong>{row.name}</strong></span>
                  <span className="admin-roster-cell">{row.grade}</span>
                  <span className="admin-roster-cell">
                    <span className="admin-advisor-name">{row.professorName}</span>
                  </span>
                  <span className="admin-roster-cell">{row.recordCount}회</span>
                  <span className="admin-roster-cell">{formatDate(row.lastDate)}</span>
                  <span className="admin-roster-cell">
                    {row.lastCategoryCode
                      ? categoryLabels.get(row.lastCategoryCode)
                      : '—'}
                  </span>
                  <span className="admin-roster-cell">
                    {row.recordCount > 0 ? (
                      '—'
                    ) : row.nudgedAt ? (
                      `발송 ${row.nudgedAt.slice(5, 10).replace('-', '.')}`
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost sm"
                        onClick={() => {
                          sendNudge({
                            studentId: row.studentId,
                            professorId: row.professorId,
                            by: user.id,
                          })
                          refetch()
                        }}
                      >
                        독려 발송
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={result.page === 1}
                  onClick={() => setPage(result.page - 1)}
                >
                  <LuChevronLeft />
                </button>
                <span className="admin-page-info">
                  {result.page} / {pages} 페이지 · 총 {result.totalCount}명
                </span>
                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={result.page === pages}
                  onClick={() => setPage(result.page + 1)}
                >
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
