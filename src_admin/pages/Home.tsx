import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import spriteHtml from './testAdminSprite.html?raw'
import { getActiveCounselor } from '../data/counselors'
import {
  getHelloSummary, getRiskSummary, getKpis, getTypeDistribution,
  getTodayTimeline, getIntake, getMyPrograms, getPerformance,
  getBriefing, getDefaultOpenStudentId,
} from '../data/counselorDashboard'
import { mockLatency } from '../data/query'
import EmptyState from '../components/EmptyState'
import StudentDetailModal from '../components/StudentDetailModal'
import './TestAdminHome.css'

// ─────────────────────────────────────────────────────────────────────────
// 상담사 홈 대시보드 — 시안(test_admin_react) 마크업을 JSX로 옮긴 것.
//
// 클래스명·구조·아이콘은 시안 그대로다. 값은 전부 counselorDashboard.ts 에서
// 받는다(CLAUDE.md 규칙 10 — 집계는 데이터 층). 리터럴을 화면에 박지 않는다.
// 막대 길이는 CSS가 아니라 데이터다 — 인라인 --v 만 바꾼다.
// CSS 는 시안 styles.css 를 .tadmin 하위로 기계 스코핑한 TestAdminHome.css.
// ─────────────────────────────────────────────────────────────────────────

