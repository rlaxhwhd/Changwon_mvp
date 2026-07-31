import { useState } from 'react'
import {
  LuBellRing,
  LuChevronLeft,
  LuChevronRight,
  LuClipboardCheck,
  LuFrown,
  LuLoaderCircle,
  LuMessageSquareMore,
  LuSearch,
} from 'react-icons/lu'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import { getActiveCounselor } from '../data/counselors'
import {
  addComment,
  getTestOptions,
  getTestSummaries,
  queryDiagnosisStatus,
  sendDiagnosisNudge,
} from '../data/diagnosisAttempts'
import type { DiagnosisStatusRow } from '../data/diagnosisAttempts'
import { totalPages } from '../data/query'
import { enrollStatusClass } from '../data/studentRoster'
import { useListData } from '../hooks/useListData'

const ALL = '전체'
const PAGE_SIZE = 12
const STATUSES = ['미응시', '진행중', '완료'] as const

const formatDate = (value?: string) => (value ? value.replaceAll('-', '.') : '—')
const formatStamp = (iso?: string) => (iso ? iso.slice(0, 10).replaceAll('-', '.') : '—')

function statusClass(status: DiagnosisStatusRow['status']): string {
  switch (status) {
    case '완료':
      return 'admin-chip admin-chip-done'
    case '진행중':
      return 'admin-chip admin-chip-ok'
    default:
      return 'admin-chip admin-chip-wait'
  }
}

/** 결과 코멘트 작성 모달 — 코멘트는 append-only 로 쌓이고 최신 건만 표에 노출된다. */
function CommentModal({ row, onClose, onSaved }: { row: DiagnosisStatusRow; onClose: () => void; onSaved: () => void }) {
  const counselor = getActiveCounselor()
  const [body, setBody] = useState('')

  const save = () => {
    if (!row.attemptId) return
    addComment({
      attemptId: row.attemptId,
      studentId: row.studentId,
      body: body.trim(),
      by: counselor.id,
      byName: counselor.name,
    })
    onSaved()
    onClose()
  }

  return (
    <AdminModal title="결과 코멘트 작성" size="md" onClose={onClose}>
      <dl className="admin-detail-grid">
        <div><dt>학생</dt><dd>{row.studentName} · {row.studentNo} · {row.studentMajor} {row.studentGrade}학년</dd></div>
        <div><dt>검사</dt><dd>{row.testName}{row.isRetake && ` (${row.attemptNo}회차)`}</dd></div>
        <div><dt>응시일</dt><dd>{formatDate(row.date)}</dd></div>
        <div><dt>결과 요약</dt><dd>{row.resultSummary ?? '—'}</dd></div>
      </dl>

      {row.comment && (
        <div className="admin-record-item-comment">
          <span className="admin-record-label"><LuMessageSquareMore /> 최근 코멘트</span>
          <p>{row.comment.body}</p>
          <small className="admin-field-hint">{row.comment.byName} · {formatStamp(row.comment.createdAt)}</small>
        </div>
      )}

      <label className="admin-field">
        <span>새 코멘트</span>
        <textarea
          rows={5}
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="상담 준비 관점에서 이 결과를 어떻게 볼지 기록합니다."
        />
        <small className="admin-field-hint">코멘트는 이력으로 쌓입니다. 기존 코멘트는 수정·삭제되지 않습니다.</small>
      </label>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>취소</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={body.trim() === ''} onClick={save}>저장</button>
      </div>
    </AdminModal>
  )
}

