import type { IconType } from 'react-icons'
import { LuBook, LuBoxes, LuBriefcase, LuCalendarCheck, LuChartColumn, LuChartLine, LuCircleCheck, LuCircleDot, LuClipboardCheck, LuFolderOpen, LuFrown, LuInfo, LuListChecks, LuLock, LuMessagesSquare, LuMoveRight, LuPencilRuler, LuQuote, LuRoute, LuRotateCw, LuScale, LuSprout, LuStar, LuTarget, LuTrophy, LuUserCheck, LuWorkflow } from 'react-icons/lu'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StaffRole } from '../data/schema/staff'
import { STUDENTS, getStudentTypeMeta } from '../../src_v2/data/students'
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { StudentData } from '../../src_v2/data/students'
import { loadJournalEntries } from '../../src_v2/data/growthJournal'
import { STUDENT_ROSTER, rosterTierClass, enrollStatusClass, studentTypeClass } from '../data/studentRoster'
import { getMergedRoadmap, TERM_ORDER } from '../data/roadmapOverrides'
import EmptyState from './EmptyState'

// ─────────────────────────────────────────────────────────────────────────
// 학생 상세 정보 공유 뷰 — 상담사 학생관리 페이지 / 조교·교수 '보기' 모달이 공유한다.
// (수정 시 이 파일만 고치면 세 화면 모두 반영 — 화면별 복붙 금지)
//   - studentId: 조회 대상    - role: 열람 권한(career=편집·전탭 / psych=제한 / professor·assistant=읽기 전용 전탭)
//   - headerAction: 헤더 우측 슬롯(페이지=목록 버튼, 모달=생략)
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

type TabKey = 'diagnosis' | 'roadmap' | 'gap' | 'growth' | 'portfolio'

interface TabDef {
  key: TabKey
  label: string
  icon: IconType
  /** 심리상담사(psych)에게도 노출되는 탭인지 (README §2 제한 열람) */
  psychAllowed: boolean
}

const TABS: TabDef[] = [
  { key: 'diagnosis', label: '진단·유형', icon: LuClipboardCheck, psychAllowed: true },
  { key: 'roadmap', label: '로드맵 진행', icon: LuRoute, psychAllowed: false },
  { key: 'gap', label: '역량 GAP', icon: LuChartColumn, psychAllowed: false },
  { key: 'growth', label: '성장·퀘스트', icon: LuSprout, psychAllowed: true },
  { key: 'portfolio', label: '포트폴리오·목표', icon: LuFolderOpen, psychAllowed: false },
]

const SCORE_CLASS: Record<string, string> = { 상: 'high', 중: 'mid', 하: 'low' }

function phaseProgress(student: StudentData): number {
  const tasks = student.phases.flatMap(p => p.tasks)
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100)
}

// ── 탭 본문 ────────────────────────────────────────────────────────────────