/** 시안 스프라이트 아이콘 */
function Ico({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><use href={`#i-${id}`} /></svg>
}

/** KPI 카드 4장의 아이콘·목적지 — key 는 getKpis() 가 정한다 */
const KPI_META: Record<string, { icon: string; to: string }> = {
  today: { icon: 'cal', to: '/counsel/schedule' },
  intake: { icon: 'clip', to: '/counsel/requests' },
  roadmap: { icon: 'route', to: '/roadmap/requests' },
  record: { icon: 'pen', to: '/counsel/records' },
}

/** AI 추천 질문 생성에 걸리는 시간(모의). 실제 생성 API가 붙으면 이 상수는 사라진다. */
const AI_QUESTION_MS = 900

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
  const depts = me.departments
  const isCareer = me.role === 'career'

  const hello = getHelloSummary(me.id, depts)
  const risk = getRiskSummary(depts)
  const kpis = getKpis(me.id)
  const dist = getTypeDistribution(depts)
  const timeline = getTodayTimeline(me.id, depts)
  const intake = getIntake(me.id, depts)
  const programs = isCareer ? getMyPrograms(me.name, hello.refDate) : []
  const perf = getPerformance(me.id)

  // 시안 동작: 항목을 누르면 그 아래로 브리핑이 펼쳐진다(하나만 열림)
  const [openId, setOpenId] = useState<string | null>(() => getDefaultOpenStudentId(me.id, depts))
  const briefing = openId ? getBriefing(openId, me.id, depts) : null

  // 학생정보 모달 — 상담사 학생관리 상세와 같은 화면(StudentDetailModal 공용)
  const [infoId, setInfoId] = useState<string | null>(null)

  // AI 추천 질문은 '생성'이다 — 브리핑을 펼치자마자 보여주지 않고 버튼을 눌러야 만들어진다.
  // 한 번 생성한 학생은 다시 펼쳐도 재생성하지 않는다.
  const [askedIds, setAskedIds] = useState<string[]>([])
  const [askingId, setAskingId] = useState<string | null>(null)
  const generateQuestions = async (studentId: string) => {
    setAskingId(studentId)
    await mockLatency(AI_QUESTION_MS)
    setAskingId(null)
    setAskedIds(prev => (prev.includes(studentId) ? prev : [...prev, studentId]))
  }

  // 사전 문진표 모달
  const [sheetOpen, setSheetOpen] = useState(false)
  useEffect(() => {
    if (!sheetOpen) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false) }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [sheetOpen])

  const questions = briefing?.rows.find(r => r.items)?.items ?? []

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
                <span><Ico id="users" />담당 학생 {hello.studentCount}명</span>
                <span><Ico id="cal" />{formatDate(hello.refDate)}</span>
              </div>
            </div>

            {/* 담당 학생 요약 */}
            <Link to="/students" className="card sm assign">
              <span className="rounded s-green"><Ico id="users" /></span>
              <div className="unit">
                <div className="k">담당 학생</div>
                <div className="v">{hello.studentCount}<u>명</u></div>
              </div>
              <div className="sep" />
              <div className="unit">
                <div className="k">상담기록</div>
                <div className="v">{hello.recordCount}<u>건</u></div>
              </div>
              <span className="go"><Ico id="chev" /></span>
            </Link>

            {/* 집중관리 현황 — 1학년을 뺀 담당 학생 대비 비율(분류 기준은 counselorDashboard.RISK_RULE) */}
            <div className="card sm risk">
              <div className="risk-hd">
                <span className="rounded s-red"><Ico id="alert" /></span>
                <div>
                  <div className="k">집중관리 현황</div>
                  <div className="s">1학년 제외 {risk.total}명 대비</div>
                </div>
              </div>
              {/* 분류를 누르면 전체 학생 목록이 그 분류로 걸린 채 열린다.
                  담당 목록이 아니라 전체 목록이다 — 집중관리는 담당 배정과 무관하게 본다. */}
              {risk.rows.map(row => (
                <Link key={row.label} to={`/students/all?focus=${row.focus}`} className="risk-row">
                  <span className="nm">{row.code && <span className="cd">{row.code}</span>}{row.label}</span>
                  <span className="v">{row.count}<u>명</u></span>
                  <span className={`p ${row.ink}`}>{row.ratio}%</span>
                  <span className="bar"><i className={row.solid} style={bar(row.ratio)} /></span>
                </Link>
              ))}
            </div>

            {/* KPI 4장 */}
            <div className="kpis">
              {kpis.map(k => {
                const meta = KPI_META[k.key]
                return (
                  <Link key={k.key} to={meta.to} className="card sm kpi">
                    <span className={`ico ${k.tint}`}><Ico id={meta.icon} /></span>
                    <div className="name">{k.name}</div>
                    <div className="num">{k.value}<u>{k.unit}</u></div>
                    <div className="bar"><i className={k.solid} style={bar(k.ratio)} /></div>
                    <div className="ratio">{k.detail}</div>
                  </Link>
                )
              })}
            </div>

            {/* 유형 분포 */}
            <div className="card">
              <div className="card-hd"><h2>담당 학생 유형 분포</h2></div>
              <div className="donut-wrap">
                <div className="donut" style={{ background: dist.gradient }}>
                  <div className="mid">
                    <div className="k">전체</div>
                    <div className="v">{dist.total}<u>명</u></div>
                  </div>
                </div>
                <div className="legend">
                  {dist.slices.map(s => (
                    <div key={s.code} className="lg">
                      <span className={`sw ${s.swatch}`} />
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
              <p className="consultation-guide">학생을 선택하면 상담 전 브리핑을 바로 확인할 수 있어요.</p>

              {timeline.length === 0 ? (
                <EmptyState message="오늘 확정된 상담이 없습니다." />
              ) : (
                <div className="tl">
                  {timeline.map(item => {
                    const on = openId === item.studentId
                    return (
                      <div
                        key={item.requestId}
                        className={`tl-item${on ? ' on' : ''}${item.status === '완료' ? ' muted' : ''}`}
                      >
                        <div
                          className="tl-row"
                          role="button"
                          tabIndex={0}
                          aria-selected={on}
                          onClick={() => setOpenId(on ? null : item.studentId)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setOpenId(on ? null : item.studentId)
                            }
                          }}
                        >
                          <div className="tl-main">
                            <div className="tl-head">
                              <span className="time">{item.time}</span>
                              <span className="who">{item.name}</span>
                              <span className="kind">{item.meta}</span>
                              {item.typeCode && (
                                <span className={`badge ${item.typeTint}`}>{item.typeCode} {item.typeLabel}</span>
                              )}
                            </div>
                            <div className="tl-desc">{item.topic}</div>
                            <div className="tl-tags">
                              <span className={`badge ${item.status === '완료' ? 's-green' : 's-blue'}`}>
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

                        {on && briefing && (
                          <section className="inline-briefing" aria-label={`${briefing.name} 상담 전 브리핑`}>
                            <div className="inline-briefing-head">
                              <div className="inline-briefing-title">
                                <h3>{briefing.name} 상담 전 브리핑</h3>
                                <span className="pill s-blue">AI</span>
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
                                  <div className="val">
                                    {/* 목록형 행(AI 추천 질문)은 버튼을 눌러 생성한 뒤에 나온다 */}
                                    {!row.items ? row.value
                                      : askedIds.includes(briefing.studentId)
                                        ? <ul>{row.items.map(q => <li key={q}>{q}</li>)}</ul>
                                        : (
                                          <button
                                            type="button"
                                            className="btn sm ai-question-btn"
                                            disabled={askingId === briefing.studentId}
                                            onClick={() => generateQuestions(briefing.studentId)}
                                          >
                                            {askingId === briefing.studentId ? (
                                              <><span className="ai-question-spin" aria-hidden="true" />질문 생성 중…</>
                                            ) : (
                                              <><Ico id="help" />AI추천질문</>
                                            )}
                                          </button>
                                        )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {briefing.alert && (
                              <div className="alert"><Ico id="alert" /><p>{briefing.alert}</p></div>
                            )}

                            <div className="actions">
                              <button
                                type="button"
                                className="btn"
                                disabled={questions.length === 0}
                                onClick={e => { e.stopPropagation(); setSheetOpen(true) }}
                              >
                                <Ico id="doc" />사전 문진표 보기
                              </button>
                              <Link to={`/counsel/session/${briefing.studentId}`} className="btn primary">
                                <Ico id="route" />상담 진행
                              </Link>
                            </div>
                          </section>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="foot-link">
                <Link to="/counsel/schedule" className="link">전체 일정 보기<Ico id="chev" /></Link>
              </div>
            </div>
          </div>

          {/* ========== 우측 ========== */}
          <div className="col col-right">

            {/* 상담접수함 */}
            <div className="card">
              <div className="card-hd">
                <h2>상담접수함</h2>
                <div className="right"><span className="badge s-purple">{intake.length}건</span></div>
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
                      <div className="nm">{row.name}<span>{row.meta}</span></div>
                      <div className="sub">{row.sub}</div>
                    </div>
                    <span className="badge s-orange">{row.status}</span>
                  </Link>
                ))
              )}
              <div className="foot-link">
                <Link to="/students" className="link">전체 보기<Ico id="chev" /></Link>
              </div>
            </div>

            {/* 내가 등록한 비교과 프로그램 — 진로상담사 전용 */}
            {isCareer && (
              <div className="card">
                <div className="card-hd">
                  <h2>내가 등록한 비교과 프로그램</h2>
                  <div className="right"><span className="badge s-green">{programs.length}개</span></div>
                </div>
                {programs.length === 0 ? (
                  <EmptyState message="등록한 프로그램이 없습니다." />
                ) : (
                  programs.map(p => (
                    <Link key={p.id} to={`/programs/${p.id}`} className="prog">
                      <span className="id">
                        <span className="code">{p.code}</span>
                        <span className={`badge ${p.tint}`}>{p.category}</span>
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
                    <span className="goal">목표 {row.goal}%</span>
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

      {/* 사전 문진표 — 브리핑의 AI 추천 질문을 문항으로 보여준다 */}
      {sheetOpen && briefing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSheetOpen(false)}>
          <section
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${briefing.name} 사전 문진표`}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>{briefing.name} 사전 문진표</h2>
                <p>상담 전 확인 · {briefing.meta}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="사전 문진표 닫기"
                onClick={() => setSheetOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <dl className="questionnaire">
              {questions.map(q => (
                <div key={q} className="questionnaire-row">
                  <dt>{q}</dt>
                  <dd>상담 전 학생 응답이 아직 등록되지 않았습니다.</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  )
}
