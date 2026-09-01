import { useState } from 'react'
import { Link } from 'react-router-dom'
import CareerPopup from '../components/CareerPopup'
import './Main.css'

// ─────────────────────────────────────────────────────────────────────────
// 메인 홈 — 시안 그대로: 창원디자인시안작업/main.html (= stu_v1.jsx)
// ★ 마크업은 시안 HTML 을 기계 변환해 그대로 옮긴 것이다.
//   클래스·구조를 손대면 시안 CSS 가 어긋난다. 수정은 시안 쪽에서 먼저 한다.
//   내용(수치·문구)은 시안 값 그대로 — 데이터 배선은 디자인 확정 후 별도로 한다.
export default function Main() {
  // 출석 체크 — 누르면 다른 화면으로 가는 게 아니라 이 자리에서 '출석 완료'로 바뀐다.
  // 아직 화면 안에서만 사는 상태다(새로고침하면 풀린다). 출석 이벤트를 남기려면
  // CLAUDE.md 의 '이벤트 → JSON 반영' 표에 저장소를 먼저 정의해야 한다.
  const [attended, setAttended] = useState(false)

  return (
    <div className="mn-page">
        <section className="career-hero reveal" aria-labelledby="welcomeTitle">
          <div className="career-hero-left">
            <div className="career-hero-copy">
              <p className="career-hero-kicker">MY CAREER DASHBOARD</p>
              <h1 id="welcomeTitle">한눈에 보는<span>오늘 나의 성장</span></h1>
              <p>진단 결과부터 상담, 로드맵과 역량까지 연결된 나의 현재 위치를 확인하고 오늘의 행동을 시작해 보세요.</p>
            </div>

          <section data-slot="card" className="journey-card hero-roadmap" id="journey" aria-labelledby="journeyTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="journeyTitle">나의 진로 여정</h2><p data-slot="card-description">내 CARE+7의 현재 위치입니다.</p></div>
            </header>
            <div data-slot="card-content">
              <div className="journey-summary">
                <div className="hero-progress-meta"><strong>58%</strong><span>역량강화 진행 중</span></div>
                <div className="progress-track" style={{ '--value': '58%' } as React.CSSProperties} aria-label="전체 진행률 58퍼센트"><i></i></div>
              </div>
              <div className="journey-scroll" tabIndex={0} aria-label="CARE+7 단계 목록, 가로로 스크롤할 수 있습니다">
                <div className="journey-steps">
                  <div className="journey-step done"><span className="journey-dot"><svg className="icon"><use href="#i-check" /></svg></span><strong>진단</strong><small>완료</small></div>
                  <div className="journey-step done"><span className="journey-dot"><svg className="icon"><use href="#i-check" /></svg></span><strong>상담</strong><small>완료</small></div>
                  <div className="journey-step done"><span className="journey-dot"><svg className="icon"><use href="#i-check" /></svg></span><strong>로드맵</strong><small>완료</small></div>
                  <div className="journey-step current"><span className="journey-dot">C4</span><strong>역량강화</strong><small>진행 중</small></div>
                  <div className="journey-step"><span className="journey-dot">C5</span><strong>기업연계</strong><small>예정</small></div>
                  <div className="journey-step"><span className="journey-dot">C6</span><strong>취업지원</strong><small>예정</small></div>
                  <div className="journey-step"><span className="journey-dot">C7</span><strong>사후관리</strong><small>예정</small></div>
                </div>
              </div>
            </div>
          </section>

          </div>

          <div className="career-hero-board">
            <div className="career-hero-top">
              <div className="career-hero-stack">

          <section data-slot="card" className="hero-panel hero-todo" id="today" aria-labelledby="todoTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="todoTitle">오늘 할 일</h2></div>
              <span data-slot="card-action" className="badge blue">08.26 수요일</span>
            </header>
            <div data-slot="card-content">
              <div className="todo-list">
                <div className="todo-item completed"><button className="todo-check" type="button" aria-label="자기탐색 진로설계 워크숍 프로그램 마감 임박" aria-pressed="true"><svg className="icon"><use href="#i-check" /></svg></button><span className="todo-copy"><b>자기탐색 진로설계 워크숍 프로그램 마감 임박</b><small>DN솔루션즈 · 채용공고 분석</small></span><span className="todo-time">완료</span></div>
                <div className="todo-item"><button className="todo-check" type="button" aria-label="9/3일 14시 진로취업상담 예정" aria-pressed="false"><svg className="icon"><use href="#i-check" /></svg></button><span className="todo-copy"><b>9/3일 14시 진로취업상담 예정</b><small>로드맵 설계 · 필수 항목</small></span><span className="todo-time">D-2</span></div>
                <div className="todo-item"><button className="todo-check" type="button" aria-label="찜한 추천 채용공고 지원하기" aria-pressed="false"><svg className="icon"><use href="#i-check" /></svg></button><span className="todo-copy"><b>찜한 추천 채용공고 지원하기</b><small>상담 예약 · 김지현 상담사</small></span><span className="todo-time">16:00</span></div>
              </div>
            </div>
            <footer data-slot="card-footer"><button className="button" type="button">전체 일정 보기 <svg className="icon"><use href="#i-arrow" /></svg></button></footer>
          </section>

          <section data-slot="card" className="hero-panel hero-quest" aria-labelledby="questTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="questTitle">오늘의 퀘스트</h2><p data-slot="card-description">작은 실행을 모아 성장 포인트를 쌓아보세요.</p></div>
              <Link data-slot="card-action" className="hero-inline-action" to="/growth/quest">전체 보기 <svg className="icon"><use href="#i-arrow" /></svg></Link>
            </header>
            <div data-slot="card-content">
              <div className="quest-layout">
                <div className="quest-ring" role="img" aria-label="오늘의 퀘스트 달성률 72퍼센트"><span className="quest-value"><strong>72%</strong></span></div>
                <div className="quest-copy"><b>커리어 루틴 만들기</b><p>오늘 5개 중 3개 완료<br />2개만 더 달성해 보세요!</p><div className="quest-steps" aria-hidden="true"><i className="done"></i><i className="done"></i><i className="done"></i><i></i><i></i></div></div>
              </div>
            </div>
            <footer data-slot="card-footer"><Link className="button" to="/growth/quest">전체 퀘스트 보기 <svg className="icon"><use href="#i-arrow" /></svg></Link></footer>
          </section>

              </div>

          <section data-slot="card" className="hero-panel hero-attendance attendance-card" aria-labelledby="attendanceTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="attendanceTitle">출석체크</h2><p data-slot="card-description">매일 접속하고 성장 포인트를 받아요.</p></div>
              <span data-slot="card-action" className="badge amber">12일 연속</span>
            </header>
            <div data-slot="card-content">
              <div className="attendance-center"><div className="attendance-streak"><span><strong>TODAY<br />CHECK</strong></span></div><div><p>매일 출석하고 성장 포인트를 모아보세요.</p><button
                className={`button primary attendance-button${attended ? ' completed' : ''}`}
                type="button"
                aria-pressed={attended}
                onClick={() => setAttended(true)}
              >{attended ? '출석 완료 +10P' : '출석하기 +10P'}</button></div></div>
            </div>
          </section>

            </div>

          <section data-slot="card" className="hero-panel hero-competency" id="competency" aria-labelledby="competencyTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="competencyTitle">나의 6대 핵심역량</h2></div>
            </header>
            <div data-slot="card-content">
              <div className="competency-layout">
                <div className="radar-wrap">
                  <svg className="radar-chart" viewBox="0 0 300 280" role="img" aria-label="의사소통 68, 문제해결 74, 협업 81, 창의성 59, 직무전문성 62, 글로벌 72">
                    {/* '나의 현재' 면색 — 옆 역량 막대(.axis-track i)와 같은 보라→하늘 축.
                        SVG 는 CSS 그라데이션을 못 받으므로 여기 정의하고 CSS 가 url(#…)로 참조한다. */}
                    <defs>
                      <linearGradient id="main-competency-mine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--competency-current)" />
                        <stop offset="100%" stopColor="var(--competency-growth)" />
                      </linearGradient>
                    </defs>
                    <polygon className="radar-grid" points="150,22 256,84 256,196 150,258 44,196 44,84" />
                    <polygon className="radar-grid" points="150,52 230,98 230,182 150,228 70,182 70,98" />
                    <polygon className="radar-grid" points="150,82 204,112 204,168 150,198 96,168 96,112" />
                    <path className="radar-axis" d="M150 140V22M150 140l106-56M150 140l106 56M150 140v118M150 140L44 196M150 140L44 84" />
                    <polygon className="radar-average" points="150,60 220,102 224,179 150,212 78,178 90,106" />
                    <polygon className="radar-target" points="150,46 238,92 230,182 150,216 82,176 86,104" />
                    <polygon className="radar-current" points="150,60 228,99 236,185 150,210 84,175 74,100" />
                    <text className="radar-label" x={150} y={10} textAnchor="middle">의사소통</text><text className="radar-label" x={266} y={80}>문제해결</text><text className="radar-label" x={266} y={204}>협업</text><text className="radar-label" x={150} y={276} textAnchor="middle">창의성</text><text className="radar-label" x={10} y={204}>직무전문성</text><text className="radar-label" x={10} y={80}>글로벌</text>
                  </svg>
                </div>
                <div className="competency-side">
                  <div className="competency-legend" aria-label="차트 범례"><span><i style={{ background: 'linear-gradient(90deg, var(--competency-current), var(--competency-growth))' } as React.CSSProperties}></i>나의 현재</span><span><i style={{ background: 'var(--competency-target)' } as React.CSSProperties}></i>목표 직무</span><span><i style={{ background: 'var(--chart-reference)' } as React.CSSProperties}></i>학과 평균</span></div>
                  <div className="axis-list">
                    <div className="axis-item"><div className="axis-head"><b>의사소통</b><strong>68</strong></div><div className="axis-track"><i style={{ '--value': '68%' } as React.CSSProperties}></i></div></div>
                    <div className="axis-item"><div className="axis-head"><b>문제해결</b><strong>74</strong></div><div className="axis-track"><i style={{ '--value': '74%' } as React.CSSProperties}></i></div></div>
                    <div className="axis-item"><div className="axis-head"><b>협업</b><strong>81</strong></div><div className="axis-track"><i style={{ '--value': '81%' } as React.CSSProperties}></i></div></div>
                    <div className="axis-item"><div className="axis-head"><b>창의성</b><strong>59</strong></div><div className="axis-track"><i style={{ '--value': '59%' } as React.CSSProperties}></i></div></div>
                    <div className="axis-item"><div className="axis-head"><b>직무전문성</b><strong>62</strong></div><div className="axis-track"><i style={{ '--value': '62%' } as React.CSSProperties}></i></div></div>
                    <div className="axis-item"><div className="axis-head"><b>글로벌</b><strong>72</strong></div><div className="axis-track"><i style={{ '--value': '72%' } as React.CSSProperties}></i></div></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          </div>
        </section>

        <div className="dashboard-grid">

          <section data-slot="card" className="program-card-shell span-12 reveal" id="programs" aria-labelledby="programTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="programTitle">진행 중인 진로·취업 프로그램</h2><p data-slot="card-description">나의 진로 유형과 관심 직무를 바탕으로 선별했어요.</p></div>
              <Link data-slot="card-action" className="button" to="/growth/program">전체 보기 <svg className="icon"><use href="#i-arrow" /></svg></Link>
            </header>
            <div data-slot="card-content">
              <div className="program-viewport">
                <div className="program-track" tabIndex={0} aria-label="추천 프로그램 목록">
                <a className="program-card" href="#"><img src="/thumb1.png" alt="인적성 NCS 역량검사 프로그램 포스터" /><div className="program-copy"><div className="program-meta"><span className="program-category">공기업준비</span><span className="program-dday">D-04</span></div><h3>2026 하반기 공채 대비 인적성·NCS 역량검사 특강</h3></div></a>
                <a className="program-card" href="#"><img src="/thumb2.png" alt="Career-Up 멘토링 스터디 포스터" /><div className="program-copy"><div className="program-meta"><span className="program-category">멘토링</span><span className="program-dday">D-08</span></div><h3>2026 졸업생 특화 Career-Up 멘토링 스터디 참가자 모집</h3></div></a>
                <a className="program-card" href="#"><img src="/thumb3.jpg" alt="취업 부스트업 트랙 포스터" /><div className="program-copy"><div className="program-meta"><span className="program-category">직무역량</span><span className="program-dday">D-12</span></div><h3>재맞고 점프업 직무역량강화 취업 부스트업 트랙</h3></div></a>
                <a className="program-card" href="#"><img src="/thumb4.png" alt="Career-Up 멘토링 프로그램 포스터" /><div className="program-copy"><div className="program-meta"><span className="program-category">상담</span><span className="program-dday">D-16</span></div><h3>2026 졸업생 특화 Career-Up 멘토링 스터디</h3></div></a>
                <a className="program-card" href="#"><img src="/thumb5.png" alt="취업콘텐츠 이러닝 포스터" /><div className="program-copy"><div className="program-meta"><span className="program-category">e-러닝</span><span className="program-dday">D-22</span></div><h3>경남형 AI-CES 취업콘텐츠 e-러닝 참여자 모집</h3></div></a>
                </div>
                <div className="program-nav program-nav-prev"><button className="carousel-button" type="button" aria-label="이전 프로그램"><svg className="icon"><use href="#i-chevron-left" /></svg></button></div>
                <div className="program-nav program-nav-next"><button className="carousel-button" type="button" aria-label="다음 프로그램"><svg className="icon"><use href="#i-chevron-right" /></svg></button></div>
              </div>
            </div>
          </section>

          <section data-slot="card" className="jobs-card span-12 reveal" id="jobs" aria-labelledby="jobsTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="jobsTitle">AI 추천 채용공고</h2><p data-slot="card-description">진단 결과와 활동 데이터를 바탕으로 나와 잘 맞는 공고를 추천해요.</p></div>
              <Link data-slot="card-action" className="button" to="/jobs/joblist">전체 보기 <svg className="icon"><use href="#i-arrow" /></svg></Link>
            </header>
            <div data-slot="card-content">
              <div className="jobs-layout">
                <article className="featured-job"><div className="featured-top"><span className="company-mark">DN</span><span className="match-badge">AI 매칭 92%</span></div><h3>DN솔루션즈<br />생산기술 신입사원</h3><p>공정개선 및 생산성 향상 업무를 담당하며 스마트 제조 환경 구축에 함께합니다.</p><div className="job-tags"><span>창원시</span><span>정규직</span><span>기계·산업공학</span></div><div className="featured-footer"><strong>2026.08.28 마감 · D-9</strong><a className="featured-link" href="#" aria-label="DN솔루션즈 공고 보기"><svg className="icon"><use href="#i-external" /></svg></a></div></article>
                <div className="job-list">
                  <a className="job-row" href="#"><span className="job-logo">LG</span><div className="job-copy"><span className="job-match">AI 매칭 88%</span><h3>LG전자 H&amp;A본부 R&amp;D 신입</h3><p>창원 · 정규직 · 기계/전기전자</p></div><div className="job-deadline"><b>D-7</b><span>08.26 마감</span></div></a>
                  <a className="job-row" href="#"><span className="job-logo">HD</span><div className="job-copy"><span className="job-match">AI 매칭 84%</span><h3>HD현대중공업 생산관리</h3><p>울산 · 정규직 · 산업공학</p></div><div className="job-deadline"><b>D-12</b><span>08.31 마감</span></div></a>
                  <a className="job-row" href="#"><span className="job-logo">HAN</span><div className="job-copy"><span className="job-match">AI 매칭 81%</span><h3>한화에어로스페이스 품질기술</h3><p>창원 · 채용연계형 인턴 · 공학계열</p></div><div className="job-deadline"><b>D-14</b><span>09.02 마감</span></div></a>
                  <a className="job-row" href="#"><span className="job-logo">KAI</span><div className="job-copy"><span className="job-match">AI 매칭 77%</span><h3>한국항공우주산업 체험형 인턴</h3><p>사천 · 인턴 · 전공무관</p></div><div className="job-deadline"><b>D-18</b><span>09.06 마감</span></div></a>
                </div>
              </div>
            </div>
          </section>

          <section data-slot="card" className="span-12 reveal" id="notices" aria-labelledby="noticeTitle">
            <header data-slot="card-header">
              <div><h2 data-slot="card-title" id="noticeTitle">공지사항</h2><p data-slot="card-description">프로그램과 진로·취업 관련 새 소식을 확인하세요.</p></div>
              <Link data-slot="card-action" className="button" to="/jobs/notices">전체 보기 <svg className="icon"><use href="#i-arrow" /></svg></Link>
            </header>
            <div data-slot="card-content">
              <div className="section-toolbar notice-toolbar"><div className="notice-tabs" role="tablist" aria-label="공지사항 분류"><button className="notice-tab active" type="button" role="tab" aria-selected="true" data-notice-tab="all">전체</button><button className="notice-tab" type="button" role="tab" aria-selected="false" data-notice-tab="program">프로그램</button><button className="notice-tab" type="button" role="tab" aria-selected="false" data-notice-tab="career">진로·취업</button><button className="notice-tab" type="button" role="tab" aria-selected="false" data-notice-tab="system">시스템</button></div></div>
              <div className="notice-list" role="tabpanel">
                <a className="notice-row" data-category="program" href="#"><span className="notice-category">프로그램</span><span className="notice-copy"><b>2026학년도 하반기 비교과 프로그램 참여 안내</b><small>역량별 추천 프로그램과 신청 일정을 확인해 주세요.</small></span><time dateTime="2026-08-19">2026.08.19</time><span className="notice-arrow"><svg className="icon"><use href="#i-chevron-right" /></svg></span></a>
                <a className="notice-row" data-category="career" href="#"><span className="notice-category">진로·취업</span><span className="notice-copy"><b>취업전략센터 1:1 맞춤 상담 예약 오픈</b><small>목표 직무별 전문 컨설턴트와 상담할 수 있습니다.</small></span><time dateTime="2026-08-18">2026.08.18</time><span className="notice-arrow"><svg className="icon"><use href="#i-chevron-right" /></svg></span></a>
                <a className="notice-row" data-category="system" href="#"><span className="notice-category">시스템</span><span className="notice-copy"><b>AI 역량진단 결과 리포트 기능 업데이트</b><small>변화 추이와 추천 활동을 한 화면에서 확인하세요.</small></span><time dateTime="2026-08-14">2026.08.14</time><span className="notice-arrow"><svg className="icon"><use href="#i-chevron-right" /></svg></span></a>
                <a className="notice-row" data-category="career" href="#"><span className="notice-category">진로·취업</span><span className="notice-copy"><b>지역 우수기업 온라인 채용설명회 개최</b><small>기업 담당자에게 직무와 채용 정보를 직접 들어보세요.</small></span><time dateTime="2026-08-12">2026.08.12</time><span className="notice-arrow"><svg className="icon"><use href="#i-chevron-right" /></svg></span></a>
                <a className="notice-row" data-category="program" href="#"><span className="notice-category">프로그램</span><span className="notice-copy"><b>CARE+7 성장 포인트 운영 기준 안내</b><small>활동별 적립 기준과 활용 방법을 안내드립니다.</small></span><time dateTime="2026-08-08">2026.08.08</time><span className="notice-arrow"><svg className="icon"><use href="#i-chevron-right" /></svg></span></a>
              </div>
            </div>
          </section>
        </div>

        {/* 시안의 #careerPopup + 「팝업 보기」 떠 있는 버튼 */}
        <CareerPopup />
    </div>
  )
}
