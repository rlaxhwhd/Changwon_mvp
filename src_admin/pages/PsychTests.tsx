import { studentDisplayName } from '../../shared/studentDisplayName'
import { useState } from 'react'
import { LuPlus, LuTrash2 } from 'react-icons/lu'
import AdminModal from '../components/AdminModal'
import PageNumbers from '../../shared/components/PageNumbers'
import { codeItems } from '../../shared/metadataStore'
import { queryPsychTestRequests, upsertPsychTest } from '../data/psychTests'
import type { PsychTestFilters, PsychTestRequest } from '../data/psychTests'
import { PSYCH_TEST_TYPES } from '../data/schema/psychTest'
import type { PsychTestScale, PsychTestStatus } from '../data/schema/psychTest'
import { useListData } from '../hooks/useListData'
import { useAsyncAction } from '../../shared/useAsyncAction'
import { ApiError } from '../../shared/api'
import './ProfessorCounsel.css'

const PAGE_SIZE = 10
const today = () => new Date().toISOString().slice(0, 10)
const initialFilters: PsychTestFilters = { status: '', testCode: '', q: '' }
const dateOf = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(iso)).replaceAll('-', '.')
const testName = (row: PsychTestRequest) => row.testLabel ?? (row.result ? (row.result.testNameEtc ?? PSYCH_TEST_TYPES.find(t => t.code === row.result!.testCode)?.label) : null) ?? '-'
const belongs = (row: PsychTestRequest) => [row.college, row.major].filter(Boolean).join(' ')
// 신청한 검사가 결과 검사 종류에 그대로 있으면 미리 고른다(마음검진처럼 묶음 검사는 상담사가 고른다).
const defaultResultCode = (row: PsychTestRequest) =>
  PSYCH_TEST_TYPES.some(t => t.code === row.testCode) ? row.testCode! : PSYCH_TEST_TYPES[0].code

/** 결과 작성 모달 — 척도 구성은 검사도구마다 달라 자유 배열로 받는다(우리가 채점하지 않는다). */
function ResultModal({ row, onClose, onSaved }: { row: PsychTestRequest; onClose: () => void; onSaved: () => void }) {
  const prev = row.result
  const [testCode, setTestCode] = useState(prev?.testCode ?? defaultResultCode(row))
  const [testNameEtc, setTestNameEtc] = useState(prev?.testNameEtc ?? '')
  const [testedAt, setTestedAt] = useState(prev?.testedAt ?? row.slot?.date ?? today())
  const [scales, setScales] = useState<PsychTestScale[]>(prev?.scales ?? [{ label: '', score: 0 }])
  const [interpretation, setInterpretation] = useState(prev?.interpretation ?? '')
  const [opinion, setOpinion] = useState(prev?.opinion ?? '')
  const [openToStudent, setOpenToStudent] = useState(prev?.openToStudent ?? false)
  const [conflict, setConflict] = useState(false)

  const etcNeeded = testCode === 'ETC' && testNameEtc.trim() === ''
  const valid = testedAt !== '' && interpretation.trim() !== '' && opinion.trim() !== '' && !etcNeeded

  const updateScale = (index: number, patch: Partial<PsychTestScale>) =>
    setScales(list => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const { run, saving, error } = useAsyncAction()
  // 서버가 정본이다 — 응답을 기다린 뒤에만 닫는다. 실패는 모달 안에 남긴다.
  const save = (status: PsychTestStatus) => {
    if (status === '완료' && !valid) return
    run(async () => {
      try {
        await upsertPsychTest(row.requestId, {
          expectedVersion: prev?.version ?? 0,
          testCode,
          testNameEtc: testCode === 'ETC' ? testNameEtc.trim() : undefined,
          testedAt,
          scales: scales.filter(item => item.label.trim() !== ''),
          interpretation: interpretation.trim(),
          opinion: opinion.trim(),
          openToStudent,
          status,
        })
        onSaved()
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 409) setConflict(true)
        throw cause
      }
    })
  }

  return (
    <AdminModal title="심리검사 결과 작성" size="lg" onClose={onClose}>
      <div className="counsel-profile-heading">
        <div>
          <strong>{studentDisplayName(row.studentName, row.studentId)}</strong>
          <span>{row.studentNo}</span>
        </div>
        <span className="admin-chip">{row.enrollmentStatus}</span>
      </div>
      <p className="admin-field-hint">
        {belongs(row)} {row.grade ? `${row.grade}학년` : ''} · 신청 검사 「{testName(row)}」{row.purpose && ` · 요청 내용 “${row.purpose}”`}
      </p>

      <div className="counsel-request-detail-grid">
        <label>
          <span>검사 종류</span>
          <select value={testCode} onChange={event => setTestCode(event.target.value)}>
            {PSYCH_TEST_TYPES.filter(item => item.active).map(item => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>실시일</span>
          <input type="date" value={testedAt} onChange={event => setTestedAt(event.target.value)} />
        </label>
        {testCode === 'ETC' && (
          <label>
            <span>검사명 <em className="counsel-required">필수</em></span>
            <input value={testNameEtc} onChange={event => setTestNameEtc(event.target.value)} placeholder="검사 도구명" />
          </label>
        )}
      </div>

      <section className="admin-scale-section">
        <div className="admin-scale-head">
          <h3>척도별 결과</h3>
          <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setScales(list => [...list, { label: '', score: 0 }])}>
            <LuPlus /> 척도 추가
          </button>
        </div>
        <p className="admin-field-hint">이 시스템은 채점하지 않습니다. 오프라인 검사도구의 결과를 그대로 옮겨 적습니다.</p>
        {scales.map((scale, index) => (
          <div className="admin-scale-row" key={index}>
            <input value={scale.label} onChange={event => updateScale(index, { label: event.target.value })} placeholder="척도명" />
            <input type="number" value={scale.score} onChange={event => updateScale(index, { score: Number(event.target.value) })} placeholder="점수" />
            <input value={scale.note ?? ''} onChange={event => updateScale(index, { note: event.target.value })} placeholder="해석 메모 (선택)" />
            <button type="button" className="admin-icon-btn danger" aria-label="척도 삭제" onClick={() => setScales(list => list.filter((_, i) => i !== index))}>
              <LuTrash2 />
            </button>
          </div>
        ))}
      </section>

      <label className="admin-field">
        <span>결과 해석 <em className="counsel-required">필수</em></span>
        <textarea rows={4} value={interpretation} onChange={event => setInterpretation(event.target.value)} placeholder="검사도구 기준의 결과 해석을 적습니다." />
      </label>
      <label className="admin-field">
        <span>상담사 소견 <em className="counsel-required">필수</em></span>
        <textarea rows={4} value={opinion} onChange={event => setOpinion(event.target.value)} placeholder="상담 맥락에서의 소견과 후속 권고를 적습니다." />
      </label>
      <label className="admin-check">
        <input type="checkbox" checked={openToStudent} onChange={event => setOpenToStudent(event.target.checked)} />
        <span>학생에게 결과 공개</span>
      </label>

      {error && <p className="admin-field-hint" role="alert">{error}</p>}
      {conflict && <div>
        <p className="admin-field-hint">작성한 내용은 아직 저장되지 않았습니다. 창을 닫고 목록에서 최신 결과를 다시 열어 주세요.</p>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onSaved}>닫고 최신 결과 보기</button>
      </div>}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>닫기</button>
        <button type="button" className="admin-btn admin-btn-ghost" disabled={saving || conflict} onClick={() => save('작성중')}>임시 저장</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={!valid || saving || conflict} onClick={() => save('완료')}>{saving ? '저장 중…' : '작성 완료'}</button>
      </div>
    </AdminModal>
  )
}

