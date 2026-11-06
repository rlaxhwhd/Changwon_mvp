import { LuClipboardList, LuDownload, LuPin, LuPlus } from 'react-icons/lu'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { getPrograms, sortByPriority, updateProgram, removeProgram } from '../data/programs'
import AdminModal from '../components/AdminModal'
import { EXPORT_TARGETS, EXPORT_TARGET_LABEL, getApplicantExportRows, toApplicantRows } from '../data/programExport'
import type { ExportTarget } from '../data/programExport'
import { downloadXlsx } from '../../shared/xlsx'
import type { Program } from '../data/schema/program'
import { categoryLabel, programCategories, programMiddleCategories } from '../data/schema/program'
import { codeLabel } from '../../shared/metadataStore'
import {
  EMPTY_PROGRAM_FILTERS, OPERATION_STATUSES, downloadStudentRoster, filterPrograms, getOperationStatus, studentStateOptions,
} from '../data/programManageFilter'
import type { ProgramManageFilters, StudentState } from '../data/programManageFilter'

function statusClass(status: string): string {
  if (status === '운영중') return 'admin-chip-ok'
  if (status === '운영완료') return 'admin-chip-done'
  if (status === '운영전') return 'admin-chip-wait'
  return 'admin-chip-cancel'
}

function period(program: Program): string {
  if (!program.runStartDate && !program.runEndDate) return '미정'
  return `${program.runStartDate || '미정'} ~ ${program.runEndDate || '미정'}`
}

