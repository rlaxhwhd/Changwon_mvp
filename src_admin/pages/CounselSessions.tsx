import { studentDisplayName } from '../../shared/studentDisplayName'
import { LuArrowRight, LuCalendarCheck, LuCalendarClock, LuClock, LuFolderOpen, LuInfo, LuSearch, LuTriangleAlert } from 'react-icons/lu'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import StudentDetailModal from '../components/StudentDetailModal'
import { getActiveCounselor } from '../data/counselors'
import { refreshCounselRequests } from '../data/counselRequests'
import { getSessionMajors, getSessionRows, getSessionSummary, SESSION_TIMING_CLASS, SESSION_TIMINGS } from '../data/counselSessions'
import type { SessionTiming } from '../data/counselSessions'
import type { CounselRequestType } from '../data/schema/counselRequest'
import { useStore } from '../../shared/useRoadmapStore'
import { studentTypeClass } from '../data/studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'

// ─────────────────────────────────────────────────────────────────────────
// 상담 진행 — 확정된 내 담당 상담을 표로 모아 상담 진행 화면(/counsel/session/:studentId)으로 보낸다.
// 디자인은 상담일지 대장(CounselJournals)과 같은 골격이다. 목록·집계는 data/counselSessions 가 맡는다.
// ─────────────────────────────────────────────────────────────────────────

const ALL = '전체'

export default function CounselSessions() {
  const me = getActiveCounselor()
  // 진입 시 서버 재조회 — 다른 화면에서 확정·완료한 상담이 새로고침 없이 반영된다.
  useStore('dc:counsel-updated')
  const [refreshError, setRefreshError] = useState('')
  useEffect(() => { refreshCounselRequests().catch(error => setRefreshError(error instanceof Error ? error.message : '상담 목록을 다시 불러오지 못했습니다.')) }, [])
  const rows = getSessionRows(me.id)
  const summary = useMemo(() => getSessionSummary(rows), [rows])
  const majors = useMemo(() => getSessionMajors(rows), [rows])

  const [query, setQuery] = useState('')
  const [major, setMajor] = useState<string>(ALL)
  const [type, setType] = useState<CounselRequestType | typeof ALL>(ALL)
  const [timing, setTiming] = useState<SessionTiming | typeof ALL>(ALL)
  const [infoId, setInfoId] = useState<string | null>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (timing !== ALL && r.timing !== timing) return false
      if (major !== ALL && r.studentMajor !== major) return false
      if (type !== ALL && r.type !== type) return false
      if (q && !`${studentDisplayName(r.studentName, r.studentId)} ${r.studentNo} ${r.topic}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, major, type, timing])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 진행</h1>
          <p className="admin-page-desc">
            일정이 확정된 담당 상담입니다. 오늘 {summary.오늘}건 · 예정 {summary.예정}건 · 지난 일정 {summary.지남}건
          </p>
        </div>
      </header>

      {refreshError && <p role="alert" className="admin-form-hint-warn">{refreshError} 아래 목록은 마지막으로 불러온 내용입니다.</p>}

      <div className="admin-editor-hint">
        <LuInfo />
        <span>
          접수함에서 <strong>확정</strong>한 상담이 이 목록에 모입니다. <strong>상담 진행</strong>을 누르면 기록지를 작성하는
          {' '}상담 진행 화면으로 이동하고, 완료 처리하면 「상담일지」로 넘어갑니다.
        </span>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-icon"><LuCalendarCheck /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">진행 대상</span>
            <span className="admin-stat-value">{summary.total}<em>건</em></span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon info"><LuClock /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">오늘</span>
            <span className="admin-stat-value">{summary.오늘}<em>건</em></span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon success"><LuCalendarClock /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">예정</span>
            <span className="admin-stat-value">{summary.예정}<em>건</em></span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon accent"><LuTriangleAlert /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">지난 일정 (처리 대기)</span>
            <span className="admin-stat-value">{summary.지남}<em>건</em></span>
          </div>
        </div>
      </div>

      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="학생 이름·학번·주제 검색" />
        </div>
        <label className="admin-select">
          <span>학과</span>
          <select value={major} onChange={e => setMajor(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {majors.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>상담유형</span>
          <select value={type} onChange={e => setType(e.target.value as CounselRequestType | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            <option value="진로취업">진로취업</option>
            <option value="심리">심리</option>
          </select>
        </label>
        <label className="admin-select">
          <span>일정</span>
          <select value={timing} onChange={e => setTiming(e.target.value as SessionTiming | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            {SESSION_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <span className="admin-toolbar-count">검색 결과 {list.length}건</span>
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState
            icon={LuFolderOpen}
            message={rows.length === 0 ? '확정된 상담이 없습니다. 신청 접수함에서 상담을 확정해 주세요.' : '조건에 맞는 상담이 없습니다.'}
          />
        ) : (
          <div className="admin-roster admin-session-roster">
            <div className="admin-roster-head">
              <span>번호</span>
              <span>상담일</span>
              <span>시간</span>
              <span>학생</span>
              <span>학과</span>
              <span>진단유형</span>
              <span>유형 · 방식</span>
              <span>상담 주제</span>
              <span>일정</span>
              <span>작업</span>
            </div>
            {list.map((r, index) => (
              <div className="admin-roster-row" key={r.requestId}>
                <span className="admin-roster-cell">{index + 1}</span>
                <span className="admin-roster-cell">{r.date}</span>
                <span className="admin-roster-cell"><small>{r.time || '—'}</small></span>
                <span className="admin-roster-cell admin-name-cell">
                  <button type="button" className="admin-inline-link" onClick={() => setInfoId(r.studentId)}>
                    {studentDisplayName(r.studentName, r.studentId)}
                  </button>
                  <small>{r.studentNo}</small>
                </span>
                <span className="admin-roster-cell">{r.studentMajor}</span>
                <span className="admin-roster-cell">
                  <span className={studentTypeClass(r.studentType)}>{typeLabel(r.studentType)}</span>
                </span>
                <span className="admin-roster-cell">{r.type}<small>{r.method}</small></span>
                <span className="admin-roster-cell admin-journal-topic">{r.topic}</span>
                <span className="admin-roster-cell">
                  <span className={`admin-chip ${SESSION_TIMING_CLASS[r.timing]}`}>{r.timing}</span>
                </span>
                <span className="admin-roster-cell">
                  <Link to={`/counsel/session/${r.studentId}`} className="admin-btn admin-btn-primary sm">
                    상담 진행 <LuArrowRight />
                  </Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {infoId && <StudentDetailModal studentId={infoId} role={me.role} onClose={() => setInfoId(null)} />}
    </div>
  )
}
