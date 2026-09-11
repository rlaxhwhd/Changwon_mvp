import { useEffect, useReducer, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMetadata } from '../../shared/useMetadata'
import { getActiveStudent, getStudentType, getStudentTypeMeta } from '../data/students'
import { buildCareerJourney, typeLabel } from '../data/careerProcess'
import { getPipelineState } from '../data/pipeline'
import StudentStatCards from '../components/StudentStatCards'
import CareerJourneyCard from '../components/CareerJourneyCard'
import NextStepBanner from '../components/NextStepBanner'
import { getGrowthRecords } from '../data/growthRecords'
import { getLoungeData } from '../data/lounge'
import { axisLabel } from '../data/schema/roadmap'
import './AiLounge.css'

function Card({id, className, title, description, locked, children}: {
  id:string; className:string; title:string; description:string; locked?:string; children?:ReactNode
}) {
  return <section data-slot="card" id={id} className={`${className} reveal`}>
    <header data-slot="card-header"><div><h2 data-slot="card-title">{title}</h2><p data-slot="card-description">{description}</p></div></header>
    {locked ? <div className="al-locked"><div className="al-placeholder" aria-hidden="true"><i /><i /><i /></div><p><span aria-hidden="true">🔒</span><span>{locked}</span></p></div> : <div data-slot="card-content">{children}</div>}
  </section>
}

export default function AiLounge() {
  useMetadata()
  const [, refresh] = useReducer(n => n + 1, 0)
  useEffect(() => {
    const events = ['dc_roadmap_changed','dc_programs_changed','dc_growth_changed','dc:diagnosis-updated','dc:counsel-updated']
    events.forEach(e => window.addEventListener(e, refresh))
    return () => events.forEach(e => window.removeEventListener(e, refresh))
  }, [])
  const student = getActiveStudent()
  const type = getStudentType(student)
  const meta = getStudentTypeMeta(student)
  const {stats, diagnosis, requests, roadmap, access} = getLoungeData(student)
  const growth = getGrowthRecords(student.id)
  const tasks = roadmap?.axes.flatMap(a => a.cells.filter(c => c.status !== 'DONE')) ?? []
  return <div className="al-page">
    <NextStepBanner />
    <section className="welcome reveal"><div><small>{student.major}{student.grade ? ` ${student.grade}학년` : ''}</small><h1>안녕하세요, <span>{student.name}</span>님.<br />오늘의 커리어 여정을 시작해 볼까요?</h1></div><div className="student-type"><span className="type-copy"><small>나의 진로 유형</small><b>{typeLabel(type)}</b><span>{meta?.goal ?? '진단 결과가 연계되면 유형을 확인할 수 있습니다.'}</span></span></div></section>
    <StudentStatCards stats={stats} />
    <div className="dashboard-grid">
      <CareerJourneyCard journey={buildCareerJourney(getPipelineState(student))} title="나의 진로 여정" desc="내 CARE 7+의 현재 위치입니다." className="reveal" id="journey" />
      <Card id="competency" className="competency-card" title="5대 핵심역량" description="연계된 역량 결과를 확인합니다." locked="역량 결과가 연계되면 확인할 수 있습니다." />
      <Card id="diagnosis" className="diagnosis-card" title="진단 결과" description="대상 진단의 진행 상태와 결과입니다."><div className="diagnosis-result-grid">{diagnosis.map(c => <article className="diagnosis-result-item" key={c.module.id}>
        <span className="diagnosis-result-name"><small>{c.module.id}</small><b>{c.module.name}</b></span>
        {c.status === 'done' ? <Link to={`/diagnosis/employment/${c.module.testId}`}><strong>{c.headline || '진단 완료'}</strong><div>{c.tags.join(' · ')}</div></Link> : <div className="al-locked"><div className="al-placeholder" aria-hidden="true"><i /><i /></div><p><span aria-hidden="true">🔒</span><span>{c.status === 'available' ? '진단 결과를 기다리고 있습니다.' : '선행 진단 완료 후 확인할 수 있습니다.'}</span></p></div>}
      </article>)}</div></Card>
      <Card id="goal" className="goal-card" title="목표 달성 계획" description="확정된 로드맵의 목표와 수행 항목입니다." locked={!roadmap ? '상담 후 로드맵이 확정되면 확인할 수 있습니다.' : undefined}>
        {roadmap && <><div className="goal-overview"><article className="goal-core"><small>목표 직무</small><h3>{roadmap.targetRole || '목표 직무 미등록'}</h3><div className="goal-number">{roadmap.progress.pct}<span>% 전체 진척도</span></div></article></div><div className="al-plan-axes">{roadmap.axes.map(a => <section key={a.axis}><h3>{axisLabel(a.axis)}</h3><ul>{a.cells.map(c => <li key={c.id}>{c.title} <span>{c.status === 'DONE' ? '완료' : '미완료'}</span></li>)}</ul></section>)}</div><Link to="/roadmap/skill-tree">로드맵 전체 보기</Link></>}
      </Card>
      <Card id="todo" className="todo-card" title="남은 수행 항목" description="확정된 로드맵에서 아직 완료하지 않은 항목입니다." locked={!roadmap ? '로드맵 확정 후 수행 항목을 확인할 수 있습니다.' : undefined}><ul className="al-record-list">{tasks.slice(0,6).map(c => <li key={c.id}><Link to="/roadmap/skill-tree">{c.title}</Link></li>)}</ul>{roadmap && tasks.length === 0 && <p>남은 수행 항목이 없습니다.</p>}</Card>
      <Card id="recommend" className="recommend-card" title="성장 활동 기록" description="내 성장에 저장한 활동 기록입니다." locked={access.growth !== 'open' && growth.length === 0 ? 'CARE 7+ 진행 후 쌓인 성장 활동을 확인할 수 있습니다.' : undefined}><ul className="al-record-list">{growth.map((r,i) => <li key={i}><small>{r.date} · {r.type}</small><strong>{r.title}</strong><p>{r.description}</p></li>)}</ul>{growth.length === 0 && <p>아직 기록된 성장 활동이 없습니다.</p>}<Link to="/growth/journal">성장 기록 보기</Link></Card>
      <Card id="counseling-status" className="counseling-card" title="상담 현황" description="내 상담 신청과 진행 상태입니다." locked={requests.length === 0 ? '상담을 신청하면 진행 상태를 확인할 수 있습니다.' : undefined}><ul className="al-record-list">{[...requests].sort((a,b) => b.requestedAt.localeCompare(a.requestedAt)).slice(0,6).map(r => <li key={r.id}><small>{r.type} · {r.slot?.date ?? r.requestedAt.slice(0,10)}</small><strong>{r.topic}</strong><span>{r.status}</span></li>)}</ul><Link to="/mypage/counsel">전체 상담 내역 보기</Link></Card>
    </div>
  </div>
}