function DiagnosisTab({ student }: { student: StudentData }) {
  const type = getStudentTypeMeta(student)
  return (
    <div className="admin-detail-grid">
      <section className="admin-card">
        <div className="admin-card-head"><h2><LuClipboardCheck /> 유형진단 결과</h2></div>
        <div className="admin-score-row">
          {(Object.entries(student.typeScores) as [string, string][]).map(([k, v]) => (
            <div key={k} className="admin-score-item">
              <span className="admin-score-label">{k}</span>
              <span className={`admin-score-badge ${SCORE_CLASS[v] ?? 'mid'}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="admin-type-line">
          <span className={studentTypeClass(student.studentType)}>{typeLabel(student.studentType)}</span>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head"><h2><LuUserCheck /> 진단 유형 · 계층</h2></div>
        <dl className="admin-deflist">
          <div><dt>진단 유형</dt><dd>{type.label}</dd></div>
          <div><dt>계층</dt><dd>{type.tierLabel}</dd></div>
          <div><dt>후속진단</dt><dd>{type.followUpTest}</dd></div>
          <div><dt>목표</dt><dd>{type.goal}</dd></div>
          <div><dt>초점</dt><dd>{type.focus}</dd></div>
        </dl>
      </section>

      <section className="admin-card admin-detail-wide">
        <div className="admin-card-head"><h2><LuScale /> 강점 · 약점</h2></div>
        <div className="admin-sw-grid">
          {student.strengthWeakness.map(sw => (
            <div key={sw.label} className={`admin-sw-item ${sw.type}`}>
              <span className="admin-sw-label">{sw.label}</span>
              <span className="admin-progress-track">
                <span
                  className={`admin-progress-fill ${sw.type === 'weakness' ? 'warn' : ''}`}
                  style={{ width: `${sw.value}%` }}
                />
              </span>
              <em>{sw.value}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function RoadmapTab({ student, canEdit }: { student: StudentData; canEdit: boolean }) {
  const merged = useMemo(() => getMergedRoadmap(student.id), [student.id])
  const pct = phaseProgress(student)

  return (
    <>
      <section className="admin-card">
        <div className="admin-card-head">
          <h2><LuRoute /> 로드맵 진행 현황</h2>
          {canEdit && (
            <Link to={`/roadmap/${student.id}`} className="admin-btn admin-btn-primary sm">
              <LuPencilRuler /> 로드맵 편집
            </Link>
          )}
        </div>
        <div className="admin-progress-big">
          <span className="admin-progress-track lg">
            <span className="admin-progress-fill" style={{ width: `${pct}%` }} />
          </span>
          <strong>{pct}%</strong>
        </div>
        {merged?.meta?.confirmed && (
          <p className="admin-detail-note">
            <LuCircleCheck /> 상담사 수정 로드맵 v{merged.meta.version} 확정 반영됨
          </p>
        )}
        <ol className="admin-phase-list">
          {student.phases.map(p => (
            <li key={p.num} className={`admin-phase-item ${p.status}`}>
              <span className="admin-phase-icon">{(() => { const Icon = PHASE_ICONS[p.icon] ?? LuCircleDot; return <Icon /> })()}</span>
              <div className="admin-phase-body">
                <div className="admin-phase-top">
                  <strong>{p.num}. {p.title}</strong>
                  <span className={`admin-chip ${p.status === 'done' ? 'admin-chip-done' : p.status === 'active' ? 'admin-chip-ok' : 'admin-chip-cancel'}`}>
                    {p.status === 'done' ? '완료' : p.status === 'active' ? '진행중' : '예정'}
                  </span>
                </div>
                <small>{p.period}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {merged && (
        <section className="admin-card">
          <div className="admin-card-head"><h2><LuListChecks /> 단·중·장기 계획 {merged.meta?.confirmed && <span className="admin-tag admin-tag-soft">수정본</span>}</h2></div>
          <div className="admin-term-cols">
            {TERM_ORDER.map(label => {
              const detail = merged.phase.termDetails?.[label]
              if (!detail) return null
              return (
                <div key={label} className="admin-term-col">
                  <div className="admin-term-col-head">
                    <strong>{label}</strong>
                    <span className="admin-term-period">{detail.period}</span>
                    {merged.origin[label] === 'override' && (
                      <span className="admin-tag admin-tag-override">수정</span>
                    )}
                  </div>
                  <p className="admin-term-headline">{detail.headline}</p>
                  <ul className="admin-term-items">
                    {detail.items.map((it, i) => (
                      <li key={i}>
                        <span className={`admin-pri admin-pri-${it.priority}`}>{it.priority}</span>
                        <span className={`admin-imp admin-imp-${it.importance}`}>{it.importance}</span>
                        <span className="admin-term-item-title">{it.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

function GapTab({ student }: { student: StudentData }) {
  if (student.gapItems.length === 0) {
    return <EmptyState icon={LuCircleCheck} message="분석된 역량 GAP이 없습니다." />
  }
  return (
    <section className="admin-card">
      <div className="admin-card-head"><h2><LuChartColumn /> 역량 GAP 분석</h2></div>
      <ul className="admin-gap-list">
        {student.gapItems.map((g, i) => (
          <li key={i} className={`admin-gap-item sev-${g.severity}`}>
            <div className="admin-gap-top">
              <strong>{g.title}</strong>
              <div className="admin-gap-badges">
                {g.badges.map((b, bi) => (
                  <span key={bi} className={`admin-tag admin-badge-${b.type}`}>{b.label}</span>
                ))}
              </div>
            </div>
            <p className="admin-gap-desc">{g.desc}</p>
            <div className="admin-gap-bar">
              <span className="admin-progress-track">
                <span className="admin-progress-fill" style={{ width: `${g.pct}%` }} />
              </span>
              <span className="admin-gap-figs">{g.current} <LuMoveRight /> {g.target}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function GrowthTab({ student }: { student: StudentData }) {
  const s = student.scoreInputs
  const stats: { label: string; value: number | string; icon: IconType }[] = [
    { label: '레벨(XP)', value: `Lv.${s.xpLevel}`, icon: LuStar },
    { label: '비교과 이수', value: `${s.programs}건`, icon: LuBoxes },
    { label: '상담 누적', value: `${s.counsel}회`, icon: LuMessagesSquare },
    { label: '출석일', value: `${s.attendanceDays}일`, icon: LuCalendarCheck },
    { label: '성장일지', value: `${s.journalCount}편`, icon: LuBook },
    { label: '일일미션 출석률', value: `${s.lectureAttendanceRate}%`, icon: LuListChecks },
    { label: '프로젝트', value: `${s.projects}건`, icon: LuWorkflow },
    { label: '공모전', value: `${s.contests}회`, icon: LuTrophy },
  ]
  const journal = loadJournalEntries(student.id)
  return (
    <div className="admin-detail-grid">
      <section className="admin-card admin-detail-wide">
        <div className="admin-card-head"><h2><LuSprout /> 성장 · 퀘스트 수행</h2></div>
        <div className="admin-metric-grid">
          {stats.map(st => (
            <div key={st.label} className="admin-metric-card">
              <span className="admin-metric-icon">{(() => { const Icon = st.icon; return <Icon /> })()}</span>
              <div>
                <span className="admin-metric-value">{st.value}</span>
                <span className="admin-metric-label">{st.label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="admin-detail-note"><LuQuote /> {student.insight}</p>
      </section>

      <section className="admin-card admin-detail-wide">
        <div className="admin-card-head">
          <h2><LuBook /> 성장경험일지</h2>
          <span className="admin-card-count">{journal.length}편</span>
        </div>
        {journal.length === 0 ? (
          <EmptyState icon={LuBook} title="작성된 성장경험일지가 없습니다" message="학생이 성장경험일지를 작성하면 이곳에 표시됩니다." />
        ) : (
          <div className="admin-journal-list">
            {journal.map(e => (
              <article key={e.id} className="admin-journal-item">
                <div className="admin-journal-top">
                  <span className="admin-tag">{e.category}</span>
                  {e.resumeUsed && <span className="admin-tag admin-tag-soft">자소서 활용</span>}
                  <time>{e.date}</time>
                </div>
                <h3 className="admin-journal-title">{e.title}</h3>
                {e.tags.length > 0 && (
                  <div className="admin-journal-tags">
                    {e.tags.map(t => <span key={t}>#{t}</span>)}
                  </div>
                )}
                <dl className="admin-journal-detail">
                  <div><dt>상황</dt><dd>{e.situation}</dd></div>
                  <div><dt>나의 역할</dt><dd>{e.role}</dd></div>
                  <div><dt>행동</dt><dd>{e.action}</dd></div>
                  <div><dt>결과</dt><dd>{e.result}</dd></div>
                  <div><dt>배운 점</dt><dd>{e.learning}</dd></div>
                  <div><dt>자소서 메모</dt><dd>{e.resumeMemo}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PortfolioTab({ student }: { student: StudentData }) {
  const tc = student.targetCompany
  return (
    <div className="admin-detail-grid">
      <section className="admin-card admin-detail-wide">
        <div className="admin-card-head"><h2><LuTarget /> 목표 기업</h2></div>
        <div className="admin-target-head">
          <div>
            <strong>{tc.name}</strong>
            <small>{tc.industry} · {tc.role}</small>
          </div>
          <span className="admin-match-badge">매칭 {tc.matchScore}%</span>
        </div>
        <div className="admin-req-grid">
          {tc.requirements.map((r, i) => {
            const pct = r.target > 0 ? Math.min(100, Math.round((r.current / r.target) * 100)) : 0
            return (
              <div key={i} className="admin-req-item">
                <span className="admin-req-label">{r.label}</span>
                <span className="admin-progress-track">
                  <span className="admin-progress-fill" style={{ width: `${pct}%` }} />
                </span>
                <em>{r.current}{r.unit} / {r.target}{r.unit}</em>
              </div>
            )
          })}
        </div>
      </section>

      <section className="admin-card admin-detail-wide">
        <div className="admin-card-head"><h2><LuWorkflow /> 직무 역량 ({student.jobField})</h2></div>
        <div className="admin-skill-list">
          {student.jobSkills.map(sk => (
            <div key={sk.label} className="admin-skill-row">
              <span className="admin-skill-label">{sk.label}</span>
              <span className="admin-progress-track">
                <span className="admin-progress-fill" style={{ width: `${(sk.score / sk.max) * 100}%` }} />
              </span>
              <em>{sk.score}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

interface StudentDetailViewProps {
  studentId: string
  role: StaffRole
  /** 헤더 우측 액션 (예: 목록 버튼). 모달에서는 생략. */
  headerAction?: ReactNode
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
    // 상세 데이터가 없는 더미 로스터 학생 → 경량 플레이스홀더 (graceful)
    const roster = STUDENT_ROSTER.find(s => s.id === studentId)
    if (roster) {
      return (
        <>
          <header className="admin-page-head">
            <div className="admin-detail-id">
              <div>
                <h1 className="admin-page-title">{roster.name}</h1>
                <p className="admin-page-desc">
                  {roster.major} · {roster.grade}학년 · 학번 {roster.studentNo}
                  {roster.gpa && ` · GPA ${roster.gpa} · ${roster.language}`}
                </p>
                <div className="admin-detail-tags">
                  <span className={studentTypeClass(roster.studentType)}>{typeLabel(roster.studentType)}</span>
                  <span className={`admin-track ${rosterTierClass(roster.tier)}`}>{roster.tier} 계층</span>
                  <span className={enrollStatusClass(roster.status)}>{roster.status}</span>
                </div>
              </div>
            </div>
            {headerAction}
          </header>

          {roster.competencyScore != null && (
            <section className="admin-card">
              <div className="admin-card-head"><h2><LuInfo /> 기본 프로필</h2></div>
              <p className="admin-page-desc">
                연락처 {roster.phone} · 역량점수 {roster.competencyScore} · 목표 {roster.targetCompanySummary}
              </p>
              {roster.typeScores && (
                <div className="admin-detail-tags">
                  <span className="admin-tag">진로명확도 {roster.typeScores.진로명확도}</span>
                  <span className="admin-tag">역량준비도 {roster.typeScores.역량준비도}</span>
                  <span className="admin-tag">취업준비도 {roster.typeScores.취업준비도}</span>
                </div>
              )}
              {roster.roadmapSummary && <p className="admin-detail-note">{roster.roadmapSummary}</p>}
            </section>
          )}

          <section className="admin-card">
            <div className="admin-card-head"><h2><LuRoute /> 로드맵 진행 현황</h2></div>
            <div className="admin-progress-big">
              <span className="admin-progress-track lg">
                <span className="admin-progress-fill" style={{ width: `${roster.progress}%` }} />
              </span>
              <strong>{roster.progress}%</strong>
            </div>
            <p className="admin-detail-note">
              <LuInfo /> 진단·GAP·포트폴리오 등 상세 분석 데이터는 아직 수집되지 않았습니다. 진단 완료 후 표시됩니다.
            </p>
          </section>
        </>
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

  return (
    <>
      <header className="admin-page-head">
        <div className="admin-detail-id">
          <div>
            <h1 className="admin-page-title">{student.name}</h1>
            <p className="admin-page-desc">
              {student.major} · {student.grade}학년 · GPA {student.gpa} · {student.language}
            </p>
            <div className="admin-detail-tags">
              <span className={studentTypeClass(student.studentType)}>{typeLabel(student.studentType)}</span>
              <span className="admin-tag">{type.tierLabel} 계층</span>
            </div>
          </div>
        </div>
        {headerAction}
      </header>

      {isPsych && (
        <div className="admin-perm-banner">
          <LuLock />
          심리상담사 제한 열람 — 진단·성향·성장 중심으로 표시됩니다. 로드맵·GAP·포트폴리오는 진로상담사 전용입니다.
        </div>
      )}

      <div className="admin-tabs" role="tablist">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`admin-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {(() => { const Icon = t.icon; return <Icon /> })()} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'diagnosis' && <DiagnosisTab student={student} />}
      {activeTab === 'roadmap' && <RoadmapTab student={student} canEdit={canEdit} />}
      {activeTab === 'gap' && <GapTab student={student} />}
      {activeTab === 'growth' && <GrowthTab student={student} />}
      {activeTab === 'portfolio' && <PortfolioTab student={student} />}
    </>
  )
}