export default function ProgramManage() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState<Program[]>(() => sortByPriority(getPrograms()))
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<ExportTarget>('applicants')
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [draft, setDraft] = useState<ProgramManageFilters>(EMPTY_PROGRAM_FILTERS)
  const [filters, setFilters] = useState<ProgramManageFilters>(EMPTY_PROGRAM_FILTERS)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const visible = filterPrograms(programs, filters, today)
  const fiscalYears = [...new Set(programs.map(p => p.fiscalYear).filter(Boolean))].sort().reverse()

  const change = <K extends keyof ProgramManageFilters>(key: K, value: ProgramManageFilters[K]) =>
    setDraft(old => ({ ...old, [key]: value }))

  const toggled = <T,>(list: T[], value: T) => list.includes(value) ? list.filter(x => x !== value) : [...list, value]

  // 필터로 가려진 프로그램이 선택에 남아 삭제되면 안 된다.
  const search = (event: FormEvent) => {
    event.preventDefault()
    setFilters(draft)
    setChecked(new Set())
    setDownloadError('')
  }

  const downloadStudents = () => {
    setDownloading(true); setDownloadError('')
    downloadStudentRoster(visible.map(p => p.id), filters.studentStates, `비교과_관리_학생_${today.replaceAll('-', '')}.xlsx`)
      .catch((error: unknown) => setDownloadError(error instanceof Error ? error.message : '엑셀 다운로드에 실패했습니다.'))
      .finally(() => setDownloading(false))
  }

  const togglePin = (id: string, pinned: boolean) => {
    updateProgram(id, { pinned })
      .then(() => setPrograms(sortByPriority(getPrograms())))
      .catch((error: unknown) =>
        window.alert(error instanceof Error ? error.message : '고정 상태를 바꾸지 못했습니다.'))
  }

  const allChecked = visible.length > 0 && visible.every(p => checked.has(p.id))

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(visible.map(p => p.id)))
  }
  const deleteSelected = async () => {
    setDeleting(true); setDeleteError('')
    const failures: string[] = []
    for (const id of checked) {
      try {
        await removeProgram(id)
        setChecked(prev => { const next = new Set(prev); next.delete(id); return next })
      } catch (error) { failures.push(`${programs.find(p => p.id === id)?.title}: ${error instanceof Error ? error.message : '삭제 실패'}`) }
    }
    setPrograms(sortByPriority(getPrograms()))
    setDeleting(false)
    if (failures.length) setDeleteError(failures.join('\n'))
    else setDeleteOpen(false)
  }

  // 명단 조립은 데이터층(programExport)이 하고, 여기서는 파일로만 만든다.
  const exportCount = getApplicantExportRows([...checked], target).length

  const downloadExcel = () => {
    const ids = [...checked]
    if (ids.length === 0) return
    downloadXlsx(`비교과_${EXPORT_TARGET_LABEL[target]}_${today.replaceAll('-', '')}.xlsx`, toApplicantRows(ids, target))
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">프로그램 관리</h1>
          <p className="admin-page-desc">등록된 비교과 프로그램의 운영 현황을 확인합니다.</p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs/new" className="admin-btn admin-btn-primary">
            <LuPlus /> 프로그램 등록
          </Link>
          <button type="button" className="admin-btn admin-btn-primary">
            <LuPlus /> 그룹 프로그램 등록
          </button>
        </div>
      </header>

      <form className="admin-card admin-program-filter" onSubmit={search}>
        <div className="admin-program-filter-row">
          <label className="admin-select"><select aria-label="대분류" value={draft.category} onChange={e => change('category', e.target.value)}>
            <option value="">대분류</option>
            {programCategories().map(code => <option key={code} value={code}>{categoryLabel(code)}</option>)}
          </select></label>
          <label className="admin-select"><select aria-label="소분류" value={draft.middleCategory} onChange={e => change('middleCategory', e.target.value)}>
            <option value="">소분류</option>
            {programMiddleCategories().map(code => <option key={code} value={code}>{codeLabel('PROGRAM_MIDDLE_CATEGORY', code)}</option>)}
          </select></label>
          <label className="admin-select"><select aria-label="인증여부" value={draft.certificate} onChange={e => change('certificate', e.target.value as ProgramManageFilters['certificate'])}>
            <option value="">인증여부</option>
            <option value="Y">발급</option>
            <option value="N">미발급</option>
          </select></label>
          <button type="submit" className="admin-btn admin-btn-primary admin-filter-submit admin-program-filter-submit">검색</button>
        </div>
        <div className="admin-program-filter-row">
          <span className="admin-program-filter-label">회계연도</span>
          <label className="admin-select"><select aria-label="회계연도" value={draft.fiscalYear} onChange={e => change('fiscalYear', e.target.value)}>
            <option value="">전체</option>
            {fiscalYears.map(year => <option key={year} value={year}>{year}년</option>)}
          </select></label>
          <span className="admin-program-filter-label">운영기간</span>
          <div className="admin-date-range">
            <label className="admin-dot-date">{draft.runFrom.replaceAll('-', '.') || 'YYYY.MM.DD'}<input type="date" aria-label="운영기간 시작" max={draft.runTo || undefined} value={draft.runFrom} onChange={e => change('runFrom', e.target.value)} /></label>
            ~
            <label className="admin-dot-date">{draft.runTo.replaceAll('-', '.') || 'YYYY.MM.DD'}<input type="date" aria-label="운영기간 종료" min={draft.runFrom || undefined} value={draft.runTo} onChange={e => change('runTo', e.target.value)} /></label>
          </div>
        </div>
        <div className="admin-program-filter-row">
          <span className="admin-program-filter-label">운영상태</span>
          {OPERATION_STATUSES.map(status => (
            <label key={status} className="admin-check">
              <input type="checkbox" checked={draft.operationStatuses.includes(status)} onChange={() => change('operationStatuses', toggled(draft.operationStatuses, status))} />
              <span>{status}</span>
            </label>
          ))}
          <span className="admin-program-filter-label">상세검색</span>
          <label className="admin-select"><select aria-label="검색 구분" value={draft.searchField} onChange={e => change('searchField', e.target.value as ProgramManageFilters['searchField'])}>
            <option value="title">프로그램명</option>
            <option value="manager">담당자</option>
          </select></label>
          <div className="admin-search"><input aria-label="검색어" placeholder="검색어 입력" value={draft.q} onChange={e => change('q', e.target.value)} /></div>
        </div>
        <div className="admin-program-filter-row">
          <span className="admin-program-filter-label">학생상태</span>
          {studentStateOptions().map(({ value, label }) => (
            <label key={value} className="admin-check">
              <input type="checkbox" checked={draft.studentStates.includes(value)} onChange={() => change('studentStates', toggled<StudentState>(draft.studentStates, value))} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </form>

      <section className="admin-card">
        <div className="admin-program-list-bar">
          <span>Total <strong>{visible.length}</strong> ea</span>
          <button type="button" className="admin-btn admin-btn-primary sm" disabled={downloading || visible.length === 0} onClick={downloadStudents}>
            <LuDownload /> {downloading ? '내려받는 중…' : '엑셀 다운로드(학생)'}
          </button>
        </div>
        {downloadError && <p role="alert" className="admin-form-hint-warn">{downloadError}</p>}
        {visible.length === 0 && programs.length > 0 ? (
          <EmptyState icon={LuClipboardList} title="조건에 맞는 프로그램이 없습니다" message="필터를 바꿔 다시 검색해 주세요." />
        ) : programs.length === 0 ? (
          <EmptyState
            icon={LuClipboardList}
            title="등록된 프로그램이 없습니다"
            message="프로그램을 등록하면 운영 현황을 이곳에서 관리할 수 있습니다."
            action={{ label: '프로그램 등록', onClick: () => navigate('/programs/new') }}
          />
        ) : (
          <>
            {checked.size > 0 && (
              <div className="admin-bulkbar">
                <span className="admin-bulkbar-count">
                  <strong>{checked.size}</strong>개 프로그램 선택됨 · 명단 <strong>{exportCount}</strong>명
                </span>
                <select
                  className="admin-bulk-select"
                  value={target}
                  onChange={e => setTarget(e.target.value as ExportTarget)}
                  aria-label="내려받을 명단"
                >
                  {EXPORT_TARGETS.map(t => (
                    <option key={t} value={t}>{EXPORT_TARGET_LABEL[t]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary sm"
                  onClick={downloadExcel}
                  disabled={exportCount === 0}
                >
                  <LuDownload /> 엑셀 다운로드
                </button>
                <button type="button" className="admin-btn admin-btn-danger sm" onClick={() => { setDeleteError(''); setDeleteOpen(true) }}>선택 삭제</button>
              </div>
            )}

          <div className="admin-roster admin-program-manage-roster">
            <div className="admin-roster-head">
              <span className="admin-check-cell">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" />
              </span>
              <span>상단고정</span>
              <span>번호</span>
              <span>회계년도</span>
              <span>프로그램명</span>
              <span>총회차</span>
              <span>운영기간</span>
              <span>모집인원</span>
              <span>신청인원</span>
              <span>운영상태</span>
              <span>담당자</span>
            </div>
            {visible.map((program, index) => {
              const operationStatus = getOperationStatus(program, today)
              return (
                <div
                  key={program.id}
                  role="button"
                  tabIndex={0}
                  className={`admin-roster-row${program.pinned ? ' is-pinned' : ''}`}
                  onClick={() => navigate(`/programs/${program.id}/edit`)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/programs/${program.id}/edit`)
                    }
                  }}
                >
                  <span
                    className="admin-roster-cell admin-check-cell"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(program.id)}
                      onChange={() => toggleCheck(program.id)}
                      aria-label={`${program.title} 선택`}
                    />
                  </span>
                  <span
                    className="admin-roster-cell admin-pin-cell"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <label className="admin-pin-toggle" title="상단 고정">
                      <input
                        type="checkbox"
                        checked={!!program.pinned}
                        onChange={e => togglePin(program.id, e.target.checked)}
                      />
                      <LuPin />
                    </label>
                  </span>
                  <span className="admin-roster-cell">{visible.length - index}</span>
                  <span className="admin-roster-cell">{program.fiscalYear}</span>
                  <span className="admin-roster-cell dc-cell-long"><strong>{program.title}</strong></span>
                  <span className="admin-roster-cell">{program.sessions}회</span>
                  <span className="admin-roster-cell"><small>{period(program)}</small></span>
                  <span className="admin-roster-cell">{program.capacity}명</span>
                  <span className="admin-roster-cell">{program.applyCount}명</span>
                  <span><span className={`admin-chip ${statusClass(operationStatus)}`}>{operationStatus}</span></span>
                  <span className="admin-roster-cell">{program.manager || '미지정'}</span>
                </div>
              )
            })}
          </div>
          </>
        )}
      </section>
      {deleteOpen && <AdminModal title="프로그램 삭제" onClose={() => { if (!deleting) setDeleteOpen(false) }}>
        <p>선택한 {checked.size}개 프로그램과 신청 기록을 삭제합니다. 삭제한 데이터는 복구할 수 없습니다.</p>
        <p>이수 결과·로드맵·설문 등 연결된 이력이 있으면 삭제되지 않습니다.</p>
        {deleteError && <p role="alert" style={{ whiteSpace: 'pre-line' }}>{deleteError}</p>}
        <div className="admin-head-actions"><button type="button" className="admin-btn" disabled={deleting} onClick={() => setDeleteOpen(false)}>취소</button><button type="button" className="admin-btn admin-btn-danger" disabled={deleting || checked.size === 0} onClick={() => { void deleteSelected() }}>{deleting ? '삭제 중…' : '삭제'}</button></div>
      </AdminModal>}
    </div>
  )
}
