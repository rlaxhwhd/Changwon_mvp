import {
  LuChevronLeft, LuChevronRight, LuFilter, LuFrown, LuLoaderCircle, LuSearch, LuStar, LuTriangleAlert,
} from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { STUDENTS } from '../../src_v2/data/students'
import {
  queryStudentRoster,
  getRosterFilterOptions,
  getRosterSummary,
  enrollStatusClass,
  isFocusFilter,
  studentTypeClass,
} from '../data/studentRoster'
import type { FocusFilter } from '../data/studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'
import { totalPages } from '../data/query'
import { useListData } from '../hooks/useListData'
import EmptyState from './EmptyState'

// ─────────────────────────────────────────────────────────────────────────
// 상담사 학생 목록 표 (담당·전체 공유) — 번호·학생·학과·학년·진단 유형·학적·IAP 이행률.
// 이 값의 이름은 데이터층(roadmap.ts·counselorDashboard.ts)이 쓰는 '이행률'을 따른다.
// 행을 누르면 /students/:id 상세 페이지로 간다.
//
// 담당 목록(/students)과 전체 목록(/students/all)은 같은 표·같은 데이터 항목이고
// 조회 범위만 다르다 → 표를 두 벌 만들지 않는다(CLAUDE.md 규칙 12).
//   - departments: 조회 스코프. 빈 배열 = 전 학과(studentRoster.getFullRoster 규약).
//     데이터 층에서 거른다 — 화면에서 filter 하지 않는다.
//   - scopeLabel: 머리글 설명 앞부분. 총원·집중관리 집계는 이 컴포넌트가 붙인다.
// ─────────────────────────────────────────────────────────────────────────
const ALL = '전체'
const PAGE_SIZE = 20

type RosterSummary = ReturnType<typeof getRosterSummary>

/**
 * 목록 필터 버튼 — 라벨·색만 갖는다. 누가 고위험군인지는 데이터층(studentRoster)이
 * 판정한다. 홈 「집중관리 현황」 카드가 같은 focus 코드로 링크를 건다.
 *
 * STAR 트랙은 판정이 아니라 **선발 트랙 소속**이라 집중관리 두 개와 성격이 다르다 —
 * 같은 줄에 두되 구분선으로 갈라 놓는다(집중관리로 읽히면 안 된다).
 */
const FOCUS_BUTTONS: { focus: FocusFilter; label: string; tone: string; count: (s: RosterSummary) => number }[] = [
  { focus: 'high', label: '고위험군', tone: 'is-high', count: s => s.highRiskCount },
  { focus: 'core', label: '핵심관리대상', tone: 'is-core', count: s => s.coreCareCount },
  { focus: 'star', label: 'STAR 트랙', tone: 'is-star', count: s => s.starCount },
]

interface StudentChargeTableProps {
  departments: string[]
  title: string
  scopeLabel: string
}

