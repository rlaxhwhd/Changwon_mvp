import { getActiveStudent } from '../data/students'
import StudentStatCards, { type StudentStat } from '../components/StudentStatCards'
import './AiLounge.css'

// 요약 지표 5장 — 상담사 학생 상세와 같은 공용 컴포넌트(StudentStatCards)가 그린다.
// 값은 아직 시안 값 그대로다. 배선할 때 이 상수만 학생 데이터에서 만들면 된다.
const LOUNGE_STATS: StudentStat[] = [
  { kind: 'diagnosis', label: '진단 완료', value: '3', unit: '/3', pct: 100, foot: '모든 진단 완료', badge: '완료' },
  {
    kind: 'counsel', label: '상담 현황', total: '5', unit: '건', foot: '이번 학기 누적',
    channels: [
      { label: '진로취업', count: '3건' },
      { label: '심리검사', count: '1건' },
      { label: '지도교수', count: '1건' },
    ],
  },
  { kind: 'roadmap', label: 'IAP 이행률', value: '62', unit: '%', pct: 62, foot: '지난달 대비', badge: '+14%p' },
  { kind: 'program', label: '비교과 이수', value: '4', unit: '/6', pct: 67, foot: '이번 학기', badge: '2개 남음' },
  {
    kind: 'level', label: '성장 레벨', levelUnit: 'LV', level: '23',
    tierLabel: '현재 성장 단계', tier: 'Career Builder',
    xp: '1,250 XP', xpFoot: '다음 레벨까지 750 XP', pct: 62,
  },
]

