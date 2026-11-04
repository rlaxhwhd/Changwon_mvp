/** 취업예측분석시스템 — 졸업(예정)자 취업 현황 대장(시스템관리자). 목록 디자인은 교수 상담신청 접수 화면을 따른다. */
import { useEffect, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuDownload, LuLoaderCircle, LuSearch, LuUpload } from 'react-icons/lu'
import PageNumbers from '../../shared/components/PageNumbers'
import { useAsyncAction } from '../../shared/useAsyncAction'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import {
  deleteEmployments, dotMonth, downloadEmployments, fetchEmploymentOptions, queryEmployments, saveEmployment,
  searchAcademicStudents, uploadEmployments, UploadRejected,
} from '../data/employmentReport'
import type {
  AcademicStudent, EmploymentFilters, EmploymentOptions, EmploymentRow, SearchField, UploadError,
} from '../data/employmentReport'
import { totalPages } from '../data/query'
import { useListData } from '../hooks/useListData'
import './ProfessorCounsel.css'

const PAGE_SIZE = 10
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 20 }, (_, i) => THIS_YEAR + 2 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const FIELDS: [SearchField, string][] = [['college', '단과대학'], ['dept', '학과'], ['studentNo', '학번'], ['sex', '성별'], ['name', '이름']]
const UNKNOWN = '미확인'

interface Draft { surveyYear: string; gradFromYear: string; gradFromMonth: string; gradToYear: string; gradToMonth: string; field: SearchField; q: string }
const EMPTY_DRAFT: Draft = { surveyYear: '', gradFromYear: '', gradFromMonth: '', gradToYear: '', gradToMonth: '', field: 'name', q: '' }

/** 졸업년도만 고르면 시작은 1월, 끝은 12월로 본다. */
function toFilters(d: Draft): EmploymentFilters {
  return {
    surveyYear: d.surveyYear ? Number(d.surveyYear) : undefined,
    graduationFrom: d.gradFromYear ? `${d.gradFromYear}-${d.gradFromMonth || '01'}` : undefined,
    graduationTo: d.gradToYear ? `${d.gradToYear}-${d.gradToMonth || '12'}` : undefined,
    field: d.field,
    q: d.q.trim(),
  }
}