export default function StudentChargeTable({ departments, title, scopeLabel }: StudentChargeTableProps) {
  const navigate = useNavigate()
  const deptKey = departments.join(',')

  // 집중관리 필터는 주소에 남긴다 — 홈 카드가 ?focus= 로 열고, 뒤로가기가 그대로 동작한다.
  const [searchParams, setSearchParams] = useSearchParams()
  const focusParam = searchParams.get('focus')
  const focus = isFocusFilter(focusParam) ? focusParam : undefined

  // 검색어는 입력 즉시가 아니라 「검색하기」(또는 Enter)로 적용한다.
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [page, setPage] = useState(1)

  // 필터 옵션·헤더 집계는 전체 집합에서(현재 페이지가 아니라). DB 전환 시 별도 집계 엔드포인트.
  const options = useMemo(() => getRosterFilterOptions(departments), [deptKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => getRosterSummary(departments), [deptKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const detailedIds = useMemo(() => new Set(STUDENTS.map(s => s.id)), [])

  // 서버(목업) 조회 — useListData가 useEffect+레이스 cleanup을 담당. DB 전환 시 훅 내부만 교체.
  const { data: result, isLoading: loading } = useListData(queryStudentRoster, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments,
    filters: {
      major: major === ALL ? undefined : major,
      grade: grade === ALL ? undefined : grade,
      studentType: type === ALL ? undefined : type,
      status: status === ALL ? undefined : status,
      focus,
    },
  })

  // 필터 변경 시 항상 1페이지부터
  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setPage(1)
  }

  const submitSearch = () => {
    setQuery(draft.trim())
    setPage(1)
  }

  /** 같은 버튼을 다시 누르면 해제된다. 주소에서 focus 를 지워 '전체'로 돌아간다. */
  const toggleFocus = (next: FocusFilter) => {
    const params = new URLSearchParams(searchParams)
    if (focus === next) params.delete('focus')
    else params.set('focus', next)
    setSearchParams(params, { replace: true })
    setPage(1)
  }

  const items = result.items
  const totalCount = result.totalCount
  const pages = totalPages(result)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">{title}</h1>
          <p className="admin-page-desc">
            {scopeLabel} · 총 {summary.total}명
            {summary.focusCount > 0 && (
              <>
                {/* 계층(상·중·하) 집계다. 아래 버튼의 고위험군·핵심관리대상과는 다른 기준이라
                    이름을 겹치게 쓰지 않는다. */}
                {' '}· <span className="admin-focus-inline"><LuTriangleAlert /> 하위 계층 {summary.focusCount}명</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* 집중관리 분류 — 인원과 판정은 데이터층이 준다(홈 카드와 같은 수치) */}
      <div className="admin-focus-filter">
        <span className="admin-focus-filter-label">집중관리</span>
        <button
          type="button"
          className={`admin-focus-btn${focus ? '' : ' is-on'}`}
          onClick={() => { setSearchParams(new URLSearchParams(), { replace: true }); setPage(1) }}
        >
          전체 <em>{summary.total}</em>
        </button>
        {FOCUS_BUTTONS.map(b => (
          <span key={b.focus} className="admin-focus-slot">
            {/* STAR 트랙 앞에서 한 번 끊는다 — 앞 두 개만 집중관리 판정이다. */}
            {b.focus === 'star' && <i className="admin-focus-sep" aria-hidden="true" />}
            <button
              type="button"
              className={`admin-focus-btn ${b.tone}${focus === b.focus ? ' is-on' : ''}`}
              onClick={() => toggleFocus(b.focus)}
            >
              {b.focus === 'star' && <LuStar />}
              {b.label} <em>{b.count(summary)}</em>
            </button>
          </span>
        ))}
        <span className="admin-focus-filter-hint">1학년은 집중관리 판정 대상에서 제외됩니다.</span>
      </div>

      {/* 필터/검색 — 옵션은 전체 조회 집합에서 파생 */}
      <form
        className="admin-filterbar"
        onSubmit={e => { e.preventDefault(); submitSearch() }}
      >
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
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
          <span>학적</span>
          <select value={status} onChange={e => onFilter(setStatus)(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.statuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn-primary admin-filter-submit">
          <LuSearch /> 검색하기
        </button>
      </form>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">
          검색 결과 {totalCount}명
          {/* 걸린 필터를 결과 줄에도 적는다 — 인원이 갑자기 줄어든 이유가 보여야 한다.
              경고색(집중관리 배지)을 쓰지 않는다. 핵심관리대상은 경고가 아니다. */}
          {focus && <span className="admin-toolbar-filter">
            <LuFilter /> {FOCUS_BUTTONS.find(b => b.focus === focus)?.label}만 보는 중
          </span>}
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
            <div className="admin-roster admin-charge-roster">
              <div className="admin-roster-head">
                <span>번호</span>
                <span>학생</span>
                <span>학과</span>
                <span>학년</span>
                <span>진단 유형</span>
                <span>학적</span>
                <span>IAP 이행률</span>
              </div>
              {items.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="admin-roster-row"
                  onClick={() => navigate(`/students/${s.id}`)}
                >
                  {/* 페이지가 넘어가도 이어지는 통 번호 (1페이지 20명이면 2페이지는 21부터) */}
                  <span className="admin-roster-no">{(page - 1) * PAGE_SIZE + i + 1}</span>
                  <span className="admin-roster-student">
                    <strong>{s.name}</strong>
                    {detailedIds.has(s.id) && <span className="admin-tag admin-tag-soft">상세</span>}
                  </span>
                  <span className="admin-roster-cell">{s.major}</span>
                  <span className="admin-roster-cell">{s.grade}학년</span>
                  <span className="admin-roster-cell">
                    {/* 유형은 '코드 → 라벨' 순서로 읽는다 (T3 역량성장형) */}
                    <span className={studentTypeClass(s.studentType)}><b>{s.studentType}</b>{typeLabel(s.studentType)}</span>
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
