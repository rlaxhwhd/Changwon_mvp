import {
  LuCalendarCheck, LuCheck, LuChevronDown, LuDownload, LuFileText, LuFolderOpen, LuInfo,
  LuMessageSquareMore, LuPaperclip, LuPen, LuPrinter, LuSearch,
} from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import StudentDetailModal from '../components/StudentDetailModal'
import { getActiveCounselor, getActiveCounselorId } from '../data/counselors'
import {
  getJournalFilterOptions, getJournalRows, getJournalSummary, JOURNAL_STATUSES, JOURNAL_STATUS_CLASS,
} from '../data/counselJournals'
import type { JournalRow, JournalStatus } from '../data/counselJournals'
import { buildRecord, upsertRecord } from '../data/counselRecords'
import type { RecordSource } from '../data/counselRecords'
import type { RecordStatus } from '../data/schema/counselRecord'
import { toJournalCsv } from '../data/counselExport'
import { studentTypeClass } from '../data/studentRoster'
import type { EnrollStatus } from '../data/studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'

// ─────────────────────────────────────────────────────────────────────────
// 상담일지 — 완료된 상담의 일지 작성 대장 겸 완료 내역 열람.
//
// 옛 「완료 상담 내역」(/counsel/records)은 이 화면의 '완료' 필터와 같은 집합이라
// 여기로 흡수했다. 같은 record.comment 를 두 화면이 각각 편집하던 것도 함께 끝난다.
// 목록·집계·기록 조립은 전부 데이터층이다 — 화면은 다시 세지 않는다.
//
// 범위는 '내가 담당한 상담'(assigneeId) 이다. 홈 KPI '상담일지 미작성'과 같은
// 기준이라 두 숫자가 어긋나지 않는다.
// ─────────────────────────────────────────────────────────────────────────

const ALL = '전체'

/** 일지 작성 패널 — 임시저장(작성중) · 제출(완료) 둘 다 dc_counsel_records 에 쓴다. */
function JournalForm({
  row, source, onClose, onSaved,
}: {
  row: JournalRow
  source: RecordSource
  onClose: () => void
  onSaved: () => void
}) {
  const record = row.record
  // 방금 저장한 기록을 들고 있어야 한다 — 부모의 row 는 모달이 열린 시점 것이라
  // 이걸 안 잇고 두 번 저장하면 같은 상담에 기록이 두 벌 생긴다(id 가 새로 발급된다).
  const [current, setCurrent] = useState(record)
  const [summary, setSummary] = useState(record?.summary ?? '')
  const [comment, setComment] = useState(record?.comment ?? '')
  const [followUp, setFollowUp] = useState(record?.followUp ?? '')
  const [justSaved, setJustSaved] = useState(false)

  // 제출 조건은 상담 진행 화면(CounselSession)과 같다 — 소견과 공개 코멘트 둘 다 필요.
  const canSubmit = summary.trim() !== '' && comment.trim() !== ''

  const save = (status: RecordStatus) => {
    const next = buildRecord(source, { summary, comment, followUp }, status, current)
    upsertRecord(next)
    setCurrent(next)
    onSaved()
    if (status === '완료') { onClose(); return }
    setJustSaved(true)
    window.setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <AdminModal title={`상담일지 — ${row.studentName}`} size="lg" onClose={onClose}>
      <div className="admin-editor-hint">
        <LuInfo />
        <span>
          <strong>소견은 내부 기록, 공개 코멘트는 학생에게 보여줄 문구</strong>입니다 — 나누어 작성하세요.
          제출하면 작성상태가 「완료」로 바뀝니다. 첨부파일은 아직 연결되지 않았습니다.
        </span>
      </div>

      <dl className="admin-journal-brief">
        <div><dt>학생</dt><dd>{row.studentName} · {row.studentNo}</dd></div>
        <div><dt>학과</dt><dd>{row.studentMajor}</dd></div>
        <div><dt>상담일시</dt><dd>{row.date} {row.time}</dd></div>
        <div><dt>유형 · 방식</dt><dd>{row.type} · {row.method}</dd></div>
        <div><dt>장소</dt><dd>{row.place || '—'}</dd></div>
        <div><dt>상담 주제</dt><dd>{row.topic}</dd></div>
      </dl>

      <label className="admin-field">
        <span>상담 내용 (소견)</span>
        <textarea
          rows={5}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="상담에서 다룬 내용과 상담사 소견을 기록합니다."
        />
      </label>

      <label className="admin-field">
        <span>학생 공개 코멘트</span>
        <textarea
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="학생 화면 '상담 현황'에 그대로 노출됩니다."
        />
        <small className="admin-field-hint">학생이 읽는 문구입니다. 소견과 분리해 작성하세요.</small>
      </label>

      <label className="admin-field">
        <span>후속 조치</span>
        <input
          type="text"
          value={followUp}
          onChange={e => setFollowUp(e.target.value)}
          placeholder="예: 이력서 첨삭 재상담 권고"
        />
      </label>

      <div className="admin-field">
        <span>첨부파일</span>
        <div className="admin-journal-attach">
          <LuPaperclip />
          <span>진단 결과지·이력서 등 상담 근거 자료를 첨부합니다.</span>
          <button type="button" className="admin-btn admin-btn-ghost sm" disabled>파일 선택</button>
        </div>
      </div>

      <div className="admin-form-actions">
        {justSaved && <span className="admin-save-hint"><LuCheck /> 임시 저장됨</span>}
        <button type="button" className="admin-btn admin-btn-ghost sm" onClick={onClose}>닫기</button>
        <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => save('작성중')}>
          임시저장
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary sm"
          disabled={!canSubmit}
          title={canSubmit ? undefined : '소견과 학생 공개 코멘트를 모두 작성해야 제출할 수 있습니다'}
          onClick={() => save('완료')}
        >
          일지 제출
        </button>
      </div>
    </AdminModal>
  )
}

