import type { CSSProperties, ReactNode } from 'react'
import type { IconType } from 'react-icons'
import {
  LuArrowRight, LuBook, LuBoxes, LuBriefcase, LuCalendarCheck, LuChartColumn, LuChartLine,
  LuCircleDot, LuClipboardCheck, LuFolderOpen, LuFrown, LuGraduationCap, LuInfo,
  LuListChecks, LuLock, LuMessagesSquare, LuPencilRuler, LuRoute, LuRotateCw, LuSparkles, LuSprout,
  LuStar, LuTrophy, LuWorkflow, LuX,
} from 'react-icons/lu'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StaffRole } from '../data/schema/staff'
import { STUDENTS, getCounselOwnerById, getStudentTypeMeta } from '../../src_v2/data/students'
import type { StudentData } from '../../src_v2/data/students'
import { STUDENT_TYPE_MAP, areaOf, typeLabel } from '../../src_v2/data/careerProcess'
import { loadJournalEntries } from '../../src_v2/data/growthJournal'
import { STUDENT_ROSTER, enrollStatusClass, studentTypeClass } from '../data/studentRoster'
import type { RosterStudent } from '../data/studentRoster'
import {
  getCompetencyRadar, getCounselOverview, getDetailStats, getDiagnosisCards, getGoalPlan,
  getRoadmapProgress, getStudentPrograms,
  type CompetencyAxis, type CompetencyRadar, type DiagnosisCard, type DetailStat,
} from '../data/studentDetail'
import DiagnosisResultReport from '../../src_v2/components/DiagnosisResultReport'
import RoadmapAxisBoard from '../../src_v2/components/RoadmapAxisBoard'
import EmptyState from './EmptyState'
import './StudentDetailView.css'

// ─────────────────────────────────────────────────────────────────────────
// 학생 상세 정보 공유 뷰 — 상담사 학생관리 페이지 / 조교·교수 '보기' 모달이 공유한다.
// (수정 시 이 파일만 고치면 세 화면 모두 반영 — 화면별 복붙 금지)
//   - studentId: 조회 대상    - role: 열람 권한(career=편집·전탭 / psych=제한 / professor·assistant=읽기 전용 전탭)
//   - headerAction: 헤더 우측 슬롯(페이지=목록 버튼, 모달=생략)
//
// 카드 마크업·클래스는 시안 stu_v1.html 을 그대로 따른다(스타일은 StudentDetailView.css).
// ⚠ 값은 전부 데이터층(../data/studentDetail)에서 온다 — 화면에서 집계·리터럴 금지.
// ─────────────────────────────────────────────────────────────────────────

// 로드맵 phase 아이콘: src_v2 학생 JSON은 fa- 문자열을 담으므로(스코프 밖),
// admin 레이어에서 Lucide 컴포넌트로 매핑한다 (dashboard STAT_ICONS 패턴 동일).
const PHASE_ICONS: Record<string, IconType> = {
  'fa-clipboard-check': LuClipboardCheck,
  'fa-comments': LuMessagesSquare,
  'fa-route': LuRoute,
  'fa-chart-line': LuChartLine,
  'fa-briefcase': LuBriefcase,
  'fa-rotate': LuRotateCw,
}

type TabKey = 'diagnosis' | 'counsel' | 'roadmap' | 'program' | 'gap' | 'growth' | 'portfolio'

interface TabDef {
  key: TabKey
  label: string
  icon: IconType
  /** 심리상담사(psych)에게도 노출되는 탭인지 (README §2 제한 열람) */
  psychAllowed: boolean
}

const TABS: TabDef[] = [
  { key: 'diagnosis', label: '진단·유형', icon: LuClipboardCheck, psychAllowed: true },
  { key: 'counsel', label: '상담', icon: LuMessagesSquare, psychAllowed: true },
  { key: 'roadmap', label: '로드맵 진행', icon: LuRoute, psychAllowed: false },
  { key: 'program', label: '비교과 프로그램', icon: LuBoxes, psychAllowed: false },
  { key: 'gap', label: '역량 GAP', icon: LuChartColumn, psychAllowed: false },
  { key: 'growth', label: '성장·퀘스트', icon: LuSprout, psychAllowed: true },
  { key: 'portfolio', label: '포트폴리오·목표', icon: LuFolderOpen, psychAllowed: false },
]

/** 시안 --result-color/--plan-color 등 인라인 커스텀 프로퍼티용 헬퍼 */
function tintVars(tint: string, names: [string, string]): CSSProperties {
  return { [`--${names[0]}`]: `var(--${tint})`, [`--${names[1]}`]: `var(--${tint}-bg)` } as CSSProperties
}

