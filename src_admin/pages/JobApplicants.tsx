// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원자관리 — 공고 1건
//
// 위: 전형 단계 정의·관리 (단계는 공고마다 다르다 — 추가·이름변경·순서변경·삭제)
// 아래: 지원자 목록 + 상태 변경 (다음 단계로 / 탈락)
//
// 상태 전이·정합성·집계는 전부 jobApplications 로더가 한다 — 이 화면은 부르고 그린다.
// 전이 결과는 학생 마이페이지 진행 타임라인에 그대로 반영된다(같은 스토어 구독).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  LuArrowLeft, LuChevronDown, LuChevronUp, LuDownload, LuInfo,
  LuPlus, LuTrash2, LuUsers,
} from 'react-icons/lu'
import EmptyState from '../components/EmptyState'
import { getJobById, jobDdayLabel } from '../data/jobsSource'
import {
  APPLICATION_STATUS_LABEL,
  addStage,
  advanceStage,
  currentStageLabel,
  getApplicationsByJob,
  getStages,
  isRecommendedInternal,
  moveStage,
  rejectApplication,
  removeStage,
  renameStage,
  stageCounts,
  summarizeJob,
} from '../data/jobApplications'
import { toJobApplicantCsv } from '../data/jobApplicationExport'
import { lastEventAt } from '../data/jobApplicationEvents'
import { enrollStatusClass } from '../data/studentRoster'
import type { ApplicationStatus } from '../data/schema/jobApplication'

/** 상태 배지 클래스 — index.css 의 admin-chip 토큰을 재사용한다. */
function statusChipClass(status: ApplicationStatus): string {
  switch (status) {
    case 'PASSED':
      return 'admin-chip admin-chip-ok'
    case 'REJECTED':
      return 'admin-chip admin-chip-penalty'
    case 'CANCELED':
      return 'admin-chip admin-chip-cancel'
    case 'IN_PROGRESS':
      return 'admin-chip admin-chip-done'
    default:
      return 'admin-chip admin-chip-wait'
  }
}