// ─────────────────────────────────────────────────────────────────────────
// AI 커리어 라운지 — 시안 그대로: 창원디자인시안작업/stu_dash.html (= stu_lounge.jsx)
// ★ 마크업은 시안 HTML 을 기계 변환해 그대로 옮긴 것이다.
//   클래스·구조를 손대면 시안 CSS 가 어긋난다. 수정은 시안 쪽에서 먼저 한다.
//   내용(수치·문구)은 시안 값 그대로 — 데이터 배선은 디자인 확정 후 별도로 한다.
export default function AiLounge() {
  const student = getActiveStudent()

  return (
    <div className="al-page">
        <section className="welcome reveal">
          <div><small>{student.major} {student.grade}학년</small>
            <h1>안녕하세요, <span>{student.name}</span>님.<br />오늘의 커리어 여정을 시작해 볼까요?</h1>
          </div>
          <div className="student-type"><span className="type-copy"><small>나의 진로 유형</small><b>진로설정형</b><span>목표 직무를 구체화하고 실행 계획을
                설계하는 단계</span></span></div>
        </section>

        <StudentStatCards stats={LOUNGE_STATS} />

        <div className="dashboard-grid">
          <section data-slot="card" className="journey-card reveal">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">나의 진로 여정</h2>
                <p data-slot="card-description">내 CARE+7의 현재 위치입니다.</p>
              </div>

            </div>
            <div data-slot="card-content">
              <div className="journey-state">
                <div className="journey-value"><span className="journey-kicker">CARE+7 ROADMAP</span><b>역량강화 단계</b>
                  <p>로드맵 설계를 완료하고 목표 직무에 필요한 핵심역량을 강화하고 있어요.</p>
                </div>
                <div className="journey-percent"><span>전체 진행률</span><b>57%</b></div>
              </div>
              <div className="progress journey-track" aria-label="CARE+7 진행률 57%"><i style={{ width: '57%', background: 'linear-gradient(90deg,var(--journey-done),var(--journey-current))' } as React.CSSProperties}></i></div>
              <div className="steps" role="list" aria-label="CARE+7 로드맵 단계" tabIndex={0}>
                <div className="step done" role="listitem"><span className="step-marker">✓</span><b>진단</b><span>완료</span></div>
                <div className="step done" role="listitem"><span className="step-marker">✓</span><b>상담</b><span>완료</span></div>
                <div className="step done" role="listitem"><span className="step-marker">✓</span><b>로드맵</b><span>완료</span></div>
                <div className="step current" role="listitem" aria-current="step"><span className="step-marker">C4</span><b>역량강화</b><span>진행 중</span></div>
                <div className="step" role="listitem"><span className="step-marker">C5</span><b>기업연계</b></div>
                <div className="step" role="listitem"><span className="step-marker">C6</span><b>취업지원</b></div>
                <div className="step" role="listitem"><span className="step-marker">C7</span><b>사후관리</b></div>
              </div>
            </div>
          </section>

          <section data-slot="card" className="competency-card reveal">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">6대 핵심역량</h2>
                <p data-slot="card-description">현재 수준, 목표 직무 요구 수준, 학과 평균을 비교합니다.</p>
              </div>
            </div>
            <div data-slot="card-content">
              <div className="chart-layout">
                <div><svg className="radar" viewBox="0 0 300 280" role="img" aria-label="6대 핵심역량 레이더 차트">
                    <polygon className="grid" points="150,22 256,84 256,196 150,258 44,196 44,84" />
                    <polygon className="grid" points="150,52 230,98 230,182 150,228 70,182 70,98" />
                    <polygon className="grid" points="150,82 204,112 204,168 150,198 96,168 96,112" />
                    <line className="axis" x1={150} y1={140} x2={150} y2={22} />
                    <line className="axis" x1={150} y1={140} x2={256} y2={84} />
                    <line className="axis" x1={150} y1={140} x2={256} y2={196} />
                    <line className="axis" x1={150} y1={140} x2={150} y2={258} />
                    <line className="axis" x1={150} y1={140} x2={44} y2={196} />
                    <line className="axis" x1={150} y1={140} x2={44} y2={84} />
                    <polygon className="avg" points="150,60 220,102 224,179 150,212 78,178 90,106" />
                    <polygon className="need" points="150,46 238,92 230,182 150,216 82,176 86,104" />
                    <polygon className="mine" points="150,58 212,104 236,187 150,208 88,174 92,108" /><text x={150} y={10} textAnchor="middle">의사소통</text><text x={266} y={80}>문제해결</text><text x={266} y={204}>협업</text><text x={150} y={276} textAnchor="middle">창의성</text><text x={10} y={204}>직무전문성</text><text x={10} y={80}>글로벌</text></svg>
                  <div className="legend"><span><i style={{ background: 'var(--competency-current)' } as React.CSSProperties}></i>나의 현재</span><span><i style={{ background: 'var(--competency-target)' } as React.CSSProperties}></i>목표 직무</span><span><i style={{ background: 'var(--chart-reference)' } as React.CSSProperties}></i>학과
                      평균</span></div>
                </div>
                <div className="axis-list">
                  <div className="axis-row">의사소통<span className="axis-track"><i style={{ width: '72%' }}></i><u style={{ left: '80%' }}></u></span><span className="gap-value">-8</span></div>
                  <div className="axis-row">문제해결<span className="axis-track"><i style={{ width: '64%' }}></i><u style={{ left: '85%' }}></u></span><span className="gap-value">-21</span></div>
                  <div className="axis-row">협업<span className="axis-track"><i style={{ width: '81%' }}></i><u style={{ left: '75%' }}></u></span><span className="gap-value" style={{ color: 'var(--mint)' } as React.CSSProperties}>+6</span></div>
                  <div className="axis-row">창의성<span className="axis-track"><i style={{ width: '58%' }}></i><u style={{ left: '65%' }}></u></span><span className="gap-value">-7</span></div>
                  <div className="axis-row">직무전문성<span className="axis-track"><i style={{ width: '47%' }}></i><u style={{ left: '88%' }}></u></span><span className="gap-value">-41</span></div>
                  <div className="axis-row">글로벌<span className="axis-track"><i style={{ width: '55%' }}></i><u style={{ left: '60%' }}></u></span><span className="gap-value">-5</span></div>
                </div>
              </div>
            </div>
          </section>

          <section data-slot="card" className="diagnosis-card reveal">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">진단 결과</h2>
                <p data-slot="card-description">CARE+ 단계별 진단에서 발견된 나의 대표 유형입니다.</p>
              </div>
            </div>
            <div data-slot="card-content">
              <div className="diagnosis-result-grid">
                <button className="diagnosis-result-item" type="button" style={{ '--result-color': 'var(--diagnosis-1)', '--result-soft': 'var(--diagnosis-1-soft)' } as React.CSSProperties}>
                  <span className="diagnosis-result-top"><span className="diagnosis-result-name"><small>C-CORE</small><b>핵심진단
                        검사</b></span><span className="diagnosis-result-date">완료</span></span>
                  <strong className="diagnosis-primary-result">역량성장형</strong>
                  <span className="diagnosis-result-tags"><span>의욕 만렙형</span><span>미래 준비 유형</span><span>개인 브랜딩</span></span>
                </button>
                <button className="diagnosis-result-item" type="button" style={{ '--result-color': 'var(--diagnosis-2)', '--result-soft': 'var(--diagnosis-2-soft)' } as React.CSSProperties}>
                  <span className="diagnosis-result-top"><span className="diagnosis-result-name"><small>C-2</small><b>진로설정
                        진단</b></span><span className="diagnosis-result-date">완료</span></span>
                  <strong className="diagnosis-primary-result">추상적 개념화형</strong>
                  <span className="diagnosis-result-tags"><span>진로 수행회피목표</span><span>창의적 의사결정</span></span>
                </button>
                <article className="diagnosis-result-item locked" aria-label="C-3 역량수준 진단 이용 제한" style={{ '--result-color': 'var(--diagnosis-3)', '--result-soft': 'var(--diagnosis-3-soft)' } as React.CSSProperties}>
                  <span className="diagnosis-result-top"><span className="diagnosis-result-name"><small>C-3</small><b>역량수준
                        진단</b></span><span className="diagnosis-result-date">이용 제한</span></span>
                  <strong className="diagnosis-primary-result">미래 유보형</strong>
                  <span className="diagnosis-result-tags"><span>온라인 네트워킹</span><span>교내 네트워킹</span><span>행동파 돌격형</span></span>
                  <span className="diagnosis-lock-layer"><span className="diagnosis-lock-message"><span className="diagnosis-lock-icon"><svg className="icon"><use href="#i-lock" /></svg></span><span className="diagnosis-lock-copy"><b>진로설정형에서는 이용할 수 없어요</b><small>다음 진로 유형으로 전환되면 진단이 열립니다.</small></span></span><button className="button diagnosis-lock-button" type="button">이용 조건 확인</button></span>
                </article>
                <article className="diagnosis-result-item locked" aria-label="C-4 구직역량 진단 이용 제한" style={{ '--result-color': 'var(--diagnosis-4)', '--result-soft': 'var(--diagnosis-4-soft)' } as React.CSSProperties}>
                  <span className="diagnosis-result-top"><span className="diagnosis-result-name"><small>C-4</small><b>구직역량
                        진단</b></span><span className="diagnosis-result-date">이용 제한</span></span>
                  <strong className="diagnosis-primary-result">구직역량 유형 분석</strong>
                  <span className="diagnosis-result-tags"><span>구직 준비도</span><span>취업 실행역량</span></span>
                  <span className="diagnosis-lock-layer"><span className="diagnosis-lock-message"><span className="diagnosis-lock-icon"><svg className="icon"><use href="#i-lock" /></svg></span><span className="diagnosis-lock-copy"><b>진로설정형에서는 이용할 수 없어요</b><small>구직 실행 단계에 진입하면 진단이 열립니다.</small></span></span><button className="button diagnosis-lock-button" type="button">유형별 진단 안내</button></span>
                </article>
              </div>
            </div>
          </section>

          <section data-slot="card" className="goal-card reveal" id="goal">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">목표 달성 계획</h2>
                <p data-slot="card-description">데이터 분석가 목표를 위한 8개 영역과 실행 과제를 관리합니다.</p>
              </div>
            </div>
            <div data-slot="card-content">
              <div className="goal-overview">
                <article className="goal-core"><small>목표 직무</small>
                  <h3>데이터 분석가</h3>
                  <p>진로 탐색부터 네트워크까지 8개 영역의 실행을 하나의 IAP로 관리합니다.</p>
                  <div className="goal-number">41<span>% 전체 진척도</span></div>
                </article>
                <div className="goal-plan">
                  <div className="goal-plan-columns">
                    <section className="goal-plan-column" style={{ '--plan-color': 'var(--goal-1)', '--plan-soft': 'var(--goal-1-soft)' } as React.CSSProperties}>
                      <div className="goal-plan-head"><span className="goal-plan-head-icon"><svg className="icon">
                            <use href="#i-calendar" /></svg></span>
                        <div className="goal-plan-head-copy"><b>IAP 실행</b><span>개인별 진로계획에 따른 실행 활동</span></div>
                      </div>
                      <div className="goal-task-list">
                        <button className="goal-task is-complete" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-layout" /></svg></span><span className="goal-task-copy"><b>창대한 멘토단 트랙(9월)
                              </b></span><span className="goal-task-status">완료</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-spark" /></svg></span><span className="goal-task-copy"><b>CWNU 커리어 골든타임 1:1 개별상담
                              </b></span><span className="goal-task-status">진행
                            중</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-scan" /></svg></span><span className="goal-task-copy"><b>비교과 프로그램 3회 수료
                              실습</b></span><span className="goal-task-status planned">예정</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-user" /></svg></span><span className="goal-task-copy"><b>2026년 직무 부트캠프 
                              특강</b></span><span className="goal-task-status planned">예정</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                      </div>
                    </section>
                    <section className="goal-plan-column" style={{ '--plan-color': 'var(--goal-2)', '--plan-soft': 'var(--goal-2-soft)' } as React.CSSProperties}>
                      <div className="goal-plan-head"><span className="goal-plan-head-icon"><svg className="icon">
                            <use href="#i-layout" /></svg></span>
                        <div className="goal-plan-head-copy"><b>핵심역량 수행</b><span>전공 기반 핵심역량 강화 활동</span></div>
                      </div>
                      <div className="goal-task-list">
                        <button className="goal-task is-complete" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-layout" /></svg></span><span className="goal-task-copy"><b>데이터베이스 개론</b></span><span className="goal-task-status">완료</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-route" /></svg></span><span className="goal-task-copy"><b>자료구조</b></span><span className="goal-task-status">진행 중</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-scan" /></svg></span><span className="goal-task-copy"><b>운영체제</b></span><span className="goal-task-status">진행 중</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-target" /></svg></span><span className="goal-task-copy"><b>선형대수</b></span><span className="goal-task-status planned">예정</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                      </div>
                    </section>
                    <section className="goal-plan-column" style={{ '--plan-color': 'var(--goal-3)', '--plan-soft': 'var(--goal-3-soft)' } as React.CSSProperties}>
                      <div className="goal-plan-head"><span className="goal-plan-head-icon"><svg className="icon">
                            <use href="#i-target" /></svg></span>
                        <div className="goal-plan-head-copy"><b>내 성장 활동</b><span>자격증·공모전·어학·프로젝트 활동</span></div>
                      </div>
                      <div className="goal-task-list">
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-spark" /></svg></span><span className="goal-task-copy"><b>IT 공모전 참여</b></span><span className="goal-task-status">진행 중</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-check" /></svg></span><span className="goal-task-copy"><b>SQLD 자격증</b></span><span className="goal-task-status">진행 중</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-scan" /></svg></span><span className="goal-task-copy"><b>TOEIC 800+
                              달성</b></span><span className="goal-task-status">진행 중</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                        <button className="goal-task" type="button"><span className="goal-task-icon"><svg className="icon">
                              <use href="#i-briefcase" /></svg></span><span className="goal-task-copy"><b>개인
                              프로젝트</b></span><span className="goal-task-status planned">예정</span><svg className="icon">
                            <use href="#i-arrow" /></svg></button>
                      </div>
                    </section>
                  </div>
                  <aside className="goal-coach"><span className="goal-coach-icon"><svg className="icon">
                        <use href="#i-spark" /></svg></span>
                    <div className="goal-coach-copy"><b>AI 코치의 한마디</b>
                      <p>IAP 실행·핵심역량 수행·내 성장 활동을 균형 있게 진행하고 있어요. 다음 단계 진입을 위해 진행 중인 과제 2개를 먼저 완료해 보세요.</p>
                    </div>
                    <div className="goal-coach-actions"><button className="button" type="button">지도교수
                        상담</button><button className="button" type="button">로드맵 다시 보기</button>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          <section data-slot="card" className="todo-card reveal" id="todo">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">이번 주 할 일</h2>
                <p data-slot="card-description">마감이 가까운 순서입니다.</p>
              </div>
              <div data-slot="card-action"><span className="badge coral">4개 남음</span></div>
            </div>
            <div data-slot="card-content">
              <div className="row-list"><label className="list-item"><input className="checkbox" type="checkbox" defaultChecked={false} /><span className="item-copy"><b>역량 갭 1개 추가 등록</b><span>IAP 승인 조건 · 현재 2/3개</span></span><span className="badge coral">D-3</span></label><label className="list-item"><input className="checkbox" type="checkbox" defaultChecked={false} /><span className="item-copy"><b>상담 예약 — 직무기초역량 진단·설계</b><span>담당 이수진 상담사 ·
                      50분</span></span><span className="badge amber">D-6</span></label><label className="list-item"><input className="checkbox" type="checkbox" defaultChecked={false} /><span className="item-copy"><b>SQL 실무 과정 수강 신청</b><span>9월 2일 개강 · 정원
                      30명</span></span><span className="badge">D-12</span></label><label className="list-item"><input className="checkbox" type="checkbox" defaultChecked={false} /><span className="item-copy"><b>현장실습 사전 교육 이수</b><span>실습 신청 전
                      필수</span></span><span className="badge">D-20</span></label></div>
            </div>
          </section>

          <section data-slot="card" className="recommend-card ai-recommend-card reveal" id="recommend">
            <div data-slot="card-content"><span className="ai-recommend-icon"><svg className="icon">
                  <use href="#i-spark" /></svg></span>
              <h3>나를 위한 AI추천</h3>
              <p>목표 직무와 현재 역량을 분석해 지금 우선하면 좋은 활동을 골랐습니다.</p>
              <div className="ai-recommend-list">
                <div className="ai-recommend-item" style={{ '--recommend-color': 'var(--recommend-1)', '--recommend-soft': 'var(--recommend-1-soft)' } as React.CSSProperties}><span>01</span><span className="ai-recommend-copy"><b>데이터 분석 실무 부트캠프</b><small>직무전문성 갭을 우선 보완해요.</small></span><strong>추천
                    96%</strong></div>
                <div className="ai-recommend-item" style={{ '--recommend-color': 'var(--recommend-2)', '--recommend-soft': 'var(--recommend-2-soft)' } as React.CSSProperties}>
                  <span>02</span><span className="ai-recommend-copy"><b>현직 데이터 분석가 멘토링</b><small>진로 수행회피목표를 행동으로
                      전환해요.</small></span><strong>추천 91%</strong></div>
              </div>
              <button className="button primary" type="button">추천 전체 보기<svg className="icon">
                  <use href="#i-arrow" /></svg></button>
            </div>
          </section>

          <section data-slot="card" className="counseling-card reveal" id="counseling-status">
            <div data-slot="card-header">
              <div>
                <h2 data-slot="card-title">상담 현황</h2>
                <p data-slot="card-description">이번 학기 상담 유형별 진행 상황과 최근 기록을 확인합니다.</p>
              </div>
              <div data-slot="card-action"><button className="button" type="button">전체 내역 보기<svg className="icon">
                    <use href="#i-arrow" /></svg></button></div>
            </div>
            <div data-slot="card-content">
              <div className="counseling-detail-grid">
                <article className="counseling-detail-column" style={{ '--counsel-color': 'var(--counsel-1)', '--counsel-soft': 'var(--counsel-1-soft)' } as React.CSSProperties}>
                  <div className="counseling-detail-head"><span className="counseling-detail-icon"><svg className="icon">
                        <use href="#i-message" /></svg></span><span className="counseling-detail-copy"><span className="counseling-detail-title">진로취업</span><span>직무·취업 준비 상담</span></span><strong className="counseling-detail-total">3건</strong></div>
                  <div className="counseling-detail-summary">완료 2 · 예정 1</div>
                  <div className="counseling-record-list">
                    <div className="counseling-record"><span><span className="counseling-record-title">직무기초역량 진단·설계</span><small>09.04 · 이수진 상담사</small></span><span className="badge">예정</span></div>
                    <div className="counseling-record"><span><span className="counseling-record-title">목표 직무 구체화</span><small>08.18 · 이수진 상담사</small></span><span className="badge">완료</span></div>
                  </div>
                </article>
                <article className="counseling-detail-column" style={{ '--counsel-color': 'var(--counsel-2)', '--counsel-soft': 'var(--counsel-2-soft)' } as React.CSSProperties}>
                  <div className="counseling-detail-head"><span className="counseling-detail-icon"><svg className="icon">
                        <use href="#i-scan" /></svg></span><span className="counseling-detail-copy"><span className="counseling-detail-title">심리검사</span><span>검사 해석·정서 상담</span></span><strong className="counseling-detail-total">1건</strong></div>
                  <div className="counseling-detail-summary">완료 1</div>
                  <div className="counseling-record-list">
                    <div className="counseling-record"><span><span className="counseling-record-title">직업흥미검사 해석 상담</span><small>08.12 · 박서연 상담사</small></span><span className="badge">완료</span></div>
                    <div className="counseling-record"><span><span className="counseling-record-title">추가 상담</span><small>필요 시 예약할 수 있어요</small></span><span className="badge">예약 가능</span></div>
                  </div>
                </article>
                <article className="counseling-detail-column" style={{ '--counsel-color': 'var(--counsel-3)', '--counsel-soft': 'var(--counsel-3-soft)' } as React.CSSProperties}>
                  <div className="counseling-detail-head"><span className="counseling-detail-icon"><svg className="icon">
                        <use href="#i-user" /></svg></span><span className="counseling-detail-copy"><span className="counseling-detail-title">지도교수</span><span>학업·진로 방향 상담</span></span><strong className="counseling-detail-total">1건</strong></div>
                  <div className="counseling-detail-summary">예정 1</div>
                  <div className="counseling-record-list">
                    <div className="counseling-record"><span><span className="counseling-record-title">2학기 진로계획 점검</span><small>09.10 · 김창원 교수</small></span><span className="badge">예정</span></div>
                    <div className="counseling-record"><span><span className="counseling-record-title">상담 전 준비</span><small>IAP 실행 내역을 확인해 주세요</small></span><span className="badge">준비 중</span></div>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>
    </div>
  )
}