export default function DiagnosisStatus() {
  const counselor = getActiveCounselor()
  const departments = counselor.departments
  const [query, setQuery] = useState('')
  const [testId, setTestId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [grade, setGrade] = useState(ALL)
  const [retakeOnly, setRetakeOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<DiagnosisStatusRow | null>(null)

  const summaries = getTestSummaries(departments)
  const tests = getTestOptions()
  const { data: result, isLoading, refetch } = useListData(queryDiagnosisStatus, {
    page,
    pageSize: PAGE_SIZE,
    q: query,
    departments,
    filters: {
      testId: testId === ALL ? undefined : testId,
      status: status === ALL ? undefined : status,
      grade: grade === ALL ? undefined : grade,
      retake: retakeOnly ? 'Y' : undefined,
    },
  })
  const pages = totalPages(result)

  /** 필터 변경 시 항상 1페이지로 되돌린다(현재 페이지가 범위를 벗어나는 것 방지). */
  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">검사 현황</h1>
          <p className="admin-page-desc">
            담당 학생의 진단검사 응시 현황과 결과를 상담 준비용으로 확인합니다.
          </p>
          <p className="admin-field-hint">
            대상 검사는 학년별 응시 정책(1학년 C-2 · 2·3학년 C-2/C-3 · 4학년 C-3/C-4 · 공통 C-CORE)으로 산정됩니다.
          </p>
        </div>
      </header>

      <div className="admin-card-head"><h2>검사별 응시율</h2></div>
      <div className="admin-diag-summary">
        {summaries.map(item => (
          <button
            key={item.testId}
            type="button"
            className={`admin-diag-card${testId === item.testId ? ' active' : ''}`}
            onClick={() => reset(setTestId)(testId === item.testId ? ALL : item.testId)}
          >
            <strong>{item.testName}</strong>
            <div className="admin-diag-rate">
              <span>{item.rate}%</span>
              <small>{item.done} / {item.target}명</small>
            </div>
            <div className="admin-diag-bar"><span style={{ width: `${item.rate}%` }} /></div>
            <div className="admin-diag-legend">
              <em>미응시 {item.notStarted}</em>
              <em>진행중 {item.inProgress}</em>
            </div>
          </button>
        ))}
      </div>

      <div className="admin-card-head"><h2>학생별 응시 내역</h2></div>
      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            value={query}
            onChange={event => reset(setQuery)(event.target.value)}
            placeholder="이름·학번·학과 검색"
          />
        </div>
        <label className="admin-select">
          <span>검사</span>
          <select value={testId} onChange={event => reset(setTestId)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {tests.map(item => <option key={item.testId} value={item.testId}>{item.name}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>상태</span>
          <select value={status} onChange={event => reset(setStatus)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {STATUSES.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학년</span>
          <select value={grade} onChange={event => reset(setGrade)(event.target.value)}>
            <option value={ALL}>{ALL}</option>
            {[1, 2, 3, 4].map(item => <option key={item} value={String(item)}>{item}학년</option>)}
          </select>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={retakeOnly} onChange={event => reset(setRetakeOnly)(event.target.checked)} />
          <span>재검사만</span>
        </label>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">
          검색 결과 {result.totalCount}건
          {isLoading && <LuLoaderCircle className="admin-spin" />}
        </span>
      </div>

      <section className="admin-card">
        {isLoading && result.items.length === 0 ? (
          <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 불러오는 중…</div>
        ) : result.items.length === 0 ? (
          <EmptyState icon={LuFrown} message="조건에 맞는 응시 내역이 없습니다." />
        ) : (
          <>
            <div className="admin-roster admin-diag-roster">
              <div className="admin-roster-head">
                <span>학번</span><span>이름</span><span>학과</span><span>학년</span>
                <span>검사</span><span>상태</span><span>응시일</span>
                <span>결과 요약</span><span>조치</span>
              </div>
              {result.items.map(row => (
                <div className="admin-roster-row" key={row.key}>
                  <span className="admin-roster-cell">{row.studentNo}</span>
                  <span className="admin-roster-cell">
                    <strong>{row.studentName}</strong>
                    <span className={enrollStatusClass(row.enrollStatus)}>{row.enrollStatus}</span>
                  </span>
                  <span className="admin-roster-cell">{row.studentMajor}</span>
                  <span className="admin-roster-cell">{row.studentGrade}</span>
                  <span className="admin-roster-cell">
                    {row.testName}
                    {row.isRetake && <small className="admin-tag admin-tag-soft">재검사 {row.attemptNo}회차</small>}
                  </span>
                  <span className="admin-roster-cell"><span className={statusClass(row.status)}>{row.status}</span></span>
                  <span className="admin-roster-cell">{formatDate(row.date)}</span>
                  <span className="admin-roster-cell admin-diag-result">
                    {row.resultSummary ?? '—'}
                    {row.comment && <small><LuMessageSquareMore /> {row.comment.body}</small>}
                  </span>
                  <span className="admin-roster-cell">
                    {row.status === '미응시' ? (
                      row.nudgedAt ? (
                        <small className="admin-field-hint">권유 {formatStamp(row.nudgedAt)}</small>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost sm"
                          onClick={() => {
                            sendDiagnosisNudge({ studentId: row.studentId, testId: row.testId, by: counselor.id })
                            refetch()
                          }}
                        >
                          <LuBellRing /> 검사 권유
                        </button>
                      )
                    ) : row.status === '완료' ? (
                      <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setTarget(row)}>
                        <LuClipboardCheck /> 결과·코멘트
                      </button>
                    ) : (
                      <small className="admin-field-hint">응시 중</small>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div className="admin-pagination">
                <button type="button" className="admin-page-btn" disabled={result.page === 1} onClick={() => setPage(result.page - 1)}>
                  <LuChevronLeft />
                </button>
                <span className="admin-page-info">
                  {result.page} / {pages} 페이지 · 총 {result.totalCount}건
                </span>
                <button type="button" className="admin-page-btn" disabled={result.page === pages} onClick={() => setPage(result.page + 1)}>
                  <LuChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {target && <CommentModal row={target} onClose={() => setTarget(null)} onSaved={refetch} />}
    </div>
  )
}
