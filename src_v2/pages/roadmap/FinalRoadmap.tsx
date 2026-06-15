import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './FinalRoadmap.css'

/* ============================================================
   AI가 두 페이지(직무 로드맵 + 진로 로드맵) 데이터를 종합해
   "지금부터 졸업까지 무엇을 어떻게 할지" 처방하는 실행 로드맵
   ============================================================ */

type Priority = 'P0' | 'P1' | 'P2'

interface ActionItem {
  id: string
  priority: Priority
  title: string
  why: string                 // 왜 해야 하는가 (영향)
  effort: string              // 예상 소요
  due: string                 // 데드라인
  impactLabel: string         // 매칭률 영향 (예: "+5%")
  linkLabel: string           // 페이지 이동 라벨
  linkPath: string
}

interface QuarterPlan {
  q: string            // "2026 Q1"
  period: string       // "2026.03 ~ 05"
  semester: string     // "2026-1학기"
  focus: string
  milestones: string[]
  expectedMatch: number  // 학기 종료 시 예상 매칭률
}

interface MatrixCell {
  label: string
  items: { title: string; meta: string }[]
}

/* ─── 학생 진단 요약 (직무 로드맵 + 진로 로드맵 데이터 종합) ─── */
const STUDENT = {
  name: '김민지',
  major: '소프트웨어공학과 4학년',
  semester: '2025-2학기',
  graduation: '2027.08',
  matchNow: 68,
  matchGoal: 90,
  topFitJob: { name: '풀스택 개발자', fit: 81 },     // 직무 로드맵 최고 적합도
  studentGoal: { company: '넥슨코리아', role: 'IT PM' }, // 진로 로드맵 학생 설정 목표
}

/* ─── AI 핵심 진단 ─────────────────────────────────────────── */
const INSIGHTS = [
  {
    tag: '🎯 핵심 갭',
    title: '추천 직무와 목표 직무가 일치하지 않습니다',
    desc: `현재 역량으로 가장 잘 맞는 직무는 풀스택 개발자(적합도 81%)이지만, 학생이 설정한 목표는 IT PM(매칭률 68%)입니다.
            두 직무는 요구 역량이 30% 정도 다르기 때문에, 둘 중 한 방향을 우선 선택하는 것이 졸업까지 가장 효과적입니다.`,
  },
  {
    tag: '🔥 가장 시급한 보강',
    title: '프로젝트 경험 0건 — 첫 번째로 해결해야 합니다',
    desc: `IT PM·풀스택 둘 다 프로젝트 포트폴리오를 필수로 봅니다. 현재 0건이라 합격 가능성이 30% 가량 낮아져 있습니다.
            비교과 프로그램 또는 캡스톤디자인으로 이번 학기 안에 1건은 반드시 시작해야 합니다.`,
  },
  {
    tag: '⏳ 시간 가용성',
    title: '졸업까지 21개월 — 5학기 내 모든 보강 가능',
    desc: `현재 시점(2025.11)에서 졸업(2027.08)까지 약 21개월입니다.
            TOEIC 150점 향상 + 자격증 2개 + 인턴 1회 + 프로젝트 2건 모두 시간 내 달성 가능한 분량입니다. 다만 첫 학기 출발이 가장 중요합니다.`,
  },
]

