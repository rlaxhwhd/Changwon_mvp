import { useEffect, useReducer, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMetadata } from '../../shared/useMetadata'
import { getActiveStudent, getStudentType, getStudentTypeMeta, type CounselRequestType, type StudentCounselRequest } from '../data/students'
import { buildCareerJourney, typeLabel } from '../data/careerProcess'
import { getPipelineState } from '../data/pipeline'
import StudentStatCards from '../components/StudentStatCards'
import CareerJourneyCard from '../components/CareerJourneyCard'
import NextStepBanner from '../components/NextStepBanner'
import { LockedContent } from '../components/LockedContent'
import CompetencyRadarChart from '../components/CompetencyRadarChart'
import { getCompetencyAxes } from '../data/competency'
import { getGrowthRecords } from '../data/growthRecords'
import { getLoungeData, getWeeklyTodos } from '../data/lounge'
import { ROADMAP_AXIS_MAP, type RoadmapAxis } from '../data/schema/roadmap'
import './AiLounge.css'
// 성장 활동 기록 카드는 「내 성장」과 같은 모양이다 — 그 스타일시트를 그대로 쓴다.
// 클래스가 전부 gh- 로 시작해 이 페이지의 다른 카드와 부딪히지 않는다.
import './growth/GrowthHome.css'

// ─────────────────────────────────────────────────────────────────────────
// AI 커리어 라운지 — 마크업은 시안(창원디자인시안작업/stu_dash.html) 그대로, 값은 DB 스토어에서 온다.
// ★ 클래스·구조를 손대면 시안 CSS(AiLounge.css) 가 어긋난다 — 2026-09-11 배선 때 평문 <ul> 로
//   바꿨다가 색·간격·상태 표시가 전부 빠졌다. 잠금 상태만 .al-locked 로 그린다.
// ─────────────────────────────────────────────────────────────────────────

/** 로드맵 3축의 시안 색·아이콘 — 축 순서는 ROADMAP_AXES 가 정하고 여기는 겉모습만 준다. */
const AXIS_LOOK: Record<RoadmapAxis, { n: number; icon: string }> = {
  IAP: { n: 1, icon: 'i-calendar' },
  CORE: { n: 2, icon: 'i-layout' },
  GROWTH: { n: 3, icon: 'i-target' },
}
/** 상담 3갈래의 시안 색·아이콘·부제. 갈래 자체는 CounselRequestType 이 정한다. */
const COUNSEL_LOOK: Record<CounselRequestType, { n: number; icon: string; desc: string }> = {
  진로취업: { n: 1, icon: 'i-message', desc: '직무·취업 준비 상담' },
  심리: { n: 2, icon: 'i-scan', desc: '검사 해석·정서 상담' },
  교수: { n: 3, icon: 'i-user', desc: '학업·진로 방향 상담' },
}

function Icon({ id }: { id: string }) {
  return <svg className="icon"><use href={`#${id}`} /></svg>
}

function Card({ id, className, title, description, locked, action, children }: {
  id: string; className: string; title: string; description: string; locked?: string; action?: ReactNode; children?: ReactNode
}) {
  return <section data-slot="card" id={id} className={`${className} reveal`}>
    <div data-slot="card-header"><div><h2 data-slot="card-title">{title}</h2><p data-slot="card-description">{description}</p></div>{action && !locked && <div data-slot="card-action">{action}</div>}</div>
    <div data-slot="card-content">{locked ? <LockedContent text={locked} /> : children}</div>
  </section>
}

function recordDate(r: StudentCounselRequest) {
  return (r.slot?.date ?? r.requestedAt.slice(0, 10)).slice(5).replace('-', '.')
}

