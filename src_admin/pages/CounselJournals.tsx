import {
  LuDownload, LuFileText, LuFolderOpen, LuInfo, LuPaperclip, LuPen, LuPrinter, LuSearch,
} from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import StudentDetailModal from '../components/StudentDetailModal'
import { getActiveCounselor } from '../data/counselors'
import {
  getJournalRows, getJournalSummary, JOURNAL_STATUSES, JOURNAL_STATUS_CLASS,
} from '../data/counselJournals'
import type { JournalRow, JournalStatus } from '../data/counselJournals'
import { toJournalCsv } from '../data/counselExport'
import { studentTypeClass } from '../data/studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'

// ─────────────────────────────────────────────────────────────────────────
// 상담일지 (화면 시안) — 완료된 상담의 일지 작성 대장.
//
// ⚠️ 화면만 구성한 단계다. 목록·집계는 단일소스(counselJournals)에서 오지만
//    작성 폼은 저장으로 연결돼 있지 않다(임시저장·제출 비활성).
//    저장을 붙일 때는 counselRecords.upsertRecord 를 쓰면 된다.
// ─────────────────────────────────────────────────────────────────────────

const ALL = '전체'

/** 일지 작성 패널 — 입력 항목 구성만. 저장은 아직 연결되지 않았다. */
function JournalForm({ row, onClose }: { row: JournalRow; onClose: () => void }) {
  const record = row.record
  return (
    <AdminModal title={`상담일지 — ${row.studentName}`} size="lg" onClose={onClose}>
      <div className="admin-editor-hint">
        <LuInfo />
        <span>
          화면 시안 단계입니다. 항목 구성만 확인하고, <strong>임시저장·제출은 아직 동작하지 않습니다.</strong>
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
        <textarea rows={5} defaultValue={record?.summary ?? ''} placeholder="상담에서 다룬 내용과 상담사 소견을 기록합니다." />
      </label>

      <label className="admin-field">
        <span>학생 공개 코멘트</span>
        <textarea rows={3} defaultValue={record?.comment ?? ''} placeholder="학생 화면 '상담 현황'에 그대로 노출됩니다." />
        <small className="admin-field-hint">학생이 읽는 문구입니다. 소견과 분리해 작성하세요.</small>
      </label>

      <div className="admin-journal-grid">
        <label className="admin-field">
          <span>후속 조치</span>
          <input type="text" defaultValue={record?.followUp ?? ''} placeholder="예: 이력서 첨삭 재상담 권고" />
        </label>
        <label className="admin-field">
          <span>다음 상담 권고일</span>
          <input type="date" />
        </label>
      </div>

      <div className="admin-field">
        <span>첨부파일</span>
        <div className="admin-journal-attach">
          <LuPaperclip />
          <span>진단 결과지·이력서 등 상담 근거 자료를 첨부합니다.</span>
          <button type="button" className="admin-btn admin-btn-ghost sm" disabled>파일 선택</button>
        </div>
      </div>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost sm" onClick={onClose}>닫기</button>
        <button type="button" className="admin-btn admin-btn-ghost sm" disabled>임시저장</button>
        <button type="button" className="admin-btn admin-btn-primary sm" disabled>일지 제출</button>
      </div>
    </AdminModal>
  )
}

export default function CounselJournals() {
  const me = getActiveCounselor()
  const rows = useMemo(() => getJournalRows(me.id), [me.id])
  const summary = useMemo(() => getJournalSummary(rows), [rows])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<JournalStatus | typeof ALL>(ALL)
  const [writing, setWriting] = useState<JournalRow | null>(null)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== ALL && r.status !== status) return false
      if (q && !`${r.studentName} ${r.studentNo} ${r.studentMajor} ${r.topic}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, status])

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
            완료된 상담의 일지 작성 현황입니다. 작성률 {summary.rate}% · 미작성 {summary.미작성}건
          </p>
        </div>
        <Link to="/counsel/records" className="admin-btn admin-btn-ghost">
          <LuFolderOpen /> 완료 상담 내역
        </Link>
      </header>

      <div className="admin-editor-hint">
        <LuInfo />
        <span>
          상담이 <strong>완료</strong>로 바뀌면 이 대장에 한 건이 생깁니다. 제출된 일지는
          {' '}<strong>완료 상담 내역</strong>에서 열람·인쇄하고, 학생에게는 공개 코멘트만 노출됩니다.
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
            placeholder="학생 이름·학번·학과·주제 검색"
          />
        </div>
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
            {list.map((r, index) => (
              <div key={r.requestId} className="admin-roster-row">
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
                <span className="admin-roster-cell admin-journal-topic">{r.topic}</span>
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
            ))}
          </div>
        )}
      </section>

      {writing && <JournalForm row={writing} onClose={() => setWriting(null)} />}
      {infoId && <StudentDetailModal studentId={infoId} role={me.role} onClose={() => setInfoId(null)} />}
    </div>
  )
}
