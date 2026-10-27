import { studentDisplayName } from '../../shared/studentDisplayName'
import PageNumbers from '../../shared/components/PageNumbers'
import { useEffect, useState } from 'react'
import { LuFrown, LuLoaderCircle, LuSearch } from 'react-icons/lu'
import AdminModal from './AdminModal'
import EmptyState from './EmptyState'
import { totalPages, type Paginated } from '../data/query'
import { STUDENT_TYPE_MAP, typeLabel, type StudentType } from '../../src_v2/data/careerProcess'
import { enrollStatusClass, fetchRosterMetadata, queryStudentRoster } from '../data/studentRoster'
import type { RosterMetadata } from '../data/studentRoster'
import type { RosterStudent } from '../data/studentRoster'
import { useListData } from '../hooks/useListData'

const ALL = '전체'
const PAGE_SIZE = 8
const TYPE_CODES = Object.keys(STUDENT_TYPE_MAP) as StudentType[]
const NO_RESULT: Paginated<RosterStudent> = { items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE }
/** active 가 아니면 서버를 부르지 않는다(검색 전용 모드의 빈 첫 화면). */
function pickerRoster({ active, ...params }: Parameters<typeof queryStudentRoster>[0] & { active: boolean }) {
  return active ? queryStudentRoster(params) : Promise.resolve(NO_RESULT)
}

interface StudentPickerProps {
  title?: string
  /** 담당 학과 범위. 빈 배열이면 전체. */
  departments?: string[]
  professorId?: string
  /** 이미 선택된 학생 id — 목록에서 '추가됨'으로 표시하고 재선택을 막는다. */
  excludeIds?: string[]
  /** false 면 학적 상태와 무관하게 전체 학생을 조회한다. */
  enrolledOnly?: boolean
  pickLabel?: string
  /** 행을 누르면 바로 고른다(한 명만 고르는 화면). */
  pickOnRowClick?: boolean
  /** 검색 전용 — 검색어·필터를 넣기 전엔 목록을 불러오지 않고, 학과·학년에 학적상태·Core 유형 필터를 더한다(상담 등록 학생 추가). */
  searchOnly?: boolean
  onPick: (student: RosterStudent) => void
  onClose: () => void
}

/**
 * 학생 선택 피커 (현행 `CoStuInfoPop` 학생검색 팝업 대응).
 * 단독 화면인 학생 목록(`/students`)과 달리 **다른 화면에서 학생을 고를 때** 쓰는 모달이다.
 * 조회는 학생 로스터 단일소스(queryStudentRoster)를 그대로 쓴다.
 */
