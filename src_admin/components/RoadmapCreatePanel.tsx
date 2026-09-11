import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { LuTarget } from 'react-icons/lu'
import { typeLabel } from '../../src_v2/data/careerProcess'
import { getHeadlineCompetency, getStudentCounselRequests } from '../../src_v2/data/students'
import type { StudentData } from '../../src_v2/data/students'
import { fetchAcademic, saveJobInterest, type AcademicSnapshot } from '../../src_v2/data/academic/repository'
import { availableJobs, deriveSkillTree } from '../../src_v2/data/academic'
import type { CourseRow } from '../../src_v2/data/academic'
import { getRecordsByStudent } from '../data/counselRecords'
import { generateRoadmap } from '../data/roadmap'
import { isCare7 } from '../../src_v2/data/counselTrack'
import './RoadmapCreatePanel.css'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 생성 패널 (상담사 전용) — /v2/roadmap/skill-tree 「01 AI 현재역량현황」 이식.
//
// ⚠ 공용 컴포넌트가 아니다. 학생 화면(AiRoadmap)과 코드를 공유하지 않는다(사용자 확정).
//   그쪽은 「내 로드맵을 본다」라 생성 후 잠금·변경요청 동선이 붙지만, 이쪽은
//   「상담 중에 담당 학생의 로드맵을 만든다」는 작업 화면이다. 마크업·CSS를 복사해 왔다.
//
// 데이터는 공유한다 — 재료를 뽑는 것은 UI 가 아니라 데이터층이다(academic 리포지토리).
// 학생 화면은 useSkillTree 훅(활성 학생 고정)을 쓰지만 여기는 담당 학생 id 로 직접 부른다.
//
// 흐름: 접힘(가운데 생성 버튼) → 재료 3종 → AI 직무분석 → 목표 직무 선택 → 생성
// 15칸의 내용은 학생 시드 roadmapOutcome 에서 온다(roadmapGenerated.ts).
// ─────────────────────────────────────────────────────────────────────────

const ANALYZE_MS = 2400
const GENERATE_MS = 2000

/** 교과 구분 → 태그 색. 새 색을 만들지 않고 시안이 정한 4종에 매핑한다. */
function courseTagClass(courseCls: string): string {
  if (courseCls === '전공필수') return 'is-req'
  if (courseCls === '전공선택') return 'is-sel'
  if (courseCls === '타학과') return 'is-etc'
  return 'is-lib'
}

/** 진행률 애니메이션 한 벌 — 직무분석·로드맵생성 두 진행이 같이 쓴다. */
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

