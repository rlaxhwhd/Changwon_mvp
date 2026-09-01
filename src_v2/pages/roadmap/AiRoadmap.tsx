import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import { usePageHead } from '../../components/PageCrumb'
// 생성된 로드맵은 새로 그리지 않는다 — 상담사 편집기(/admin/roadmap/:id)와 같은 공용 보드다.
import RoadmapAxisBoard from '../../components/RoadmapAxisBoard'
import { useSkillTree } from '../../hooks/useSkillTree'
import { getActiveStudent, getHeadlineCompetency } from '../../data/students'
import { typeLabel } from '../../data/careerProcess'
import { ROADMAP_AXIS_MAP } from '../../data/schema/roadmap'
import type { RoadmapAxis } from '../../data/schema/roadmap'
// 로드맵 1개의 정본은 교직원 포털의 읽기 모델이다(base ⊕ 상담사 override ⊕ 프로그램 편입분).
// 학생 화면이 축·칸을 다시 조립하지 않는다 — DB 전환 시 이 import 하나가 쿼리로 바뀐다.
import { getStudentRoadmap } from '../../../src_admin/data/roadmap'
// 상담 코멘트도 같은 단일소스(상담 기록)에서 읽는다. comment 는 '학생에게 공개되는' 필드다.
import { getRecordsByStudent } from '../../../src_admin/data/counselRecords'
import type { CourseRow } from '../../data/academic'
import './AiRoadmap.css'

// ─────────────────────────────────────────────────────────────────────────
// AI 직무 로드맵 — 시안 roadmap.html 이식
//
//   01 AI 현재역량현황 재료 3종(진단·상담 / 수강강의 / 스펙) → AI 오브 → 목표 직무 → 생성
//   02 로드맵 결과    RoadmapAxisBoard(공용 3축 보드)
//
// 흐름: 오브 클릭 → 분석 로딩 → 직무 적합도 목록 → 직무 선택(목표 확정)
//       → 「AI분석 / 로드맵 생성」 → 생성 로딩 → 02 결과.
//
// 이 파일에는 과목·직무·자격증·축 리터럴을 두지 않는다. 전부 데이터층에서 온다.
// ─────────────────────────────────────────────────────────────────────────

/** 축 카드 아래 「더보기」 목적지. 갈 곳이 없는 축은 버튼을 그리지 않는다. */
const AXIS_MORE: Record<RoadmapAxis, { to: string; label: string } | null> = {
  IAP: { to: '/growth/program', label: '비교과 프로그램 더보기' },
  CORE: null, // 학과 개설 강의 목록 화면이 아직 없다
  GROWTH: { to: '/mypage/portfolio', label: '성장 활동 더보기' },
}

/** 교과 구분 → 태그 색. 새 색을 만들지 않고 시안이 정한 4종에 매핑한다. */
function courseTagClass(courseCls: string): string {
  if (courseCls === '전공필수') return 'is-req'
  if (courseCls === '전공선택') return 'is-sel'
  if (courseCls === '타학과') return 'is-etc'
  return 'is-lib'
}

const ANALYZE_MS = 2400
const GENERATE_MS = 2000

/** 진행률 애니메이션 한 벌 — 직무분석·로드맵생성 두 로딩이 같이 쓴다. */
function useProgressRun(active: boolean, duration: number, onDone: () => void) {
  const [progress, setProgress] = useState(0)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (!active) return
    setProgress(0)
    const start = performance.now()
    let rafId = 0
    const tick = (now: number) => {
      const elapsed = now - start
      setProgress(Math.min(100, Math.round((elapsed / duration) * 100)))
      if (elapsed < duration) rafId = requestAnimationFrame(tick)
      else done.current()
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [active, duration])

  return progress
}