/* ─── 두 갈래 시나리오 ─────────────────────────────────────── */
const SCENARIOS = [
  {
    id: 'A',
    badge: 'A안 · 추천',
    title: '현재 역량을 살린 풀스택 개발자 경로',
    fit: 81,
    pros: [
      '현재 역량의 88%가 이미 일치 — 가장 자연스러운 길',
      '추가 보강이 6개월 더 짧음',
      '취업 시장 수요가 IT PM보다 2배 많음',
    ],
    cons: ['학생이 처음 설정한 IT PM 목표를 변경해야 함'],
    targets: ['네이버', '카카오', '토스', '우아한형제들', 'IT 스타트업'],
  },
  {
    id: 'B',
    badge: 'B안 · 학생 설정 목표',
    title: '목표 그대로 IT PM 경로 유지',
    fit: 68,
    pros: [
      '학생의 진로 목표(넥슨 IT PM)와 일치',
      '게임 산업 도메인 지식이 강점이 될 수 있음',
    ],
    cons: [
      'PMP·CAPM 자격증 추가 학습 필요 (+6개월)',
      'TOEIC 700+ 필수 (현재 550)',
      '코딩 깊이보다 커뮤니케이션·기획 역량 추가 보강 필요',
    ],
    targets: ['넥슨코리아', '삼성DS', 'LG전자', '카카오게임즈', '엔씨소프트'],
  },
]

/* ─── 이번 주 액션 (THIS WEEK · P0 위주) ──────────────────── */
const THIS_WEEK: ActionItem[] = [
  {
    id: 'a1',
    priority: 'P0',
    title: "비교과 프로그램 'AI 데이터 분석 캠프' 신청",
    why: '프로젝트 경험 0건 → 1건으로 만드는 가장 빠른 경로. 마감까지 3일 남음.',
    effort: '신청 10분',
    due: 'D-3',
    impactLabel: '매칭률 +4%',
    linkLabel: '신청하러 가기',
    linkPath: '/growth/program',
  },
  {
    id: 'a2',
    priority: 'P0',
    title: 'TOEIC 학습 일정 등록 (인강 또는 학원)',
    why: 'TOEIC 550 → 700 목표. 일정 등록을 미루면 졸업까지 시간이 빠듯해집니다.',
    effort: '의사결정 30분 + 결제',
    due: '이번 주말',
    impactLabel: '매칭률 +6% (목표 달성 시)',
    linkLabel: '일일미션에서 시작',
    linkPath: '/growth/mission',
  },
  {
    id: 'a3',
    priority: 'P1',
    title: '정보처리기사 2026-1회 시험 신청 (필기)',
    why: '자격증 보강 2개 중 첫 번째. 시험 일정에 맞춰 지금부터 준비해야 합니다.',
    effort: '온라인 신청 20분',
    due: 'D-10',
    impactLabel: '매칭률 +3%',
    linkLabel: '진단 결과 다시 보기',
    linkPath: '/diagnosis/result',
  },
  {
    id: 'a4',
    priority: 'P1',
    title: 'A·B 시나리오 중 1차 의사결정',
    why: '핵심 갭 — 어느 직무 방향으로 갈지 결정하지 않으면 매주 시간이 분산됩니다. 지도교수 상담 1회 권장.',
    effort: '상담 신청 + 30분 면담',
    due: '이번 주 내',
    impactLabel: '전체 로드맵 정렬',
    linkLabel: '지도교수 상담 신청',
    linkPath: '/counsel/professor',
  },
]