const CSV_HEAD = ['번호', '이름', '학번', '소속', '학년', '심리검사', '검사방법', '신청일시', '상담일시', '상태']
const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

/** 검사관리 = 심리검사 현황. 학생이 신청한 오프라인 심리검사와 결과 작성 상태를 본다. */
export default function PsychTests() {
  const [draft, setDraft] = useState<PsychTestFilters>(initialFilters)
  const [filters, setFilters] = useState<PsychTestFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<PsychTestRequest | null>(null)
  const [message, setMessage] = useState('')
  const { data, isLoading, error, refetch } = useListData(queryPsychTestRequests, { ...filters, page, pageSize: PAGE_SIZE })
  const kinds = codeItems.filter(item => item.group_code === 'PSYCH_TEST_KIND' && item.is_active).sort((a, b) => a.sort_order - b.sort_order)
  const pages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE))
  const numberOf = (index: number) => data.totalCount - (data.page - 1) * PAGE_SIZE - index
  const allChecked = data.items.length > 0 && data.items.every(row => selected.has(row.requestId))
  const toggle = (id: string) => setSelected(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next })

  // 체크한 행이 있으면 그 행만, 없으면 지금 조건의 전체 명단을 내려받는다(100건씩 나눠 받는다).
  const download = async () => {
    setMessage('')
    try {
      let rows: PsychTestRequest[] = data.items.filter(row => selected.has(row.requestId))
      if (!rows.length) {
        for (let p = 1; p === 1 || rows.length < data.totalCount; p += 1) {
          const chunk = await queryPsychTestRequests({ ...filters, page: p, pageSize: 100 })
          rows.push(...chunk.items)
          if (!chunk.items.length) break
        }
      }
      const body = [CSV_HEAD, ...rows.map((row, index) => [index + 1, row.studentName, row.studentNo, belongs(row), row.grade ?? '', testName(row),
        row.method, dateOf(row.requestedAt), row.slot ? `${row.slot.date} ${row.slot.start}` : '', row.status])]
        .map(line => line.map(csvCell).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `심리검사현황_${today().replaceAll('-', '')}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '명단을 내려받지 못했습니다.')
    }
  }

  return (
    <div className="admin-page professor-counsel-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">심리검사 현황</h1>
          <p className="admin-page-desc">학생이 신청한 오프라인 심리검사를 확인하고, 검사 후 결과를 작성합니다. 결과 작성 완료가 곧 신청 완료입니다.</p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="admin-btn psych-test-view" onClick={download}>명단 다운로드</button>
          {/* 학교 SMS 발송 연동이 아직 없다(backend/app/sms.py 경계만 있음) — 보내는 척하지 않는다. */}
          <button type="button" className="admin-btn admin-btn-ghost" disabled title="학교 SMS 연동 후 사용할 수 있습니다.">SMS발송</button>
          <button type="button" className="admin-btn admin-btn-ghost" disabled title="학교 SMS 연동 후 사용할 수 있습니다.">SMS전체 발송</button>
        </div>
      </header>

      <form className="professor-report-filters" onSubmit={event => { event.preventDefault(); setFilters({ ...draft }); setPage(1); setSelected(new Set()) }}>
        <div className="admin-filterbar">
          <label className="admin-select"><span>심리검사</span>
            <select value={draft.testCode} onChange={e => setDraft(old => ({ ...old, testCode: e.target.value }))}>
              <option value="">전체</option>{kinds.map(kind => <option key={kind.code} value={kind.code}>{kind.label}</option>)}
            </select>
          </label>
          <label className="admin-select"><span>상태</span>
            <select value={draft.status} onChange={e => setDraft(old => ({ ...old, status: e.target.value as PsychTestFilters['status'] }))}>
              <option value="">전체</option><option>신청</option><option>완료</option><option>취소</option>
            </select>
          </label>
          <div className="admin-search"><input aria-label="학생 검색어" placeholder="이름 / 학번 입력" value={draft.q} onChange={e => setDraft(old => ({ ...old, q: e.target.value }))} /></div>
          <button className="admin-btn admin-btn-primary" type="submit">검색</button>
          <button className="admin-btn admin-btn-ghost" type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); setPage(1); setSelected(new Set()) }}>초기화</button>
        </div>
      </form>
      {(message || error) && <p role="alert" className="admin-form-hint-warn">{message || error?.message}</p>}

      <div className="admin-toolbar">
        <span className="admin-toolbar-count" aria-live="polite">총 {data.totalCount}건{selected.size > 0 && ` · ${selected.size}건 선택`}{isLoading && ' · 불러오는 중…'}</span>
      </div>
      <section className="admin-card">
        <div className="professor-report-table-wrap"><table className="professor-report-table psych-test-table">
          <thead><tr>
            <th scope="col"><input type="checkbox" aria-label="이 페이지 전체 선택" checked={allChecked}
              onChange={() => setSelected(old => { const next = new Set(old); data.items.forEach(row => allChecked ? next.delete(row.requestId) : next.add(row.requestId)); return next })} /></th>
            {['번호', '이름', '학번', '소속', '학년', '심리검사', '검사방법', '신청일시', '상담일시', '상태', '결과관리'].map(h => <th scope="col" key={h}>{h}</th>)}
          </tr></thead>
          <tbody>{!data.items.length ? <tr><td colSpan={12} className="professor-home-empty">{isLoading ? '불러오는 중…' : '심리검사 신청 내역이 없습니다.'}</td></tr>
            : data.items.map((row, index) => <tr key={row.requestId}>
              <td><input type="checkbox" aria-label={`${row.studentName} 선택`} checked={selected.has(row.requestId)} onChange={() => toggle(row.requestId)} /></td>
              <td>{numberOf(index)}</td>
              <td>{studentDisplayName(row.studentName, row.studentId)}</td>
              <td>{row.studentNo}</td>
              <td className="psych-test-belongs">{belongs(row)}</td>
              <td>{row.grade ?? '-'}</td>
              <td>{testName(row)}</td>
              <td>{row.method}</td>
              <td>{dateOf(row.requestedAt)}</td>
              <td>{row.slot ? <>{row.slot.date}<br />{row.slot.start}</> : '-'}</td>
              <td>{row.status}</td>
              <td>{row.status === '취소' ? '-' : row.result?.status === '완료'
                ? <button type="button" className="admin-btn sm psych-test-view" onClick={() => setTarget(row)}>조회</button>
                : <button type="button" className="admin-btn admin-btn-primary sm" onClick={() => setTarget(row)}>{row.result ? '이어쓰기' : '결과작성'}</button>}</td>
            </tr>)}</tbody>
        </table></div>
        {pages > 1 && <div className="admin-pagination">
          <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
          <PageNumbers page={page} pages={pages} onChange={setPage} />
          <span className="admin-page-info">{page} / {pages} 페이지</span>
          <button className="admin-page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>}
      </section>

      {target && <ResultModal key={target.requestId} row={target} onClose={() => setTarget(null)}
        onSaved={() => { setTarget(null); refetch() }} />}
    </div>
  )
}