export default function JobApplicants() {
  const { jobId } = useParams()
  // 전이 후 재조회 트리거 — 스토어가 localStorage 라 화면이 스스로 다시 읽는다.
  const [tick, setTick] = useState(0)
  const [newStage, setNewStage] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

  const job = jobId ? getJobById(jobId) : undefined
  const stages = useMemo(() => (jobId ? getStages(jobId) : []), [jobId, tick])
  const counts = useMemo(() => (jobId ? stageCounts(jobId) : {}), [jobId, tick])
  const applications = useMemo(() => (jobId ? getApplicationsByJob(jobId) : []), [jobId, tick])
  const summary = useMemo(() => (jobId ? summarizeJob(jobId) : undefined), [jobId, tick])

  // 지원 접수 대상이 아닌 공고는 이 화면에 들어올 이유가 없다.
  if (!job || !isRecommendedInternal(job)) return <Navigate to="/jobs/applicants" replace />

  const refresh = () => setTick(t => t + 1)

  const submitNewStage = () => {
    if (!newStage.trim() || !jobId) return
    addStage(jobId, newStage)
    setNewStage('')
    refresh()
  }

  const commitRename = () => {
    if (!editing || !jobId) return
    renameStage(jobId, editing.id, editing.name)
    setEditing(null)
    refresh()
  }

  const onRemoveStage = (stageId: string, name: string) => {
    if (!jobId) return
    // 로더가 "지원자가 올라가 있으면 거부"를 판정한다 — 화면은 사유만 전한다.
    if (!removeStage(jobId, stageId)) {
      window.alert(`«${name}» 단계에 지원자가 올라가 있어 삭제할 수 없습니다.\n먼저 해당 지원자를 다음 단계로 보내거나 탈락 처리해 주세요.`)
      return
    }
    refresh()
  }

  const onReject = (id: string, name: string) => {
    const reason = window.prompt(`${name} 지원자를 탈락 처리합니다.\n사유를 남겨 주세요(선택).`)
    if (reason === null) return
    rejectApplication(id, reason.trim() || undefined)
    refresh()
  }

  const downloadCsv = () => {
    if (!jobId) return
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const url = URL.createObjectURL(
      new Blob([`﻿${toJobApplicantCsv([jobId])}`], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${job.company}_지원자현황_${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <Link to="/jobs/applicants" className="admin-inline-link">
        <LuArrowLeft /> 추천채용 지원자관리
      </Link>

      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">[추천채용] {job.company} — {job.role}</h1>
          <p className="admin-page-desc">
            {job.companyType && `${job.companyType} · `}마감 {jobDdayLabel(job)}
            {summary && ` · 지원 ${summary.total}명 (진행중 ${summary.open} · 합격 ${summary.passed} · 탈락 ${summary.rejected})`}
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={downloadCsv}
            disabled={applications.length === 0}
          >
            <LuDownload /> 엑셀 다운로드
          </button>
        </div>
      </header>

      {/* ── 전형 단계 정의 및 관리 ─────────────────────────────────── */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>전형 단계 정의 및 관리</h2>
          <span className="admin-card-count">{stages.length}단계</span>
        </div>

        <div className="admin-editor-hint">
          <LuInfo />
          단계는 공고마다 다르게 정할 수 있습니다. 지원자는 <strong>정의한 순서대로만</strong> 이동하며,
          마지막 단계를 통과하면 최종 합격 처리됩니다.
        </div>

        <div className="admin-phase-list">
          {stages.map((stage, i) => (
            <div key={stage.id} className="admin-phase-item">
              <span className="admin-phase-icon">{stage.order}</span>
              <div className="admin-phase-body">
                {editing?.id === stage.id ? (
                  <input
                    className="admin-item-title-input"
                    value={editing.name}
                    autoFocus
                    onChange={e => setEditing({ id: stage.id, name: e.target.value })}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    aria-label="단계명"
                  />
                ) : (
                  <button
                    type="button"
                    className="admin-phase-top"
                    onClick={() => setEditing({ id: stage.id, name: stage.name })}
                  >
                    <strong>{stage.order}단계: {stage.name}</strong>
                    <small>현재 {counts[stage.id] ?? 0}명</small>
                  </button>
                )}
              </div>
              <div className="admin-request-actions">
                <button
                  type="button"
                  className="admin-icon-btn"
                  aria-label="위로"
                  disabled={i === 0}
                  onClick={() => { moveStage(job.id, stage.id, -1); refresh() }}
                >
                  <LuChevronUp />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn"
                  aria-label="아래로"
                  disabled={i === stages.length - 1}
                  onClick={() => { moveStage(job.id, stage.id, 1); refresh() }}
                >
                  <LuChevronDown />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn"
                  aria-label="단계 삭제"
                  onClick={() => onRemoveStage(stage.id, stage.name)}
                >
                  <LuTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-avail-add">
          <input
            className="admin-item-title-input"
            placeholder="새 전형 단계 이름 (예: 인적성 검사, 2차 면접)"
            value={newStage}
            onChange={e => setNewStage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitNewStage() }}
            aria-label="새 전형 단계 이름"
          />
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={submitNewStage}
            disabled={!newStage.trim()}
          >
            <LuPlus /> 단계 추가
          </button>
        </div>
      </section>

      {/* ── 지원자 목록 ────────────────────────────────────────────── */}
      <section className="admin-card">
        <div className="admin-card-head">
          <h2>지원자 현황</h2>
          <span className="admin-card-count">{applications.length}명</span>
        </div>

        {applications.length === 0 ? (
          <EmptyState
            icon={LuUsers}
            title="아직 지원자가 없습니다"
            message="학생이 교내 채용공고에서 지원하면 이곳에 표시됩니다."
          />
        ) : (
          <div className="admin-roster admin-jobapp-applicant-roster">
            <div className="admin-roster-head">
              <span>학생</span>
              <span>학번</span>
              <span>학과 · 학년</span>
              <span>학적</span>
              <span>지원일</span>
              <span>현재 전형</span>
              <span>상태</span>
              <span>관리</span>
            </div>
            {applications.map(a => {
              const open = a.status === 'APPLIED' || a.status === 'IN_PROGRESS'
              const updated = lastEventAt(a.id)
              return (
                <div key={a.id} className="admin-roster-row">
                  <span className="admin-roster-student"><strong>{a.snapName}</strong></span>
                  <span className="admin-roster-cell">{a.snapStudentNo}</span>
                  <span className="admin-roster-cell">
                    {a.snapMajor}
                    <small>{a.snapGrade}학년</small>
                  </span>
                  <span className="admin-roster-cell">
                    <span className={enrollStatusClass(a.snapEnrollStatus)}>{a.snapEnrollStatus}</span>
                  </span>
                  <span className="admin-roster-cell">
                    {a.appliedAt.slice(0, 10)}
                    {updated && <small>변경 {updated.slice(0, 10)}</small>}
                  </span>
                  <span className="admin-roster-cell">{currentStageLabel(a)}</span>
                  <span className="admin-roster-cell">
                    <span className={statusChipClass(a.status)}>{APPLICATION_STATUS_LABEL[a.status]}</span>
                  </span>
                  <span className="admin-request-actions">
                    {open ? (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary sm"
                          onClick={() => { advanceStage(a.id); refresh() }}
                        >
                          다음 단계
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger-ghost sm"
                          onClick={() => onReject(a.id, a.snapName)}
                        >
                          탈락
                        </button>
                      </>
                    ) : (
                      <span className="admin-field-hint">처리 완료</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