export default function CounselJournals() {
  const me = getActiveCounselor()
  const meId = getActiveCounselorId()
  // 저장하면 rev 를 올려 대장을 다시 읽는다 — 새로고침 없이 작성상태·요약이 따라온다.
  const [rev, setRev] = useState(0)
  const rows = useMemo(() => getJournalRows(me.id), [me.id, rev])
  const summary = useMemo(() => getJournalSummary(rows), [rows])
  // 드롭다운에 넣을 값은 데이터층이 고른다 — 학과·학년 목록을 화면에 적어 두지 않는다.
  const options = useMemo(() => getJournalFilterOptions(rows), [rows])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<JournalStatus | typeof ALL>(ALL)
  const [major, setMajor] = useState<string>(ALL)
  const [grade, setGrade] = useState<string>(ALL)
  const [enroll, setEnroll] = useState<EnrollStatus | typeof ALL>(ALL)
  const [writing, setWriting] = useState<JournalRow | null>(null)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [opened, setOpened] = useState<Set<string>>(new Set())

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== ALL && r.status !== status) return false
      if (major !== ALL && r.studentMajor !== major) return false
      if (grade !== ALL && String(r.studentGrade ?? '') !== grade) return false
      if (enroll !== ALL && r.studentStatus !== enroll) return false
      // 학과는 드롭다운이 맡았다 — 검색어까지 학과를 훑으면 두 조건이 서로를 덮는다.
      if (q && !`${r.studentName} ${r.studentNo} ${r.topic}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, status, major, grade, enroll])

  const allChecked = list.length > 0 && list.every(r => checked.has(r.requestId))

  const toggle = (requestId: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(requestId)) next.delete(requestId)
      else next.add(requestId)
      return next
    })
  }

  const toggleAll = () => {
    setChecked(prev => {
      const next = new Set(prev)
      list.forEach(r => (allChecked ? next.delete(r.requestId) : next.add(r.requestId)))
      return next
    })
  }

  const toggleOpen = (requestId: string) => {
    setOpened(prev => {
      const next = new Set(prev)
      if (next.has(requestId)) next.delete(requestId)
      else next.add(requestId)
      return next
    })
  }

  /** 기록에 복사될 스냅샷 — 신청(대장 행)과 담당자에서 온다. */
  const sourceOf = (r: JournalRow): RecordSource => ({
    requestId: r.requestId,
    studentId: r.studentId,
    studentName: r.studentName,
    studentMajor: r.studentMajor,
    type: r.type,
    method: r.method,
    topic: r.topic,
    date: r.date,
    counselorId: meId,
    counselorName: me.name,
  })

  // 대상 = 선택분, 선택이 없으면 화면에 보이는 목록 전체.
  // 필터로 가려진 선택은 제외한다 — 버튼에 적힌 건수와 실제 대상이 어긋나면 안 된다.
  const targetRows = checked.size > 0 ? list.filter(r => checked.has(r.requestId)) : list
  // 인쇄는 작성된 일지만 — 미작성 행은 인쇄할 서식이 없다.
  const printIds = targetRows.flatMap(r => (r.record ? [r.record.id] : []))

  const downloadCsv = () => {
    if (targetRows.length === 0) return
    const url = URL.createObjectURL(
      new Blob([`﻿${toJournalCsv(targetRows)}`], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `상담일지대장_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담일지</h1>
          <p className="admin-page-desc">
            완료된 상담의 일지 작성 현황과 내역입니다. 작성률 {summary.rate}% · 미작성 {summary.미작성}건
          </p>
        </div>
        <Link to="/counsel/schedule" className="admin-btn admin-btn-ghost">
          <LuCalendarCheck /> 일정 보기
        </Link>
      </header>

      <div className="admin-editor-hint">
        <LuInfo />
        <span>
          상담이 <strong>완료</strong>로 바뀌면 이 대장에 한 건이 생깁니다. 상담 주제를 누르면
          {' '}작성된 소견·코멘트를 펼쳐 볼 수 있고, 학생에게는 <strong>공개 코멘트만</strong> 노출됩니다.
        </span>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-icon"><LuFileText /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">작성 대상</span>
            <span className="admin-stat-value">{summary.total}<em>건</em></span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon accent"><LuPen /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">미작성</span>
            <span className="admin-stat-value">{summary.미작성}<em>건</em></span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon info"><LuPen /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">작성중</span>
            <span className="admin-stat-value">{summary.작성중}<em>건</em></span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon success"><LuFileText /></span>
          <div className="admin-stat-body">
            <span className="admin-stat-label">제출 완료</span>
            <span className="admin-stat-value">{summary.완료}<em>건</em></span>
          </div>
        </div>
      </div>

      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="학생 이름·학번·주제 검색"
          />
        </div>
        <label className="admin-select">
          <span>학과</span>
          <select value={major} onChange={e => setMajor(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.majors.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학년</span>
          <select value={grade} onChange={e => setGrade(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {options.grades.map(g => <option key={g} value={String(g)}>{g}학년</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>학적상태</span>
          <select value={enroll} onChange={e => setEnroll(e.target.value as EnrollStatus | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            {options.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>작성상태</span>
          <select value={status} onChange={e => setStatus(e.target.value as JournalStatus | typeof ALL)}>
            <option value={ALL}>{ALL}</option>
            {JOURNAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <span className="admin-toolbar-count">검색 결과 {list.length}건</span>
        {list.length > 0 && (
          <div className="admin-toolbar-actions">
            <Link
              to={`/counsel/records/print?ids=${printIds.join(',')}`}
              className={`admin-btn admin-btn-ghost sm${printIds.length === 0 ? ' is-disabled' : ''}`}
              target="_blank"
              rel="noreferrer"
              aria-disabled={printIds.length === 0}
              title={printIds.length === 0 ? '작성된 일지가 없습니다' : undefined}
            >
              <LuPrinter /> 선택 인쇄 ({printIds.length})
            </Link>
            <button type="button" className="admin-btn admin-btn-primary sm" onClick={downloadCsv}>
              <LuDownload /> 엑셀 다운로드 ({targetRows.length})
            </button>
          </div>
        )}
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState
            icon={LuFolderOpen}
            message={rows.length === 0 ? '작성 대상 상담이 없습니다.' : '조건에 맞는 일지가 없습니다.'}
          />
        ) : (
          <div className="admin-roster admin-journal-roster">
            <div className="admin-roster-head">
              <span className="admin-check-cell">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
              </span>
              <span>번호</span>
              <span>상담일</span>
              <span>시간</span>
              <span>학생</span>
              <span>학과</span>
              <span>진단유형</span>
              <span>유형 · 방식</span>
              <span>상담 주제</span>
              <span>작성상태</span>
              <span>작업</span>
            </div>
            {list.map((r, index) => {
              const open = opened.has(r.requestId)
              return (
                <div key={r.requestId}>
                  <div className="admin-roster-row">
                    <span className="admin-roster-cell admin-check-cell">
                      <input
                        type="checkbox"
                        checked={checked.has(r.requestId)}
                        onChange={() => toggle(r.requestId)}
                        aria-label={`${r.studentName} 상담일지 선택`}
                      />
                    </span>
                    <span className="admin-roster-cell">{list.length - index}</span>
                    <span className="admin-roster-cell">{r.date}</span>
                    <span className="admin-roster-cell"><small>{r.time || '—'}</small></span>
                    <span className="admin-roster-cell">
                      <button type="button" className="admin-inline-link" onClick={() => setInfoId(r.studentId)}>
                        {r.studentName}
                      </button>
                      <small>{r.studentNo}</small>
                    </span>
                    <span className="admin-roster-cell">{r.studentMajor}</span>
                    <span className="admin-roster-cell">
                      <span className={studentTypeClass(r.studentType)}>{typeLabel(r.studentType)}</span>
                    </span>
                    <span className="admin-roster-cell">{r.type}<small>{r.method}</small></span>
                    {/* 작성된 일지가 있는 행만 펼침 — 미작성은 펼칠 내용이 없다 */}
                    <span className="admin-roster-cell admin-journal-topic">
                      {r.record ? (
                        <button
                          type="button"
                          className={`admin-journal-topic-toggle${open ? ' is-open' : ''}`}
                          aria-expanded={open}
                          onClick={() => toggleOpen(r.requestId)}
                        >
                          <LuChevronDown /> {r.topic}
                        </button>
                      ) : r.topic}
                    </span>
                    <span className="admin-roster-cell">
                      <span className={`admin-chip ${JOURNAL_STATUS_CLASS[r.status]}`}>{r.status}</span>
                    </span>
                    <span className="admin-roster-cell admin-journal-actions">
                      <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setWriting(r)}>
                        <LuPen /> {r.status === '미작성' ? '작성' : '수정'}
                      </button>
                      {r.record && (
                        <Link
                          to={`/counsel/records/${r.record.id}/print`}
                          className="admin-btn admin-btn-ghost sm"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <LuPrinter /> 인쇄
                        </Link>
                      )}
                    </span>
                  </div>

                  {open && r.record && (
                    <div className="admin-journal-body">
                      <div className="admin-record-item-summary">
                        <span className="admin-record-label">상담 소견</span>
                        <p>{r.record.summary || '아직 작성되지 않았습니다.'}</p>
                      </div>
                      <div className="admin-record-item-comment">
                        <span className="admin-record-label">
                          <LuMessageSquareMore /> 학생 공개 코멘트
                        </span>
                        <p>{r.record.comment || '아직 작성되지 않았습니다.'}</p>
                      </div>
                      {r.record.followUp && (
                        <div className="admin-record-item-followup">
                          <span className="admin-record-label">후속 조치</span>
                          <p>{r.record.followUp}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {writing && (
        <JournalForm
          row={writing}
          source={sourceOf(writing)}
          onClose={() => setWriting(null)}
          onSaved={() => setRev(v => v + 1)}
        />
      )}
      {infoId && <StudentDetailModal studentId={infoId} role={me.role} onClose={() => setInfoId(null)} />}
    </div>
  )
}
