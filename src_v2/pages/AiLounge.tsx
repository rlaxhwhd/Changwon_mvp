import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import './AiLounge.css'

// ── Mock Data ──────────────────────────────────────────────────────
const userStats = [
  { icon: 'fa-solid fa-clipboard-check', label: '진단 결과',  value: '85',   unit: '점' },
  { icon: 'fa-solid fa-chart-line',       label: '역량 분석',  value: '72',   unit: '점' },
  { icon: 'fa-solid fa-graduation-cap',   label: '학점 분석',  value: '3.68', unit: '/ 4.5' },
  { icon: 'fa-solid fa-id-card',          label: '자격증',     value: '2',    unit: '개' },
  { icon: 'fa-solid fa-comments',         label: '상담 내역',  value: '3',    unit: '회' },
  { icon: 'fa-solid fa-book-open',         label: '성장경험일지', value: '12',   unit: '건' },
  { icon: 'fa-solid fa-clipboard-list',    label: '비교과프로그램 신청', value: '5', unit: '건' },
]

const radarAxes = [
  { label: '전문 역량', user: 88, target: 90 },
  { label: '실무 역량', user: 78, target: 90 },
  { label: '실행 역량', user: 76, target: 90 },
  { label: '성장 역량', user: 65, target: 90 },
  { label: '인성 역량', user: 82, target: 90 },
  { label: '취업 역량', user: 70, target: 90 },
]

const competencyBars = [
  { label: '전문 역량', value: 88 },
  { label: '실무 역량', value: 78 },
  { label: '실행 역량', value: 76 },
  { label: '인성 역량', value: 82 },
  { label: '취업 역량', value: 70 },
  { label: '성장 역량', value: 65 },
]

const nextActions = [
  { num: 1, text: 'TOEIC 응시 ~ 목표 700+ (어학 미등록)',           color: '#EF4444' },
  { num: 2, text: 'PMP 기초 자격증 취득 준비 (PM역량 +15점)',        color: '#F59E0B' },
  { num: 3, text: '캡스톤 디자인 프로젝트 등록 (프로젝트 경험 보강)', color: '#2E5BFF' },
  { num: 4, text: 'AI 로드맵 확인 및 다음 단계 계획',                 color: '#2E5BFF' },
]

const quickLinks = [
  { icon: 'fa-solid fa-route',    label: 'AI 로드맵',  path: '/roadmap/ai',        iconColor: '#6B7280', bg: '#F3F4F6' },
  { icon: 'fa-solid fa-folder',   label: '프로그램 신청', path: '/growth/program', iconColor: '#2E5BFF', bg: '#EEF2FF' },
  { icon: 'fa-solid fa-briefcase',label: '경력관리',   path: '/growth/journal',    iconColor: '#2E5BFF', bg: '#EEF2FF' },
  { icon: 'fa-solid fa-id-badge', label: '포트폴리오', path: '/mypage/portfolio',  iconColor: '#2E5BFF', bg: '#EEF2FF' },
]

interface CounselPair {
  type: string
  date: string
  question: string
  aiAdvice: string
  typeColor: string
}

const counselPairs: CounselPair[] = [
  {
    type: '진로/취업 상담',
    date: '2025.04.10 · 김미래 상담사',
    question: '"학과와 맞는 것 같아서 진로에 대한 고민이 드는 중"',
    aiAdvice: '진로 적합성에 대한 고민은 매우 자연스러운 탐색 과정입니다. 강점 영역(정보활용·문제해결)에 부합하는 데이터·기획 직무를 우선 탐색해 보시는 것을 권장드려요.',
    typeColor: '#F59E0B',
  },
  {
    type: '심리 상담',
    date: '2025.04.12 · 박지은 상담사',
    question: '"최근 이별로 인 상태로 학업과 진로에 집중을 하지 못하는 모습"',
    aiAdvice: '힘든 시기를 보내고 계시군요. 감정이 흔들릴 때 학업에 집중하기 어려운 것은 당연해요. 하루 10분 마음챙김 명상과 가벼운 운동 루틴으로 정서 안정을 되찾는 것을 추천드립니다.',
    typeColor: '#8B5CF6',
  },
  {
    type: '교수 상담',
    date: '2025.04.18 · 박지훈 교수',
    question: '"전공 진로 방향과 대학원 진학 가능성에 대해 함께 논의"',
    aiAdvice: '대학원 진학을 고려한다면 학점 관리와 더불어 GRE/TOEFL 일정 확보, 연구실 인턴 참여, 교수 추천서를 위한 관계 형성을 6개월 단위 로드맵으로 준비하시는 것이 좋습니다.',
    typeColor: '#10B981',
  },
  {
    type: '진로/취업 상담',
    date: '2025.04.25 · 정유진 상담사',
    question: '"AI 기업 채용 트렌드와 포트폴리오 구성 전략을 안내"',
    aiAdvice: 'GitHub 정리와 캡스톤 프로젝트 회고록 작성, 그리고 1개 이상의 사이드 프로젝트 배포 경험으로 포트폴리오 완성도를 끌어올리세요. AI 기업은 "실제 배포 + 회고" 조합을 가장 높게 평가합니다.',
    typeColor: '#F59E0B',
  },
]

