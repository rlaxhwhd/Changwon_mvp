import { studentDisplayName } from '../../shared/studentDisplayName'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import spriteHtml from './testAdminSprite.html?raw'
import { getActiveCounselor } from '../data/counselors'
import {
  getHelloSummary, getKpis, getTypeDistribution,
  getTodayTimeline, getIntake, getMyPrograms, getPerformance,
  useCounselDashboard, useCounselBriefing, type Dashboard,
} from '../data/counselorDashboard'
import EmptyState from '../components/EmptyState'
import StudentDetailModal from '../components/StudentDetailModal'
import './TestAdminHome.css'
import { categoryLabel } from '../data/schema/program'

// ─────────────────────────────────────────────────────────────────────────
// 상담사 홈: 운영 수치·목록·브리핑은 counsel-dashboard API의 DB 조회 결과다.
// counselorDashboard.ts는 조회 갱신과 표시 형식을 담당한다.
// 기존 반응형 레이아웃은 TestAdminHome.css의 .tadmin 스타일을 사용한다.
// ─────────────────────────────────────────────────────────────────────────

/** 시안 스프라이트 아이콘 */
function Ico({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><use href={`#i-${id}`} /></svg>
}

/** KPI 카드 4장의 아이콘·목적지 — key 는 getKpis() 가 정한다 */
const KPI_META: Record<string, { icon: string; to?: string }> = {
  today: { icon: 'cal' },
  intake: { icon: 'clip', to: '/counsel/requests' },
  roadmap: { icon: 'route', to: '/roadmap/requests' },
  record: { icon: 'pen', to: '/counsel/journals' },
}

/** 성과 지표 4행의 아이콘 — key 는 getPerformance() 가 정한다 */
const PERF_ICON: Record<string, string> = {
  progress: 'chart', record: 'doc', confirm: 'clip', roadmap: 'route',
}

function bar(v: number): CSSProperties {
  return { '--v': `${Math.min(100, Math.max(0, v))}%` } as CSSProperties
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${wd})`
}

/** 시안의 새싹 장식 (인사 카드 우측) */
function Sprig() {
  return (
    <svg className="sprig" viewBox="0 0 132 154" aria-hidden="true">
      <path d="M66 152C66 112 66 66 66 22" stroke="#A8DEC5" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M66 106C44 106 29 92 27 72c22-4 37 9 39 34Z" fill="#CFEFE0" />
      <path d="M66 84c22 0 37-14 39-34-22-4-37 9-39 34Z" fill="#B4E6CE" />
      <path d="M66 62C46 60 33 46 33 28c20-2 33 12 33 34Z" fill="#E2F6EC" />
      <path d="M66 40c15-4 26-17 26-32-17 2-28 15-26 32Z" fill="#C6EBD9" />
    </svg>
  )
}

export default function Home() {
  const me = getActiveCounselor()
  const { data, error, refresh } = useCounselDashboard(me.id)
  if (!data) return (
    <div className="tadmin"><div className="page">
      {error ? <div role="alert" className="dashboard-status">
        <p>상담사 홈을 조회하지 못했습니다. {error}</p>
        <button type="button" className="btn" onClick={refresh}>다시 조회</button>
      </div> : <p role="status" className="dashboard-status">상담 현황을 불러오는 중입니다.</p>}
    </div></div>
  )
  return <HomeContent key={me.id} data={data} error={error} />
}

function HomeContent({ data, error }: { data: Dashboard; error: string }) {
  const me = getActiveCounselor()
  const isCareer = me.role === 'career'

  const hello = getHelloSummary(data)
  const [contactTab, setContactTab] = useState<'diagnosis' | 'counsel' | 'roadmap'>('diagnosis')
  const contactLabels = { diagnosis: '진단을 완료하지 않은 학생', counsel: '진단 완료 후 상담을 완료하지 않은 학생', roadmap: '진단·상담 완료 후 로드맵이 생성되지 않은 학생' }
  const kpis = getKpis(data)
  const dist = getTypeDistribution(data)
  const timeline = getTodayTimeline(data)
  const intake = getIntake(data)
  const programs = getMyPrograms(data)
  const perf = getPerformance(data)

  // 신청 ID로 구분한다. 같은 학생의 서로 다른 상담를 섞지 않는다.
  const [openId, setOpenId] = useState<string | null | undefined>(undefined)
  const activeRequestId = openId === undefined
    ? timeline.find(t => t.status !== '완료')?.requestId ?? null
    : timeline.some(t => t.requestId === openId) ? openId : null
  const briefingResource = useCounselBriefing(activeRequestId, me.id)
  const briefing = briefingResource.data

  // 학생정보 모달 — 상담사 학생관리 상세와 같은 화면(StudentDetailModal 공용)
  const [infoId, setInfoId] = useState<string | null>(null)

  return (
    <div className="tadmin">
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute' }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: spriteHtml }}
      />

      <div className="page">
        {/* 상태 줄·새로고침 버튼은 뺐다(2026-09-17). 갱신은 진입·포커스·30초 폴링이 알아서 한다 — 실패했을 때만 알린다. */}
        {error && <div className="dashboard-status"><p role="alert">최신 조회에 실패해 이전 결과를 표시합니다. {error}</p></div>}
        <div className="grid">

          {/* ========== 좌측 ========== */}
          <div className="col">

            {/* 인사 */}
            <div className="card lg hello">
              <Sprig />
              <h1>{me.name} 상담사님,<br />오늘 상담 <em>{hello.todayCount}건</em>입니다</h1>
              <div className="under" />
              <div className="facts">
                <span><Ico id="sun" />{me.dept}</span>
                <span><Ico id="users" />CARE 7+ 참여학생 {hello.studentCount}명</span>
                <span><Ico id="cal" />{formatDate(hello.refDate)}</span>
              </div>
            </div>

            {/* CARE 7+ 참여학생 요약 */}
            <Link to="/students/all" className="card sm assign">
              <span className="rounded s-green"><Ico id="users" /></span>
              <div className="unit">
                <div className="k">CARE 7+ 참여학생</div>
                <div className="v">{hello.studentCount}<u>명</u></div>
              </div>
              <div className="sep" />
              <div className="unit">
                <div className="k">상담기록</div>
                <div className="v">{hello.recordCount}<u>건</u></div>
              </div>
              <span className="go"><Ico id="chev" /></span>
            </Link>

            <div className="card sm risk">
              <div className="risk-hd"><span className="rounded s-red"><Ico id="alert" /></span>
                <div><div className="k">미접촉자 현황</div><div className="s">재학생 {data.uncontacted.total.toLocaleString()}명 기준</div></div>
              </div>
              <div className="admin-tabs" role="tablist" aria-label="미접촉 단계">
                {(['diagnosis', 'counsel', 'roadmap'] as const).map((key, index) => <button key={key} type="button" role="tab"
                  aria-selected={contactTab === key} className={`admin-tab${contactTab === key ? ' active' : ''}`} onClick={() => setContactTab(key)}>
                  {['진단', '상담', '로드맵'][index]}</button>)}
              </div>
              <div role="tabpanel" aria-label={contactLabels[contactTab]}>
                <p>{contactLabels[contactTab]}</p>
                <Link to={`/students/all?contact=${contactTab}`} className="risk-row">
                  <span className="v">{data.uncontacted[contactTab].toLocaleString()}<u>명</u></span><span>학생 목록 보기 →</span>
                </Link>
              </div>
            </div>

            {/* KPI 4장 */}
            <div className="kpis">
              {kpis.map(k => {
                const meta = KPI_META[k.key]
                const content = <>
                    <span className={`ico ${k.tint}`}><Ico id={meta.icon} /></span>
                    <div className="name">{k.name}</div>
                    <div className="num">{k.value}<u>{k.unit}</u></div>
                    <div className="bar"><i className={k.solid} style={bar(k.ratio)} /></div>
                    <div className="ratio">{k.detail}</div>
                </>
                return meta.to ? <Link key={k.key} to={meta.to} className="card sm kpi">{content}</Link> : <div key={k.key} className="card sm kpi">{content}</div>
              })}
            </div>

            {/* 유형 분포 */}
            <div className="card">
              <div className="card-hd"><h2>CARE 7+ 참여학생 유형 분포</h2></div>
              <div className="donut-wrap">
                <div className="donut" style={{ background: dist.gradient }}>
                  <div className="mid">
                    <div className="k">전체</div>
                    <div className="v">{dist.total}<u>명</u></div>
                  </div>
                </div>
                <div className="legend">
                  {dist.slices.map(s => (
                    <div key={s.code ?? 'unassigned'} className="lg">
                      <span className={`sw ${s.swatch}`} style={!s.code ? { background: 'var(--text-cap)' } : undefined} />
                      <span className="cd">{s.code}</span>
                      <span className="nm">{s.label}</span>
                      <span className="n">{s.count}명</span>
                      <span className="p">{s.ratio}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="cap note">
                유형은 진단 완료 학생에게만 부여되며, 로드맵 생성과 비교과 프로그램 노출의 기준이 됩니다.
              </p>
            </div>
          </div>

          {/* ========== 중앙 ========== */}
          <div className="col">
            <div className="card lg today-counsel">
              <div className="card-hd">
                <h2>오늘의 상담</h2>
                <div className="right"><span className="badge s-teal">{timeline.length}건</span></div>
              </div>
              <p className="consultation-guide">오늘 예정된 접수 대기·확정·완료 상담입니다. 다른 날짜의 신청은 상담접수함에서 확인하세요.</p>

              {timeline.length === 0 ? (
                <EmptyState message="오늘 예정된 상담이 없습니다." />
              ) : (
                <div className="tl">
                  {timeline.map(item => {
                    const on = activeRequestId === item.requestId
                    return (
                      <div
                        key={item.requestId}
                        className={`tl-item${on ? ' on' : ''}${item.status === '완료' ? ' muted' : ''}`}
                      >
                        <div
                          className="tl-row"
                          role="button"
                          tabIndex={0}
                          aria-expanded={on}
                          onClick={() => setOpenId(on ? null : item.requestId)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setOpenId(on ? null : item.requestId)
                            }
                          }}
                        >
                          <div className="tl-main">
                            <div className="tl-head">
                              <span className="time">{item.time}</span>
                              <span className="who">{studentDisplayName(item.name, item.studentId)}</span>
                              <span className="kind">{item.meta}</span>
                              {item.typeCode && (
                                <span className={`badge ${item.typeTint}`}>{item.typeCode} {item.typeLabel}</span>
                              )}
                              {item.care7 && <small className="tl-care">CARE 7+</small>}
                            </div>
                            <div className="tl-desc">{item.topic}</div>
                            <div className="tl-tags">
                              <span className={`badge ${item.status === '완료' ? 's-green' : item.status === '대기' ? 's-orange' : 's-blue'}`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <div className="tl-act">
                            {/* 행 클릭(브리핑 토글)과 겹치지 않게 이벤트를 멈춘다 */}
                            <button
                              type="button"
                              className="btn sm student-info-btn"
                              onClick={e => { e.stopPropagation(); setInfoId(item.studentId) }}
                            >
                              <Ico id="user" /><span>학생정보</span>
                            </button>
                            <button
                              type="button"
                              className={`btn sm briefing-toggle${on ? ' is-open' : ''}`}
                              aria-expanded={on}
                            >
                              <span>{on ? '브리핑 닫기' : '브리핑 보기'}</span><Ico id="chev" />
                            </button>
                          </div>
                        </div>

                        {on && briefingResource.error && <div role="alert" className="dashboard-status">
                          <p>{briefingResource.error}</p><button type="button" className="btn sm" onClick={briefingResource.refresh}>다시 조회</button>
                        </div>}
                        {on && !briefing && !briefingResource.error && <p role="status">브리핑을 불러오는 중입니다.</p>}
                        {on && briefing && !briefingResource.error && (
                          <section className="inline-briefing" aria-label={`${studentDisplayName(briefing.name, briefing.studentId)} 상담 전 브리핑`}>
                            <div className="inline-briefing-head">
                              <div className="inline-briefing-title">
                                <h3>{studentDisplayName(briefing.name, briefing.studentId)} 상담 전 브리핑</h3>
                              </div>
                              <div className="inline-briefing-meta">
                                <span><Ico id="user" />{briefing.mode}</span>
                                <span><Ico id="clock" />{briefing.time}</span>
                              </div>
                            </div>

                            <div className="scores">
                              {briefing.scores.map(s => (
                                <div key={s.label} className="score">
                                  <div className="k">{s.label}</div>
                                  <div className="row">
                                    <div className={`v ${s.ink}`}>{s.value}<u>{s.unit}</u></div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="brief">
                              {briefing.rows.map(row => (
                                <div key={row.label} className="brow">
                                  <div className="lab">{row.label}</div>
                                  <div className="val">{row.value}</div>
                                </div>
                              ))}
                            </div>

                            <div className="actions">
                              <Link to={item.status === '대기' ? '/counsel/requests' : `/counsel/session/${briefing.studentId}`} className="btn primary">
                                <Ico id="route" />{item.status === '대기' ? '접수 확인' : '상담 진행'}
                              </Link>
                            </div>
                          </section>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </div>

          {/* ========== 우측 ========== */}
          <div className="col col-right">

            {/* 상담접수함 */}
            <div className="card">
              <div className="card-hd">
                <h2>상담접수함</h2>
                <div className="right"><span className="badge s-purple">{data.counts.pending}건</span></div>
              </div>
              {intake.length === 0 ? (
                <EmptyState message="대기 중인 신청이 없습니다." />
              ) : (
                intake.map((row, i) => (
                  <Link
                    key={row.requestId}
                    to="/counsel/requests"
                    className={`intake${i === intake.length - 1 ? ' is-last' : ''}`}
                  >
                    <span className={`ava ${row.tint}`}>{row.initial}</span>
                    <div className="info">
                      <div className="nm">{studentDisplayName(row.name, row.studentId)}<span>{row.meta}</span></div>
                      <div className="sub">{row.sub}</div>
                    </div>
                    <span className="badge s-orange">{row.status}</span>
                  </Link>
                ))
              )}
              <div className="foot-link">
                <Link to="/counsel/requests" className="link">전체 보기<Ico id="chev" /></Link>
              </div>
            </div>

            {/* 내가 등록한 비교과 프로그램 — 진로상담사 전용 */}
            {isCareer && (
              <div className="card">
                <div className="card-hd">
                  <h2>내가 등록한 비교과 프로그램</h2>
                  <div className="right"><span className="badge s-green">{data.programCount}개</span></div>
                </div>
                {programs.length === 0 ? (
                  <EmptyState message="등록한 프로그램이 없습니다." />
                ) : (
                  programs.map(p => (
                    <Link key={p.id} to={`/programs/${p.id}`} className="prog">
                      <span className="id">
                        <span className="code">{p.code}</span>
                        <span className={`badge ${p.tint}`}>{categoryLabel(p.category)}</span>
                        <span className="today">오늘 <b>{p.todayCount}</b>명 신청</span>
                      </span>
                      <span className="nm">{p.title}</span>
                      <span className="row">
                        <span className="lb">신청 / 모집</span>
                        <span className="n">{p.applied}<u> / {p.capacity}명</u></span>
                      </span>
                      <span className="bar"><i className={p.solid} style={bar(p.ratio)} /></span>
                    </Link>
                  ))
                )}
                <div className="foot-link">
                  <Link to="/programs" className="link">전체 보기<Ico id="chev" /></Link>
                </div>
              </div>
            )}

            {/* 성과 지표 */}
            <div className="card">
              <div className="card-hd"><h2>나의 성과 지표</h2></div>
              {perf.map(row => (
                <div key={row.key} className="perf">
                  <div className="row">
                    <span className={`ico ${row.tint}`}><Ico id={PERF_ICON[row.key]} /></span>
                    <span className="nm">{row.name}</span>
                    <span className={`v ${row.ink}`}>{row.value}<u>%</u></span>
                  </div>
                  <div className="bar"><i className={row.solid} style={bar(row.value)} /></div>
                </div>
              ))}
              <div className="foot-link">
                <Link to="/counsel/stats" className="link">성과 리포트 보기<Ico id="chev" /></Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 학생정보 — 학생관리 상세와 같은 화면(공용 StudentDetailModal) */}
      {infoId && (
        <StudentDetailModal studentId={infoId} role={me.role} onClose={() => setInfoId(null)} />
      )}

    </div>
  )
}
