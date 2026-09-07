import { LuClipboardList, LuDownload, LuPin, LuPlus } from 'react-icons/lu'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { getPrograms, sortByPriority, updateProgram } from '../data/programs'
import { EXPORT_TARGETS, EXPORT_TARGET_LABEL, getApplicantExportRows, toApplicantCsv } from '../data/programExport'
import type { ExportTarget } from '../data/programExport'
import type { Program } from '../data/schema/program'

type OperationStatus = '운영전' | '운영중' | '운영완료' | Program['status'] | '상태 미정'

function getOperationStatus(program: Program, today: string): OperationStatus {
  if (!program.runStartDate || !program.runEndDate) return program.status || '상태 미정'
  if (today < program.runStartDate) return '운영전'
  if (today > program.runEndDate) return '운영완료'
  return '운영중'
}

function statusClass(status: OperationStatus): string {
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
  const today = new Date().toISOString().slice(0, 10)

  const togglePin = (id: string, pinned: boolean) => {
    updateProgram(id, { pinned })
    setPrograms(sortByPriority(getPrograms()))
  }

  const allChecked = programs.length > 0 && programs.every(p => checked.has(p.id))

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setChecked(allChecked ? new Set() : new Set(programs.map(p => p.id)))
  }

  // 명단 조립은 데이터층(programExport)이 하고, 여기서는 파일로만 만든다.
  const exportCount = getApplicantExportRows([...checked], target).length

  const downloadCsv = () => {
    const ids = [...checked]
    if (ids.length === 0) return
    const url = URL.createObjectURL(
      new Blob([`﻿${toApplicantCsv(ids, target)}`], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `비교과_${EXPORT_TARGET_LABEL[target]}_${today.replaceAll('-', '')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
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
        </div>
      </header>

      <section className="admin-card">
        {programs.length === 0 ? (
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
                  onClick={downloadCsv}
                  disabled={exportCount === 0}
                >
                  <LuDownload /> 엑셀 다운로드
                </button>
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
            {programs.map((program, index) => {
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
                  <span className="admin-roster-cell">{programs.length - index}</span>
                  <span className="admin-roster-cell">{program.fiscalYear}</span>
                  <span className="admin-roster-cell"><strong>{program.title}</strong></span>
                  <span className="admin-roster-cell">{program.sessions}회</span>
                  <span className="admin-roster-cell"><small>{period(program)}</small></span>
                  <span className="admin-roster-cell">{program.capacity}명</span>
                  <span className="admin-roster-cell">{program.applicants.length}명</span>
                  <span><span className={`admin-chip ${statusClass(operationStatus)}`}>{operationStatus}</span></span>
                  <span className="admin-roster-cell">{program.manager || '미지정'}</span>
                </div>
              )
            })}
          </div>
          </>
        )}
      </section>
    </div>
  )
}