// ─── 아이콘 ───────────────────────────────────────────────────────────────
// 시안이 쓴 outline 스프라이트(DESIGN.md §21). 이모지 금지.
const ICON_PATHS: Record<string, ReactNode> = {
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
  alert: <><path d="M12 5.5v8.5" /><path d="M12 18.4h.01" /></>,
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

export interface RoadmapCreatePanelProps {
  student: StudentData
  /** 생성 상담사 이름 — 생성 이력에 남는다. */
  counselorName: string
  /** 생성이 끝났다. 부모가 로드맵을 다시 읽어 3축 보드를 그린다. */
  onGenerated: () => void
  /**
   * 이미 로드맵이 있는 학생을 다시 만드는 중인가(PROCESS.md §6-6).
   * 접힘 없이 바로 펼치고, 지금 로드맵이 어떻게 되는지 경고를 함께 띄운다.
   */
  regenerate?: boolean
  /** 재생성을 그만둘 때. regenerate 일 때만 쓴다. */
  onCancel?: () => void
}

type Phase = 'flow' | 'analyzing' | 'picking' | 'generating'

export default function RoadmapCreatePanel({
  student, counselorName, onGenerated, regenerate = false, onCancel,
}: RoadmapCreatePanelProps) {
  const [open, setOpen] = useState(regenerate)
  const [phase, setPhase] = useState<Phase>('flow')
  const [snap, setSnap] = useState<AcademicSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [targetJobId, setTargetJobId] = useState<string | null>(null)
  const [targetSetAt, setTargetSetAt] = useState<string | null>(null)
  const [jobInput, setJobInput] = useState('')
  const [jobInputError, setJobInputError] = useState('')

  // 학사 스냅샷은 펼칠 때 한 번만 읽는다(리포지토리가 async 라 화면이 비동기 흐름이다).
  useEffect(() => {
    if (!open) return
    let alive = true
    fetchAcademic(student.id)
      .then(next => { if (alive) { setSnap(next); setLoaded(true) } })
      .catch(() => { if (alive) { setSnap(null); setLoaded(true) } })
    return () => { alive = false }
  }, [open, student.id])

  const data = useMemo(
    () => (snap ? deriveSkillTree(snap, student, getStudentCounselRequests(student.id)) : null),
    [snap, student])
  const jobOptions = useMemo(() => (snap ? availableJobs(snap) : []), [snap])
  // 적합도가 높은 순으로 — 위에서부터 고르게 한다.
  const directions = useMemo(
    () => [...(data?.directions ?? [])].sort((a, b) => b.fitPercent - a.fitPercent),
    [data],
  )
  const target = directions.find(d => d.jobId === targetJobId) ?? null
  const targetOption = jobOptions.find(job => job.jobId === targetJobId) ?? null

  // 코멘트를 아직 안 쓴 회차가 섞이므로 '코멘트가 있는' 최신 1건을 고른다.
  const lastComment = useMemo(
    () => getRecordsByStudent(student.id).find(r => r.comment?.trim()),
    [student.id],
  )
  const outcome = student.roadmapOutcome
  // 로드맵은 CARE 7+ 진로·취업 상담 자리에서 난다(PROCESS.md §6-7). 서버는 그 상담을
  // 근거로 요구하므로 여기서 어느 상담인지 고른다 — 근거 없이는 생성할 수 없다.
  const basisRequest = useMemo(
    () => getStudentCounselRequests(student.id)
      .filter(request => request.type === '진로취업' && isCare7(request.careTrack)
        && (request.status === '확정' || request.status === '완료'))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0],
    [student.id],
  )
  const [generateError, setGenerateError] = useState('')

  const analyzeProgress = useProgressRun(phase === 'analyzing', ANALYZE_MS, () => setPhase('picking'))
  const generateProgress = useProgressRun(phase === 'generating', GENERATE_MS, () => {
    // 목표 직무는 상담에서 고른 것이 정본이다 — 시드 값보다 우선한다.
    if (!basisRequest) {
      setGenerateError('확정된 CARE 7+ 진로·취업 상담이 있어야 로드맵을 만들 수 있습니다.')
      return
    }
    generateRoadmap(student.id, basisRequest.id, target?.name, `상담 ${counselorName}`)
      .then(() => { setGenerateError(''); onGenerated() })
      .catch(cause => setGenerateError(
        cause instanceof Error ? cause.message : '로드맵을 만들지 못했습니다. 다시 시도해 주세요.'))
  })

  const pickJob = (jobId: string) => {
    setTargetJobId(jobId)
    setTargetSetAt(new Date().toISOString().slice(0, 10))
    setPhase('flow')
  }

  /**
   * 목록에 없는 직무를 직무사전에서 담아 분석한다.
   * 관심직무가 하나도 없는 학생(신입생)은 이 경로로만 목표를 잡을 수 있다 —
   * 적합도는 담긴 직무에 대해서만 계산되기 때문이다.
   */
  const handleAddJob = () => {
    const query = jobInput.trim().toLocaleLowerCase()
    if (!query) { setJobInputError('직무를 입력하거나 위 목록에서 선택하세요.'); return }
    const existing = directions.find(d => d.name.toLocaleLowerCase() === query)
    if (existing) { setJobInputError(''); setJobInput(''); pickJob(existing.jobId); return }
    const candidate = jobOptions.find(job => job.label.toLocaleLowerCase() === query)
    if (!candidate) { setJobInputError('등록된 직무 목록에서 선택할 수 있습니다.'); return }
    saveJobInterest(student.id, candidate.jobId, true)
      .then(() => fetchAcademic(student.id))
      .then(next => {
        setSnap(next)
        setJobInputError('')
        setJobInput('')
        pickJob(candidate.jobId)
      })
      .catch(() => setJobInputError('직무를 담지 못했습니다. 다시 시도해 주세요.'))
  }

  // 재료 2 — 수강했거나 수강 중인 과목만 재료로 쓴다.
  const allCourses = data ? [...data.core.rows, ...data.expert.rows] : []
  const takenCourses = allCourses.filter(row => row.done || row.inProgress).slice(0, 5)
  const ownedCerts = data?.certification.rows.filter(cert => cert.owned) ?? []

  // ── 접힘 — 카드 가운데 생성 버튼 하나 ──────────────────────────────────
  if (!open) {
    return (
      <div className="rcp-empty">
        <span className="rcp-empty-ico"><LuTarget /></span>
        <strong>아직 로드맵이 없습니다</strong>
        <p>
          진단·상담 결과와 수강 정보, 학생 스펙을 재료로 3축 15칸 로드맵 1개를 만듭니다.
          <br />상담을 진행하면서 이 자리에서 바로 생성하세요.
        </p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setOpen(true)}>
          로드맵 생성
        </button>
      </div>
    )
  }

  return (
    <div className="rcp">
      {/* 재생성은 지금 로드맵을 버리는 일이다 — 무엇이 어떻게 되는지 먼저 말한다. */}
      {regenerate && (
        <p className="rcp-warn">
          지금 로드맵은 <b>스냅샷으로 보관</b>되고 새 로드맵으로 바뀝니다.
          <b> 완료한 칸은 이월되지 않습니다</b> — 지난 이행 실적은 스냅샷에서 조회합니다.
        </p>
      )}

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
                <dd>
                  <span className="air-badge is-mint">
                    {student.studentType ? `${student.studentType} ${typeLabel(student.studentType)}` : '유형 미정'}
                  </span>
                </dd>
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
            <section className="air-analysis">
              <h4>AI 분석</h4>
              <p>{student.insight || '분석 코멘트가 아직 없습니다. 진단을 마치면 채워집니다.'}</p>
              {/* 대표 역량이 없으면(점수 0인 신입생) 줄을 긋지 않는다 — 빈 구분선만 남는다. */}
              {getHeadlineCompetency(student).length > 0 && (
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
              )}
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
                  {loaded ? '수강 이력이 아직 연동되지 않았습니다.' : '수강 이력을 불러오는 중입니다.'}
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

      {/* 분석·생성 중에는 플로우 자리를 진행 표시로 바꿔 끼운다 —
          이미 학생 상세 모달 안이라 모달을 한 겹 더 얹지 않는다. */}
      {phase === 'analyzing' || phase === 'generating' ? (
        <div className="air-run" aria-live="polite">
          <h4>{phase === 'analyzing' ? 'AI가 직무 적합도를 분석중입니다' : 'AI가 맞춤형 로드맵을 생성중입니다'}</h4>
          <p>
            {phase === 'analyzing'
              ? '수강 이력과 스펙을 직무 요구역량과 대조합니다'
              : `${target?.name ?? ''} 기준으로 3축 15칸을 구성합니다`}
          </p>
          <div className="air-run-bar">
            <i style={{ width: `${phase === 'analyzing' ? analyzeProgress : generateProgress}%` }} />
          </div>
          <span className="air-run-pct">{phase === 'analyzing' ? analyzeProgress : generateProgress}%</span>
          {/* 서버가 거절하면 사실대로 보여 준다 — 진행률만 채우고 성공한 척하지 않는다. */}
          {generateError && <p className="air-run-error" role="alert">{generateError}</p>}
        </div>
      ) : phase === 'picking' ? (
        <div className="air-pick">
          <div className="air-pick-head">
            <h4>목표 직무를 선택하세요</h4>
            <button type="button" className="admin-btn sm" onClick={() => setPhase('flow')}>닫기</button>
          </div>
          {directions.length === 0 ? (
            <p className="air-pick-empty">
              담긴 관심 직무가 없어 적합도를 낼 대상이 없습니다. 아래에서 직무를 담아 분석하세요.
            </p>
          ) : (
            <div className="air-pick-list">
              {directions.map(d => (
                <button
                  key={d.jobId}
                  type="button"
                  className={`air-pick-item${targetJobId === d.jobId ? ' is-on' : ''}`}
                  onClick={() => pickJob(d.jobId)}
                >
                  <strong>{d.name}</strong>
                  <small>{d.subtitle}</small>
                  <span className="air-pick-fit">적합도 {d.fitPercent}%</span>
                </button>
              ))}
            </div>
          )}

          {/* 목록에 없는 직무 — 직무사전에서 담아 그 자리에서 분석한다. */}
          <div className="air-pick-add">
            <input
              value={jobInput}
              onChange={event => { setJobInput(event.target.value); setJobInputError('') }}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleAddJob() } }}
              list="rcp-job-options"
              placeholder="분석할 직무를 입력해 추가"
              aria-label="분석할 직무 입력"
            />
            <datalist id="rcp-job-options">
              {jobOptions.map(job => <option key={job.jobId} value={job.label} />)}
            </datalist>
            <button type="button" className="admin-btn admin-btn-primary sm" onClick={handleAddJob}>추가</button>
          </div>
          {jobInputError && <p className="air-pick-error">{jobInputError}</p>}
        </div>
      ) : (
        <div className="air-flow">
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

          <button
            type="button"
            className="air-orb"
            onClick={() => setPhase('analyzing')}
            disabled={!loaded}
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
            onClick={() => setPhase('generating')}
            disabled={!target || !outcome}
          >
            <b><AirIcon name="spark" />AI분석 / 로드맵 생성</b>
            <small>
              {!outcome ? '이 학생은 생성할 재료가 없습니다'
                : target ? '맞춤형 로드맵 1개 생성' : '목표 직무를 먼저 설정하세요'}
            </small>
          </button>
        </div>
      )}

      {phase === 'flow' && (
        <div className="rcp-actions">
          <button
            type="button"
            className="admin-btn sm"
            onClick={() => (regenerate ? onCancel?.() : setOpen(false))}
          >
            {regenerate ? '재생성 취소' : '접기'}
          </button>
        </div>
      )}
    </div>
  )
}
