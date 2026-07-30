import { useState } from 'react'
import {
  LuChevronLeft,
  LuChevronRight,
  LuFrown,
  LuLoaderCircle,
  LuSearch,
} from 'react-icons/lu'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import {
  assignAdvisor,
  getAdvisorRosterForExport,
  getAdvisorTabCounts,
  getAssignYearOptions,
  getProfessorAdvisorCounts,
  professorsOfMajor,
  queryAdvisorRoster,
} from '../data/advisorAssigns'
import type { AdvisorRosterRow, AdvisorTab } from '../data/advisorAssigns'
import type { Assistant } from '../data/assistants'
import { totalPages } from '../data/query'
import { getActiveUser } from '../data/staff'
import {
  collegeOf,
  enrollStatusClass,
  getRosterFilterOptions,
} from '../data/studentRoster'
import { useListData } from '../hooks/useListData'

const ALL = '전체'
const PAGE_SIZE = 10
const formatDate = (value?: string) => value ? value.replaceAll('-', '.') : '—'

export default function AssistantAdvisor() {
  const user = getActiveUser()
  const departments = user.role === 'assistant'
    ? (user as Assistant).departments
    : []
  const [tab, setTab] = useState<AdvisorTab>('all')
  const [query, setQuery] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [status, setStatus] = useState('재학')
  const [year, setYear] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdvisorRosterRow | null>(null)
  const [error, setError] = useState('')
  const options = getRosterFilterOptions(departments)
  const years = getAssignYearOptions(departments)
  const counts = getAdvisorTabCounts(departments)
  const params = {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments,
    tab,
    filters: {
      major: major === ALL ? undefined : major,
      grade: grade === ALL ? undefined : grade,
      status: status === ALL ? undefined : status,
      year: year === ALL ? undefined : year,
    },
  }
  const { data: result, isLoading, refetch } = useListData(
    queryAdvisorRoster,
    params,
  )
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }
  const reset = () => {
    setQuery('')
    setMajor(ALL)
    setGrade(ALL)
    setStatus('재학')
    setYear(ALL)
    setPage(1)
  }
  const download = () => {
    const rows = getAdvisorRosterForExport({
      ...params,
      page: undefined,
      pageSize: undefined,
    })
    const escape = (value: string | number | undefined) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [
      ['학번', '이름', '소속', '학년', '학적', '연락처', '지도교수', '배정일자'],
      ...rows.map(row => [
        row.studentNo,
        row.name,
        `${collegeOf(row.major)} ${row.major}`,
        row.grade,
        row.status,
        row.phone ?? '',
        row.advisor?.professorName ?? '',
        row.advisor ? formatDate(row.advisor.assignedAt) : '',
      ]),
    ]
      .map(row => row.map(escape).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    )
    link.download = `전담교수배정_${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const confirmAssign = (professorId: string, assignedAt: string) => {
    if (!selected) return
    try {
      assignAdvisor({
        studentId: selected.id,
        professorId,
        assignedAt,
        by: user.id,
      })
      setSelected(null)
      setError('')
      refetch()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '배정 처리 중 오류가 발생했습니다.',
      )
    }
  }
  const pages = totalPages(result)
  const start = (result.page - 1) * PAGE_SIZE

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">전담교수 배정 현황</h1>
          <p className="admin-page-desc">
            {user.dept} · 담당 학과 학생 {counts.all}명
          </p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={reset}>
            초기화
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={download}>
            엑셀 다운로드
          </button>
        </div>
      </header>

      <div className="admin-tabs" role="tablist">
        {([
          ['all', '전체', counts.all],
          ['unassigned', '미배정', counts.unassigned],
          ['assigned', '배정', counts.assigned],
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
          <span>학과</span>
          <select value={major} onChange={event => change(setMajor)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.majors.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학년</span>
          <select value={grade} onChange={event => change(setGrade)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.grades.map(item => <option key={item} value={item}>{item}학년</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학적</span>
          <select value={status} onChange={event => change(setStatus)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.statuses.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>배정년도</span>
          <select value={year} onChange={event => change(setYear)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {years.map(item => <option key={item}>{item}</option>)}
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
            message={tab === 'unassigned'
              ? '미배정 학생이 없습니다. 전원 배정 완료.'
              : '조건에 맞는 학생이 없습니다.'}
          />
        ) : (
          <>
            <div className="admin-roster admin-advisor-roster">
              <div className="admin-roster-head">
                <span>번호</span><span>학번</span><span>이름</span><span>소속</span>
                <span>학년</span><span>학적</span><span>연락처</span><span>지도교수</span>
                <span>배정일자</span>
              </div>
              {result.items.map((row, index) => (
                <div key={row.id} className="admin-roster-row">
                  <span className="admin-roster-cell">{start + index + 1}</span>
                  <span className="admin-roster-cell">{row.studentNo}</span>
                  <span className="admin-roster-cell"><strong>{row.name}</strong></span>
                  <span className="admin-roster-cell">{collegeOf(row.major)} {row.major}</span>
                  <span className="admin-roster-cell">{row.grade}</span>
                  <span className="admin-roster-cell">
                    <span className={enrollStatusClass(row.status)}>{row.status}</span>
                  </span>
                  <span className="admin-roster-cell">{row.phone ?? '—'}</span>
                  <span className="admin-roster-cell">
                    {row.advisor ? (
                      <span className="admin-advisor-name">{row.advisor.professorName}</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary sm"
                        onClick={() => {
                          setSelected(row)
                          setError('')
                        }}
                      >
                        교수 배정
                      </button>
                    )}
                  </span>
                  <span className="admin-roster-cell">{formatDate(row.advisor?.assignedAt)}</span>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <Pagination
                page={result.page}
                pages={pages}
                total={result.totalCount}
                onChange={setPage}
              />
            )}
          </>
        )}
      </section>
      {selected && (
        <AssignModal
          student={selected}
          error={error}
          onClose={() => setSelected(null)}
          onConfirm={confirmAssign}
        />
      )}
    </div>
  )
}

function AssignModal({
  student,
  error,
  onClose,
  onConfirm,
}: {
  student: AdvisorRosterRow
  error: string
  onClose: () => void
  onConfirm: (professorId: string, assignedAt: string) => void
}) {
  const professors = professorsOfMajor(student.major)
  const [professorId, setProfessorId] = useState(professors[0]?.id ?? '')
  const [assignedAt, setAssignedAt] = useState(new Date().toISOString().slice(0, 10))
  const activeCounts = getProfessorAdvisorCounts(student.major)

  return (
    <AdminModal title="교수 배정" size="md" onClose={onClose}>
      <dl className="admin-kv">
        <div><dt>학생</dt><dd>{student.name}</dd></div>
        <div><dt>학번</dt><dd>{student.studentNo}</dd></div>
        <div><dt>소속</dt><dd>{student.major}</dd></div>
        <div><dt>학년</dt><dd>{student.grade}학년</dd></div>
      </dl>
      {professors.length === 0 ? (
        <EmptyState icon={LuFrown} message="해당 학과의 교수 정보가 없습니다." />
      ) : (
        <>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-full">
              <span>교수</span>
              <select value={professorId} onChange={event => setProfessorId(event.target.value)}>
                {professors.map(professor => (
                  <option key={professor.id} value={professor.id}>
                    {professor.name} ({professor.major}) · 배정 {activeCounts.get(professor.id) ?? 0}명
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>배정일</span>
              <input
                type="date"
                value={assignedAt}
                onChange={event => setAssignedAt(event.target.value)}
              />
            </label>
          </div>
          {error && <p className="admin-field-hint">{error}</p>}
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => onConfirm(professorId, assignedAt)}
            >
              배정 확정
            </button>
          </div>
        </>
      )}
    </AdminModal>
  )
}

function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number
  pages: number
  total: number
  onChange: (page: number) => void
}) {
  return (
    <div className="admin-pagination">
      <button
        type="button"
        className="admin-page-btn"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <LuChevronLeft />
      </button>
      <span className="admin-page-info">{page} / {pages} 페이지 · 총 {total}명</span>
      <button
        type="button"
        className="admin-page-btn"
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
      >
        <LuChevronRight />
      </button>
    </div>
  )
}