/** 시안 stat-meter 는 --value/--accent 로 막대를 그린다 */
function meterVars(pct: number, tint: string): CSSProperties {
  return { '--value': `${pct}%`, '--accent': `var(--${tint})` } as CSSProperties
}

// ── 레이더 차트 (시안 .radar 클래스 사용, n축 가변) ─────────────────────────
// 시안은 6축 하드코딩 폴리곤이지만 우리 축 수는 데이터가 정한다 → 좌표만 계산한다.
const RCX = 150, RCY = 140, RR = 96

function radarPoint(i: number, n: number, r: number) {
  const angle = ((i * 360) / n - 90) * (Math.PI / 180)
  return { x: RCX + r * Math.cos(angle), y: RCY + r * Math.sin(angle) }
}

function radarPoly(values: number[], n: number) {
  return values
    .map((v, i) => {
      const p = radarPoint(i, n, (Math.max(0, Math.min(100, v)) / 100) * RR)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')
}

function CompetencyRadarChart({ axes }: { axes: CompetencyAxis[] }) {
  const n = axes.length
  return (
    <svg className="radar" viewBox="0 0 300 280" role="img" aria-label={`${n}대 역량 레이더 차트`}>
      {[100, 66, 33].map(pct => (
        <polygon
          key={pct}
          className="grid"
          points={Array.from({ length: n }, (_, i) => {
            const p = radarPoint(i, n, (pct / 100) * RR)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const p = radarPoint(i, n, RR)
        return <line key={i} className="axis" x1={RCX} y1={RCY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} />
      })}
      <polygon className="need" points={radarPoly(axes.map(a => a.target), n)} />
      <polygon className="mine" points={radarPoly(axes.map(a => a.score), n)} />
      {axes.map((a, i) => {
        const p = radarPoint(i, n, RR + 20)
        const dx = p.x - RCX
        const anchor = Math.abs(dx) < 6 ? 'middle' : dx > 0 ? 'start' : 'end'
        return (
          <text key={a.key} x={p.x.toFixed(1)} y={p.y.toFixed(1)} textAnchor={anchor} dominantBaseline="middle">
            {a.key}
          </text>
        )
      })}
    </svg>
  )
}

// ── 공통 조각 ──────────────────────────────────────────────────────────────

function CardHead({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div data-slot="card-header">
      <div>
        <h2 data-slot="card-title">{title}</h2>
        {desc && <p data-slot="card-description">{desc}</p>}
      </div>
      {action && <div data-slot="card-action">{action}</div>}
    </div>
  )
}

/** 요약 지표 4장 — 시안 stu_v1 의 .stat-card 마크업을 그대로 따른다.
 *  head(라벨+아이콘) → value → foot(설명+배지) → meter(막대+%) 순서를 바꾸지 말 것. */
function StatRow({ stats }: { stats: DetailStat[] }) {
  const ICONS: Record<string, IconType> = {
    mint: LuClipboardCheck, sky: LuMessagesSquare, blue: LuRoute, pink: LuBoxes,
  }
  return (
    <section className="stats" aria-label="학생 요약 지표">
      {stats.map(s => {
        const Icon = ICONS[s.tint] ?? LuInfo
        return (
          <article key={s.label} data-slot="card" className="stat-card">
            <div data-slot="card-content">
              <div className="stat-head">
                <span className="stat-label">{s.label}</span>
                <span className={`stat-icon ${s.tint}`}><Icon className="icon" /></span>
              </div>
              <div className="stat-value">{s.value}{s.unit && <small>{s.unit}</small>}</div>
              <div className="stat-foot">
                <span>{s.foot}</span>
                {s.badge && <span className={`badge ${s.tint}`}>{s.badge}</span>}
              </div>
              {s.pct != null && (
                <div className="stat-meter" style={meterVars(s.pct, s.tint)} aria-label={`${s.label} ${s.pct}%`}>
                  <span className="stat-meter-track"><i /></span><b>{s.pct}%</b>
                </div>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

// ── 탭 ①: 진단·유형 ────────────────────────────────────────────────────────

function DiagnosisTab({ student }: { student: StudentData }) {
  const type = getStudentTypeMeta(student)
  const cards = useMemo(() => getDiagnosisCards(student.id, student.studentType), [student.id, student.studentType])
  const [openCard, setOpenCard] = useState<DiagnosisCard | null>(null)

  return (
    <>
      {/* 두 카드는 높이를 맞춘다 — 진단 결과 카드가 진단 유형 카드 높이를 따라간다. */}
      <div className="dashboard-grid grid-stretch">
        <section data-slot="card" className="diagnosis-card col-7">
          <CardHead title="진단 결과" desc={`${typeLabel(student.studentType)} 대상 진단 ${cards.length}종의 응시 현황입니다. 카드를 누르면 상세 결과가 열립니다.`} />
          <div data-slot="card-content">
            <div className="diagnosis-result-grid">
              {cards.map(c => (
                <button
                  key={c.module.id}
                  type="button"
                  className={`diagnosis-result-item${c.state === '미실시' ? ' not-taken' : ''}`}
                  style={tintVars(c.tint, ['result-color', 'result-soft'])}
                  onClick={() => c.state !== '미실시' && setOpenCard(c)}
                >
                  <span className="diagnosis-result-top">
                    <span className="diagnosis-result-name">
                      <small>{c.module.id}</small><b>{c.module.name}</b>
                    </span>
                    <span className="diagnosis-result-date">
                      {c.state === '완료' ? (c.completedAt ?? '완료') : c.state}
                    </span>
                  </span>
                  {c.state === '미실시' ? (
                    <>
                      <p className="diagnosis-notice">아직 응시 결과가 없습니다.<br />{c.module.decides}</p>
                      <span className="diagnosis-start-label">응시 권유 대상 <LuArrowRight className="icon" /></span>
                    </>
                  ) : (
                    <>
                      <strong className="diagnosis-primary-result">
                        {c.module.id === 'CCORE' ? typeLabel(student.studentType) : (c.tags[0] ?? areaOf(c.module))}
                      </strong>
                      <span className="diagnosis-result-tags">
                        {c.tags.slice(c.module.id === 'CCORE' ? 0 : 1).map((t, i) => <span key={i}>{t}</span>)}
                        {c.attemptNo != null && c.attemptNo > 1 && <span>{c.attemptNo}회차</span>}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section data-slot="card" className="col-5">
          <CardHead
            title="진단 유형"
            desc="C-CORE 결과로 확정된 6유형과 그에 따른 후속 경로입니다."
            action={<span className={studentTypeClass(student.studentType)}><b>{student.studentType}</b>{typeLabel(student.studentType)}</span>}
          />
          <div data-slot="card-content">
            <div className="axis-list">
              {(Object.entries(student.typeScores) as [string, string][]).map(([k, v]) => (
                <div key={k} className="axis-row kv">
                  {k}
                  <span className="badge">{v}</span>
                </div>
              ))}
            </div>
            <dl className="kv-list">
              {[
                ['후속진단', type.followUpTest],
                ['목표', type.goal],
                ['초점', type.focus],
              ].map(([dt, dd]) => (
                <div key={dt} className="kv-row"><dt>{dt}</dt><dd>{dd}</dd></div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      {openCard && <DiagnosisDetailModal card={openCard} studentId={student.id} onClose={() => setOpenCard(null)} />}
    </>
  )
}

/** 진단 상세 결과 모달 — 껍데기(헤더·닫기)만 admin 이 갖고,
 *  본문 결과표는 학생 포털과 공유하는 DiagnosisResultReport 가 그린다. */
function DiagnosisDetailModal({ card, studentId, onClose }: { card: DiagnosisCard; studentId: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="diagnosis-modal open">
      <button className="diagnosis-modal-backdrop" type="button" aria-label="진단 상세 닫기" onClick={onClose} />
      {/* 검사 색은 다이얼로그 전체가 상속한다 — 막대·수치·코멘트 테두리가 모두 --diagnosis-color 를 쓴다 */}
      <section
        className="diagnosis-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sdvDiagTitle"
        style={tintVars(card.tint, ['diagnosis-color', 'diagnosis-soft'])}
      >
        <header className="diagnosis-modal-header">
          <div>
            <small>{card.module.id}</small>
            <h2 id="sdvDiagTitle">{card.module.name} 상세 결과</h2>
          </div>
          <button className="diagnosis-modal-close" type="button" aria-label="닫기" onClick={onClose}><LuX /></button>
        </header>
        <div className="diagnosis-modal-content">
          {/* 결과표는 학생 포털과 같은 공용 컴포넌트를 쓴다 — 여기서 다시 만들지 않는다.
              검사별 색만 넘겨 카드 색과 맞춘다. */}
          <DiagnosisResultReport
            studentId={studentId}
            testId={card.module.testId}
            attemptNo={card.attemptNo}
            accent={`var(--${card.tint})`}
            accentSoft={`var(--${card.tint}-bg)`}
            showFactorDesc
          />
        </div>
      </section>
    </div>
  )
}

// ── 탭 ②: 상담 ─────────────────────────────────────────────────────────────

function CounselTab({ studentId }: { studentId: string }) {
  const channels = useMemo(() => getCounselOverview(studentId), [studentId])
  const total = channels.reduce((n, c) => n + c.total, 0)

  return (
    <div className="dashboard-grid">
      <section data-slot="card" className="counseling-card">
        <CardHead
          title="상담 현황"
          desc="진로취업·심리·지도교수 3채널의 진행 상황과 최근 기록입니다."
          action={<span className="badge">누적 {total}건</span>}
        />
        <div data-slot="card-content">
          {total === 0 ? (
            <p className="sdv-empty">아직 상담 이력이 없습니다.<br />상담이 접수되면 채널별로 여기에 쌓입니다.</p>
          ) : (
            <div className="counseling-detail-grid">
              {channels.map(c => (
                <article key={c.channel} className="counseling-detail-column" style={tintVars(c.tint, ['counsel-color', 'counsel-soft'])}>
                  <div className="counseling-detail-head">
                    <span className="counseling-detail-icon">
                      {c.channel === '지도교수' ? <LuGraduationCap className="icon" /> : <LuMessagesSquare className="icon" />}
                    </span>
                    <span><b>{c.channel}</b><span>{c.desc}</span></span>
                  </div>
                  <div className="counseling-detail-count">
                    <strong>{c.total}건</strong>
                    <span>완료 {c.done}{c.upcoming > 0 && ` · 예정 ${c.upcoming}`}</span>
                  </div>
                  <div className="counseling-record-list">
                    {c.rows.map((r, i) => (
                      <div key={i} className="counseling-record">
                        <span><b>{r.title}</b><small>{r.date} · {r.by}</small></span>
                        <span className="badge">{r.status}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── 탭 ③: 로드맵 진행 ──────────────────────────────────────────────────────

function RoadmapTab({ student, canEdit }: { student: StudentData; canEdit: boolean }) {
  const pct = getRoadmapProgress(student.id)
  const plan = useMemo(() => getGoalPlan(student), [student])
  const current = student.phases.find(p => p.status === 'active') ?? student.phases[student.phases.length - 1]

  return (
    <div className="dashboard-grid">
      <section data-slot="card" className="journey-card">
        <CardHead
          title="진로 여정"
          desc="진단 → 상담 → 로드맵 → 역량강화 → 취업지원 순서에서 지금 서 있는 위치입니다."
          action={canEdit ? (
            <Link to={`/roadmap/${student.id}`} className="admin-btn admin-btn-primary sm"><LuPencilRuler /> 로드맵 편집</Link>
          ) : undefined}
        />
        <div data-slot="card-content">
          <div className="journey-state">
            <div className="journey-value">
              <span className="journey-kicker">CAREER ROADMAP</span>
              <b>{current?.title ?? '단계 미정'}</b>
              <p>{current?.recommendation ?? '로드맵이 아직 생성되지 않았습니다.'}</p>
            </div>
            <div className="journey-percent"><span>전체 진행률</span><b>{pct}%</b></div>
          </div>
          <div className="progress journey-track" aria-label={`로드맵 진행률 ${pct}%`}>
            <i style={{ width: `${pct}%`, background: 'linear-gradient(90deg,var(--mint),var(--violet))' }} />
          </div>
          <div
            className="steps"
            role="list"
            aria-label="로드맵 단계"
            style={{ gridTemplateColumns: `repeat(${student.phases.length}, 1fr)` }}
          >
            {student.phases.map(p => {
              const Icon = PHASE_ICONS[p.icon] ?? LuCircleDot
              return (
                <div
                  key={p.num}
                  className={`step${p.status === 'done' ? ' done' : p.status === 'active' ? ' current' : ''}`}
                  role="listitem"
                  aria-current={p.status === 'active' ? 'step' : undefined}
                >
                  <span className="step-marker">{p.status === 'done' ? '✓' : <Icon />}</span>
                  <b>{p.title}</b>
                  <span>{p.status === 'done' ? '완료' : p.status === 'active' ? '진행 중' : p.period}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {plan && (
        <section data-slot="card" className="goal-card">
          <CardHead
            title="목표 달성 계획"
            desc={`${plan.role} 목표를 향한 로드맵 3축입니다. 축·칸 정의는 PROCESS.md §6.`}
            action={plan.confirmed ? <span className="badge mint">확정 v{plan.version}</span> : <span className="badge">초안</span>}
          />
          <div data-slot="card-content">
            <article className="goal-core" style={{ marginBottom: 16 }}>
              <small>목표 직무</small>
              <h3>{plan.role}</h3>
              <p>{plan.company} 기준 · IAP 실행 · 핵심역량 수행 · 내 성장 활동 3축을 하나의 로드맵으로 관리합니다.</p>
              <div className="goal-number">{plan.progress}<span>% 이행률 · {plan.done}/{plan.total}칸</span></div>
            </article>
            {/* 3축 렌더는 학생 화면과 같은 공용 컴포넌트 — 수정은 RoadmapAxisBoard 한 곳에서만 */}
            <RoadmapAxisBoard axes={plan.axes} origin={plan.origin} />
          </div>
        </section>
      )}
    </div>
  )
}

// ── 탭 ④: 비교과 프로그램 ──────────────────────────────────────────────────

function ProgramTab({ studentId }: { studentId: string }) {
  const summary = useMemo(() => getStudentPrograms(studentId), [studentId])

  return (
    <div className="dashboard-grid">
      <section data-slot="card">
        <CardHead
          title="비교과 프로그램"
          desc="이 학생이 신청한 프로그램과 선발·출석·수료 결과입니다."
          action={<span className="badge">신청 {summary.applied} · 수료 {summary.completed}</span>}
        />
        <div data-slot="card-content">
          {summary.rows.length === 0 ? (
            <p className="sdv-empty">신청한 비교과 프로그램이 없습니다.<br />학생이 신청하면 이곳에 표시됩니다.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>프로그램</th><th>분류</th><th>운영 기간</th><th>신청일</th><th>선발</th><th>출석</th><th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map(r => (
                    <tr key={r.programId}>
                      <td className="wrap"><b>{r.title}</b></td>
                      <td>{r.category}</td>
                      <td>{r.period}</td>
                      <td>{r.appliedAt}</td>
                      <td><span className="badge">{r.selectionStatus}</span></td>
                      <td><span className={`badge${r.attendance === '출석' ? ' mint' : r.attendance === '노쇼' ? ' coral' : ''}`}>{r.attendance}</span></td>
                      <td><span className={`badge${r.outcomeStatus === '수료' ? ' mint' : ''}`}>{r.outcomeStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── 탭 ⑤: 역량 GAP ─────────────────────────────────────────────────────────

function GapTab({ student, radar }: { student: StudentData; radar: CompetencyRadar }) {
  return (
    <>
      <div className="dashboard-grid">
        <section data-slot="card" className="competency-card col-7">
          <CardHead title={`${radar.axes.length}대 핵심역량`} desc="현재 수준과 목표 도달선을 비교합니다. 점수는 20개 학사·활동 지표의 가중평균입니다." />
          <div data-slot="card-content">
            <div className="chart-layout">
              <div>
                <CompetencyRadarChart axes={radar.axes} />
                <div className="legend">
                  <span><i style={{ background: 'var(--violet)' }} />나의 현재</span>
                  <span><i style={{ background: 'var(--coral)' }} />목표 수준</span>
                </div>
              </div>
              <div className="axis-list">
                {radar.axes.map(a => (
                  <div key={a.key} className="axis-row">
                    {a.label}
                    <span className="axis-track">
                      <i style={{ width: `${a.score}%` }} />
                      <u style={{ left: `${a.target}%` }} />
                    </span>
                    <span className="gap-value" style={a.gap >= 0 ? { color: 'var(--mint)' } : undefined}>
                      {a.gap >= 0 ? `+${a.gap}` : a.gap}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section data-slot="card" className="col-5">
          <CardHead title="강점 · 약점" desc="학사·활동 데이터에서 도출된 상대 강약입니다." />
          <div data-slot="card-content">
            <div className="axis-list">
              {student.strengthWeakness.map(sw => (
                <div key={sw.label} className="axis-row">
                  {sw.label}
                  <span className="axis-track">
                    <i style={{ width: `${sw.value}%`, background: sw.type === 'weakness' ? 'var(--amber)' : undefined }} />
                  </span>
                  <span className="gap-value" style={sw.type === 'strength' ? { color: 'var(--mint)' } : undefined}>{sw.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section data-slot="card">
          <CardHead title="목표 직무 대비 GAP" desc="목표 직무 요구 조건과 현재 보유 수준의 차이입니다." />
          <div data-slot="card-content">
            {student.gapItems.length === 0 ? (
              <p className="sdv-empty">분석된 역량 GAP이 없습니다.</p>
            ) : (
              student.gapItems.map((g, i) => (
                <div key={i} className="gap-row">
                  <div className="gap-row-top">
                    <b>{g.title}</b>
                    {g.badges.map((b, bi) => (
                      <span key={bi} className={`badge${b.type === 'required' ? ' coral' : b.type === 'preferred' ? ' blue' : ''}`}>{b.label}</span>
                    ))}
                  </div>
                  <p>{g.desc}</p>
                  <div className="axis-row">
                    <span className="axis-track"><i style={{ width: `${g.pct}%`, background: g.severity === 'critical' ? 'var(--coral)' : undefined }} /></span>
                    <span className="gap-row-figs">{g.current} <LuArrowRight className="icon" /> {g.target}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  )
}

// ── 탭 ⑥: 성장·퀘스트 ──────────────────────────────────────────────────────

function GrowthTab({ student }: { student: StudentData }) {
  const s = student.scoreInputs
  const stats: { label: string; value: string; icon: IconType; tint: string }[] = [
    { label: '레벨(XP)', value: `Lv.${s.xpLevel}`, icon: LuStar, tint: 'violet' },
    { label: '비교과 이수', value: `${s.programs}건`, icon: LuBoxes, tint: 'mint' },
    { label: '상담 누적', value: `${s.counsel}회`, icon: LuMessagesSquare, tint: 'sky' },
    { label: '출석일', value: `${s.attendanceDays}일`, icon: LuCalendarCheck, tint: 'blue' },
    { label: '성장일지', value: `${s.journalCount}편`, icon: LuBook, tint: 'amber' },
    { label: '일일미션 출석률', value: `${s.lectureAttendanceRate}%`, icon: LuListChecks, tint: 'mint' },
    { label: '프로젝트', value: `${s.projects}건`, icon: LuWorkflow, tint: 'violet' },
    { label: '공모전', value: `${s.contests}회`, icon: LuTrophy, tint: 'coral' },
  ]
  const journal = loadJournalEntries(student.id)

  return (
    <>
      <section className="stats stats-8" aria-label="성장 지표">
        {stats.map(st => {
          const Icon = st.icon
          return (
            <article key={st.label} data-slot="card" className="stat-card">
              <div data-slot="card-content">
                <div className="stat-head">
                  <span className="stat-label">{st.label}</span>
                  <span className={`stat-icon ${st.tint}`}><Icon className="icon" /></span>
                </div>
                <div className="stat-value">{st.value}</div>
              </div>
            </article>
          )
        })}
      </section>

      <div className="dashboard-grid">
        <section data-slot="card" className="ai-recommend-card">
          <div data-slot="card-content">
            <span className="ai-recommend-icon"><LuSparkles className="icon" /></span>
            <h3>상담 참고 메모</h3>
            <p>{student.insight}</p>
            {student.counselorQuestions && student.counselorQuestions.length > 0 && (
              <div className="ai-recommend-list">
                {student.counselorQuestions.slice(0, 3).map((q, i) => (
                  <div key={i} className="ai-recommend-item" style={tintVars(i === 0 ? 'violet' : 'mint', ['recommend-color', 'recommend-soft'])}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <span className="ai-recommend-copy"><b>{q}</b></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section data-slot="card">
          <CardHead title="성장경험일지" desc="학생이 직접 기록한 경험입니다. 상담 시 자소서 소재로 활용합니다." action={<span className="badge">{journal.length}편</span>} />
          <div data-slot="card-content">
            {journal.length === 0 ? (
              <p className="sdv-empty">작성된 성장경험일지가 없습니다.<br />학생이 작성하면 이곳에 표시됩니다.</p>
            ) : (
              <div className="row-list">
                {journal.map(e => (
                  <div key={e.id} className="list-item noicon">
                    <span className="item-copy">
                      <b>{e.title}</b>
                      <span>{e.situation}</span>
                      <span>배운 점 · {e.learning}</span>
                    </span>
                    <span className="item-action">
                      <span className="badge">{e.category}</span>
                      {e.resumeUsed && <span className="badge mint">자소서 활용</span>}
                      <small>{e.date}</small>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

// ── 탭 ⑦: 포트폴리오·목표 ──────────────────────────────────────────────────

function PortfolioTab({ student }: { student: StudentData }) {
  const tc = student.targetCompany
  return (
    <div className="dashboard-grid">
      <section data-slot="card" className="col-7">
        <CardHead
          title="목표 기업"
          desc={`${tc.industry} · ${tc.role}`}
          action={<span className="badge violet">매칭 {tc.matchScore}%</span>}
        />
        <div data-slot="card-content">
          <article className="goal-core" style={{ marginBottom: 16 }}>
            <small>목표 기업</small>
            <h3>{tc.name}</h3>
            <p>{tc.industry} 산업의 {tc.role} 직무 기준으로 요구 조건 {tc.requirements.length}개를 대조합니다.</p>
            <div className="goal-number">{tc.matchScore}<span>% 매칭률</span></div>
          </article>
          <div className="axis-list">
            {tc.requirements.map((r, i) => {
              const pct = r.target > 0 ? Math.min(100, Math.round((r.current / r.target) * 100)) : 0
              return (
                <div key={i} className="axis-row fig">
                  {r.label}
                  <span className="axis-track"><i style={{ width: `${pct}%` }} /></span>
                  <span className="gap-value" style={pct >= 100 ? { color: 'var(--mint)' } : undefined}>
                    {r.current}{r.unit} / {r.target}{r.unit}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section data-slot="card" className="col-5">
        <CardHead title={`직무 역량 (${student.jobField})`} desc="목표 직무 기준 보유 역량 수준입니다." />
        <div data-slot="card-content">
          <div className="axis-list">
            {student.jobSkills.map(sk => (
              <div key={sk.label} className="axis-row">
                {sk.label}
                <span className="axis-track"><i style={{ width: `${(sk.score / sk.max) * 100}%` }} /></span>
                <span className="gap-value">{sk.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ── 본체 ───────────────────────────────────────────────────────────────────

interface StudentDetailViewProps {
  studentId: string
  role: StaffRole
  /** 헤더 우측 액션 (예: 목록 버튼). 모달에서는 생략. */
  headerAction?: ReactNode
}

/**
 * 상담 시드 학생(학번을 id 로 쓰는 데모 학생)을 로스터 플레이스홀더 모양으로 옮긴다.
 * 이 학생들은 STUDENTS·STUDENT_ROSTER 어디에도 없어서 폴백이 한 겹 더 필요하다.
 * 계층(tier)·진행률은 저장값이 아니라 파생값이다 — 유형 맵과 로드맵 로더에서 뽑는다.
 */
function counselOwnerAsRoster(studentId: string): RosterStudent | undefined {
  const owner = getCounselOwnerById(studentId)
  if (!owner) return undefined
  return {
    id: owner.id,
    studentNo: owner.studentNo,
    name: owner.name,
    // ⚠ 상담 시드는 major 에 학년을 붙여 둔다("경영학과 3학년") — grade 필드가 따로 있는데도.
    //   플레이스홀더가 학년을 따로 그리므로 여기서 떼어내지 않으면 "경영학과 3학년 · 3학년"이 된다.
    //   시드를 고치지 않는 이유: 접수함 행은 major 한 칸만 보여줘서 거기선 학년이 정보다.
    major: owner.major.replace(/\s*\d+학년\s*$/, ''),
    grade: owner.grade,
    studentType: owner.studentType,
    tier: STUDENT_TYPE_MAP[owner.studentType].tierLabel as RosterStudent['tier'],
    progress: getRoadmapProgress(owner.id),
    status: owner.enrollmentStatus,
    gpa: owner.gpa,
    phone: owner.phone,
    language: owner.language,
    competencyScore: owner.competencyScore,
    targetCompanySummary: owner.targetCompanySummary,
    roadmapSummary: owner.roadmapSummary,
  }
}

export default function StudentDetailView({ studentId, role, headerAction }: StudentDetailViewProps) {
  const canEdit = role === 'career' // 로드맵 편집은 진로상담사 전용
  const isPsych = role === 'psych'

  const student = STUDENTS.find(s => s.id === studentId)

  const visibleTabs = useMemo(
    () => (isPsych ? TABS.filter(t => t.psychAllowed) : TABS),
    [isPsych],
  )
  const [tab, setTab] = useState<TabKey>(visibleTabs[0]?.key ?? 'diagnosis')

  if (!student) {
    // 상세 데이터가 없는 학생 → 경량 플레이스홀더 (graceful).
    // 학생 id 체계가 세 갈래다 — STUDENTS(상세) · STUDENT_ROSTER(stu-NNN) ·
    // 상담 시드(학번). 상담 신청은 studentId 에 학번을 쓰므로 세 번째까지 봐야
    // 접수함·홈에서 연 상세가 "찾을 수 없습니다"로 떨어지지 않는다.
    const roster = STUDENT_ROSTER.find(s => s.id === studentId) ?? counselOwnerAsRoster(studentId)
    if (roster) {
      return (
        <div className="sdv">
          <header className="admin-page-head">
            <div className="admin-detail-id">
              <div>
                <h1 className="admin-page-title">{roster.name}</h1>
                <p className="admin-page-desc">
                  {roster.major} · {roster.grade}학년 · 학번 {roster.studentNo}
                  {roster.gpa && ` · GPA ${roster.gpa} · ${roster.language}`}
                </p>
                <div className="admin-detail-tags">
                  <span className={studentTypeClass(roster.studentType)}><b>{roster.studentType}</b>{typeLabel(roster.studentType)}</span>
                  <span className={enrollStatusClass(roster.status)}>{roster.status}</span>
                </div>
              </div>
            </div>
            {headerAction}
          </header>

          <div className="dashboard-grid">
            <section data-slot="card" className="journey-card">
              <CardHead title="로드맵 진행 현황" desc="진단·GAP·포트폴리오 등 상세 분석은 진단 완료 후 표시됩니다." />
              <div data-slot="card-content">
                <div className="journey-state">
                  <div className="journey-value">
                    <span className="journey-kicker">CAREER ROADMAP</span>
                    <b>상세 데이터 수집 전</b>
                    <p>{roster.roadmapSummary ?? '진단을 완료하면 유형별 로드맵이 생성됩니다.'}</p>
                  </div>
                  <div className="journey-percent"><span>전체 진행률</span><b>{roster.progress}%</b></div>
                </div>
                <div className="progress journey-track" aria-label={`로드맵 진행률 ${roster.progress}%`}>
                  <i style={{ width: `${roster.progress}%`, background: 'linear-gradient(90deg,var(--mint),var(--violet))' }} />
                </div>
              </div>
            </section>

            {roster.competencyScore != null && (
              <section data-slot="card">
                <CardHead title="기본 프로필" desc={`연락처 ${roster.phone} · 역량점수 ${roster.competencyScore} · 목표 ${roster.targetCompanySummary}`} />
                {roster.typeScores && (
                  <div data-slot="card-content">
                    <div className="axis-list">
                      {(Object.entries(roster.typeScores) as [string, string][]).map(([k, v]) => (
                        <div key={k} className="axis-row kv">{k}<span className="badge">{v}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )
    }
    return (
      <section className="admin-card">
        <EmptyState icon={LuFrown} message="해당 학생을 찾을 수 없습니다." />
      </section>
    )
  }

  const type = getStudentTypeMeta(student)
  const activeTab = visibleTabs.some(t => t.key === tab) ? tab : visibleTabs[0].key
  const radar = getCompetencyRadar(student, type.tierLabel)
  const stats = getDetailStats(student, student.studentType)

  return (
    <div className="sdv">
      <header className="admin-page-head">
        <div className="admin-detail-id">
          <h1 className="admin-page-title">{student.name}</h1>
        </div>
        {headerAction}
      </header>

      {/* 학적 기본값은 한 행 표로 읽는다 — 가운뎃점으로 이어 붙이면 항목 경계가 사라진다. */}
      <dl className="sdv-idbar">
        <div><dt>학과</dt><dd>{student.major}</dd></div>
        <div><dt>학년</dt><dd>{student.grade}학년</dd></div>
        <div><dt>학번</dt><dd>{student.studentNo}</dd></div>
        <div><dt>학점</dt><dd>{student.gpa}</dd></div>
        <div><dt>어학</dt><dd>{student.language}</dd></div>
        <div>
          <dt>진단 유형</dt>
          <dd><span className={studentTypeClass(student.studentType)}><b>{student.studentType}</b>{typeLabel(student.studentType)}</span></dd>
        </div>
      </dl>

      {isPsych && (
        <div className="admin-perm-banner">
          <LuLock />
          심리상담사 제한 열람 — 진단·상담·성장 중심으로 표시됩니다. 로드맵·비교과·GAP·포트폴리오는 진로상담사 전용입니다.
        </div>
      )}

      <StatRow stats={stats} />

      <div className="admin-tabs" role="tablist">
        {visibleTabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeTab === t.key}
              className={`admin-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon /> {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'diagnosis' && <DiagnosisTab student={student} />}
      {activeTab === 'counsel' && <CounselTab studentId={student.id} />}
      {activeTab === 'roadmap' && <RoadmapTab student={student} canEdit={canEdit} />}
      {activeTab === 'program' && <ProgramTab studentId={student.id} />}
      {activeTab === 'gap' && <GapTab student={student} radar={radar} />}
      {activeTab === 'growth' && <GrowthTab student={student} />}
      {activeTab === 'portfolio' && <PortfolioTab student={student} />}
    </div>
  )
}