export default function AiLounge() {
  useMetadata()
  const [, refresh] = useReducer(n => n + 1, 0)
  useEffect(() => {
    const events = ['dc_roadmap_changed', 'dc_programs_changed', 'dc_growth_changed', 'dc:diagnosis-updated', 'dc:counsel-updated']
    events.forEach(e => window.addEventListener(e, refresh))
    return () => events.forEach(e => window.removeEventListener(e, refresh))
  }, [])
  const student = getActiveStudent()
  const type = getStudentType(student)
  const meta = getStudentTypeMeta(student)
  const { stats, diagnosis, requests, roadmap, access } = getLoungeData(student)
  const growth = getGrowthRecords(student.id)
  const tasks = roadmap?.axes.flatMap(a => a.cells.filter(c => c.status !== 'DONE').map(c => ({ ...c, axis: a.axis }))) ?? []
  const active = requests.filter(r => r.status !== '취소')
  const todos = getWeeklyTodos(student)

  return <div className="al-page">
    <NextStepBanner />
    <section className="welcome reveal"><div><small>{student.major}{student.grade ? ` ${student.grade}학년` : ''}</small><h1>안녕하세요, <span>{student.name}</span>님.<br />오늘의 커리어 여정을 시작해 볼까요?</h1></div><div className="student-type"><span className="type-copy"><small>나의 진로 유형</small><b>{typeLabel(type)}</b><span>{meta?.goal ?? '진단 결과가 연계되면 유형을 확인할 수 있습니다.'}</span></span></div></section>
    <StudentStatCards stats={stats} />
    <div className="dashboard-grid">
      <CareerJourneyCard journey={buildCareerJourney(getPipelineState(student))} title="나의 진로 여정" desc="내 CARE 7+의 현재 위치입니다." className="reveal" id="journey" />

      <Card id="competency" className="competency-card" title="5대 핵심역량" description="비교과 프로그램과 수강 강의활동으로 쌓은 역량입니다.">
        <div className="competency-chart">
          {student.coreCompetencySource === 'DEVELOPMENT_CARE7_TEST' && <p>개발 테스트용 예시 점수입니다.</p>}
          <CompetencyRadarChart axes={getCompetencyAxes(student)} currentFill="competency-mine">
            <defs><linearGradient id="competency-mine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--competency-current)" />
              <stop offset="100%" stopColor="var(--competency-growth)" />
            </linearGradient></defs>
          </CompetencyRadarChart>
        </div>
      </Card>

      <Card id="diagnosis" className="diagnosis-card" title="진단 결과" description="대상 진단의 진행 상태와 결과입니다.">
        <div className="diagnosis-result-grid">
          {diagnosis.map((c, i) => {
            const n = (i % 5) + 1
            const style = { '--result-color': `var(--diagnosis-${n})`, '--result-soft': `var(--diagnosis-${n}-soft)` } as CSSProperties
            const name = <span className="diagnosis-result-name"><small>{c.module.id}</small><b>{c.module.name}</b></span>
            if (c.status !== 'done') return <article key={c.module.id} className="diagnosis-result-item not-taken" style={style}>
              <span className="diagnosis-result-top">{name}<span className="diagnosis-result-date">{c.status === 'available' ? '응시 가능' : '잠금'}</span></span>
              <strong className="diagnosis-primary-result">{c.status === 'available' ? '진단 결과를 기다리고 있습니다.' : '선행 진단 완료 후 확인할 수 있습니다.'}</strong>
              <span className="diagnosis-result-tags">{c.module.factors.map(f => <span key={f.name}>{f.name}</span>)}</span>
            </article>
            return <Link key={c.module.id} className="diagnosis-result-item" to={`/diagnosis/employment/${c.module.testId}`} style={style}>
              <span className="diagnosis-result-top">{name}<span className="diagnosis-result-date">완료</span></span>
              <strong className="diagnosis-primary-result">{c.headline || '진단 완료'}</strong>
              <span className="diagnosis-result-tags">{c.tags.map(t => <span key={t}>{t}</span>)}</span>
            </Link>
          })}
        </div>
      </Card>

      <Card id="goal" className="goal-card" title="목표 달성 계획" description="확정된 로드맵의 목표와 수행 항목입니다." locked={!roadmap ? '상담 후 로드맵이 확정되면 확인할 수 있습니다.' : undefined}>
        {roadmap && <div className="goal-overview">
          <article className="goal-core"><small>목표 직무</small>
            <h3>{roadmap.targetRole || '목표 직무 미등록'}</h3>
            <p>IAP 실행 · 핵심역량 수행 · 내 성장 활동 3축의 실행을 하나의 로드맵으로 관리합니다.</p>
            <div className="goal-number">{roadmap.progress.pct}<span>% 전체 진척도</span></div>
          </article>
          <div className="goal-plan">
            <div className="goal-plan-columns">
              {roadmap.axes.map(a => {
                const axis = ROADMAP_AXIS_MAP[a.axis]
                const look = AXIS_LOOK[a.axis]
                return <section key={a.axis} className="goal-plan-column" style={{ '--plan-color': `var(--goal-${look.n})`, '--plan-soft': `var(--goal-${look.n}-soft)` } as CSSProperties}>
                  <div className="goal-plan-head"><span className="goal-plan-head-icon"><Icon id={look.icon} /></span>
                    <div className="goal-plan-head-copy"><b>{axis.label}</b><span>{axis.desc}</span></div>
                  </div>
                  <div className="goal-task-list">
                    {a.cells.map(c => <Link key={c.id} className={`goal-task${c.status === 'DONE' ? ' is-complete' : ''}`} to="/roadmap/skill-tree">
                      <span className="goal-task-icon"><Icon id={c.status === 'DONE' ? 'i-check' : look.icon} /></span>
                      <span className="goal-task-copy"><b>{c.title}</b></span>
                      <span className={`goal-task-status${c.status === 'DONE' ? '' : ' planned'}`}>{c.status === 'DONE' ? '완료' : '예정'}</span>
                      <Icon id="i-arrow" />
                    </Link>)}
                  </div>
                </section>
              })}
            </div>
            <aside className="goal-coach"><span className="goal-coach-icon"><Icon id="i-spark" /></span>
              <div className="goal-coach-copy"><b>로드맵 진행</b>
                <p>전체 {roadmap.progress.total}칸 중 {roadmap.progress.done}칸을 마쳤습니다. 남은 항목 {tasks.length}개는 로드맵에서 자세히 볼 수 있습니다.</p>
              </div>
              <div className="goal-coach-actions"><Link className="button" to="/roadmap/skill-tree">로드맵 전체 보기</Link></div>
            </aside>
          </div>
        </div>}
      </Card>

      {/* 이번 주 할 일 — 시안의 체크박스는 표시용이다. 완료 판정은 상담·수료·로드맵 쪽 정본이 한다. */}
      <Card id="todo" className="todo-card" title="이번 주 할 일" description="마감이 가까운 순서입니다."
        action={todos.length > 0 && <span className="badge coral">{todos.length}개 남음</span>}>
        {todos.length === 0 ? <p className="gh-empty">예정된 할 일이 없습니다.</p>
          : <div className="row-list">{todos.slice(0, 6).map(t => <Link key={t.id} className="list-item" to={t.to}>
            <input className="checkbox" type="checkbox" checked={false} readOnly tabIndex={-1} aria-hidden="true" />
            <span className="item-copy"><b>{t.title}</b><span>{t.sub}</span></span>
            <span className={`badge${t.dday <= 3 ? ' coral' : t.dday <= 7 ? ' amber' : ''}`}>{t.dday === 0 ? 'D-DAY' : `D-${t.dday}`}</span>
          </Link>)}</div>}
      </Card>

      {/* 성장 활동 기록 — 「내 성장」(/v2/growth)의 같은 카드다. 여기서는 읽기만 한다.
          gh-shell 이 필요하다 — --gh-* 색 토큰과 점 색 규칙이 그 클래스 하위로 스코프돼 있다. */}
      <section data-slot="card" className="recommend-card gh-shell reveal" id="recommend">
        <article className="gh-card gh-archive">
          <header className="gh-card-head">
            <div><span className="gh-section-kicker">GROWTH ARCHIVE</span><h2>성장 활동 기록</h2><p>내 성장에 저장한 활동 기록입니다.</p></div>
            <div className="gh-head-actions"><Link to="/growth/journal">성장 기록 보기</Link></div>
          </header>
          {access.growth !== 'open' && growth.length === 0 ? <LockedContent text="CARE 7+ 진행 후 쌓인 성장 활동을 확인할 수 있습니다." />
            : <div className="gh-timeline">
              {growth.map((r, i) => <div className="gh-timeline-item" key={`${r.date}-${r.title}-${i}`}>
                <time>{r.date}</time><span className={`gh-timeline-dot is-${r.tone}`} />
                <div><span>{r.type}</span><strong>{r.title}</strong><p>{r.description}</p></div>
              </div>)}
              {growth.length === 0 && <p className="gh-empty">아직 기록된 성장 활동이 없습니다.</p>}
            </div>}
        </article>
      </section>

      <Card id="counseling-status" className="counseling-card" title="상담 현황" description="내 상담 신청과 진행 상태입니다."
        locked={requests.length === 0 ? '상담을 신청하면 진행 상태를 확인할 수 있습니다.' : undefined}
        action={<Link className="button" to="/mypage/counsel">전체 내역 보기<Icon id="i-arrow" /></Link>}>
        <div className="counseling-detail-grid">
          {(Object.keys(COUNSEL_LOOK) as CounselRequestType[]).map(kind => {
            const look = COUNSEL_LOOK[kind]
            const mine = active.filter(r => r.type === kind).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
            const done = mine.filter(r => r.status === '완료').length
            const summary = [done > 0 && `완료 ${done}`, mine.length - done > 0 && `예정 ${mine.length - done}`].filter(Boolean).join(' · ') || '신청 없음'
            return <article key={kind} className="counseling-detail-column" style={{ '--counsel-color': `var(--counsel-${look.n})`, '--counsel-soft': `var(--counsel-${look.n}-soft)` } as CSSProperties}>
              <div className="counseling-detail-head"><span className="counseling-detail-icon"><Icon id={look.icon} /></span><span className="counseling-detail-copy"><span className="counseling-detail-title">{kind}</span><span>{look.desc}</span></span><strong className="counseling-detail-total">{mine.length}건</strong></div>
              <div className="counseling-detail-summary">{summary}</div>
              <div className="counseling-record-list">
                {mine.slice(0, 2).map(r => <div className="counseling-record" key={r.id}><span><span className="counseling-record-title">{r.topic}</span><small>{recordDate(r)} · {r.method}</small></span><span className="badge">{r.status}</span></div>)}
              </div>
            </article>
          })}
        </div>
      </Card>
    </div>
  </div>
}