export default function StudentPicker({ title = '학생 검색', departments = [], professorId, excludeIds = [], enrolledOnly = true, pickLabel = '추가', pickOnRowClick = false, searchOnly = false, onPick, onClose }: StudentPickerProps) {
  const [query, setQuery] = useState('')
  // 검색 전용 모드에서 입력 중인 검색어 — 제출해야 query 로 적용된다.
  const [draft, setDraft] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  // searchOnly 전용 필터 — 학적상태(재학/졸업)와 Core 유형(T1~T6)
  const [status, setStatus] = useState<'재학' | '졸업'>('재학')
  const [studentType, setStudentType] = useState(ALL)
  const [page, setPage] = useState(1)
  const [options, setOptions] = useState<RosterMetadata['options']>({ majors: [], grades: [], types: [], tiers: [], statuses: [] })
  const [metadataError, setMetadataError] = useState('')
  const scopeKey = JSON.stringify([departments, professorId])
  useEffect(() => {
    let cancelled = false
    fetchRosterMetadata(departments, undefined, professorId).then(data => { if (!cancelled) setOptions(data.options) })
      .catch(e => { if (!cancelled) setMetadataError(e.message) })
    return () => { cancelled = true }
  }, [scopeKey])
  const picked = new Set(excludeIds)
  // 검색 전용 모드는 검색어나 필터(학과·학년·유형)를 넣기 전에는 조회하지 않는다.
  const active = !searchOnly || query.trim() !== '' || studentType !== ALL || major !== ALL || grade !== ALL

  const { data: result, isLoading, error } = useListData(pickerRoster, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments,
    professorId,
    active,
    filters: {
      major: major === ALL ? undefined : major,
      grade: grade === ALL ? undefined : grade,
      status: searchOnly ? status : enrolledOnly ? '재학' : undefined,
      studentType: searchOnly && studentType !== ALL ? studentType : undefined,
    },
  })
  const pages = totalPages(result)

  return (
    <AdminModal title={title} size="lg" onClose={onClose}>
      {(metadataError || error) && <p role="alert">{metadataError || error?.message}</p>}
      {!searchOnly && <p className="admin-field-hint">{enrolledOnly ? '재학생만 조회됩니다.' : '전체 학생에서 조회합니다.'}</p>}
      <div className={searchOnly ? 'admin-picker-filters' : 'admin-filterbar'}>
        {!searchOnly && <div className="admin-search">
          <LuSearch />
          <input
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1) }}
            placeholder="이름·학번·학과 검색"
          />
        </div>}
        <label className="admin-select">
          <span>학과</span>
          <select value={major} onChange={event => { setMajor(event.target.value); setPage(1) }}>
            <option value={ALL}>{ALL}</option>
            {options.majors.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학년</span>
          <select value={grade} onChange={event => { setGrade(event.target.value); setPage(1) }}>
            <option value={ALL}>{ALL}</option>
            {options.grades.map(item => <option key={item} value={String(item)}>{item}학년</option>)}
          </select>
        </label>
        {searchOnly && <>
          <label className="admin-select">
            <span>학적상태</span>
            <select value={status} onChange={event => { setStatus(event.target.value as '재학' | '졸업'); setPage(1) }}>
              <option value="재학">재학</option>
              <option value="졸업">졸업</option>
            </select>
          </label>
          <label className="admin-select">
            <span>Core 유형</span>
            <select value={studentType} onChange={event => { setStudentType(event.target.value); setPage(1) }}>
              <option value={ALL}>{ALL}</option>
              {TYPE_CODES.map(code => <option key={code} value={code}>{code} {typeLabel(code)}</option>)}
            </select>
          </label>
        </>}
      </div>
      {/* 검색 전용 — 글자마다 조회하지 않고 Enter·검색 버튼으로 검색어를 적용한다. */}
      {searchOnly && (
        <form className="admin-picker-search" onSubmit={event => { event.preventDefault(); setQuery(draft.trim()); setPage(1) }}>
          <div className="admin-search">
            <LuSearch />
            <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="이름·학번 검색" autoFocus />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary"><LuSearch /> 검색</button>
        </form>
      )}

      {!active ? null : isLoading && result.items.length === 0 ? (
        <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
      ) : result.items.length === 0 ? (
        searchOnly ? <p className="admin-field-hint">조건에 맞는 학생이 없습니다.</p> : <EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다." />
      ) : (
        <div className="admin-roster admin-picker-roster">
          <div className="admin-roster-head">
            <span>학번</span><span>이름</span><span>학과</span><span>학년</span><span>학적</span><span>선택</span>
          </div>
          {result.items.map(student => (
            <div className="admin-roster-row" key={student.id}
              style={pickOnRowClick && !picked.has(student.id) ? { cursor: 'pointer' } : undefined}
              onClick={pickOnRowClick && !picked.has(student.id) ? () => onPick(student) : undefined}>
              <span className="admin-roster-cell">{student.studentNo}</span>
              <span className="admin-roster-cell"><strong>{studentDisplayName(student.name, student.id, student.star)}</strong></span>
              <span className="admin-roster-cell">{student.major}</span>
              <span className="admin-roster-cell">{student.grade}</span>
              <span className="admin-roster-cell">
                <span className={enrollStatusClass(student.status)}>{student.status}</span>
              </span>
              <span className="admin-roster-cell">
                {picked.has(student.id) ? (
                  <small className="admin-field-hint">추가됨</small>
                ) : (
                  <button type="button" className="admin-btn admin-btn-ghost sm" onClick={event => { event.stopPropagation(); onPick(student) }}>{pickLabel}</button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="admin-page-btn" disabled={result.page === 1} onClick={() => setPage(result.page - 1)}>이전</button>
          <PageNumbers page={result.page} pages={pages} onChange={setPage} />
                <span className="admin-page-info">{result.page} / {pages} 페이지 · 총 {result.totalCount}명</span>
          <button type="button" className="admin-page-btn" disabled={result.page === pages} onClick={() => setPage(result.page + 1)}>다음</button>
        </div>
      )}
    </AdminModal>
  )
}