interface RoadmapPhase {
  num: number
  period: string
  title: string
  color: string
  actions: string[]
}

const roadmapPhases: RoadmapPhase[] = [
  {
    num: 1,
    period: '이번 달 · 0~4주차',
    title: '가장 큰 격차부터 좁히기 — 글로벌 역량 + 영단어 고득점',
    color: '#EF4444',
    actions: [
      '매일 미션에 고득점 단어 10개 + 난해 단어 5개 우선 배치 (TOEIC 800+ 목표)',
      '주 2회 LC/RC 실전 모의고사로 체득 여부 확인',
      '글로벌 PBL / 국제 교류 프로그램 1개 신청 (9CORE 글로벌 35점 → 50점)',
      '면접 기초 강의 1개 수강 (대인관계·리더십 65점대 보강)',
    ],
  },
  {
    num: 2,
    period: '다음 2개월 · 5~12주차',
    title: '실무 역량 + 포트폴리오의 "결과물" 만들기',
    color: '#F59E0B',
    actions: [
      '캡스톤 디자인 / 학과 팀 프로젝트 1건 등록 → 실무 경험 +1',
      'GitHub 정리 + 회고록 있는 사이드 프로젝트 1개 배포',
      'PMP 기초 / 정보처리기사 중 1개 자격증 학습 시작',
      '비교과 "AI 활용 자소서 특강" 신청해 자소서 1차 초안 완성',
    ],
  },
  {
    num: 3,
    period: '다음 학기 · 13~24주차',
    title: '대학원·취업 트랙 분기 — 선택지를 좁히기',
    color: '#2E5BFF',
    actions: [
      '대학원 트랙: GRE / TOEFL 일정 확보, 연구실 인턴 신청, 교수 추천서 관계 형성',
      '취업 트랙: AI / 데이터 기업 채용 공고 10개 분석 + 자소서 최종 작성',
      '면접 / 자소서 AI 컨설팅 신청 → 1:1 피드백 사이클 진입',
      '본인 강점(전공·문제해결) 기반 직무 우선순위 Top 3 확정',
    ],
  },
]

// ── Radar Chart (SVG) ──────────────────────────────────────────────
const CX = 150, CY = 150, R = 80