function StudentSearchModal({ initial, onPick, onClose }: { initial: string; onPick: (s: AcademicStudent) => void; onClose: () => void }) {
  const [q, setQ] = useState(initial)
  const [items, setItems] = useState<AcademicStudent[] | null>(null)
  const { run, saving, error } = useAsyncAction()
  const search = (value: string) => {
    if (!value.trim()) return
    run(async () => setItems(await searchAcademicStudents(value.trim())))
  }
  // 학번을 적고 검색을 누르면 그 값으로 바로 찾는다.
  useEffect(() => { if (initial.trim()) search(initial) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AdminModal title="학생 검색" size="lg" onClose={onClose}>
      <form className="admin-picker-search" onSubmit={event => { event.preventDefault(); search(q) }}>
        <div className="admin-search">
          <LuSearch />
          <input value={q} onChange={event => setQ(event.target.value)} placeholder="학번 또는 이름" aria-label="학번 또는 이름" autoFocus />
        </div>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}><LuSearch /> 검색</button>
      </form>
      {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}
      {saving ? <div className="admin-loading"><LuLoaderCircle className="admin-spin" /> 찾는 중…</div>
        : items === null ? <p className="admin-field-hint">학번(앞자리) 또는 이름으로 검색합니다. 재학·졸업생 모두 조회됩니다.</p>
        : items.length === 0 ? <p className="admin-field-hint">조건에 맞는 학생이 없습니다.</p>
        : <div className="professor-report-table-wrap"><table className="dc-list-table professor-report-table forecast-picker-table">
          <thead><tr>{['학번', '이름', '단과대학', '학과', '학적', '졸업년월', '선택'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>{items.map(s => <tr key={s.studentNo} className="forecast-picker-row" onClick={() => onPick(s)}>
            <td>{s.studentNo}</td><td>{s.name ?? '-'}</td><td>{s.collegeName ?? '-'}</td><td>{s.deptName}</td>
            <td>{s.status}</td><td>{dotMonth(s.graduationMonth)}</td>
            <td><button type="button" className="admin-btn admin-btn-ghost sm" onClick={event => { event.stopPropagation(); onPick(s) }}>선택</button></td>
          </tr>)}</tbody>
        </table></div>}
      {items && items.length === 50 && <p className="admin-field-hint">50명까지만 보여 줍니다. 검색어를 더 자세히 입력하세요.</p>}
    </AdminModal>
  )
}

interface FormState {
  surveyYear: string; studentNo: string; student: Pick<AcademicStudent, 'name' | 'collegeName' | 'deptName' | 'sex'> | null
  gradYear: string; gradMonth: string; companyName: string; duty: string; companyTypeCode: string; regionCode: string
  employedYear: string; employedMonth: string
}

function fromRow(row: EmploymentRow | null): FormState {
  const [gradYear = '', gradMonth = ''] = row?.graduationMonth?.split('-') ?? []
  const [employedYear = '', employedMonth = ''] = row?.employedMonth.split('-') ?? []
  return {
    surveyYear: String(row?.surveyYear ?? THIS_YEAR), studentNo: row?.studentNo ?? '',
    student: row ? { name: row.name, collegeName: row.collegeName, deptName: row.deptName ?? '', sex: row.sex } : null,
    gradYear, gradMonth, companyName: row?.companyName ?? '', duty: row?.duty ?? '',
    companyTypeCode: row?.companyTypeCode ?? '', regionCode: row?.regionCode ?? '', employedYear, employedMonth,
  }
}

function EmploymentFormModal({ row, options, onClose, onSaved }: {
  row: EmploymentRow | null; options: EmploymentOptions; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(() => fromRow(row))
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const { run, saving } = useAsyncAction()
  const set = (patch: Partial<FormState>) => setForm(old => ({ ...old, ...patch }))
  const pick = (s: AcademicStudent) => {
    const [gradYear = '', gradMonth = ''] = s.graduationMonth?.split('-') ?? []
    // 학사에 졸업년월이 있으면 채우고, 졸업예정자처럼 없으면 입력값을 그대로 둔다.
    set({ studentNo: s.studentNo, student: s, ...(s.graduationMonth ? { gradYear, gradMonth } : {}) })
    setSearching(false)
  }
  const submit = () => {
    const missing = [
      !form.studentNo.trim() && '학번', !form.companyName.trim() && '취업처', !form.duty.trim() && '부서/업무',
      !form.companyTypeCode && '기업분류', !form.regionCode && '지역', !(form.employedYear && form.employedMonth) && '취업일자',
    ].filter(Boolean)
    if (missing.length) { setMessage(`${missing.join(', ')}을(를) 입력하세요.`); return }
    const gradMonth = form.gradMonth.padStart(2, '0')
    if ((form.gradYear || form.gradMonth) && !(/^\d{4}$/.test(form.gradYear) && /^(0[1-9]|1[0-2])$/.test(gradMonth))) {
      setMessage('졸업년월은 년도 4자리, 월 2자리로 입력하세요.'); return
    }
    setMessage('')
    run(async () => {
      try {
        await saveEmployment(row?.id ?? null, {
          surveyYear: Number(form.surveyYear), studentNo: form.studentNo.trim(),
          graduationMonth: form.gradYear ? `${form.gradYear}-${gradMonth}` : null,
          companyName: form.companyName.trim(), duty: form.duty.trim(), companyTypeCode: form.companyTypeCode,
          regionCode: form.regionCode, employedMonth: `${form.employedYear}-${form.employedMonth}`,
        })
        onSaved()
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : '저장하지 못했습니다.')
      }
    })
  }
  const required = <em className="forecast-required" aria-hidden="true">*</em>
  return (
    <AdminModal title={row ? '취업 현황 수정' : '취업 현황 신규등록'} size="xl" onClose={onClose}>
      <dl className="professor-personal-grid forecast-form">
        <dt>조사년도{required}</dt>
        <dd className="professor-personal-wide">
          <select aria-label="조사년도" value={form.surveyYear} onChange={e => set({ surveyYear: e.target.value })}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </dd>
        <dt>단과대학</dt><dd>{form.student?.collegeName ?? ''}</dd>
        <dt>학과(전공)</dt><dd>{form.student?.deptName ?? ''}</dd>
        <dt>학번{required}</dt>
        <dd>
          <input aria-label="학번" value={form.studentNo} onChange={e => set({ studentNo: e.target.value, student: null })} />
          <button type="button" className="admin-btn admin-btn-primary sm" onClick={() => setSearching(true)}>검색</button>
        </dd>
        <dt>이름/성별</dt><dd>{form.student ? [form.student.name, form.student.sex].filter(Boolean).join(' / ') : ''}</dd>
        <dt>졸업년월</dt>
        <dd className="professor-personal-wide">
          <input aria-label="졸업년도" className="forecast-month-input" inputMode="numeric" maxLength={4} placeholder="졸업년도 4자리로 입력하세요"
            value={form.gradYear} onChange={e => set({ gradYear: e.target.value.replace(/\D/g, '') })} />
          <span>.</span>
          <input aria-label="졸업월" className="forecast-month-input" inputMode="numeric" maxLength={2} placeholder="졸업월 2자리로 입력하세요"
            value={form.gradMonth} onChange={e => set({ gradMonth: e.target.value.replace(/\D/g, '') })} />
        </dd>
        <dt>취업처(기업명){required}</dt>
        <dd>
          <input aria-label="취업처" className="forecast-company" placeholder="취업처(기업명)를 입력하세요" value={form.companyName}
            onChange={e => set({ companyName: e.target.value })} />
          {/* 미확인 — 취업처·부서/업무를 '미확인'으로 채운다. 잠그지 않으니 확인되면 언제든 고친다. */}
          <button type="button" className="admin-btn forecast-unknown-btn sm" onClick={() => set({ companyName: UNKNOWN, duty: UNKNOWN })}>미확인</button>
        </dd>
        <dt>부서/업무{required}</dt>
        <dd><input aria-label="부서/업무" value={form.duty} onChange={e => set({ duty: e.target.value })} /></dd>
        <dt>기업분류{required}</dt>
        <dd>
          <select aria-label="기업분류" value={form.companyTypeCode} onChange={e => set({ companyTypeCode: e.target.value })}>
            <option value="">선택해주세요</option>{options.companyTypes.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </dd>
        <dt>지역{required}</dt>
        <dd>
          <select aria-label="지역" value={form.regionCode} onChange={e => set({ regionCode: e.target.value })}>
            <option value="">선택해주세요</option>{options.regions.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </dd>
        <dt>취업일자{required}</dt>
        <dd className="professor-personal-wide">
          <select aria-label="취업년도" value={form.employedYear} onChange={e => set({ employedYear: e.target.value })}>
            <option value="">취업년도</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select aria-label="취업월" value={form.employedMonth} onChange={e => set({ employedMonth: e.target.value })}>
            <option value="">취업월</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </dd>
      </dl>
      {message && <p role="alert" className="admin-form-hint-warn">{message}</p>}
      <div className="forecast-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={submit}>{saving ? '저장 중…' : '저장'}</button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>취소</button>
      </div>
      {searching && <StudentSearchModal initial={form.studentNo} onPick={pick} onClose={() => setSearching(false)} />}
    </AdminModal>
  )
}

export default function EmploymentForecast() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [filters, setFilters] = useState<EmploymentFilters>(toFilters(EMPTY_DRAFT))
  const [page, setPage] = useState(1)
  const [options, setOptions] = useState<EmploymentOptions>({ companyTypes: [], regions: [], surveyYears: [] })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<EmploymentRow | null | 'new'>(null)
  const [notice, setNotice] = useState('')
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const { run, saving } = useAsyncAction()
  const { data, isLoading, error, refetch } = useListData(queryEmployments, { ...filters, page, pageSize: PAGE_SIZE })
  const pages = totalPages(data)
  const loadOptions = () => fetchEmploymentOptions().then(setOptions).catch(reason => setMessage(reason.message))
  useEffect(() => { void loadOptions() }, [])
  // 삭제로 현재 페이지가 사라지면 마지막 페이지로 — 빈 목록에선 페이지 버튼도 그려지지 않는다.
  useEffect(() => { if (!isLoading && !error && page > pages) setPage(pages) }, [isLoading, error, page, pages])
  const surveyYears = [...new Set([THIS_YEAR, ...options.surveyYears])].sort((a, b) => b - a)
  const change = (patch: Partial<Draft>) => setDraft(old => ({ ...old, ...patch }))
  const refresh = () => { setSelected(new Set()); refetch(); void loadOptions() }
  const fail = (caught: unknown) => setMessage(caught instanceof Error ? caught.message : '요청에 실패했습니다.')

  const pageIds = data.items.map(r => r.id)
  const allChecked = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const toggle = (id: number) => setSelected(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const remove = () => {
    if (!selected.size) { setMessage('삭제할 항목을 선택하세요.'); return }
    if (!window.confirm(`선택한 ${selected.size}건을 삭제합니다.`)) return
    run(async () => {
      try {
        const result = await deleteEmployments([...selected])
        setNotice(`${result.deleted}건을 삭제했습니다.`); setMessage(''); refresh()
      } catch (caught) { fail(caught) }
    })
  }
  const upload = (file: File | undefined) => {
    if (!file) return
    setUploadErrors([]); setNotice(''); setMessage('')
    run(async () => {
      try {
        const result = await uploadEmployments(file)
        setNotice(`엑셀 업로드 완료 — 신규 ${result.inserted}건, 갱신 ${result.updated}건`); refresh()
      } catch (caught) {
        if (caught instanceof UploadRejected) setUploadErrors(caught.errors)
        fail(caught)
      } finally {
        if (fileInput.current) fileInput.current.value = ''
      }
    })
  }
  const download = () => run(async () => { try { await downloadEmployments(filters) } catch (caught) { fail(caught) } })

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">취업예측분석시스템</h1>
          <p className="admin-page-desc">졸업(예정)자의 취업 현황을 등록하고 엑셀로 내려받거나 일괄 등록합니다.</p>
        </div>
      </header>
      <form className="forecast-filters" onSubmit={event => {
        event.preventDefault()
        const next = toFilters(draft)
        if (next.graduationFrom && next.graduationTo && next.graduationFrom > next.graduationTo) { setMessage('졸업년월 시작은 종료보다 늦을 수 없습니다.'); return }
        setMessage(''); setFilters(next); setPage(1); setSelected(new Set())
      }}>
        <div className="admin-filterbar">
          <label className="admin-select"><span>조사년도</span>
            <select value={draft.surveyYear} onChange={e => change({ surveyYear: e.target.value })}>
              <option value="">전체</option>{surveyYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <div className="admin-select forecast-month-range" role="group" aria-label="졸업년월">
            <span>졸업년월</span>
            <select aria-label="졸업년월 시작 년도" value={draft.gradFromYear} onChange={e => change({ gradFromYear: e.target.value })}>
              <option value="">졸업년도</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select aria-label="졸업년월 시작 월" value={draft.gradFromMonth} onChange={e => change({ gradFromMonth: e.target.value })}>
              <option value="">졸업월</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span aria-hidden="true">~</span>
            <select aria-label="졸업년월 종료 년도" value={draft.gradToYear} onChange={e => change({ gradToYear: e.target.value })}>
              <option value="">졸업년도</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select aria-label="졸업년월 종료 월" value={draft.gradToMonth} onChange={e => change({ gradToMonth: e.target.value })}>
              <option value="">졸업월</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="admin-filterbar">
          <label className="admin-select"><span>검색조건</span>
            <select value={draft.field} onChange={e => change({ field: e.target.value as SearchField })}>
              {FIELDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="admin-search">
            <LuSearch />
            <input value={draft.q} onChange={e => change({ q: e.target.value })} aria-label="검색어"
              placeholder={draft.field === 'sex' ? '남 또는 여' : '검색어 입력'} />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary">검색</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => {
            setDraft(EMPTY_DRAFT); setFilters(toFilters(EMPTY_DRAFT)); setPage(1); setSelected(new Set()); setMessage('')
          }}>초기화</button>
        </div>
      </form>
      {(message || error) && <p role="alert" className="admin-form-hint-warn">{message || error?.message}</p>}
      {uploadErrors.length > 0 && (
        <ul className="forecast-upload-errors" aria-label="업로드 오류 행">
          {uploadErrors.map(e => <li key={e.row}><strong>{e.row}행</strong> {e.message}</li>)}
        </ul>
      )}
      {notice && <p role="status" className="admin-field-hint">{notice}</p>}
      <div className="admin-toolbar">
        <span className="admin-toolbar-count">
          총 <strong>{data.totalCount}</strong>개 {isLoading && <LuLoaderCircle className="admin-spin" />}
        </span>
        <div className="forecast-actions">
          <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={download}><LuDownload /> 엑셀다운로드</button>
          <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => fileInput.current?.click()}><LuUpload /> 엑셀업로드</button>
          <input ref={fileInput} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={e => upload(e.target.files?.[0])} />
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing('new')}>신규등록</button>
          <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={remove}>삭제{selected.size ? ` (${selected.size})` : ''}</button>
        </div>
      </div>
      <section className="admin-card">
        {data.items.length === 0 ? <EmptyState message={isLoading ? '불러오는 중…' : '등록된 취업 현황이 없습니다.'} /> : (
          <>
            <div className="professor-report-table-wrap">
              <table className="dc-list-table professor-report-table forecast-table">
                <thead>
                  <tr>
                    <th scope="col"><input type="checkbox" aria-label="이 페이지 전체 선택" checked={allChecked}
                      onChange={() => setSelected(old => {
                        const next = new Set(old)
                        pageIds.forEach(id => { if (allChecked) next.delete(id); else next.add(id) })
                        return next
                      })} /></th>
                    {['번호', '졸업년월', '단과대학', '학과(전공)', '학번', '이름', '성별', '취업처', '부서/업무', '취업일자', '기업분류', '지역', '조사년도', '작성자']
                      .map(h => <th scope="col" key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row, index) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" aria-label={`${row.name ?? row.studentNo} 선택`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
                      <td>{data.totalCount - (data.page - 1) * PAGE_SIZE - index}</td>
                      <td>{dotMonth(row.graduationMonth)}</td>
                      <td>{row.collegeName ?? '-'}</td>
                      <td>{row.deptName ?? '-'}</td>
                      <td>{row.studentNo}</td>
                      <td>
                        <button type="button" className="professor-report-link professor-link-btn" onClick={() => setEditing(row)}>
                          {row.name ?? row.studentNo}
                        </button>
                      </td>
                      <td>{row.sex ?? '-'}</td>
                      <td>{row.companyName}</td>
                      <td>{row.duty}</td>
                      <td>{dotMonth(row.employedMonth)}</td>
                      <td>{row.companyType}</td>
                      <td>{row.region}</td>
                      <td>{row.surveyYear}</td>
                      <td>{row.writer ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="admin-pagination">
                <button type="button" className="admin-page-btn" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}><LuChevronLeft /></button>
                <PageNumbers page={page} pages={pages} onChange={setPage} />
                <span className="admin-page-info">{page} / {pages} 페이지 · 총 {data.totalCount}건</span>
                <button type="button" className="admin-page-btn" disabled={page === pages} onClick={() => setPage(value => Math.min(pages, value + 1))}><LuChevronRight /></button>
              </div>
            )}
          </>
        )}
      </section>
      {editing && (
        <EmploymentFormModal row={editing === 'new' ? null : editing} options={options} onClose={() => setEditing(null)}
          onSaved={() => { setNotice(editing === 'new' ? '등록했습니다.' : '수정했습니다.'); setEditing(null); setMessage(''); refresh() }} />
      )}
    </div>
  )
}