export default function AiRoadmap() {
  usePageHead('AI 직무 로드맵', '진단·상담 결과와 수강 정보, 학생 스펙을 종합해 맞춤형 로드맵을 생성합니다.')

  const { status, data, jobOptions, addJob } = useSkillTree()
  const student = getActiveStudent()
  const roadmap = useMemo(() => getStudentRoadmap(student.id), [student.id])
  // 기록은 최신순이다. 코멘트를 아직 안 쓴 회차가 섞이므로 '코멘트가 있는' 최신 1건을 고른다.
  const lastComment = useMemo(
    () => getRecordsByStudent(student.id).find(record => record.comment?.trim()),
    [student.id],
  )

  // 모달은 두 국면을 갖는다 — 열면 먼저 분석하고(loading), 끝나면 목록을 보여준다(list).
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPhase, setPickerPhase] = useState<'loading' | 'list'>('loading')
  const [targetJobId, setTargetJobId] = useState<string | null>(null)
  const [targetSetAt, setTargetSetAt] = useState<string | null>(null)
  const [jobInput, setJobInput] = useState('')
  const [jobInputError, setJobInputError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const analyzeProgress = useProgressRun(
    pickerOpen && pickerPhase === 'loading', ANALYZE_MS,
    () => setPickerPhase('list'),
  )
  const generateProgress = useProgressRun(
    generating, GENERATE_MS,
    () => { setGenerating(false); setGenerated(true) },
  )

  // 학생이 바뀌면 목표 직무·생성 결과를 되돌린다.
  useEffect(() => {
    setTargetJobId(null)
    setTargetSetAt(null)
    setGenerated(false)
  }, [student.id])

  // 적합도가 높은 순으로 — 모달에서 학생이 위에서부터 고르게 한다.
  const directions = [...(data?.directions ?? [])].sort((a, b) => b.fitPercent - a.fitPercent)
  const target = directions.find(d => d.jobId === targetJobId) ?? null
  const targetOption = jobOptions.find(job => job.jobId === targetJobId) ?? null

  const openPicker = () => { setPickerOpen(true); setPickerPhase('loading') }

  /** 직무 확정 — 적합도는 모달을 열 때 이미 분석했으므로 바로 목표로 잡는다. */
  const pickJob = (jobId: string) => {
    setTargetJobId(jobId)
    setTargetSetAt(new Date().toISOString().slice(0, 10))
    setPickerOpen(false)
  }

  const handleAddJob = () => {
    const query = jobInput.trim().toLocaleLowerCase()
    if (!query) { setJobInputError('직무를 입력하거나 위 목록에서 선택하세요.'); return }
    const existing = directions.find(d => d.name.toLocaleLowerCase() === query)
    if (existing) { setJobInputError(''); setJobInput(''); pickJob(existing.jobId); return }
    const candidate = jobOptions.find(job => job.label.toLocaleLowerCase() === query)
    if (!candidate) { setJobInputError('등록된 직무 목록에서 선택할 수 있습니다.'); return }
    addJob(candidate.jobId)
    setJobInputError('')
    setJobInput('')
    pickJob(candidate.jobId)
  }

  const closePicker = () => {
    if (pickerPhase === 'loading') return
    setPickerOpen(false)
    setJobInputError('')
  }

  // 재료 2 — 수강했거나 수강 중인 과목만 재료로 쓴다.
  const allCourses = data ? [...data.core.rows, ...data.expert.rows] : []
  const takenCourses = allCourses.filter(row => row.done || row.inProgress).slice(0, 5)
  const ownedCerts = data?.certification.rows.filter(cert => cert.owned) ?? []

  return (
    <div className="air">
      {/* ===== 01 AI 현재역량현황 ===== */}
      <section className="air-panel">
        <div className="air-sec-head">
          <span className="air-sec-no">01</span>
          <h2 className="air-sec-title">AI 현재역량현황</h2>
        </div>
        <p className="air-sec-desc">
          진단·상담 결과와 수강 정보, 학생 스펙을 종합하여 AI가 분석하고 목표 직무를 설정합니다.
        </p>

        <div className="air-sources">
          {/* 재료 1 — 진단유형 / 상담 */}
          <article className="air-src is-mint">
            <div className="air-src-head">
              <span className="air-src-ico"><AirIcon name="users" /></span>
              <h3 className="air-src-title">진단유형 / 상담</h3>
            </div>
            <div className="air-src-body">
              <dl className="air-kv">
                <div className="air-kv-row">
                  <dt>확정 유형</dt>
                  <dd><span className="air-badge is-mint">{student.studentType} {typeLabel(student.studentType)}</span></dd>
                </div>
                <div className="air-kv-row">
                  <dt>상담 코멘트</dt>
                  <dd>
                    {lastComment
                      ? <p>{lastComment.comment}<em className="air-kv-by">{lastComment.counselorName} · {lastComment.date}</em></p>
                      : <p>아직 등록된 상담 코멘트가 없습니다.</p>}
                  </dd>
                </div>
              </dl>
              {/* AI 분석 — 서술과 대표 역량을 한 상자에 모은다.
                  같은 판정을 두 군데에 나누어 놓으면 따로 읽힌다. */}
              <section className="air-analysis">
                <h4>AI 분석</h4>
                <p>{student.insight}</p>
                <ul className="air-checks">
                  {getHeadlineCompetency(student).map(item => {
                    const strong = item.type === 'strength'
                    return (
                      <li key={item.label} className={strong ? 'is-strength' : 'is-weak'}>
                        <span className="air-check-mark">
                          <AirIcon name={strong ? 'check' : 'alert'} />
                        </span>
                        {item.label} {strong ? '강점' : '약점'} ({item.value}점)
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>
          </article>

          {/* 재료 2 — 수강강의 / 학과 */}
          <article className="air-src is-blue">
            <div className="air-src-head">
              <span className="air-src-ico"><AirIcon name="book" /></span>
              <h3 className="air-src-title">수강강의 / 학과</h3>
            </div>
            <div className="air-src-body">
              <section className="air-courses">
                <h4>나의 수강 강의</h4>
                {takenCourses.map(row => <CourseLine key={row.code} row={row} />)}
                {takenCourses.length === 0 && (
                  <p className="air-course-empty">
                    {status === 'loading' ? '수강 이력을 불러오는 중입니다.' : '수강 이력이 아직 연동되지 않았습니다.'}
                  </p>
                )}
              </section>
            </div>
          </article>

          {/* 재료 3 — 학생 성장 */}
          <article className="air-src is-violet">
            <div className="air-src-head">
              <span className="air-src-ico"><AirIcon name="user" /></span>
              <h3 className="air-src-title">학생 성장</h3>
            </div>
            <div className="air-src-body">
              <dl className="air-specs">
                <div className="air-spec">
                  <span className="air-spec-ico"><AirIcon name="lang" className="sm" /></span>
                  <dt>어학 성적</dt>
                  <dd><span>{student.language}</span></dd>
                </div>
                <div className="air-spec">
                  <span className="air-spec-ico"><AirIcon name="cert" className="sm" /></span>
                  <dt>자격증</dt>
                  <dd>
                    {ownedCerts.map(cert => (
                      <span key={cert.certId}>{cert.label}{cert.acquiredDt ? ` (${cert.acquiredDt})` : ''}</span>
                    ))}
                    {ownedCerts.length === 0 && <span>보유한 자격증이 없습니다.</span>}
                  </dd>
                </div>
                <div className="air-spec">
                  <span className="air-spec-ico"><AirIcon name="trophy" className="sm" /></span>
                  <dt>공모전</dt>
                  <dd><span>{student.scoreInputs.contests}건 참여</span></dd>
                </div>
                <div className="air-spec">
                  <span className="air-spec-ico"><AirIcon name="file" className="sm" /></span>
                  <dt>프로젝트</dt>
                  <dd><span>{student.scoreInputs.projects}건 수행</span></dd>
                </div>
              </dl>
            </div>
          </article>
        </div>

        {/* 재료 3종 → AI 오브 커넥터 */}
        <div className="air-connector" aria-hidden="true">
          <span className="air-drop" style={{ left: '16.3%' }} />
          <span className="air-drop" style={{ left: '50%' }} />
          <span className="air-drop" style={{ left: '83.7%' }} />
          <span className="air-bus" style={{ left: '16.3%', right: '16.3%' }} />
          <span className="air-tail" style={{ left: '36.8%' }} />
        </div>

        {/* AI 플로우 — 로드맵이 생성된 뒤에는 잠근다.
            로드맵 정본은 상담사가 쥐고 있어(PROCESS.md), 학생이 여기서 다시 생성하면
            상담사가 만든 로드맵을 학생이 덮어쓰는 셈이 된다. */}
        <div className={`air-flow-wrap${generated ? ' is-locked' : ''}`}>
        <div className="air-flow" aria-hidden={generated || undefined}>
          <div className="air-flow-card">
            <h4><AirIcon name="brain" />AI 종합 분석</h4>
            <ul>
              <li><AirIcon name="check-circle" />진단 결과 + 수강 패턴 + 스펙 분석</li>
              <li><AirIcon name="check-circle" />직무 요구역량 매칭 및 역량 갭 분석</li>
              <li><AirIcon name="check-circle" />개인 성장 우선순위 도출</li>
            </ul>
          </div>

          <span className="air-chev" aria-hidden="true">
            <AirIcon name="chev" /><AirIcon name="chev" /><AirIcon name="chev" />
          </span>

          {/* AI 오브 — 누르면 곧바로 적합도 분석이 돈다 */}
          <button
            type="button"
            className="air-orb"
            onClick={openPicker}
            disabled={status !== 'ready'}
            aria-haspopup="dialog"
          >
            <AirIcon name="spark" className="air-orb-star" />
            <span className="air-orb-label">AI 직무분석</span>
          </button>

          <span className="air-chev" aria-hidden="true"><AirIcon name="chev" /></span>

          <div className="air-flow-card">
            <h4><AirIcon name="target" />목표 직무 설정</h4>
            <div className="air-job-box">
              <p className={`air-job-name${target ? '' : ' is-empty'}`}>
                {target ? target.name : '직무를 선택하세요'}
              </p>
              <dl className="air-job-meta">
                <dt>직무 그룹</dt><dt>적합도</dt><dt>설정일</dt>
                <dd>{targetOption?.category ?? target?.subtitle ?? '—'}</dd>
                <dd>{target ? `${target.fitPercent}%` : '—'}</dd>
                <dd>{targetSetAt ?? '—'}</dd>
              </dl>
            </div>
          </div>

          <span className="air-chev" aria-hidden="true"><AirIcon name="chev" /></span>

          <button
            type="button"
            className="air-gen"
            onClick={() => setGenerating(true)}
            disabled={!target || !roadmap || generating}
          >
            <b><AirIcon name="spark" />AI분석 / 로드맵 생성</b>
            <small>{target ? '맞춤형 로드맵 1개 생성' : '목표 직무를 먼저 설정하세요'}</small>
          </button>
        </div>

        {generated && (
          <div className="air-flow-lock">
            {/* 자물쇠는 Font Awesome 아이콘이다 — 비교과 추천 잠금(pr-reco-lock)과 같은 표기다. */}
            <span className="air-flow-lock-icon"><i className="fa-solid fa-lock" /></span>
            <p className="air-flow-lock-text">로드맵 변경은 상담사의 승인이 필요합니다.</p>
            <Link to="/roadmap/request" className="air-flow-lock-btn">
              <AirIcon name="plus" className="xs" />로드맵 변경하기
            </Link>
          </div>
        )}
        </div>
      </section>

      {/* ===== 02 맞춤형 로드맵 결과 ===== */}
      {generated && roadmap && (
        <>
          <div className="air-link-arrow" aria-hidden="true">
            <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
              <defs>
                <linearGradient id="air-arrow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--violet-soft)" />
                  <stop offset="1" stopColor="var(--violet)" />
                </linearGradient>
              </defs>
              <path d="M11 0h12v14h8L17 30 3 14h8z" fill="url(#air-arrow)" />
            </svg>
          </div>

          <section className="air-panel">
            <div className="air-sec-head">
              <span className="air-sec-no">02</span>
              <h2 className="air-sec-title">맞춤형 로드맵 결과</h2>
            </div>
            <p className="air-sec-desc">AI 분석 결과를 바탕으로 생성된 맞춤형 로드맵입니다.</p>

            {/* 히어로 */}
            <div className="air-hero">
              <div>
                <p className="air-hero-kicker">나만을 위한 단 하나의 로드맵</p>
                <h3>{target?.name ?? student.targetRole}</h3>
                <p className="air-hero-desc">
                  목표 직무 기준 · {roadmap.axes.map(a => ROADMAP_AXIS_MAP[a.axis].label).join(' · ')} 3축을
                  하나의 로드맵으로 관리합니다.
                </p>
              </div>
              <div className="air-hero-stat">
                <div>
                  <p className="air-label">전체 이행률</p>
                  <p className="air-value">{roadmap.progress.pct}<small>%</small></p>
                  <p className="air-sub">이행 {roadmap.progress.done} / {roadmap.progress.total}칸</p>
                </div>
                <div
                  className="air-donut"
                  style={{ '--pct': roadmap.progress.pct } as React.CSSProperties}
                  role="img"
                  aria-label={`전체 이행률 ${roadmap.progress.pct}%`}
                />
              </div>
            </div>

            {/* 3축 — 상담사 편집기와 같은 공용 보드. 여기서 3축 마크업을 다시 쓰지 않는다. */}
            <div className="air-board">
              <RoadmapAxisBoard
                axes={roadmap.axes}
                origin={roadmap.origin}
                axisFooter={axis => {
                  const more = AXIS_MORE[axis.axis]
                  return more ? (
                    <Link className="air-axis-more" to={more.to}>
                      <AirIcon name="plus" className="xs" />{more.label}
                    </Link>
                  ) : null
                }}
              />
            </div>
          </section>
        </>
      )}

      {/* 로드맵이 아직 없는 학생 — 빈 화면 대신 다음 단계를 준다 (CLAUDE.md 규칙 13) */}
      {!roadmap && (
        <div className="air-locked">
          <AirIcon name="info" />
          <h3>아직 로드맵이 생성되지 않았습니다</h3>
          <p>
            로드맵은 진단과 상담을 마친 뒤 상담 자리에서 함께 만들어집니다.<br />
            먼저 진로취업상담을 신청해 주세요.
          </p>
          <Link to="/counsel/career">상담 신청하러 가기</Link>
        </div>
      )}

      {/* ── 직무 분석 모달 — 열자마자 분석하고, 끝나면 적합도 목록을 보여준다 ── */}
      <Modal open={pickerOpen} onClose={closePicker} title="AI 직무분석" size="md">
        {pickerPhase === 'loading' ? (
          <LoadingPane
            progress={analyzeProgress}
            title="AI가 직무적합도를 분석중입니다"
            desc="진단 결과 · 수강 과목 · 자격증 데이터를 종합 분석합니다"
          />
        ) : (
          <>
            <p className="air-pick-desc">분석이 끝났습니다. 목표로 삼을 직무를 선택하세요.</p>
            <div className="air-pick-list">
              {directions.map(dir => (
                <button
                  key={dir.jobId}
                  type="button"
                  className={`air-pick-item${dir.jobId === targetJobId ? ' is-selected' : ''}`}
                  onClick={() => pickJob(dir.jobId)}
                >
                  <span className="air-pick-ico"><AirIcon name="target" /></span>
                  <span className="air-pick-info">
                    <span className="air-pick-name">{dir.name}</span>
                    <span className="air-pick-sub">요구 역량 {dir.matchedCount} / {dir.totalCount} 충족</span>
                  </span>
                  <span className="air-pick-fit">
                    <b>{dir.fitPercent}%</b>
                    <small>적합도</small>
                  </span>
                </button>
              ))}
              {directions.length === 0 && <p className="air-pick-empty">분석할 직무가 없습니다. 아래에서 추가해 주세요.</p>}
            </div>

            <div className="air-pick-add">
              <input
                value={jobInput}
                onChange={event => { setJobInput(event.target.value); setJobInputError('') }}
                onKeyDown={event => { if (event.key === 'Enter') handleAddJob() }}
                list="air-job-options"
                placeholder="분석할 직무를 입력해 추가"
                aria-label="분석할 직무 입력"
              />
              <datalist id="air-job-options">
                {jobOptions.map(job => <option key={job.jobId} value={job.label} />)}
              </datalist>
              <button type="button" onClick={handleAddJob}>추가</button>
            </div>
            {jobInputError && <p className="air-pick-error">{jobInputError}</p>}
          </>
        )}
      </Modal>

      {/* ── 로드맵 생성 로딩 ── */}
      <Modal open={generating} onClose={() => undefined} title="로드맵 생성" size="md">
        <LoadingPane
          progress={generateProgress}
          title="AI가 맞춤형 로드맵을 생성중입니다"
          desc={`${target?.name ?? ''} 기준으로 3축 로드맵을 구성합니다`}
        />
      </Modal>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

/** 분석·생성 두 로딩이 같이 쓰는 진행 화면. */
function LoadingPane({ progress, title, desc }: { progress: number; title: string; desc: string }) {
  return (
    <div className="air-analyzing" aria-live="polite" aria-busy={progress < 100}>
      <div className="air-analyzing-spinner" />
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className="air-analyzing-bar"><i style={{ width: `${progress}%` }} /></div>
      <span className="air-analyzing-pct">{progress}%</span>
    </div>
  )
}

function CourseLine({ row }: { row: CourseRow }) {
  return (
    <div className="air-course">
      <span className="air-course-code">{row.code}</span>
      <span className="air-course-name">{row.name}</span>
      <span className={`air-tag ${courseTagClass(row.courseCls)}`}>{row.courseCls}</span>
      <span className="air-course-cr">{row.credit}학점</span>
    </div>
  )
}

// ─── 아이콘 ───────────────────────────────────────────────────────────────
// 시안이 쓴 outline 스프라이트를 컴포넌트로 옮긴 것(DESIGN.md §21). 이모지 금지.

const ICON_PATHS: Record<string, React.ReactNode> = {
  spark: <><path d="M11 3l1.7 4.3L17 9l-4.3 1.7L11 15l-1.7-4.3L5 9l4.3-1.7z" /><path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  users: <><path d="M15.5 20v-1.8a3.7 3.7 0 00-3.7-3.7H6.2A3.7 3.7 0 002.5 18.2V20" /><circle cx="9" cy="7.5" r="3.6" /><path d="M21.5 20v-1.8a3.7 3.7 0 00-2.8-3.6M16.5 4.2a3.7 3.7 0 010 6.7" /></>,
  book: <><path d="M4 4.5h6.2a1.8 1.8 0 011.8 1.8v13a1.8 1.8 0 00-1.8-1.8H4z" /><path d="M20 4.5h-6.2a1.8 1.8 0 00-1.8 1.8v13a1.8 1.8 0 011.8-1.8H20z" /></>,
  user: <><path d="M19.5 20.5v-2a4 4 0 00-4-4h-7a4 4 0 00-4 4v2" /><circle cx="12" cy="7.5" r="4" /></>,
  lang: <><path d="M20.5 14.5a2 2 0 01-2 2H7.5l-4 3.5v-15a2 2 0 012-2h13a2 2 0 012 2z" /><path d="M8 9.5h8M8 12.8h5" /></>,
  cert: <><path d="M12 2.8l7.5 2.8v5.6c0 4.8-3.2 7.6-7.5 8.8-4.3-1.2-7.5-4-7.5-8.8V5.6z" /><path d="M9 11.8l2.1 2.1 4.1-4.2" /></>,
  trophy: <><path d="M8 3.5h8v5.2a4 4 0 01-8 0z" /><path d="M8 4.8H5v1.9a3 3 0 003 3M16 4.8h3v1.9a3 3 0 01-3 3" /><path d="M12 12.8v4M9.5 20.5h5" /></>,
  file: <><path d="M14 3v5h5" /><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M8.5 13h7M8.5 16.5h4.5" /></>,
  brain: <><path d="M11 4.2a2.6 2.6 0 00-4.6 1.5 2.6 2.6 0 00-1.6 4.5 2.7 2.7 0 00.8 4.6 2.6 2.6 0 004.5 2.2h.9z" /><path d="M13 4.2a2.6 2.6 0 014.6 1.5 2.6 2.6 0 011.6 4.5 2.7 2.7 0 01-.8 4.6 2.6 2.6 0 01-4.5 2.2H13z" /><path d="M12 4v14.5" /></>,
  'check-circle': <><circle cx="12" cy="12" r="9.2" /><path d="M8.2 12.2l2.6 2.6 5-5.2" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16.5v-5M12 8h.01" /></>,
  // 배지 자체가 원이라 아이콘까지 원을 그리면 10px 에서 뭉개진다 — 느낌표만 남긴다.
  alert: <><path d="M12 5.5v8.5" /><path d="M12 18.4h.01" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="M20 6.5L9.4 17.2 4 11.8" />,
  chev: <path d="M9 5.5l6.5 6.5L9 18.5" />,
}

function AirIcon({ name, className = '' }: { name: keyof typeof ICON_PATHS; className?: string }) {
  return (
    <svg className={`air-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}
