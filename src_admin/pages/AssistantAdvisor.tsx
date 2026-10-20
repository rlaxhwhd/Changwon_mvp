import { studentDisplayName } from '../../shared/studentDisplayName'
import { useExportSelection } from '../../shared/useExportSelection'
import PageNumbers from '../../shared/components/PageNumbers'
import { useState } from 'react'
import { PROFESSOR_GROUPS } from '../../src_v2/data/professors'
import './AssistantAdvisor.css'
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
  getAdvisorTabCounts,
  getAssignYearOptions,
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
  const grades = [...new Set([1, ...options.grades])].sort((a, b) => a - b)
  const statuses = [...new Set(['재학', '휴학', '졸업', ...options.statuses])]
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
  const selection = useExportSelection(JSON.stringify([query, tab, params.filters, departments]), result.items, row => row.id, isLoading)
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
  const download = async () => {
    try {
    if (!selection.count) return
    const rows = selection.rows
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
    } catch (caught) { setError(caught instanceof Error ? caught.message : '명단을 내려받지 못했습니다.') }
  }
  const confirmAssign = async (professorId: string, assignedAt: string) => {
    if (!selected) return
    try {
      await assignAdvisor({
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
            {departments.join(' · ')} · 담당 학과 학생 {counts.all}명
          </p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={reset}>
            초기화
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={download} disabled={!selection.count || isLoading}>
            엑셀 다운로드 ({selection.count})
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
            {grades.map(item => <option key={item} value={item}>{item}학년</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학적</span>
          <select value={status} onChange={event => change(setStatus)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {statuses.map(item => <option key={item}>{item}</option>)}
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
                <span>{selection.header}</span><span>번호</span><span>학번</span><span>이름</span><span>소속</span>
                <span>학년</span><span>학적</span><span>연락처</span><span>지도교수</span>
                <span>배정일자</span>
              </div>
              {result.items.map((row, index) => (
                <div key={row.id} className="admin-roster-row">
                  <span>{selection.checkbox(row, row.name)}</span><span className="admin-roster-cell">{result.totalCount - start - index}</span>
                  <span className="admin-roster-cell">{row.studentNo}</span>
                  <span className="admin-roster-cell"><strong>{studentDisplayName(row.name, row.id)}</strong></span>
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
  onConfirm: (professorId: string, assignedAt: string) => Promise<void>
}) {
  const [college, setCollege] = useState(ALL)
  const [major, setMajor] = useState(ALL)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [saving, setSaving] = useState(false)
  const [assignedAt, setAssignedAt] = useState(new Date().toISOString().slice(0, 10))
  const entries = PROFESSOR_GROUPS.flatMap(group =>
    Object.entries(group.divisions).flatMap(([department, professors]) =>
      professors.map(professor => ({ ...professor, college: group.name, department }))))
  const majors = [...new Set(entries.filter(p => college === ALL || p.college === college).map(p => p.department))]
  const filtered = entries.filter(p =>
    (college === ALL || p.college === college) && (major === ALL || p.department === major) &&
    `${p.id} ${p.name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  // Joint appointments produce multiple directory entries; select a professor once by ID.
  const visibleIds = new Set(filtered.map(p => p.id))
  const professors = [...new Map(filtered.map(p => [p.id, p])).values()]
  const clearSelection = () => setProfessorId('')

  return (
    <AdminModal title="교수 배정" size="lg" className="advisor-assign-modal" onClose={onClose}>
      <dl className="admin-kv">
        <div><dt>학생</dt><dd>{studentDisplayName(student.name, student.id)}</dd></div>
        <div><dt>학번</dt><dd>{student.studentNo}</dd></div>
        <div><dt>소속</dt><dd>{student.major}</dd></div>
        <div><dt>학년</dt><dd>{student.grade}학년</dd></div>
      </dl>
      <form className="admin-filterbar advisor-professor-filters" onSubmit={event => {
        event.preventDefault(); setSearch(query); clearSelection()
      }}>
        <label className="admin-select">
          <span>대학</span>
          <select value={college} onChange={event => { setCollege(event.target.value); setMajor(ALL); clearSelection() }}>
            <option value={ALL}>{ALL}</option>
            {PROFESSOR_GROUPS.map(group => <option key={group.name}>{group.name}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학과</span>
          <select value={major} onChange={event => { setMajor(event.target.value); clearSelection() }}>
            <option value={ALL}>{ALL}</option>
            {majors.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="admin-search">
          <LuSearch aria-hidden="true" />
          <input aria-label="교수 사번 또는 이름" placeholder="사번·이름 검색" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <button type="submit" className="admin-btn admin-btn-primary">검색</button>
      </form>
      <p className="admin-field-hint" aria-live="polite">검색 결과 {professors.length}명</p>
      <div className="advisor-professor-list">
        <table>
          <thead><tr><th scope="col">선택</th><th scope="col">이름</th><th scope="col">사번</th><th scope="col">대학</th><th scope="col">학과</th></tr></thead>
          <tbody>
            {professors.map(professor => (
              <tr key={professor.id} className={professorId === professor.id ? 'selected' : ''}>
                <td><input type="radio" name="advisor-professor" aria-label={`${professor.name} (${professor.id}) 선택`}
                  checked={professorId === professor.id} onChange={() => setProfessorId(professor.id)} disabled={saving} /></td>
                <td>{professor.name}</td><td>{professor.id}</td><td>{professor.college}</td><td>{professor.department}</td>
              </tr>
            ))}
            {professors.length === 0 && <tr><td colSpan={5}>조건에 맞는 교수가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <label className="admin-field advisor-assigned-date">
        <span>배정일</span>
        <input type="date" value={assignedAt} onChange={event => setAssignedAt(event.target.value)} disabled={saving} />
      </label>
      {error && <p className="admin-field-hint" role="alert">{error}</p>}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={saving}>닫기</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !visibleIds.has(professorId) || !assignedAt}
          onClick={async () => { setSaving(true); try { await onConfirm(professorId, assignedAt) } finally { setSaving(false) } }}>
          {saving ? '배정 중…' : '배정 확정'}
        </button>
      </div>
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
      <PageNumbers page={page} pages={pages} onChange={onChange} />
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