/* ─── 학기별 4분기 로드맵 ─────────────────────────────────── */
const QUARTERS: QuarterPlan[] = [
  {
    q: '2025 Q4',
    period: '2025.11 ~ 2026.02',
    semester: '2025-2학기 + 겨울방학',
    focus: '준비 시즌 — 시작이 가장 중요한 학기',
    milestones: [
      '비교과 프로그램 1건 시작 (프로젝트 #1 시드)',
      'TOEIC 학습 시작 → 1차 모의고사 600점',
      '정보처리기사 필기 합격',
      '운영체제 과목 수강 + B+ 이상',
    ],
    expectedMatch: 74,
  },
  {
    q: '2026 Q1',
    period: '2026.03 ~ 05',
    semester: '2026-1학기',
    focus: '핵심 보강 — 프로젝트와 어학 동시 진행',
    milestones: [
      '캡스톤디자인 등록 → 프로젝트 #2 착수',
      'TOEIC 정식 응시 → 700점 달성',
      '정보처리기사 실기 합격',
      '여름 인턴 지원 시즌 진입 (5월부터)',
    ],
    expectedMatch: 81,
  },
  {
    q: '2026 Q2',
    period: '2026.06 ~ 08',
    semester: '여름방학',
    focus: '실무 경험 — 인턴 또는 외부 프로젝트',
    milestones: [
      'IT 인턴 8주 이상 참여',
      '프로젝트 #1 완료 → 포트폴리오 등재',
      '데이터분석·네트워크 보강 학습',
    ],
    expectedMatch: 86,
  },
  {
    q: '2026 Q3',
    period: '2026.09 ~ 2027.02',
    semester: '2026-2학기 + 겨울방학',
    focus: '취업 사전 준비 — 자소서·포트폴리오 완성',
    milestones: [
      '프로젝트 #2 완료 → 포트폴리오 2건 확보',
      'AI 자소서 3개 회사 버전 완성 (넥슨/네이버/카카오)',
      '리눅스마스터 또는 PMP/CAPM 중 택1 취득',
      '모의 면접 5회 이상',
    ],
    expectedMatch: 90,
  },
  {
    q: '2027 Q1',
    period: '2027.03 ~ 08',
    semester: '2027-1학기',
    focus: '취업 시즌 — 실제 지원과 면접',
    milestones: [
      '상반기 공채 3개 이상 지원',
      '서류 → 코딩테스트 → 면접 라운드 통과',
      '복수 합격 후 최종 선택 → 졸업 (8월)',
    ],
    expectedMatch: 92,
  },
]

/* ─── 우선순위 매트릭스 ─────────────────────────────────── */
const MATRIX: MatrixCell[] = [
  {
    label: '높은 영향 · 긴급',
    items: [
      { title: '비교과 프로그램', meta: '프로젝트 #1 · 이번 주' },
      { title: 'TOEIC 학습 시작', meta: '6개월 안에 700' },
      { title: '시나리오 의사결정', meta: '로드맵 정렬' },
    ],
  },
  {
    label: '높은 영향 · 여유',
    items: [
      { title: '캡스톤디자인', meta: '2026-1 학기' },
      { title: 'IT 인턴', meta: '2026 여름' },
      { title: 'PMP/CAPM (B안 선택 시)', meta: '2026-2 학기' },
    ],
  },
  {
    label: '낮은 영향 · 긴급',
    items: [
      { title: '운영체제 수강', meta: '이번 학기 수강신청' },
      { title: '한국사 1급 갱신', meta: '유효 기간 확인' },
    ],
  },
  {
    label: '낮은 영향 · 여유',
    items: [
      { title: '빅데이터 보강', meta: 'A안에서 우선순위 낮음' },
      { title: '제2외국어', meta: '여력이 남으면' },
    ],
  },
]

/* ─── Priority pill 라벨 ──────────────────────────────────── */
const PRI_META: Record<Priority, { label: string; cls: string }> = {
  P0: { label: 'P0 · 긴급', cls: 'fr-pri-p0' },
  P1: { label: 'P1 · 중요', cls: 'fr-pri-p1' },
  P2: { label: 'P2 · 일반', cls: 'fr-pri-p2' },
}

/* ============================================================
   Component
   ============================================================ */
