import type { IconType } from 'react-icons'
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronsRight,
  LuDownload,
  LuHand,
  LuInfo,
  LuList,
  LuRotateCcw,
  LuSearch,
  LuTrash2,
  LuUserCheck,
  LuUserX,
} from 'react-icons/lu'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPenaltyList, waivePenalty, clearPenalty } from '../data/penalties'
import type { StudentPenalty, PenaltyEntry } from '../data/penalties'
import { penaltyLevel } from '../data/schema/penalty'
import { collegeOf } from '../data/colleges'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import './ProgramBlacklist.css'

const KIND_LABEL: Record<PenaltyEntry['kind'], { label: string; icon: IconType }> = {
  noshow: { label: '노쇼 벌점', icon: LuUserX },
  manual: { label: '수동 부여', icon: LuHand },
  waive: { label: '차감·해제', icon: LuRotateCcw },
}

const ALL = '전체'
const PER_PAGE = 10

function toneChip(tone: 'ok' | 'warn' | 'danger'): string {
  switch (tone) {
    case 'danger':
      return 'admin-chip-cancel'
    case 'warn':
      return 'admin-chip-wait'
    case 'ok':
      return 'admin-chip-done'
  }
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 행 클릭 시 모달에 뜨는 벌점 이력 + 차감·해제 (기존 카드 내용 재사용) */
function PenaltyDetail({ record, onDone }: { record: StudentPenalty; onDone: () => void }) {
  const level = penaltyLevel(record.total)
  const [waivePts, setWaivePts] = useState('')
  const [waiveReason, setWaiveReason] = useState('')

  const canWaive = Number(waivePts) > 0 && waiveReason.trim() !== ''

  const handleWaive = () => {
    if (!canWaive) return
    waivePenalty(record.studentId, Number(waivePts), waiveReason.trim())
    onDone()
  }

  const handleClear = () => {
    if (!window.confirm(`${record.studentName} 학생의 벌점 이력을 전부 해제할까요?`)) return
    clearPenalty(record.studentId)
    onDone()
  }

  return (
    <div className="blk-detail">
      <div className="blk-detail-head">
        <div className="blk-detail-who">
          <strong>{record.studentName}</strong>
          <small>{collegeOf(record.studentMajor)} · {record.studentMajor} · {record.studentId}</small>
        </div>
        <span className="admin-blacklist-total"><em>{record.total}</em>점</span>
        <span className={`admin-chip ${toneChip(level.tone)}`}>{level.label}</span>
      </div>

      <ul className="admin-penalty-history">
        {[...record.entries].reverse().map(e => (
          <li key={e.id} className={`admin-penalty-entry${e.points < 0 ? ' is-waive' : ''}`}>
            <span className="admin-penalty-entry-kind">
              {(() => { const Icon = KIND_LABEL[e.kind].icon; return <Icon /> })()} {KIND_LABEL[e.kind].label}
            </span>
            <span className="admin-penalty-entry-reason">{e.reason}</span>
            <span className={`admin-penalty-entry-points${e.points < 0 ? ' minus' : ''}`}>
              {e.points > 0 ? `+${e.points}` : e.points}
            </span>
            <span className="admin-penalty-entry-at">{fmtDateTime(e.at)}</span>
          </li>
        ))}
      </ul>

      <div className="admin-blacklist-actions">
        <label className="admin-field admin-blacklist-pts">
          <span>차감 점수</span>
          <input
            type="number"
            min={1}
            value={waivePts}
            onChange={e => setWaivePts(e.target.value)}
            placeholder="예: 10"
          />
        </label>
        <label className="admin-field admin-blacklist-reason">
          <span>차감·해제 사유</span>
          <input
            type="text"
            value={waiveReason}
            onChange={e => setWaiveReason(e.target.value)}
            placeholder="예: 소명 인정 — 병결 확인"
          />
        </label>
        <button className="admin-btn admin-btn-ghost sm" disabled={!canWaive} onClick={handleWaive}>
          <LuRotateCcw /> 차감
        </button>
        <button className="admin-btn admin-btn-danger-ghost sm" onClick={handleClear}>
          <LuTrash2 /> 전체 해제
        </button>
      </div>
    </div>
  )
}

export default function ProgramBlacklist() {
  const [refreshKey, setRefreshKey] = useState(0)

  // 벌점 레코드 → 표 행 뷰모델 (학번=studentId, 대학=학과 매핑 파생)
  const all = useMemo(
    () =>
      getPenaltyList().map(record => ({
        record,
        studentNo: record.studentId,
        college: collegeOf(record.studentMajor),
      })),
    [refreshKey],
  )

  const totalPoints = all.reduce((sum, r) => sum + r.record.total, 0)

  // 필터 옵션은 목록에서 파생 (하드코딩 금지)
  const colleges = useMemo(() => [...new Set(all.map(r => r.college))].sort(), [all])
  const majors = useMemo(() => [...new Set(all.map(r => r.record.studentMajor))].sort(), [all])

  const [college, setCollege] = useState(ALL)
  const [major, setMajor] = useState(ALL)
  const [ptsMin, setPtsMin] = useState(ALL)
  const [scope, setScope] = useState(ALL)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<StudentPenalty | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const minPts = ptsMin === ALL ? 0 : Number(ptsMin)
    return all.filter(r => {
      if (college !== ALL && r.college !== college) return false
      if (major !== ALL && r.record.studentMajor !== major) return false
      if (r.record.total < minPts) return false
      if (q) {
        const name = r.record.studentName.toLowerCase()
        const no = r.studentNo.toLowerCase()
        const maj = r.record.studentMajor.toLowerCase()
        const hay =
          scope === '이름' ? name
          : scope === '학번' ? no
          : scope === '학과' ? maj
          : `${name} ${no} ${maj}`
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [all, college, major, ptsMin, scope, query])

  // 필터 변경 시 1페이지로
  useEffect(() => { setPage(1) }, [college, major, ptsMin, scope, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows = filtered.slice((pageClamped - 1) * PER_PAGE, pageClamped * PER_PAGE)

  // 페이지 번호 윈도우 (최대 10개)
  const pageWindow = useMemo(() => {
    const size = 10
    const start = Math.max(1, Math.min(pageClamped - 4, totalPages - size + 1))
    const end = Math.min(totalPages, start + size - 1)
    const out: number[] = []
    for (let p = start; p <= end; p++) out.push(p)
    return out
  }, [pageClamped, totalPages])

  const downloadCsv = () => {
    const header = ['번호', '이름', '학번', '대학', '학과', '벌점점수']
    const rows = filtered.map((r, idx) => [
      String(filtered.length - idx),
      r.record.studentName,
      r.studentNo,
      r.college,
      r.record.studentMajor,
      String(r.record.total),
    ])
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '블랙리스트.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const refresh = () => {
    setRefreshKey(k => k + 1)
    setSelected(null)
  }

  return (
    <div className="admin-page blk">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">블랙리스트 관리</h1>
          <p className="admin-page-desc">
            비교과 프로그램 신청 후 미참여(노쇼)한 학생의 누적 벌점을 관리합니다. 대상 {all.length}명 · 누적 {totalPoints}점
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs" className="admin-btn admin-btn-ghost">
            <LuList /> 프로그램 목록
          </Link>
        </div>
      </header>

      <div className="admin-editor-hint">
        <LuInfo />
        벌점은 프로그램 상세의 <strong>출석 체크(노쇼)</strong>에서 자동 부여됩니다. 행을 클릭하면 벌점 이력을 확인하고 차감·해제할 수 있습니다. 누적 벌점·사유는 학생 화면에도 반영됩니다.
      </div>

      {/* 검색·필터 카드 */}
      <form className="blk-filter" onSubmit={e => e.preventDefault()}>
        <div className="blk-filter-row">
          <select className="blk-field" value={college} onChange={e => setCollege(e.target.value)} aria-label="대학">
            <option value={ALL}>대학</option>
            {colleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="blk-field" value={major} onChange={e => setMajor(e.target.value)} aria-label="학과">
            <option value={ALL}>학과</option>
            {majors.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="blk-field" value={ptsMin} onChange={e => setPtsMin(e.target.value)} aria-label="벌점점수">
            <option value={ALL}>벌점점수</option>
            <option value="10">10점 이상</option>
            <option value="20">20점 이상</option>
            <option value="30">30점 이상</option>
          </select>
          <button type="submit" className="blk-search-btn"><LuSearch /> 검색</button>
        </div>
        <div className="blk-filter-row">
          <span className="blk-label">검색조건</span>
          <select className="blk-field blk-field-sm" value={scope} onChange={e => setScope(e.target.value)} aria-label="검색조건">
            <option value={ALL}>전체</option>
            <option value="이름">이름</option>
            <option value="학번">학번</option>
            <option value="학과">학과</option>
          </select>
          <div className="blk-search">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요"
              aria-label="검색어"
            />
            <LuSearch aria-hidden="true" />
          </div>
        </div>
      </form>

      {/* 카운트 + 엑셀 다운로드 */}
      <div className="blk-toolbar">
        <span className="blk-count">총 <em>{filtered.length}</em> 개</span>
        <button type="button" className="blk-excel-btn" onClick={downloadCsv}>
          <LuDownload /> 엑셀 다운로드
        </button>
      </div>

      <section className="admin-card blk-card">
        {all.length === 0 ? (
          <EmptyState
            icon={LuUserCheck}
            title="블랙리스트가 비어 있습니다"
            message="노쇼로 처리된 학생이 아직 없습니다. 프로그램 상세에서 출석을 '노쇼'로 체크하면 여기 자동으로 추가됩니다."
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={LuUserCheck} message="조건에 맞는 학생이 없습니다." />
        ) : (
          <>
            <div className="blk-table" role="table">
              <div className="blk-thead" role="row">
                <span>번호</span>
                <span>이름</span>
                <span>학번</span>
                <span>대학</span>
                <span>학과</span>
                <span>벌점점수</span>
              </div>
              {pageRows.map((r, i) => {
                const no = filtered.length - ((pageClamped - 1) * PER_PAGE + i)
                return (
                  <button
                    type="button"
                    className="blk-row"
                    role="row"
                    key={r.record.studentId}
                    onClick={() => setSelected(r.record)}
                  >
                    <span className="blk-c-no">{no}</span>
                    <span className="blk-c-name">{r.record.studentName}</span>
                    <span className="blk-c-mono">{r.studentNo}</span>
                    <span>{r.college}</span>
                    <span>{r.record.studentMajor}</span>
                    <span className="blk-c-pts"><em>{r.record.total}</em></span>
                  </button>
                )
              })}
            </div>

            <nav className="blk-pager" aria-label="블랙리스트 페이지">
              <button type="button" disabled={pageClamped === 1} onClick={() => setPage(pageClamped - 1)} aria-label="이전">
                <LuChevronLeft />
              </button>
              {pageWindow.map(p => (
                <button
                  type="button"
                  key={p}
                  className={p === pageClamped ? 'active' : ''}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button type="button" disabled={pageClamped === totalPages} onClick={() => setPage(pageClamped + 1)} aria-label="다음">
                <LuChevronRight />
              </button>
              <button type="button" disabled={pageClamped === totalPages} onClick={() => setPage(totalPages)} aria-label="마지막">
                <LuChevronsRight />
              </button>
            </nav>
          </>
        )}
      </section>

      {selected && (
        <AdminModal title={`${selected.studentName} · 벌점 이력`} onClose={() => setSelected(null)} size="md">
          <PenaltyDetail record={selected} onDone={refresh} />
        </AdminModal>
      )}
    </div>
  )
}
