import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import type { CourseGroup, CourseRow, DirectionRow } from '../../data/academic'
import { useSkillTree } from '../../hooks/useSkillTree'
import './SkillTree.css'

// ─── Page ─────────────────────────────────────────────────────────────────────
// 데이터는 전부 useSkillTree → data/academic(파생) → academic/repository(스왑 지점)
// 에서 온다. 이 컴포넌트에는 과목·스킬·직무·자격증 리터럴을 두지 않는다.

export default function SkillTree() {
  const {
    status, data, jobOptions, certOptions, studentName, error, reload,
    addJob, removeJob, addCert, removeCert,
  } = useSkillTree()

  const [selectedDirection, setSelectedDirection] = useState<string | null>(null)
  const [expandedDirection, setExpandedDirection] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [jobInputOpen, setJobInputOpen] = useState(false)
  const [jobInput, setJobInput] = useState('')
  const [jobInputError, setJobInputError] = useState('')
  const [certPickerOpen, setCertPickerOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)

  // 학생이 바뀌면 대표 직무로 선택을 되돌린다.
  useEffect(() => {
    if (!data) return
    setSelectedDirection(prev =>
      prev && data.directions.some(d => d.jobId === prev) ? prev : data.defaultDirectionId)
    setExpandedDirection(prev =>
      prev && data.directions.some(d => d.jobId === prev) ? prev : data.defaultDirectionId)
  }, [data])

  useEffect(() => {
    if (!analyzing) return
    const start = performance.now()
    const DURATION = 2800
    let rafId = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100))
      setProgress(pct)
      if (elapsed < DURATION) {
        rafId = requestAnimationFrame(tick)
      } else {
        window.setTimeout(() => setAnalyzing(false), 700)
      }
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [analyzing])

  // ── 로딩 ──
  if (status === 'loading') return <SkillTreeSkeleton />

  // ── 에러: 학사 데이터를 불러오지 못함 ──
  if (status === 'error') {
    return (
      <Notice icon="fa-triangle-exclamation" title="학사 데이터를 불러오지 못했습니다">
        {error?.message ?? '알 수 없는 오류가 발생했습니다.'}
        <br />
        <button className="st-notice-btn" onClick={reload}>
          <i className="fa-solid fa-rotate-right" /> 다시 시도
        </button>
      </Notice>
    )
  }

  // ── 빈 상태: 이 학생의 수강이력·교육과정이 아직 미러되지 않음 ──
  if (status === 'empty' || !data) {
    return (
      <Notice icon="fa-database" title="학사 데이터가 아직 연동되지 않았습니다">
        {studentName} 학생의 수강이력·교육과정이 학사DB에서 아직 넘어오지 않았습니다.<br />
        수강 과목이 연동되면 직무 적합도를 자동으로 분석합니다.
      </Notice>
    )
  }

  const startAnalyze = () => {
    if (analyzing) return
    setProgress(0)
    setAnalyzing(true)
  }

  const toggleDirection = (id: string) => {
    setSelectedDirection(id)
    setExpandedDirection(prev => (prev === id ? null : id))
  }

  const handleAddJob = (jobId: string) => {
    addJob(jobId)
    setSelectedDirection(jobId)
    setExpandedDirection(jobId)
    setPickerOpen(false)
  }
  const handleRemoveJob = (jobId: string) => {
    removeJob(jobId)
    setSelectedDirection(prev => (prev === jobId ? data.defaultDirectionId : prev))
    setExpandedDirection(prev => (prev === jobId ? null : prev))
  }
  const handleAddCert = (certId: string) => { addCert(certId); setCertPickerOpen(false) }

  const handleReanalyzeJob = () => {
    const query = jobInput.trim().toLocaleLowerCase()
    if (!query) {
      setJobInputError('직무를 입력하거나 목록에서 선택하세요.')
      return
    }
    const current = data.directions.find(direction => direction.name.toLocaleLowerCase() === query)
    const candidate = jobOptions.find(job => job.label.toLocaleLowerCase() === query)
    if (current) {
      setSelectedDirection(current.jobId)
      setExpandedDirection(current.jobId)
    } else if (candidate) {
      handleAddJob(candidate.jobId)
    } else {
      setJobInputError('등록된 직무 목록에서 선택할 수 있습니다.')
      return
    }
    setJobInputError('')
    setJobInputOpen(false)
    setJobInput('')
    startAnalyze()
  }

  const mergedCompetency: CourseGroup = {
    title: '핵심역량',
    subtitle: '목표 직무와 연결되는 전공·전문 과목',
    rows: [...data.core.rows, ...data.expert.rows],
    doneCount: data.core.doneCount + data.expert.doneCount,
    totalCount: data.core.totalCount + data.expert.totalCount,
    fitPercent: Math.round(((data.core.doneCount + data.expert.doneCount) /
      Math.max(1, data.core.totalCount + data.expert.totalCount)) * 100),
  }

  const expanded = data.directions.find(d => d.jobId === expandedDirection)

  return (
    <div className="st-wrapper">
      <div className="st-content">
        {/* ── Header ── */}
        <div className="st-header">
          <div className="st-header-left">
            <div className="st-header-icon">
              <i className="fa-solid fa-sitemap" />
            </div>
            <div>
              <h1 className="st-header-title">AI 직무 로드맵</h1>
              <p className="st-header-subtitle">
                진단, 상담, 수강과목, 자격증을 기반으로 직무 방향의 적합도를 확인하세요
              </p>
            </div>
          </div>
          <div className="st-header-meta">
            <span className="st-header-dept">{data.deptName}</span>
            <span className="st-header-sep">·</span>
            <span>{data.entryYear}학번 교육과정</span>
          </div>
        </div>

        {/* ── 4-column Grid ── */}
        <div className="st-grid">

          {/* Col 1: 기초 역량 */}
          <div className="st-col st-col--foundation">
            <div className="st-col-header">
              <div className="st-col-title">기초 역량</div>
              <div className="st-col-subtitle">모든 역량의 시작점</div>
            </div>
            <div className="st-col-body">
              {data.foundation.map(item => (
                <div key={item.id} className="st-found-card">
                  <div className="st-found-top">
                    <div className="st-found-icon">
                      <i className={`fa-solid ${item.icon}`} />
                    </div>
                    <div className="st-found-info">
                      <div className="st-found-name">{item.name}</div>
                      <div className="st-found-sub">{item.subtitle}</div>
                    </div>
                    <div className={`st-found-status${item.complete ? ' complete' : ''}`}>
                      {item.complete
                        ? <><i className="fa-solid fa-circle-check" /> 완료</>
                        : <><i className="fa-regular fa-circle" /> 진행중</>}
                    </div>
                  </div>
                  <div className="st-prog-bar">
                    <div
                      className={`st-prog-fill${item.complete ? ' complete' : ''}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="st-found-prog-label">{item.progressLabel}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2·3: 핵심 / 전문 역량 — 교육과정 + 수강이력에서 파생 */}
          <CourseColumn group={mergedCompetency} />

          {/* Col 4: 자격 */}
          <div className="st-col st-col--growth">
            <div className="st-col-header">
              <div className="st-col-title">내 성장 활동</div>
              <div className="st-col-subtitle">자격증·어학 등 보유 활동 현황</div>
            </div>
            <div className="st-col-body st-skill-list">
              {data.certification.rows.map(cert => (
                <div key={cert.certId} className={`st-skill-row${cert.added ? ' st-skill-row-added' : ''}`}>
                  <div className="st-skill-icon">
                    <i className={`fa-solid ${cert.icon}`} />
                  </div>
                  <div className="st-skill-info">
                    <span className={`st-skill-name${cert.owned ? ' done' : ''}`}>{cert.label}</span>
                    <span className="st-skill-sub">
                      {cert.issuer}
                      {cert.acquiredDt && <> · {cert.acquiredDt} 취득</>}
                    </span>
                  </div>
                  <div className={`st-skill-check${cert.owned ? ' done' : ' todo'}`}>
                    {cert.owned && <i className="fa-solid fa-check" />}
                  </div>
                  {cert.added && (
                    <button
                      className="st-skill-row-remove"
                      onClick={() => removeCert(cert.certId)}
                      aria-label={`${cert.label} 삭제`}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              ))}
              {data.certification.rows.length === 0 && (
                <p className="st-col-empty">등록된 자격증이 없습니다.</p>
              )}
            </div>

            <button className="st-cert-add" onClick={() => setCertPickerOpen(true)}>
              <i className="fa-solid fa-plus" /> 자격증 추가
            </button>

            <div className="st-col-fit">
              보유 {data.certification.ownedCount} / {data.certification.rows.length}
            </div>
          </div>
        </div>

        {/* ── Neon Flow ── */}
        <div className="st-flow-wrap">
          <svg className="st-flow" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="st-neon" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="500" y2="260">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="st-beam" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="500" y2="260">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="50%" stopColor="#bae6fd" stopOpacity="1" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
              <filter id="st-glow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="1080" height="340">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path className="st-flow-path" d="M 166 0 C 166 84, 420 116, 500 210" />
            <path className="st-flow-path" d="M 500 0 C 500 92, 500 128, 500 210" />
            <path className="st-flow-path" d="M 834 0 C 834 84, 580 116, 500 210" />
            <path className="st-flow-beam st-flow-beam-1" pathLength="100" d="M 166 0 C 166 84, 420 116, 500 210" />
            <path className="st-flow-beam st-flow-beam-2" pathLength="100" d="M 500 0 C 500 92, 500 128, 500 210" />
            <path className="st-flow-beam st-flow-beam-3" pathLength="100" d="M 834 0 C 834 84, 580 116, 500 210" />
          </svg>
          <button
            type="button"
            className="st-analyze-btn"
            onClick={startAnalyze}
            disabled={analyzing}
            aria-label="AI 직무적합도 분석하기"
          >
            <span className="st-analyze-btn-icon">
              <i className="fa-solid fa-wand-magic-sparkles" />
            </span>
            <span className="st-analyze-btn-label">분석하기</span>
          </button>
        </div>

        {/* ── 직무 방향 ── */}
        <div className="st-dir-section">
          <div className="st-dir-section-head">
            <div>
              <div className="st-dir-section-title">직무 방향</div>
              <div className="st-dir-section-sub">현재 역량과 가장 잘 맞는 커리어를 확인하세요</div>
            </div>
            <button className="st-dir-add-btn" onClick={() => setJobInputOpen(true)}>
              <i className="fa-solid fa-plus" /> 직무 추가
            </button>
          </div>

          {jobInputOpen && (
            <div className="st-job-input" role="group" aria-label="직무 입력 및 재분석">
              <input
                value={jobInput}
                onChange={event => { setJobInput(event.target.value); setJobInputError('') }}
                onKeyDown={event => { if (event.key === 'Enter') handleReanalyzeJob() }}
                list="skill-tree-job-options"
                placeholder="분석할 직무를 입력하세요"
                autoFocus
              />
              <datalist id="skill-tree-job-options">
                {[...data.directions.map(direction => direction.name), ...jobOptions.map(job => job.label)].map(label => (
                  <option key={label} value={label} />
                ))}
              </datalist>
              <button type="button" onClick={handleReanalyzeJob}>재분석</button>
              <button type="button" className="st-job-input-cancel" onClick={() => setJobInputOpen(false)} aria-label="직무 입력 닫기">
                <i className="fa-solid fa-xmark" />
              </button>
              {jobInputError && <p>{jobInputError}</p>}
            </div>
          )}

          <div className="st-dir-grid">
            {data.directions.map(dir => (
              <div
                key={dir.jobId}
                className={`st-dir-card${expandedDirection === dir.jobId ? ' expanded' : ''}${dir.jobId === selectedDirection ? ' selected' : ''}`}
                onClick={() => toggleDirection(dir.jobId)}
              >
                <div className="st-dir-card-icon">
                  <i className={`fa-solid ${dir.icon}`} />
                </div>
                <div className="st-dir-card-info">
                  <div className="st-dir-card-name">{dir.name}</div>
                  <div className="st-dir-card-sub">
                    요구 역량 {dir.matchedCount} / {dir.totalCount} 충족
                  </div>
                </div>
                <div className="st-dir-card-fit">
                  <span>{dir.fitPercent}%</span>
                  <small>적합도</small>
                </div>
                <i className={`fa-solid fa-chevron-${expandedDirection === dir.jobId ? 'up' : 'down'} st-dir-card-chevron`} />
                {dir.added && (
                  <button
                    className="st-dir-card-remove"
                    onClick={e => { e.stopPropagation(); handleRemoveJob(dir.jobId) }}
                    aria-label={`${dir.name} 삭제`}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
            ))}
            {data.directions.length === 0 && (
              <p className="st-col-empty">관심 직무를 추가하면 적합도를 분석합니다.</p>
            )}
          </div>

          {expanded && <DirectionDetail dir={expanded} />}
        </div>

        {/* ── Analysis Bar ── */}
        <div className="st-analysis">
          <div className="st-analysis-title">전체 역량 분석</div>
          <div className="st-analysis-stats">
            <div className="st-stat">
              <span className="st-stat-label">연결된 역량</span>
              <span className="st-stat-val">
                {data.analysis.connectedSkills}
                <span className="st-stat-total">/{data.analysis.totalSkills}</span>
              </span>
            </div>
            <div className="st-stat">
              <span className="st-stat-label">강점 역량</span>
              <span className="st-stat-val st-stat-strong">{data.analysis.strongSkills}</span>
            </div>
            <div className="st-stat">
              <span className="st-stat-label">보완 필요 역량</span>
              <span className="st-stat-val st-stat-weak">{data.analysis.weakSkills}</span>
            </div>
          </div>
          <div className="st-analysis-score">
            <span className="st-analysis-score-label">종합 적합도</span>
            <DonutChart percent={data.analysis.overallPercent} />
          </div>
          <p className="st-analysis-desc">{data.analysis.description}</p>
          <button className="st-analysis-btn">상세 분석 보기 <i className="fa-solid fa-arrow-right" /></button>
        </div>

        {/* ── TIP Bar ── */}
        <div className="st-tip">
          <i className="fa-solid fa-circle-info" /><strong>TIP</strong>&nbsp; 타학과 수강 과목도 역량으로 반영됩니다. 부족한 역량은 다음 학기 수강신청에 참고하세요!
        </div>
      </div>

      {/* ── 직무 선택 모달 ── */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="직무 추가" size="sm">
        <p className="st-picker-desc">관심 직무를 선택하면 현재 역량 기준 적합도를 분석해 드려요.</p>
        <div className="st-picker-list">
          {jobOptions.map(job => (
            <button key={job.jobId} className="st-picker-item" onClick={() => handleAddJob(job.jobId)}>
              <div className="st-picker-icon">
                <i className={`fa-solid ${job.icon}`} />
              </div>
              <div className="st-picker-info">
                <span className="st-picker-name">{job.label}</span>
                <span className="st-picker-sub">{job.summary}</span>
              </div>
              <div className="st-picker-fit">{job.category}</div>
            </button>
          ))}
          {jobOptions.length === 0 && <p className="st-picker-empty">모든 직무를 추가했습니다.</p>}
        </div>
      </Modal>

      {/* ── 자격증 추가 모달 ── */}
      <Modal open={certPickerOpen} onClose={() => setCertPickerOpen(false)} title="자격증 추가" size="sm">
        <p className="st-picker-desc">취득했거나 목표로 하는 자격증을 선택하세요.</p>
        <div className="st-picker-list">
          {certOptions.map(cert => (
            <button key={cert.certId} className="st-picker-item" onClick={() => handleAddCert(cert.certId)}>
              <div className="st-picker-icon">
                <i className={`fa-solid ${cert.icon}`} />
              </div>
              <div className="st-picker-info">
                <span className="st-picker-name">{cert.label}</span>
                <span className="st-picker-sub">{cert.issuer} · {cert.kind}</span>
              </div>
            </button>
          ))}
          {certOptions.length === 0 && <p className="st-picker-empty">모든 자격증을 추가했습니다.</p>}
        </div>
      </Modal>

      {/* ── AI 분석 로딩 오버레이 ── */}
      {analyzing && (
        <div className="st-analyze-overlay" role="dialog" aria-live="polite" aria-busy={progress < 100}>
          <div className="st-analyze-card">
            {progress < 100
              ? <div className="st-analyze-spinner" />
              : <div className="st-analyze-check"><i className="fa-solid fa-check" /></div>}
            <h3 className="st-analyze-title">
              {progress < 100 ? 'AI가 직무적합도를 분석중입니다' : '분석이 완료되었습니다'}
            </h3>
            <p className="st-analyze-sub">
              {progress < 100
                ? '진단 결과 · 수강 과목 · 자격증 데이터를 종합 분석합니다'
                : '아래 직무 방향 카드에서 결과를 확인해보세요'}
            </p>
            <div className="st-analyze-bar">
              <div className="st-analyze-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="st-analyze-percent">{progress}%</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 로딩 — 학사 데이터를 불러오는 동안 4열 골격을 유지해 레이아웃이 튀지 않게 한다. */
function SkillTreeSkeleton() {
  return (
    <div className="st-wrapper">
      <div className="st-content" aria-busy="true" aria-live="polite">
        <div className="st-header st-sk-header">
          <span className="sr-only">학사 데이터를 불러오는 중입니다</span>
        </div>
        <div className="st-grid">
          {[0, 1, 2, 3].map(col => (
            <div key={col} className="st-col">
              <div className="st-col-header">
                <div className="st-sk-line st-sk-w40" />
                <div className="st-sk-line st-sk-w70" />
              </div>
              <div className="st-col-body">
                {Array.from({ length: 5 }, (_, i) => <div key={i} className="st-sk-row" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 빈 상태 · 에러 공용 안내면. */
function Notice({ icon, title, children }: {
  icon: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="st-wrapper">
      <div className="st-content">
        <div className="st-empty">
          <i className={`fa-solid ${icon}`} />
          <h2>{title}</h2>
          <p>{children}</p>
        </div>
      </div>
    </div>
  )
}

/** 과목 열(핵심 역량 · 전문 역량). 교육과정 ∪ 수강이력에서 파생된 행을 그린다. */
function CourseColumn({ group }: { group: CourseGroup }) {
  return (
    <div className="st-col st-col--course">
      <div className="st-col-header">
        <div className="st-col-title">{group.title}</div>
        <div className="st-col-subtitle">{group.subtitle}</div>
      </div>
      <div className="st-col-body st-skill-list">
        {group.rows.map(row => <CourseRowView key={row.code} row={row} />)}
        {group.rows.length === 0 && <p className="st-col-empty">해당 과목이 없습니다.</p>}
      </div>
      <div className="st-col-fit">
        이수 {group.doneCount} / {group.totalCount} · {group.fitPercent}%
      </div>
    </div>
  )
}

function CourseRowView({ row }: { row: CourseRow }) {
  const stateCls = row.done ? ' done' : row.inProgress ? ' progress' : ' todo'
  return (
    <div
      className={`st-skill-row${row.external ? ' st-skill-row-ext' : ''}`}
      title={row.skills.length ? `연계 역량: ${row.skills.join(', ')}` : undefined}
    >
      <div className="st-skill-icon">
        <i className={`fa-solid ${row.icon}`} />
      </div>
      <div className="st-skill-info">
        <span className={`st-skill-name${row.done ? ' done' : ''}`}>
          {row.name}
          {row.external && (
            <span className="st-badge st-badge-ext" title={`${row.externalDept} 개설`}>타학과</span>
          )}
        </span>
        <span className="st-skill-sub">
          <span className="st-skill-code">{row.code}</span>
          <span className="st-badge st-badge-cls">{row.courseCls}</span>
          {row.credit}학점
          {row.grade && <> · {row.grade}</>}
          {row.inProgress && <> · 수강중</>}
        </span>
      </div>
      <div className={`st-skill-check${stateCls}`}>
        {row.done && <i className="fa-solid fa-check" />}
        {row.inProgress && <i className="fa-solid fa-ellipsis" />}
      </div>
    </div>
  )
}

function DirectionDetail({ dir }: { dir: DirectionRow }) {
  return (
    <div className="st-dir-detail">
      <div className="st-dir-detail-head">
        <div className="st-dir-detail-icon">
          <i className={`fa-solid ${dir.icon}`} />
        </div>
        <div className="st-dir-detail-titles">
          <div className="st-dir-detail-name">{dir.name}</div>
          <div className="st-dir-detail-sub">{dir.subtitle}</div>
        </div>
        <div className="st-dir-detail-fit">
          <span>{dir.fitPercent}%</span>
          <small>적합도</small>
        </div>
      </div>

      <div className="st-dir-detail-body">
        <div className="st-dir-detail-block">
          <div className="st-dir-detail-block-title">
            <i className="fa-solid fa-briefcase" /> 이 직무가 하는 일
          </div>
          <ul className="st-dir-detail-list">
            {dir.whatToDo.map(item => (
              <li key={item}><span>{item}</span><i className="fa-solid fa-check" /></li>
            ))}
          </ul>
        </div>

        <div className="st-dir-detail-block">
          <div className="st-dir-detail-block-title">
            <i className="fa-solid fa-triangle-exclamation" /> 보완이 필요한 역량
          </div>
          {dir.gapSkills.length ? (
            <div className="st-dir-detail-tags">
              {dir.gapSkills.map(s => (
                <span key={s} className="st-dir-detail-tag st-dir-detail-tag-gap">{s}</span>
              ))}
            </div>
          ) : (
            <p className="st-dir-detail-none">요구 역량을 모두 충족했습니다.</p>
          )}

          <div className="st-dir-detail-block-title" style={{ marginTop: 18 }}>
            <i className="fa-solid fa-building" /> 취업 기관 · 방향
          </div>
          <div className="st-dir-detail-tags">
            {dir.targetOrgs.map(org => (
              <span key={org} className="st-dir-detail-tag">{org}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DonutChart({ percent }: { percent: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - percent / 100)
  return (
    <svg className="st-donut-svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#F2F5FF" strokeWidth="8" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke="#2E5BFF" strokeWidth="8"
        strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1C2442">
        {percent}%
      </text>
    </svg>
  )
}
