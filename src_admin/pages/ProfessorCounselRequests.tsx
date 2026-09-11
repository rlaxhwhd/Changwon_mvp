/** 교수 상담 신청 접수 화면 — 교수에게 지정된 신청만 일정 확정 또는 취소한다. */
import {
  LuChevronLeft,
  LuChevronRight,
  LuLoaderCircle,
  LuSearch,
} from 'react-icons/lu'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import StudentDetailModal from '../components/StudentDetailModal'
import { formatRelativeTime } from '../data/counselRequests'
import {
  cancelProfRequest,
  confirmProfRequest,
  getProfReqTabCounts,
  queryProfCounselRequests,
} from '../data/profCounselRequests'
import type { ProfCounselRequestRow, ProfReqTab } from '../data/profCounselRequests'
import { totalPages } from '../data/query'
import { getActiveUser } from '../data/staff'
import { enrollStatusClass } from '../data/studentRoster'
import { useListData } from '../hooks/useListData'
import { useAsyncAction } from '../../shared/useAsyncAction'

const PAGE_SIZE = 10
const tabs: ProfReqTab[] = ['전체', '대기', '확정', '완료', '취소']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function ConfirmScheduleModal({
  request,
  onClose,
  onConfirmed,
}: {
  request: ProfCounselRequestRow
  onClose: () => void
  onConfirmed: () => void
}) {
  const [date, setDate] = useState(request.slot?.date ?? today())
  const [start, setStart] = useState(request.slot?.start ?? '09:00')
  const [end, setEnd] = useState(request.slot?.end ?? '10:00')
  const [place, setPlace] = useState(request.slot?.place ?? '')
  const [error, setError] = useState('')
  const { run, saving } = useAsyncAction()
  const confirm = () => {
    if (!date || !start || !end || start >= end) {
      setError('종료 시각은 시작 시각보다 늦어야 합니다.')
      return
    }
    // 전이는 서버가 한다 — 응답을 기다리지 않고 닫으면 실패가 화면에 남지 않는다.
    run(async () => {
      setError('')
      try {
        await confirmProfRequest(request.id, { date, start, end, place: place.trim() || undefined })
        onConfirmed()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '일정을 확정하지 못했습니다.')
      }
    })
  }
  return (
    <AdminModal title="상담 일정 확정" size="md" onClose={onClose}>
      <div className="admin-kv">
        <span>이름</span>
        <strong>{request.studentName}</strong>
        <span>학번</span>
        <strong>{request.studentNo}</strong>
        <span>학과</span>
        <strong>{request.studentMajor}</strong>
        <span>방식</span>
        <strong>{request.method}</strong>
        <span>주제</span>
        <strong>{request.topic}</strong>
      </div>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>날짜</span>
          <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>시작 시각</span>
          <input type="time" value={start} onChange={event => setStart(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>종료 시각</span>
          <input type="time" value={end} onChange={event => setEnd(event.target.value)} />
        </label>
        <label className="admin-field">
          <span>{request.method === '비대면' ? '링크 안내' : '장소 안내'}</span>
          <input
            value={place}
            placeholder={request.method === '비대면' ? '화상 링크' : undefined}
            onChange={event => setPlace(event.target.value)}
          />
        </label>
        {error && <p className="admin-field-hint" role="alert">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={confirm}>
            {saving ? '확정 중…' : '일정 확정'}
          </button>
        </div>
      </div>
    </AdminModal>
  )
}

export default function ProfessorCounselRequests() {
  const user = getActiveUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState<ProfReqTab>('전체')
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState<ProfCounselRequestRow | null>(null)
  // 학생 정보 열람 — 이 목록은 이미 "나에게 온 신청"만 담고 있어 타학과 학생도 여기서는 볼 수 있다.
  // (학생 검색 /professor/students 은 소속 학과로 제한된다 — 범위가 다른 화면이다.)
  const [viewing, setViewing] = useState<ProfCounselRequestRow | null>(null)
  const counts = getProfReqTabCounts(user.id)
  const { data, isLoading, refetch } = useListData(queryProfCounselRequests, {
    professorId: user.id,
    tab,
    q,
    page,
    pageSize: PAGE_SIZE,
    filters: { method: method || undefined },
  })
  const pages = totalPages(data)
  const startIndex = (data.page - 1) * PAGE_SIZE
  const { run, saving, error } = useAsyncAction()
  const reset = () => {
    setTab('전체')
    setQ('')
    setMethod('')
    setPage(1)
  }
  // 취소 사유는 서버가 필수로 요구한다 — 사유 없이 보내면 422 로 거절된다.
  const reject = (row: ProfCounselRequestRow) => {
    const reason = window.prompt(`${row.studentName} 학생의 상담 신청을 거절합니다.\n사유를 입력해 주세요.`)
    if (!reason?.trim()) return
    run(async () => { await cancelProfRequest(row.id, reason.trim()); refetch() })
  }
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 신청 접수</h1>
          <p className="admin-page-desc">{user.name} · 나에게 신청된 교수상담</p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={reset}>초기화</button>
        </div>
      </header>
      {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}
      <div className="admin-tabs" role="tablist" aria-label="상담 신청 상태">
        {tabs.map(item => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`admin-tab${tab === item ? ' active' : ''}`}
            onClick={() => { setTab(item); setPage(1) }}
          >
            {item}<span className="admin-tab-count">{counts[item]}</span>
          </button>
        ))}
      </div>
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
          <span>방식</span>
          <select value={method} onChange={event => { setMethod(event.target.value); setPage(1) }}>
            <option value="">전체</option>
            <option value="대면">대면</option>
            <option value="비대면">비대면</option>
          </select>
        </label>
      </div>
      <div className="admin-toolbar">
        <span className="admin-toolbar-count">
          검색 결과 {data.totalCount}건 {isLoading && <LuLoaderCircle className="admin-spin" />}
        </span>
      </div>
      <section className="admin-card">
        {data.items.length === 0 ? <EmptyState message="접수된 교수상담 신청이 없습니다." /> : (
          <>
            <div className="admin-roster admin-profreq-roster">
              <div className="admin-roster-head">
                <span>#</span><span>학생</span><span>학적</span><span>방식</span>
                <span>주제</span><span>신청/일정</span><span>상태</span><span>관리</span>
              </div>
              {data.items.map((row, index) => (
                <div className="admin-roster-row" key={row.id}>
                  <span className="admin-roster-cell">{startIndex + index + 1}</span>
                  <span className="admin-roster-cell">
                    <strong>{row.studentName}</strong>
                    <small>{row.studentNo} · {row.studentMajor}</small>
                    {row.isAdvisee && <span className="admin-tag admin-tag-soft">지도</span>}
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost sm"
                      onClick={() => setViewing(row)}
                    >
                      정보보기
                    </button>
                  </span>
                  <span className="admin-roster-cell">
                    <span className={enrollStatusClass(row.enrollmentStatus)}>{row.enrollmentStatus}</span>
                  </span>
                  <span className="admin-roster-cell"><span className="admin-tag">{row.method}</span></span>
                  <span className="admin-roster-cell admin-td-ellipsis" title={row.topic}>{row.topic}</span>
                  <span className="admin-roster-cell">
                    <small>{formatRelativeTime(row.requestedAt)} 신청</small><br />
                    {row.slot ? `${row.slot.date} ${row.slot.start}–${row.slot.end}` : '일정 미정'}
                  </span>
                  <span className="admin-roster-cell">
                    <span
                      className={`counsel-status-badge is-${
                        row.status === '대기'
                          ? 'waiting'
                          : row.status === '확정'
                            ? 'confirmed'
                            : row.status === '완료'
                              ? 'complete'
                              : 'cancelled'
                      }`}
                    >
                      {row.status}
                    </span>
                  </span>
                  <span className="admin-roster-cell">
                    {row.status === '대기' && <>
                      <button type="button" className="admin-btn admin-btn-primary sm" onClick={() => setConfirming(row)}>
                        접수·일정
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost sm"
                        disabled={saving}
                        onClick={() => reject(row)}
                      >
                        거절
                      </button>
                    </>}
                    {row.status === '확정' && <>
                      <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setConfirming(row)}>
                        일정 변경
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary sm"
                        onClick={() => navigate(`/professor/counsel/records?requestId=${row.id}`)}
                      >
                        기록 작성
                      </button>
                    </>}
                    {row.status === '완료' && <strong className="admin-advisor-name">기록 완료</strong>}
                    {row.status === '취소' && '—'}
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
      {confirming && (
        <ConfirmScheduleModal
          request={confirming}
          onClose={() => setConfirming(null)}
          onConfirmed={() => { setConfirming(null); refetch() }}
        />
      )}
      {viewing && (
        <StudentDetailModal studentId={viewing.studentId} role="professor" onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