function getRadarPoint(i: number, r: number) {
  const angle = (i * 60 - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function toPolygon(values: number[]) {
  return values.map((v, i) => {
    const p = getRadarPoint(i, (v / 100) * R)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')
}

function RadarChart() {
  const userPoly   = toPolygon(radarAxes.map(a => a.user))
  const targetPoly = toPolygon(radarAxes.map(a => a.target))

  return (
    <svg viewBox="0 0 300 300" width="100%" height="220" style={{ overflow: 'visible' }}>
      {/* Grid hexagons */}
      {[25, 50, 75, 100].map(pct => (
        <polygon
          key={pct}
          points={Array.from({ length: 6 }, (_, i) => {
            const p = getRadarPoint(i, (pct / 100) * R)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
          fill="none"
          stroke="#E8ECF0"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getRadarPoint(i, R)
        return <line key={i} x1={CX} y1={CY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#E8ECF0" strokeWidth="1" />
      })}

      {/* Target polygon */}
      <polygon points={targetPoly} fill="rgba(46,91,255,0.05)" stroke="#2E5BFF" strokeWidth="1.5" strokeDasharray="5 3" />

      {/* User polygon */}
      <polygon points={userPoly} fill="rgba(46,91,255,0.18)" stroke="#2E5BFF" strokeWidth="2" />

      {/* User dots */}
      {radarAxes.map((a, i) => {
        const p = getRadarPoint(i, (a.user / 100) * R)
        return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill="#2E5BFF" />
      })}

      {/* Labels */}
      {radarAxes.map((a, i) => {
        const p = getRadarPoint(i, R + 22)
        const anchor = i === 0 || i === 3 ? 'middle' : i === 1 || i === 2 ? 'start' : 'end'
        return (
          <text key={i} x={p.x.toFixed(1)} y={p.y.toFixed(1)}
            textAnchor={anchor} dominantBaseline="middle"
            fontSize="11" fill="#637381" fontFamily="Pretendard, sans-serif">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

// 점수 구간별 색상: 0~40 빨강 / 41~70 초록 / 71~100 파랑
const scoreBandColor = (s: number) => (s >= 71 ? '#2E5BFF' : s >= 41 ? '#22C55E' : '#EF4444')

// ── Mini Ring (각 검사 점수) ───────────────────────────────────────
function MiniRing({ value, color }: { value: number; color: string }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const filled = (value / 100) * circ
  return (
    <svg viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#EEF2F7" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled.toFixed(1)} ${circ.toFixed(1)}`}
        strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle" fontSize="22" fontWeight="900" fill={color} fontFamily="Pretendard, sans-serif">
        {value}
      </text>
    </svg>
  )
}

// ── Modal Radar (가변 축) ──────────────────────────────────────────
function ModalRadar({ axes }: { axes: { label: string; value: number }[] }) {
  const size = 320
  const cx = size / 2
  const cy = size / 2
  const r = 100
  const n = axes.length

  const pt = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) }
  }
  const grids = [0.25, 0.5, 0.75, 1.0]
  const pts = axes.map((a, i) => pt(i, a.value / 100))
  const dataPath = pts.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 340 }}>
      <defs>
        <linearGradient id="al-modal-radar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7B6EFF" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#4A90FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {grids.map((lv, li) => (
        <polygon key={li}
          points={axes.map((_, i) => { const p = pt(i, lv); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="#C7D2FE" strokeWidth={lv === 1 ? 1.2 : 0.8} strokeOpacity={lv === 1 ? 0.7 : 0.5}
        />
      ))}
      {axes.map((_, i) => {
        const o = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke="#C7D2FE" strokeWidth="0.8" strokeOpacity="0.6" />
      })}
      <path d={dataPath} fill="url(#al-modal-radar)" fillOpacity="0.45" />
      <path d={dataPath} fill="none" stroke="url(#al-modal-radar)" strokeWidth="2" />
      {pts.map(({ x, y }, i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#5B5BFF" />
      ))}
      {axes.map((a, i) => {
        const { x, y } = pt(i, 1.22)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
            fontSize="13" fill="#4B5563" fontWeight="700" fontFamily="Pretendard, sans-serif">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

interface TestSummary {
  id: string
  label: string
  score: number
  color: string
  axes: { label: string; value: number }[]
  aiComment: string
  strengths: string[]
  weaknesses: string[]
}

const TEST_SUMMARIES: TestSummary[] = [
  {
    id: 'aptitude',
    label: '인적성검사',
    score: 80,
    color: '#2E5BFF',
    axes: [
      { label: '언어이해', value: 84 },
      { label: '수리능력', value: 78 },
      { label: '추리능력', value: 82 },
      { label: '공간지각', value: 75 },
      { label: '정보활용', value: 88 },
      { label: '상황판단', value: 73 },
    ],
    aiComment:
      '김채원님의 인적성 평균은 80점으로 또래 상위 25% 수준입니다. 정보활용(88)과 언어이해(84)가 가장 두드러진 강점이라, 데이터 리서치·기획·컨설팅 직무에서 즉시 활용 가능한 역량을 확보한 상태입니다. 다만 공간지각(75)과 상황판단(73)이 평균보다 낮은 편이라, 도식/차트 해석 훈련과 케이스 면접 대비 모의문제(주 2회 이상)를 권장합니다. 동일 패턴으로 12주만 학습하면 평균을 5점 이상 끌어올릴 수 있다는 예측치가 산출되었어요.',
    strengths: ['정보활용 88', '언어이해 84', '추리능력 82'],
    weaknesses: ['상황판단 73', '공간지각 75'],
  },
  {
    id: '9core',
    label: '9CORE 검사',
    score: 68,
    color: '#F59E0B',
    axes: [
      { label: '의사소통', value: 78 },
      { label: '문제해결', value: 82 },
      { label: '자기관리', value: 70 },
      { label: '대인관계', value: 65 },
      { label: '정보활용', value: 88 },
      { label: '글로벌', value: 35 },
      { label: '리더십', value: 60 },
      { label: '창의융합', value: 72 },
      { label: '직업윤리', value: 75 },
    ],
    aiComment:
      '9CORE 검사 평균은 69점으로 보통 수준이며, 영역 간 편차가 큰 편입니다. 문제해결(82)·정보활용(88)·의사소통(78)이 강점이라 분석·기획 직무에 잘 맞습니다. 반면 글로벌 역량(35)이 가장 큰 보완 포인트라, TOEIC 700+ 취득과 학내 글로벌 교류·국제 PBL 프로그램 참여를 1순위로 추천드립니다. 리더십(60)·대인관계(65)는 동아리 임원 활동이나 팀 프로젝트 리더 경험을 통해 단기간에 향상 가능한 영역입니다. 이 흐름대로 6개월 학습 시 평균 75점대 진입이 예상됩니다.',
    strengths: ['문제해결 82', '정보활용 88'],
    weaknesses: ['글로벌 35'],
  },
  {
    id: 'cares',
    label: 'CARES 검사',
    score: 88,
    color: '#10B981',
    axes: [
      { label: '관심', value: 90 },
      { label: '통제', value: 86 },
      { label: '호기심', value: 92 },
      { label: '자신감', value: 84 },
      { label: '협력', value: 88 },
    ],
    aiComment:
      'CARES 검사 평균은 88점으로 진로 적응력 영역에서 매우 우수한 수준입니다. 호기심(92)과 관심(90)이 모두 90점대로, 새로운 기술/직무를 빠르게 학습·흡수하는 데 큰 강점이 있습니다. 협력(88)과 통제(86)도 안정적이라 팀 단위 프로젝트나 인턴십에서도 두각을 드러낼 가능성이 높습니다. 자신감(84)은 상대적으로 낮은 편이라, 대외 발표·해커톤 등에서 결과물 공개 경험을 누적하면 점수 + 실제 자신감 모두 상승하실 거예요. 현재 흐름을 유지하시는 것이 최우선 전략입니다.',
    strengths: ['호기심 92', '관심 90', '협력 88'],
    weaknesses: [],
  },
  {
    id: 'job-competency',
    label: '직무역량검사',
    score: 74,
    color: '#7C3AED',
    axes: [
      { label: '기획력', value: 72 },
      { label: '실행력', value: 78 },
      { label: '협업력', value: 80 },
      { label: '문제해결', value: 76 },
      { label: '전문지식', value: 70 },
      { label: '도구활용', value: 68 },
    ],
    aiComment:
      '직무역량 평균은 74점으로 양호한 편이지만, 영역별 편차가 다소 있어 보완이 필요합니다. 협업력(80)과 실행력(78)은 실무 즉시 투입이 가능한 수준이며, 팀 프로젝트 경험과 함께 가시화하면 면접에서도 큰 어필 포인트가 됩니다. 반면 도구활용(68)과 전문지식(70)은 실무에서 가장 빨리 격차가 드러나는 영역이라, 채용공고에서 자주 요구되는 SQL·Python·Figma 등 핵심 툴 중 2개를 선정해 매주 2시간씩 12주만 학습해도 점수 + 실제 업무 적응력이 크게 개선됩니다.',
    strengths: ['협업력 80', '실행력 78'],
    weaknesses: ['도구활용 68'],
  },
  {
    id: 'aptitude-job',
    label: '직업적성검사',
    score: 82,
    color: '#0EA5E9',
    axes: [
      { label: '분석성향', value: 86 },
      { label: '창의성향', value: 80 },
      { label: '실무성향', value: 78 },
      { label: '대인성향', value: 84 },
      { label: '관리성향', value: 76 },
      { label: '연구성향', value: 88 },
    ],
    aiComment:
      '직업적성 평균은 82점으로 연구·분석 영역에 매우 강한 적합도를 보입니다. 연구성향(88)과 분석성향(86), 대인성향(84)이 모두 80점대 이상으로 골고루 우수해, 데이터 사이언티스트·UX 리서처·전략 컨설팅처럼 "분석 + 협업"이 결합된 직무에서 가장 큰 만족도를 얻을 가능성이 높습니다. 실무성향(78)과 관리성향(76)은 중간 수준이라, 추후 PM/리더 트랙으로 확장을 고려한다면 인턴십에서 일정·이해관계자 관리 경험을 의식적으로 쌓는 것을 추천드립니다.',
    strengths: ['연구성향 88', '분석성향 86'],
    weaknesses: [],
  },
  {
    id: 'mbti',
    label: '성격유형검사',
    score: 90,
    color: '#EC4899',
    axes: [
      { label: '외향(E)', value: 62 },
      { label: '직관(N)', value: 88 },
      { label: '사고(T)', value: 76 },
      { label: '판단(J)', value: 84 },
      { label: '계획성', value: 82 },
      { label: '적응성', value: 70 },
    ],
    aiComment:
      'INTJ 성향이 우세합니다(완성도 90%). 직관(N)·판단(J) 점수가 모두 84점 이상으로, 큰 그림을 보고 장기 목표를 설계·실행하는 전략가 유형이라 R&D·전략기획·창업가 트랙에서 두각을 보이실 가능성이 높습니다. 사고(T) 76점은 데이터 기반 의사결정에 적합한 균형 잡힌 수준입니다. 적응성(70)은 상대적으로 낮은 편이라, 변화 많은 스타트업/에이전시 환경에서는 의식적인 즉흥 대응 훈련(역할극·즉문즉답)이 필요하며, 이를 보완하면 어떤 조직에서도 안정적으로 성과를 낼 수 있습니다.',
    strengths: ['직관(N) 88', '판단(J) 84'],
    weaknesses: ['적응성 70'],
  },
  {
    id: 'psychology',
    label: '심리검사',
    score: 76,
    color: '#F97316',
    axes: [
      { label: '정서안정', value: 72 },
      { label: '자아존중', value: 80 },
      { label: '대인적응', value: 76 },
      { label: '스트레스', value: 68 },
      { label: '회복탄력', value: 82 },
    ],
    aiComment:
      '심리검사 평균은 76점으로 전반적으로 안정된 정서 상태를 유지하고 계십니다. 회복탄력(82)과 자아존중(80)이 우수하다는 것은, 실패나 좌절 상황에서도 빠르게 회복하고 다시 도전할 수 있는 심리적 기초가 단단하다는 의미입니다. 다만 스트레스(68)와 정서안정(72) 영역이 다른 항목보다 낮은 편이라, 학기 중 누적되는 학업 압박이 가끔 큰 부담으로 다가올 가능성이 있습니다. 주 1회 마음챙김 명상(10분)과 운동 루틴(주 3회)을 함께 시작하시면 두 영역 모두 단기간 내 향상이 가능합니다.',
    strengths: ['회복탄력 82', '자아존중 80'],
    weaknesses: ['스트레스 68'],
  },
  {
    id: 'interest',
    label: '진로흥미검사',
    score: 84,
    color: '#06B6D4',
    axes: [
      { label: '탐구형(I)', value: 88 },
      { label: '예술형(A)', value: 70 },
      { label: '사회형(S)', value: 76 },
      { label: '진취형(E)', value: 82 },
      { label: '관습형(C)', value: 78 },
      { label: '실재형(R)', value: 80 },
    ],
    aiComment:
      'Holland 모형 기준 탐구형(I, 88)과 진취형(E, 82)이 가장 두드러지는 흥미 코드입니다. 즉 "지적 호기심으로 문제를 깊이 파헤치는 것"과 "성과·영향력을 만들어내는 것" 양쪽 모두에서 강한 내재 동기가 작동합니다. 이런 IE 조합은 데이터 사이언스, 전략 컨설팅, AI 프로덕트 매니지먼트, 창업 등 "분석 + 비즈니스 임팩트"가 결합된 직군에서 가장 큰 만족도와 성과를 만들어냅니다. 관습형(C, 78)과 실재형(R, 80)도 평균 이상이라 회계·운영 관리처럼 정밀한 영역에서도 적응이 어렵지 않으며, 직무 선택 폭이 넓은 편입니다.',
    strengths: ['탐구형 88', '진취형 82'],
    weaknesses: [],
  },
]

// ── Page ───────────────────────────────────────────────────────────
export default function AiLounge() {
  const [openTestId, setOpenTestId] = useState<string | null>(null)
  const openTest = openTestId ? TEST_SUMMARIES.find(t => t.id === openTestId) ?? null : null

  return (
    <div className="al-page">

      {/* Hero */}
      <header className="al-hero">
        <h1>AI 커리어 라운지</h1>
        <p>AI가 종합 분석한 나의 커리어 현황을 한눈에 확인하세요.</p>
      </header>

      {/* Profile Card */}
      <div className="al-profile-card">
        <div className="al-profile-user">
          <div className="al-avatar-box">
            <img className="al-avatar-photo" src="/student-profile.png" alt="김채원 프로필" />
          </div>
          <div className="al-profile-info">
            <div className="al-profile-name">김채원</div>
            <div className="al-profile-dept">컴퓨터공학과 3학년</div>
            <span className="al-lv-badge">Lv. 23</span>
          </div>
        </div>

        <div className="al-stats-row">
          {userStats.map((s, i) => (
            <div key={i} className="al-stat">
              <i className={`${s.icon} al-stat-icon`} />
              <span className="al-stat-label">{s.label}</span>
              <div className="al-stat-val">
                <strong>{s.value}</strong>
                <span>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Layout: content stack + sticky right sidebar ─────── */}
      <div className="al-layout">

        <div className="al-content">

          <div className="al-analysis-row">

            {/* 종합 분석 리포트 */}
            <div className="card al-report-card">
              <div className="card-title">종합 분석 리포트</div>
              <div className="al-card-sub">AI가 분석한 당신의 종합 평가</div>
              <div className="al-score-row">
                <span className="al-score-num">72</span>
                <span className="al-score-denom">/100</span>
              </div>
              <div className="al-prog-track">
                <div className="al-prog-fill" style={{ width: '72%' }} />
              </div>
              <div className="al-report-3col">
                <div className="al-rcol">
                  <div className="al-rcol-title"><i className="fa-solid fa-star" /> 강점</div>
                  {['문제해결 능력이 우수해요','전공 역량이 탄탄해요','성장 가능성이 높아요'].map((t,i)=>(
                    <div key={i} className="al-bullet"><i className="fa-solid fa-check" />{t}</div>
                  ))}
                </div>
                <div className="al-rcol">
                  <div className="al-rcol-title"><i className="fa-solid fa-star" /> 보완이 필요한 역량</div>
                  {['실무 경험을 더 쌓아보세요','프로젝트 경험이 부족해요','커뮤니케이션 능력 향상 필요'].map((t,i)=>(
                    <div key={i} className="al-bullet"><i className="fa-solid fa-check" />{t}</div>
                  ))}
                </div>
                <div className="al-rcol">
                  <div className="al-rcol-title"><i className="fa-solid fa-check" /> 맞춤 추천</div>
                  {['데이터 분석 프로젝트 경험 기획','기업 멘토링 프로그램','프레젠테이션 스킬 향상'].map((t,i)=>(
                    <div key={i} className="al-bullet"><i className="fa-solid fa-check" />{t}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* 역량 비교 분석 */}
            <div className="card al-radar-card">
              <div className="card-title">역량 비교 분석</div>
              <div className="al-card-sub">목표 기업 합격자 평균</div>
              <div className="al-radar-legend">
                <span className="al-leg-item"><span className="al-leg-line al-leg-solid"/>나의 역량</span>
                <span className="al-leg-item"><span className="al-leg-line al-leg-dash"/>목표 기업 합격자 평균</span>
              </div>
              <RadarChart />
            </div>

          </div>

          {/* ── Bottom Grid ───────────────────────────────────────────── */}
      <div className="al-bottom-grid">

        {/* AI 역량별 상세 분석 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>
              <i className="fa-solid fa-chart-bar"/> AI 역량별 상세 분석
            </div>
            <Link to="/roadmap/ai" className="al-more-link">상세 보기 →</Link>
          </div>
          <div className="al-bar-list">
            {competencyBars.map((b,i)=>(
              <div key={i} className="al-bar-row">
                <span className="al-bar-lbl">{b.label}</span>
                <div className="al-bar-track">
                  <div className="al-bar-fill" style={{ width:`${b.value}%` }}/>
                </div>
                <span className="al-bar-val">{b.value}점</span>
              </div>
            ))}
          </div>
          <div className="al-ai-box al-comp-ai">
            <i className="fa-solid fa-wand-magic-sparkles"/>
            <span>
              전문 역량과 인성 역량이 다른 영역 대비 두드러진 강점으로 분석되었습니다. 평균 80점 이상을 유지하고 있어
              해당 영역과 연관된 직무(R&D, 윤리/컴플라이언스, 기술 컨설팅)에서 즉시 활용 가능한 수준입니다.
              반면 <strong>실무 역량</strong>과 <strong>실행 역량</strong>은 70점 후반에 머물러 있어, 단기 캡스톤·인턴십·해커톤 같은
              "실제 결과물을 만드는 활동"을 6주 단위로 사이클링하면 단기간 내 평균 5점 이상 향상이 기대됩니다.
              지금 흐름을 유지하면서 실행 영역만 보강하면 종합 평균 80점대 진입이 충분히 가능합니다.
            </span>
          </div>
        </div>

        {/* 진단검사 결과 요약 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>
              <i className="fa-solid fa-chart-pie"/> 진단검사 결과 요약
            </div>
            <Link to="/diagnosis/result" className="al-more-link">전체 보기 →</Link>
          </div>
          <div className="al-test-rings">
            {TEST_SUMMARIES.map(t => (
              <button
                key={t.id}
                className="al-test-ring"
                onClick={() => setOpenTestId(t.id)}
                aria-label={`${t.label} 상세 보기`}
              >
                <MiniRing value={t.score} color={scoreBandColor(t.score)} />
                <span className="al-test-name">{t.label}</span>
              </button>
            ))}
          </div>
          <p className="al-test-hint">
            <i className="fa-solid fa-hand-pointer"/> 클릭하면 세부 결과를 확인할 수 있습니다
          </p>
        </div>

        {/* 최근 상담 내역 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>최근 상담 내역</div>
            <Link to="/mypage/counsel" className="al-more-link">전체 보기 →</Link>
          </div>
          <div className="al-counsel-list">
            {counselPairs.slice(0, 3).map((p, i) => (
              <div key={i} className="al-counsel-pair">
                <div className="al-counsel-pair-head">
                  <span className="al-counsel-type" style={{ color: p.typeColor }}>{p.type}</span>
                  <span className="al-counsel-date">{p.date}</span>
                </div>
                <div className="al-counsel-msg al-counsel-msg-q">
                  <span className="al-counsel-msg-lbl">질문</span>
                  <p>{p.question}</p>
                </div>
                <div className="al-counsel-msg al-counsel-msg-a">
                  <span className="al-counsel-msg-lbl">AI 조언</span>
                  <p>{p.aiAdvice}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOEIC 영단어 오답노트 AI 분석 */}
        <div className="card">
          <div className="al-row-hd">
            <div className="card-title" style={{marginBottom:0}}>
              <i className="fa-solid fa-book"/> TOEIC 영단어 오답노트
            </div>
            <Link to="/growth/mission" className="al-more-link">학습 가기 →</Link>
          </div>

          <div className="al-toeic-summary">
            <div className="al-toeic-stat">
              <span className="al-toeic-stat-num">72</span>
              <span className="al-toeic-stat-unit">%</span>
              <span className="al-toeic-stat-lbl">최근 14일 정답률</span>
            </div>
            <div className="al-toeic-stat-divider" />
            <div className="al-toeic-stat-grid">
              <div>
                <span className="al-toeic-stat-num-sm">98</span>
                <span className="al-toeic-stat-lbl-sm">학습 단어</span>
              </div>
              <div>
                <span className="al-toeic-stat-num-sm" style={{ color: '#EF4444' }}>27</span>
                <span className="al-toeic-stat-lbl-sm">오답 누적</span>
              </div>
              <div>
                <span className="al-toeic-stat-num-sm" style={{ color: '#10B981' }}>71</span>
                <span className="al-toeic-stat-lbl-sm">정답 누적</span>
              </div>
            </div>
          </div>

          <div className="al-toeic-cats">
            <div className="al-toeic-cats-title">난이도별 정답률</div>
            {[
              { label: '필수단어 (600점대 / 빈출 기초)', correct: 88, hint: 'company, increase, provide 등 빈출 1000어' },
              { label: '핵심단어 (700점대 / 시험 직결)', correct: 70, hint: 'distribute, comply, postpone 등 PART 5·6 키워드' },
              { label: '고득점 단어 (800점대 / 변별력)', correct: 42, hint: 'discretion, leverage, mitigate 등 PART 7 추론어' },
              { label: '난해 단어 (900점대 / 고난도)', correct: 30, hint: 'forfeit, succinct, ubiquitous 등 저빈도 추상어' },
            ].map(c => {
              const wrong = 100 - c.correct
              const color = c.correct >= 80 ? '#10B981' : c.correct >= 60 ? '#F59E0B' : '#EF4444'
              return (
                <div key={c.label} className="al-toeic-cat-row">
                  <div className="al-toeic-cat-head">
                    <span className="al-toeic-cat-lbl">{c.label}</span>
                    <span className="al-toeic-cat-val" style={{ color }}>
                      정답 {c.correct}% <span className="al-toeic-cat-wrong">· 오답 {wrong}%</span>
                    </span>
                  </div>
                  <div className="al-toeic-cat-bar">
                    <div className="al-toeic-cat-fill" style={{ width: `${c.correct}%`, background: color }} />
                  </div>
                  <span className="al-toeic-cat-hint">{c.hint}</span>
                </div>
              )
            })}
          </div>

          <div className="al-ai-box al-toeic-ai">
            <i className="fa-solid fa-wand-magic-sparkles"/>
            <span>
              최근 14일 학습 데이터 분석 결과, <strong>필수단어(88%)</strong>와 <strong>핵심단어(70%)</strong>는
              비교적 안정적이지만, <strong>고득점 단어(42%)</strong>와 <strong>난해 단어(30%)</strong>에서
              오답률이 급격히 올라갑니다. 현재 추세라면 <strong>예상 점수 720~760점대</strong>에 머무를
              가능성이 높습니다. <strong>TOEIC 800점 이상</strong>을 목표로 하신다면, 1) 매일 미션에
              <em>고득점 단어 10개 + 난해 단어 5개</em>를 우선 배치하고, 2) 동의어/반의어 짝(synonym pair)
              학습을 병행해 PART 5의 어휘 문제에서 시간을 단축하며, 3) 주 2회 LC/RC 실전 모의고사로
              체득 여부를 확인하시면 6주 내 800점대 진입이 충분히 가능할 것으로 예측됩니다.
            </span>
          </div>
        </div>

      </div>

      {/* ── AI 액션 로드맵 ─────────────────────────────────────────── */}
      <div className="al-roadmap-section">
        <div className="al-sec-hd">
          <span className="al-sec-title">
            <i className="fa-solid fa-wand-magic-sparkles"/> 그래서 뭐부터? · AI 액션 로드맵
          </span>
          <Link to="/roadmap/ai" className="al-more-link">전체 로드맵 →</Link>
        </div>
        <p className="al-roadmap-intro">
          진단 점수 · 역량 분석 · TOEIC 학습 데이터 · 상담 기록을 모두 종합해서, 김채원님이 <strong>지금 무엇부터,
          어떤 순서로 진행하면 가장 효율적인지</strong> 3단계 로드맵으로 정리했어요.
        </p>

        <div className="al-roadmap-list">
          {roadmapPhases.map(phase => (
            <div key={phase.num} className="al-roadmap-phase">
              <div className="al-roadmap-phase-head">
                <span className="al-roadmap-num" style={{ background: phase.color }}>{phase.num}</span>
                <div className="al-roadmap-phase-meta">
                  <span className="al-roadmap-period">{phase.period}</span>
                  <strong className="al-roadmap-title">{phase.title}</strong>
                </div>
              </div>
              <ul className="al-roadmap-actions">
                {phase.actions.map((a, i) => (
                  <li key={i}>
                    <i className="fa-solid fa-check" style={{ color: phase.color }} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="al-ai-box al-roadmap-summary">
          <i className="fa-solid fa-wand-magic-sparkles"/>
          <span>
            이 흐름대로 6개월간 진행하면 <strong>9CORE 평균 75 → 82점</strong>,
            <strong> TOEIC 720 → 820점대</strong>, <strong>포트폴리오 결과물 +2건</strong> 확보가
            충분히 가능합니다. 진도가 어긋난다면 <Link to="/roadmap/ai" className="al-roadmap-link">AI 진로 로드맵</Link>에서
            언제든 자동으로 재조정해 드릴게요.
          </span>
        </div>
      </div>

        </div>

        {/* Right Sidebar — sticky, follows scroll across all content */}
        <aside className="al-right-sidebar">

          {/* 우선순위 요약 — 가장 중요한 인사이트로 promote */}
          <div className="card al-priority-card">
            <div className="card-title">
              <i className="fa-solid fa-circle-exclamation" /> 우선순위 요약
            </div>
            <div className="al-priority-list">
              <div className="al-pri-item">
                <span className="al-pri-dot" style={{ background:'#EF4444' }}/>
                <span className="al-pri-label">긴급 (High)</span>
                <span className="al-pri-cnt" style={{ color:'#EF4444' }}>2개</span>
              </div>
              <div className="al-pri-item">
                <span className="al-pri-dot" style={{ background:'#99A1A9' }}/>
                <span className="al-pri-label">보통 (Medium)</span>
                <span className="al-pri-cnt">1개</span>
              </div>
              <div className="al-pri-item">
                <span className="al-pri-dot" style={{ background:'#D1D5DB' }}/>
                <span className="al-pri-label">낮음 (Low)</span>
                <span className="al-pri-cnt">1개</span>
              </div>
            </div>
          </div>

          {/* 추천 다음 행동 */}
          <div className="card">
            <div className="card-title">추천 다음 행동</div>
            <div className="al-action-list">
              {nextActions.map((a,i)=>(
                <div key={i} className="al-action-item">
                  <span className="al-action-num" style={{ background:a.color }}>{a.num}</span>
                  <span className="al-action-txt">{a.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="card">
            <div className="card-title">빠른 이동</div>
            <div className="al-quick-list">
              {quickLinks.map((q,i)=>(
                <Link key={i} to={q.path} className="al-quick-item">
                  <span className="al-quick-ico" style={{ background:q.bg, color:q.iconColor }}>
                    <i className={q.icon}/>
                  </span>
                  <span className="al-quick-lbl">{q.label}</span>
                  <i className="fa-solid fa-chevron-right al-quick-arr"/>
                </Link>
              ))}
            </div>
          </div>

        </aside>

      </div>

      {/* ── Test Detail Modal ─────────────────────────────────────── */}
      <Modal
        open={openTest !== null}
        onClose={() => setOpenTestId(null)}
        title={openTest ? `${openTest.label} 결과` : ''}
        size="lg"
      >
        {openTest && (
          <div className="al-test-modal">
            <div className="al-test-modal-top">
              <div className="al-test-modal-score" style={{ color: scoreBandColor(openTest.score) }}>
                {openTest.score}<span>점</span>
              </div>
              <div className="al-test-modal-meta">
                <span className="al-test-modal-name">{openTest.label}</span>
                <span className="al-test-modal-sub">
                  {openTest.axes.length}개 영역 · 평균 {openTest.score}점
                </span>
              </div>
            </div>

            <div className="al-test-modal-chart">
              <ModalRadar axes={openTest.axes} />
            </div>

            <div className="al-test-modal-ai">
              <div className="al-test-modal-ai-head">
                <i className="fa-solid fa-wand-magic-sparkles" /> AI 코멘트
              </div>
              <p>{openTest.aiComment}</p>
            </div>

            <div className="al-test-modal-tags">
              {openTest.axes.map(ax => {
                const cls = ax.value >= 71 ? 'high' : ax.value >= 41 ? 'mid' : 'low'
                return (
                  <span key={ax.label} className={`al-test-tag al-test-tag-${cls}`}>
                    {ax.label} {ax.value}점
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