export default function FinalRoadmap() {
  const navigate = useNavigate()
  const [chosenScenario, setChosenScenario] = useState<'A' | 'B'>('A')

  return (
    <div className="fr-wrap">
      <div className="fr-breadcrumb">
        <span>진로취업 로드맵</span>
        <i className="fa-solid fa-chevron-right" />
        <span className="active">최종 로드맵</span>
      </div>

      {/* ─── Hero — Now vs Goal ───────────────────────────────── */}
      <section className="fr-hero">
        <div className="fr-hero-text">
          <p className="fr-eyebrow">AI FINAL CAREER ROADMAP</p>
          <h1>{STUDENT.name} 학생, 졸업까지의 실행 계획입니다.</h1>
          <p className="fr-hero-sub">
            직무 로드맵의 역량 데이터와 진로 로드맵의 목표 데이터를 종합해,
            <strong> 지금부터 졸업까지 무엇을 언제까지 해야 하는지</strong>를 우선순위로 정리했습니다.
          </p>
        </div>
        <div className="fr-hero-stats">
          <div className="fr-stat">
            <span>현재 매칭률</span>
            <strong className="fr-stat-now">{STUDENT.matchNow}<small>%</small></strong>
          </div>
          <i className="fa-solid fa-arrow-right fr-stat-arrow" />
          <div className="fr-stat">
            <span>졸업 시 예상</span>
            <strong className="fr-stat-goal">{STUDENT.matchGoal}<small>%</small></strong>
          </div>
        </div>
      </section>

      {/* ─── 01 AI 핵심 진단 ─────────────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">01</span>
          <div>
            <h2>AI 핵심 진단</h2>
            <p>두 로드맵 데이터를 종합한 3가지 핵심 발견</p>
          </div>
        </header>
        <div className="fr-insight-grid">
          {INSIGHTS.map(ins => (
            <article key={ins.title} className="fr-insight-card">
              <span className="fr-insight-tag">{ins.tag}</span>
              <h3>{ins.title}</h3>
              <p>{ins.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 02 시나리오 선택 ───────────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">02</span>
          <div>
            <h2>1차 의사결정 — 어느 직무로 갈까?</h2>
            <p>두 시나리오 중 하나를 정해야 이후 모든 액션이 정렬됩니다. 이번 주 안에 결정 권장.</p>
          </div>
        </header>
        <div className="fr-scenario-grid">
          {SCENARIOS.map(sc => {
            const isSelected = chosenScenario === sc.id
            return (
              <article
                key={sc.id}
                className={`fr-scenario-card${isSelected ? ' selected' : ''}`}
                onClick={() => setChosenScenario(sc.id as 'A' | 'B')}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') setChosenScenario(sc.id as 'A' | 'B') }}
              >
                <div className="fr-scenario-head">
                  <span className={`fr-scenario-badge ${sc.id === 'A' ? 'rec' : 'goal'}`}>{sc.badge}</span>
                  <span className="fr-scenario-fit">{sc.fit}%<small> 적합도</small></span>
                </div>
                <h3>{sc.title}</h3>

                <p className="fr-scenario-label">장점</p>
                <ul className="fr-scenario-list">
                  {sc.pros.map(p => <li key={p}><i className="fa-solid fa-check" />{p}</li>)}
                </ul>

                <p className="fr-scenario-label">단점 / 추가 필요</p>
                <ul className="fr-scenario-list cons">
                  {sc.cons.map(c => <li key={c}><i className="fa-solid fa-xmark" />{c}</li>)}
                </ul>

                <div className="fr-scenario-targets">
                  {sc.targets.map(t => <span key={t}>{t}</span>)}
                </div>

                <div className="fr-scenario-foot">
                  {isSelected
                    ? <span className="fr-scenario-chosen"><i className="fa-solid fa-circle-check" /> 이 시나리오 선택됨</span>
                    : <span className="fr-scenario-pick">클릭해서 선택</span>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* ─── 03 이번 주 액션 ────────────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">03</span>
          <div>
            <h2>이번 주 액션</h2>
            <p>오늘부터 7일 안에 끝낼 일. P0는 미루면 전체 로드맵이 밀립니다.</p>
          </div>
        </header>
        <div className="fr-action-grid">
          {THIS_WEEK.map(a => (
            <article key={a.id} className="fr-action-card">
              <div className="fr-action-top">
                <span className={`fr-pri ${PRI_META[a.priority].cls}`}>{PRI_META[a.priority].label}</span>
                <span className="fr-action-due"><i className="fa-regular fa-clock" /> {a.due}</span>
              </div>
              <h3>{a.title}</h3>
              <p className="fr-action-why">{a.why}</p>
              <div className="fr-action-meta">
                <span><i className="fa-regular fa-hourglass-half" /> {a.effort}</span>
                <span className="fr-action-impact"><i className="fa-solid fa-arrow-trend-up" /> {a.impactLabel}</span>
              </div>
              <button className="fr-action-btn" onClick={() => navigate(a.linkPath)}>
                {a.linkLabel} <i className="fa-solid fa-arrow-right" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 04 학기별 분기 로드맵 (Timeline) ──────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">04</span>
          <div>
            <h2>졸업까지 — 분기별 로드맵</h2>
            <p>매 분기 종료 시점의 예상 매칭률을 기준으로 마일스톤을 배치했습니다.</p>
          </div>
        </header>
        <div className="fr-timeline">
          {QUARTERS.map((q, idx) => (
            <article key={q.q} className={`fr-tl-card${idx === 0 ? ' current' : ''}`}>
              <div className="fr-tl-mark">
                <span className="fr-tl-q">{q.q}</span>
                <span className="fr-tl-period">{q.period}</span>
              </div>
              <div className="fr-tl-body">
                <div className="fr-tl-head">
                  <strong>{q.semester}</strong>
                  <span className="fr-tl-match">예상 매칭률 {q.expectedMatch}%</span>
                </div>
                <p className="fr-tl-focus">{q.focus}</p>
                <ul className="fr-tl-list">
                  {q.milestones.map(m => (
                    <li key={m}><i className="fa-solid fa-flag" />{m}</li>
                  ))}
                </ul>
                <div className="fr-tl-bar">
                  <div className="fr-tl-bar-fill" style={{ width: `${q.expectedMatch}%` }} />
                  <span>{q.expectedMatch}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── 05 우선순위 매트릭스 ─────────────────────────── */}
      <section className="fr-section">
        <header className="fr-sec-head">
          <span className="fr-sec-num">05</span>
          <div>
            <h2>우선순위 매트릭스</h2>
            <p>같은 시간을 써도 결과가 다릅니다. 좌상단부터 시작하세요.</p>
          </div>
        </header>
        <div className="fr-matrix">
          {MATRIX.map((cell, idx) => (
            <div key={cell.label} className={`fr-mx-cell fr-mx-${idx}`}>
              <span className="fr-mx-label">{cell.label}</span>
              <ul>
                {cell.items.map(it => (
                  <li key={it.title}>
                    <strong>{it.title}</strong>
                    <small>{it.meta}</small>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 06 AI 코치 메시지 ────────────────────────────── */}
      <section className="fr-section fr-coach">
        <i className="fa-solid fa-robot fr-coach-icon" />
        <div>
          <h2>AI 코치의 한마디</h2>
          <p>
            <strong>{STUDENT.name} 학생</strong>, 학업 역량과 핵심 개발 스킬은 이미 상위권입니다.
            지금 가장 중요한 결정은 <strong>"풀스택 vs IT PM" 시나리오 선택</strong>이고,
            가장 시급한 행동은 <strong>이번 주 안에 비교과 프로그램 1건을 시작</strong>하는 것입니다.
            첫 3주 안의 출발이 잘되면, 졸업 시점 매칭률 90%는 충분히 도달 가능한 목표입니다.
            지도교수 상담을 먼저 받고 시나리오를 확정한 뒤 위 액션을 순서대로 실행하세요.
          </p>
          <div className="fr-coach-actions">
            <button className="fr-coach-btn primary" onClick={() => navigate('/counsel/professor')}>
              <i className="fa-solid fa-user-tie" /> 지도교수 상담 신청
            </button>
            <button className="fr-coach-btn" onClick={() => navigate('/roadmap/ai')}>
              <i className="fa-solid fa-route" /> 진로 로드맵 다시 보기
            </button>
            <button className="fr-coach-btn" onClick={() => navigate('/roadmap/skill-tree')}>
              <i className="fa-solid fa-sitemap" /> 직무 로드맵 다시 보기
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
