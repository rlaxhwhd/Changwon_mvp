/** 교수 상담 기록 화면 — 기록은 append하고 신청 연계 건은 완료로 전이한다. */
import { LuChevronLeft, LuChevronRight, LuSearch } from 'react-icons/lu'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import StudentPicker from '../components/StudentPicker'
import type { RosterStudent } from '../data/studentRoster'
import { addProfCounselRecord, queryProfRecords } from '../data/profCounselRecords'
import { completeProfRequest, getProfRequestById } from '../data/profCounselRequests'
import { PROF_COUNSEL_CATEGORIES, PROF_COUNSEL_CHANNEL_LABEL } from '../data/schema/profCounselRecord'
import type { CounselMethod } from '../data/schema/counselRequest'
import { getActiveUser } from '../data/staff'
import { totalPages } from '../data/query'
import { useListData } from '../hooks/useListData'
import { useAsyncAction } from '../../shared/useAsyncAction'

const PAGE_SIZE = 10

export default function ProfessorCounselRecords() {
  const user = getActiveUser()
  const [params] = useSearchParams()
  const requestId = params.get('requestId')
  const request = requestId ? getProfRequestById(user.id, requestId) : undefined
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null)
  const [pickingStudent, setPickingStudent] = useState(false)
  const studentId = request?.studentId ?? selectedStudent?.id ?? ''
  const [categoryCode, setCategoryCode] = useState(PROF_COUNSEL_CATEGORIES[0].code)
  // 연계 건은 학생이 신청한 방식을 그대로 계승한다(온라인=비대면 · 오프라인=대면).
  const [method, setMethod] = useState<CounselMethod>(request?.method ?? '대면')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const { data, refetch } = useListData(queryProfRecords, {
    professorId: user.id, page, pageSize: PAGE_SIZE, q,
    filters: { categoryCode: categoryFilter || undefined },
  })
  const pages = totalPages(data)
  const startIndex = (data.page - 1) * PAGE_SIZE
  const { run, saving } = useAsyncAction()

  const save = () => {
    if (!studentId || !summary.trim()) {
      setError('학생과 상담 내용을 입력하세요.')
      return
    }
    run(async () => {
      setError('')
      try {
        // 신청 연계 건은 완료 전이가 곧 기록이다(서버가 기록 저장+전이를 한 트랜잭션으로).
        // 직접 작성 건은 서버가 신청(DONE)+기록을 함께 만든다. 둘 다 서버가 거절하면 아무것도 남지 않는다.
        if (request) await completeProfRequest(request.id, { summary: summary.trim() })
        else await addProfCounselRecord({ studentId, professorId: user.id, categoryCode, method, date, summary: summary.trim() })
        setSummary('')
        refetch()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '상담 기록을 저장하지 못했습니다.')
      }
    })
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 기록</h1>
          <p className="admin-page-desc">{user.name} · 상담 결과를 기록하면 조교 실적 집계에 반영됩니다.</p>
        </div>
      </header>
      <section className="admin-card">
        <div className="admin-card-head"><h2>기록 작성</h2></div>
        {(
          <div className="admin-form-grid">
            {request ? <>
              <div className="admin-kv">
                <span>학생</span><strong>{request.studentName} ({request.studentNo})</strong>
              </div>
              <div className="admin-kv">
                <span>학과·학년</span><strong>{request.studentMajor} · {request.studentGrade}학년</strong>
              </div>
              <p className="admin-field-hint">저장 시 해당 상담 신청이 완료 처리됩니다.</p>
            </> : (
              <div className="admin-field">
                <span>학생</span>
                <button type="button" className="admin-btn" onClick={() => setPickingStudent(true)}>
                  {selectedStudent ? `${selectedStudent.name} (${selectedStudent.studentNo})` : '지도학생 검색'}
                </button>
              </div>
            )}
            <label className="admin-field">
              <span>상담구분</span>
              <select
                value={categoryCode}
                onChange={event => setCategoryCode(event.target.value as typeof categoryCode)}
              >
                {PROF_COUNSEL_CATEGORIES.map(item => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>상담 방식</span>
              <select
                value={method}
                onChange={event => setMethod(event.target.value as CounselMethod)}
              >
                {(Object.keys(PROF_COUNSEL_CHANNEL_LABEL) as CounselMethod[]).map(key => (
                  <option key={key} value={key}>{PROF_COUNSEL_CHANNEL_LABEL[key]}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>상담일</span>
              <input type="date" value={date} onChange={event => setDate(event.target.value)} />
            </label>
            <label className="admin-field admin-field-full">
              <span>상담 내용</span>
              <textarea value={summary} onChange={event => setSummary(event.target.value)} />
            </label>
            {error && <p className="admin-field-hint" role="alert">{error}</p>}
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        )}
      </section>
      {pickingStudent && <StudentPicker title="지도학생 검색" professorId={user.id}
        onPick={student => { setSelectedStudent(student); setPickingStudent(false) }} onClose={() => setPickingStudent(false)} />}
      <section className="admin-card">
        <div className="admin-card-head"><h2>내 상담 기록</h2></div>
        <div className="admin-filterbar">
          <div className="admin-search">
            <LuSearch />
            <input
              value={q}
              onChange={event => { setQ(event.target.value); setPage(1) }}
              placeholder="이름·학번 검색"
              aria-label="이름 또는 학번 검색"
            />
          </div>
          <label className="admin-select">
            <span>상담구분</span>
            <select value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPage(1) }}>
              <option value="">전체</option>
              {PROF_COUNSEL_CATEGORIES.map(item => (
                <option key={item.code} value={item.code}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        {data.items.length === 0 ? <EmptyState message="작성한 상담 기록이 없습니다. 위에서 첫 기록을 작성하세요." /> : (
          <>
            <div className="admin-roster admin-profrec-roster">
              <div className="admin-roster-head">
                <span>#</span><span>상담일</span><span>학생</span><span>학과·학년</span>
                <span>상담구분</span><span>내용</span><span>연계</span>
              </div>
              {data.items.map((item, index) => (
                <div className="admin-roster-row" key={item.id}>
                  <span className="admin-roster-cell">{startIndex + index + 1}</span>
                  <span className="admin-roster-cell">{item.date.replaceAll('-', '.')}</span>
                  <span className="admin-roster-cell">{item.snapshot.name} {item.snapshot.studentNo}</span>
                  <span className="admin-roster-cell">{item.snapshot.major} · {item.snapshot.grade}학년</span>
                  <span className="admin-roster-cell">
                    {PROF_COUNSEL_CATEGORIES.find(category => category.code === item.categoryCode)?.label}
                  </span>
                  <span className="admin-roster-cell admin-td-ellipsis" title={item.summary}>
                    {item.summary || '—'}
                  </span>
                  <span className="admin-roster-cell">
                    {item.requestId ? <span className="admin-tag admin-tag-soft">신청 연계</span> : '—'}
                  </span>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(value => Math.max(1, value - 1))}
                >
                  <LuChevronLeft />
                </button>
                <span className="admin-page-info">{page} / {pages} 페이지 · 총 {data.totalCount}건</span>
                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={page === pages}
                  onClick={() => setPage(value => Math.min(pages, value + 1))}
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
