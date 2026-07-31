import { useState } from 'react'
import { LuFrown, LuLoaderCircle, LuSearch } from 'react-icons/lu'
import AdminModal from './AdminModal'
import EmptyState from './EmptyState'
import { totalPages } from '../data/query'
import { enrollStatusClass, getRosterFilterOptions, queryStudentRoster } from '../data/studentRoster'
import type { RosterStudent } from '../data/studentRoster'
import { useListData } from '../hooks/useListData'

const ALL = '전체'
const PAGE_SIZE = 8

interface StudentPickerProps {
  title?: string
  /** 담당 학과 범위. 빈 배열이면 전체. */
  departments?: string[]
  /** 이미 선택된 학생 id — 목록에서 '추가됨'으로 표시하고 재선택을 막는다. */
  excludeIds?: string[]
  onPick: (student: RosterStudent) => void
  onClose: () => void
}

/**
 * 학생 선택 피커 (현행 `CoStuInfoPop` 학생검색 팝업 대응).
 * 단독 화면인 학생 목록(`/students`)과 달리 **다른 화면에서 학생을 고를 때** 쓰는 모달이다.
 * 조회는 학생 로스터 단일소스(queryStudentRoster)를 그대로 쓴다.
 */
export default function StudentPicker({ title = '학생 검색', departments = [], excludeIds = [], onPick, onClose }: StudentPickerProps) {
  const [query, setQuery] = useState('')
  const [major, setMajor] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [page, setPage] = useState(1)
  const options = getRosterFilterOptions(departments)
  const picked = new Set(excludeIds)

  const { data: result, isLoading } = useListData(queryStudentRoster, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments,
    filters: {
      major: major === ALL ? undefined : major,
      grade: grade === ALL ? undefined : grade,
      status: '재학',
    },
  })
  const pages = totalPages(result)

  return (
    <AdminModal title={title} size="lg" onClose={onClose}>
      <p className="admin-field-hint">재학생만 조회됩니다.</p>
      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1) }}
            placeholder="이름·학과 검색"
          />
        </div>
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
      </div>

      {isLoading && result.items.length === 0 ? (
        <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
      ) : result.items.length === 0 ? (
        <EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다." />
      ) : (
        <div className="admin-roster admin-picker-roster">
          <div className="admin-roster-head">
            <span>학번</span><span>이름</span><span>학과</span><span>학년</span><span>학적</span><span>선택</span>
          </div>
          {result.items.map(student => (
            <div className="admin-roster-row" key={student.id}>
              <span className="admin-roster-cell">{student.studentNo}</span>
              <span className="admin-roster-cell"><strong>{student.name}</strong></span>
              <span className="admin-roster-cell">{student.major}</span>
              <span className="admin-roster-cell">{student.grade}</span>
              <span className="admin-roster-cell">
                <span className={enrollStatusClass(student.status)}>{student.status}</span>
              </span>
              <span className="admin-roster-cell">
                {picked.has(student.id) ? (
                  <small className="admin-field-hint">추가됨</small>
                ) : (
                  <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => onPick(student)}>추가</button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="admin-page-btn" disabled={result.page === 1} onClick={() => setPage(result.page - 1)}>이전</button>
          <span className="admin-page-info">{result.page} / {pages} 페이지 · 총 {result.totalCount}명</span>
          <button type="button" className="admin-page-btn" disabled={result.page === pages} onClick={() => setPage(result.page + 1)}>다음</button>
        </div>
      )}
    </AdminModal>
  )
}
