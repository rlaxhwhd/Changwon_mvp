import { useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import type { PageId } from '../types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface DashboardProps {
  onToast: (msg: string) => void;
  onNavigate: (page: PageId) => void;
}

/* ── 핵심 지표 ── */
const coreStats = [
  { label: '학점', value: '4.3', sub: '/ 4.5', icon: 'fa-solid fa-graduation-cap', color: '#2563EB', bg: '#EFF6FF', trend: '+0.1' },
  { label: 'AI 역량 종합', value: '68', sub: '점', icon: 'fa-solid fa-robot', color: '#0EA5E9', bg: '#EFF6FF', trend: '+5' },
  { label: '보유 자격증', value: '1', sub: '건', icon: 'fa-solid fa-certificate', color: '#047857', bg: '#ECFDF5', detail: 'SQLD' },
  { label: '어학 성적', value: '—', sub: '', icon: 'fa-solid fa-language', color: '#DC2626', bg: '#FEF2F2', warn: '미취득' },
  { label: '보유 스킬', value: '6', sub: '개', icon: 'fa-solid fa-code', color: '#7C3AED', bg: '#F5F3FF', detail: 'Java, React 외 4개' },
];

/* ── 우선순위 요약 ── */
const priorities = [
  { level: '긴급', color: '#DC2626', count: 2 },
  { level: '보통', color: '#9CA3AF', count: 1 },
  { level: '낮음', color: '#9CA3AF', count: 1 },
];

/* ── 추천 다음 행동 ── */
const nextActions = [
  { rank: 1, text: 'TOEIC 응시 — 목표 700+ (어학 미등록)', page: 'program-apply' as PageId, urgent: true },
  { rank: 2, text: 'PMP 기초 자격증 취득 준비 (PM역량 +15점)', page: 'program-apply' as PageId, urgent: true },
  { rank: 3, text: '캡스톤 디자인 프로젝트 등록 (프로젝트 경험 보강)', page: 'career-manage' as PageId, urgent: false },
  { rank: 4, text: 'AI 로드맵 확인 및 다음 단계 계획', page: 'ai-roadmap' as PageId, urgent: false },
];

/* ── 역량 항목 ── */
const skills = [
  { name: '학점', score: 90, target: 85, icon: 'fa-solid fa-graduation-cap', color: '#2563EB' },
  { name: '어학', score: 20, target: 70, icon: 'fa-solid fa-language', color: '#60A5FA' },
  { name: 'IT자격증', score: 40, target: 75, icon: 'fa-solid fa-certificate', color: '#D97706' },
  { name: 'PM역량', score: 55, target: 80, icon: 'fa-solid fa-diagram-project', color: '#3B82F6' },
  { name: '프로젝트', score: 45, target: 85, icon: 'fa-solid fa-code-branch', color: '#10B981' },
  { name: '인성/심리', score: 80, target: 75, icon: 'fa-solid fa-brain', color: '#60A5FA' },
];

/* ── AI 역량별 상세 ── */
const aiDetailScores = [
  { name: '학업 역량', score: 88, color: '#2563EB' },
  { name: '프로그래밍', score: 85, color: '#0EA5E9' },
  { name: '인적성', score: 80, color: '#10B981' },
  { name: '커뮤니케이션', score: 70, color: '#D97706' },
  { name: '프로젝트 경험', score: 45, color: '#DC2626' },
  { name: '어학', score: 10, color: '#DC2626' },
  { name: '자격증', score: 35, color: '#D97706' },
];

/* ── 검사 결과 ── */
const examSummary = [
  { name: '인적성검사', score: 80, color: '#2563EB', date: '2025.04.15',
    radarColor: 'rgba(37,99,235,',
    items: [
      { name: '언어이해', score: 85 }, { name: '수리능력', score: 78 },
      { name: '추리능력', score: 82 }, { name: '공간지각', score: 72 }, { name: '지각속도', score: 83 },
    ],
    aiComment: '언어이해(85점)와 지각속도(83점)가 강점입니다. 공간지각(72점)은 보완이 필요하며, 도형 추론 문제 유형 집중 학습을 권장합니다.',
  },
  { name: '9CORE 검사', score: 68, color: '#D97706', date: '2025.03.20',
    radarColor: 'rgba(217,119,6,',
    items: [
      { name: '도전정신', score: 75 }, { name: '소통능력', score: 70 }, { name: '문제해결', score: 65 },
      { name: '창의융합', score: 60 }, { name: '글로벌역량', score: 55 }, { name: '디지털역량', score: 72 },
      { name: '자기관리', score: 68 }, { name: '대인관계', score: 73 }, { name: '윤리의식', score: 70 },
    ],
    aiComment: '대인관계(73점)와 디지털역량(72점)이 상대적 강점입니다. 글로벌역량(55점)이 가장 낮으며, 어학 능력 향상 및 국제교류 프로그램 참여를 권장합니다.',
  },
  { name: 'CARES 검사', score: 88, color: '#10B981', date: '2025.05.01',
    radarColor: 'rgba(16,185,129,',
    items: [
      { name: '자기이해', score: 90 }, { name: '진로탐색', score: 88 },
      { name: '정보수집', score: 85 }, { name: '의사결정', score: 89 }, { name: '실행계획', score: 86 },
    ],
    aiComment: '전 영역이 85점 이상으로 우수합니다. 특히 자기이해(90점)와 의사결정(89점)이 뛰어나며, 진로 결정력이 충분한 상태입니다. 실행 단계에 집중하세요.',
  },
];

function makeRadarData(exam: typeof examSummary[0]) {
  return {
    labels: exam.items.map(i => i.name),
    datasets: [{
      label: exam.name,
      data: exam.items.map(i => i.score),
      backgroundColor: `${exam.radarColor}0.18)`,
      borderColor: exam.color,
      borderWidth: 2,
      pointBackgroundColor: exam.color,
      pointRadius: 4,
    }],
  };
}

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: { stepSize: 20, font: { size: 10 }, backdropColor: 'transparent' },
      pointLabels: { font: { size: 12, weight: 700 as const, family: 'Noto Sans KR' }, color: '#374151' },
      grid: { color: 'rgba(0,0,0,.06)' },
      angleLines: { color: 'rgba(0,0,0,.06)' },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx: { raw: unknown }) => ` ${ctx.raw}점` } },
  },
};

/* ── 역량프로그램 ── */
const programs = [
  { name: '취업역량강화 캠프', hours: 40, category: '취업', score: 86 },
  { name: 'AI 활용 자소서 특강', hours: 3, category: 'AI', score: 78 },
  { name: '창업아이디어 경진대회', hours: 16, category: '창업', score: 70 },
];

/* ── 여정 ── */
const journey = [
  { step: 1, title: '나를 알기', sub: '진단검사', done: true, page: 'psych-test' as PageId, emoji: '🔍' },
  { step: 2, title: '길을 찾기', sub: '상담 & 설계', done: false, page: 'counsel-career' as PageId, emoji: '🧭' },
  { step: 3, title: '역량 쌓기', sub: '프로그램 참여', done: false, page: 'program-apply' as PageId, emoji: '📚' },
  { step: 4, title: '꿈에 도달', sub: '취업 준비 완성', done: false, page: 'career-manage' as PageId, emoji: '🚀' },
];

/* ── AI 기능 카드 ── */
const aiCards = [
  { title: 'AI 로드맵', desc: '나만의 커리어 경로', icon: 'fa-solid fa-route', page: 'ai-roadmap' as PageId, gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)' },
  { title: '취업예측', desc: 'AI 기반 합격률 분석', icon: 'fa-solid fa-chart-pie', page: 'ai-prediction' as PageId, gradient: 'linear-gradient(135deg, #60A5FA, #22D3EE)' },
  { title: 'AI 채용', desc: '맞춤 채용 추천', icon: 'fa-solid fa-briefcase', page: 'ai-jobs' as PageId, gradient: 'linear-gradient(135deg, #D97706, #FBBF24)' },
  { title: 'AI 평가', desc: '종합 역량 리포트', icon: 'fa-solid fa-clipboard-check', page: 'ai-evaluation' as PageId, gradient: 'linear-gradient(135deg, #10B981, #34D399)' },
];

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="d5-bar-track">
      <div className="d5-bar-fill" style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

function RingMini({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 800, color }}>{score}</span>
      </div>
    </div>
  );
}

export default function Dashboard({ onToast, onNavigate }: DashboardProps) {
  const [showAiChat, setShowAiChat] = useState(false);
  const [examModal, setExamModal] = useState<number | null>(null);
  const [goalModal, setGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ company: '넥슨코리아', role: 'IT Project Manager', gpa: '4.3', industry: '게임/IT' });

  const overallScore = 68;
  const currentStep = journey.find(j => !j.done);

  return (
    <div className="d5-root">
      {/* ── Hero ── */}
      <div className="d5-hero">
        <div className="d5-hero-orb d5-hero-orb-1" />
        <div className="d5-hero-orb d5-hero-orb-2" />
        <div className="d5-hero-inner">
          <div className="d5-hero-text">
            <p className="d5-hero-greeting">안녕하세요, 김민준님 👋</p>
            <h1 className="d5-hero-title">AI 커리어 <span className="d5-gradient-text">라운지</span></h1>
            <p className="d5-hero-sub">
              상담 · 진단검사 · 역량개발 전 영역의 AI 분석 결과를 종합적으로 확인하세요.
            </p>
            {currentStep && (
              <button className="d5-btn-primary" onClick={() => onNavigate(currentStep.page)}>
                {currentStep.title} 시작하기 <i className="fa-solid fa-arrow-right" />
              </button>
            )}
          </div>
          <div className="d5-hero-gauge">
            <div className="d5-gauge-circle">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="6" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#d5grad)" strokeWidth="6"
                  strokeDasharray={`${(overallScore / 100) * 264} 264`}
                  strokeLinecap="round" transform="rotate(-90 50 50)" />
                <defs>
                  <linearGradient id="d5grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="d5-gauge-inner">
                <span className="d5-gauge-num">{overallScore}</span>
                <span className="d5-gauge-label">종합점수</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="d5-badge-rank">상위 32%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 핵심 지표 5카드 ── */}
      <div className="d5-section">
        <div className="d5-core-stats">
          {coreStats.map((s, i) => (
            <div key={i} className="d5-core-card">
              <div className="d5-core-icon" style={{ background: s.bg, color: s.color }}>
                <i className={s.icon} />
              </div>
              <div className="d5-core-info">
                <div className="d5-core-label">{s.label}</div>
                <div className="d5-core-value" style={{ color: s.color }}>
                  {s.value}<span className="d5-core-sub">{s.sub}</span>
                </div>
                {s.trend && (
                  <div className="d5-core-trend">
                    <i className="fa-solid fa-arrow-up" /> {s.trend}
                  </div>
                )}
                {s.detail && <div className="d5-core-detail">{s.detail}</div>}
                {s.warn && <div className="d5-core-warn"><i className="fa-solid fa-circle-exclamation" /> {s.warn}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 메인 + 우측 사이드바 레이아웃 ── */}
      <div className="d5-body-layout">
      <div className="d5-body-main">

      {/* ── 내 역량 레이더 + 진로 목표 / 검사 결과 ── */}
      <div className="d5-radar-row">
        {/* 내 역량 레이더 (왼쪽) */}
        <div className="d5-card d5-radar-card">
          <div className="d5-card-head">
            <h3><i className="fa-solid fa-chart-radar" style={{ color: '#6366F1' }} /> 내 역량 레이더</h3>
            <button className="d5-text-btn" onClick={() => onNavigate('ai-evaluation')}>
              <i className="fa-solid fa-robot" /> AI 분석
            </button>
          </div>
          <div className="d5-radar-sub">목표 vs 현재 비교</div>
          <div className="d5-radar-chart">
            <Radar
              data={{
                labels: skills.map(s => s.name),
                datasets: [
                  {
                    label: '내 현재 역량',
                    data: skills.map(s => s.score),
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    borderColor: '#6366F1',
                    borderWidth: 2,
                    pointBackgroundColor: '#6366F1',
                    pointRadius: 4,
                  },
                  {
                    label: '넥슨 합격자 평균',
                    data: skills.map(s => s.target),
                    backgroundColor: 'rgba(16,185,129,0.10)',
                    borderColor: '#10B981',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointBackgroundColor: '#10B981',
                    pointRadius: 3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 25, font: { size: 10 }, backdropColor: 'transparent' },
                    pointLabels: { font: { size: 12, weight: 700 as const, family: 'Noto Sans KR' }, color: '#374151' },
                    grid: { color: 'rgba(0,0,0,.06)' },
                    angleLines: { color: 'rgba(0,0,0,.06)' },
                  },
                },
                plugins: {
                  legend: { display: true, position: 'bottom' as const, labels: { usePointStyle: true, padding: 16, font: { size: 12, family: 'Noto Sans KR' } } },
                  tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; raw: unknown }) => `${ctx.dataset.label} ${ctx.raw}점` } },
                },
              }}
            />
          </div>
        </div>

        {/* 오른쪽: 진로 목표 + 검사 결과 */}
        <div className="d5-radar-right">
          {/* 진로 목표 */}
          <div className="d5-card">
            <div className="d5-card-head">
              <h3><i className="fa-solid fa-bullseye" style={{ color: '#DC2626' }} /> 진로 목표</h3>
              <button className="d5-text-btn" onClick={() => setGoalModal(true)}>
                <i className="fa-solid fa-pen" /> 편집
              </button>
            </div>
            <div className="d5-goal-table">
              <div className="d5-goal-row"><span>희망 직무</span><strong>{goalForm.role}</strong></div>
              <div className="d5-goal-row"><span>희망 기업</span><strong>{goalForm.company} ({goalForm.industry})</strong></div>
              <div className="d5-goal-row"><span>현재 합격 예측</span><strong style={{ color: '#D97706' }}>58%</strong></div>
              <div className="d5-goal-row"><span>목표 달성률</span><strong>64%</strong></div>
            </div>
            <button className="d5-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
              onClick={() => onNavigate('ai-roadmap')}>
              <i className="fa-solid fa-route" /> AI 로드맵 보기
            </button>
          </div>

          {/* 검사 결과 요약 */}
          <div className="d5-card">
            <div className="d5-card-head">
              <h3><i className="fa-solid fa-chart-simple" style={{ color: '#2563EB' }} /> 검사 결과 요약</h3>
            </div>
            <div className="d5-exam-rings">
              {examSummary.map((ex, i) => (
                <div key={i} className="d5-exam-ring-item" onClick={() => setExamModal(i)} style={{ cursor: 'pointer' }}>
                  <RingMini score={ex.score} color={ex.color} />
                  <div className="d5-exam-ring-label">{ex.name}</div>
                </div>
              ))}
            </div>
            <div className="d5-exam-hint">
              <i className="fa-solid fa-hand-pointer" /> 클릭하면 세부 결과를 확인할 수 있습니다
            </div>
          </div>
        </div>
      </div>

      {/* ── AI 역량별 상세 + 상담 AI 분석 ── */}
      <div className="d5-two-col">
        {/* AI 역량별 상세 */}
        <div className="d5-card">
          <div className="d5-card-head">
            <h3><i className="fa-solid fa-chart-bar" style={{ color: '#2563EB' }} /> AI 역량별 상세</h3>
            <button className="d5-text-btn" onClick={() => onNavigate('ai-evaluation')}>
              상세 <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
          {aiDetailScores.map((a, i) => (
            <div key={i} className="d5-detail-row" onClick={() => onNavigate('ai-evaluation')}>
              <span className="d5-detail-name">{a.name}</span>
              <ScoreBar score={a.score} color={a.color} />
              <span className="d5-detail-score" style={{ color: a.color }}>{a.score}점</span>
            </div>
          ))}
          <div className="d5-ai-comment" style={{ marginTop: 18 }}>
            <div className="d5-ai-label"><i className="fa-solid fa-robot" /> AI 종합 역량 평가</div>
            <p style={{ margin: '0 0 10px' }}>
              김민준님은 <strong>학업 역량(88점)과 프로그래밍(85점)</strong>이 가장 뛰어나며,
              이 두 영역은 IT PM 직무에서 기술 이해력과 개발팀 소통에 직접적인 강점이 됩니다.
              인적성(80점)도 상위 수준으로, 논리적 사고력과 문제해결 능력이 검증된 상태입니다.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              반면 <strong>어학(10점)은 시급한 보완</strong>이 필요합니다. 넥슨코리아 IT PM 합격자 평균 어학 점수는 TOEIC 720점 이상이며,
              현재 미취득 상태로는 서류 통과가 어렵습니다. 3개월 집중 학습 플랜을 통해 TOEIC 700점 이상을 목표로 하시길 권장합니다.
              자격증(35점) 역시 SQLD 1건에 머물러 있으므로, PMP 기초 과정이나 정보처리기사를 추가하면 경쟁력이 크게 올라갑니다.
            </p>
            <p style={{ margin: 0 }}>
              프로젝트 경험(45점)은 캡스톤디자인이나 현장실습을 통해 1~2건만 추가해도 목표 수준(85점)에 근접할 수 있습니다.
              커뮤니케이션(70점)은 양호하나, 팀 리더 경험을 쌓으면 PM 직무 면접에서 큰 차별점이 될 것입니다.
            </p>
          </div>
        </div>

        {/* 상담 AI 종합 분석 */}
        <div className="d5-card">
          <div className="d5-card-head">
            <h3><i className="fa-solid fa-heart" style={{ color: '#E879A0' }} /> 상담 AI 종합 분석</h3>
          </div>

          {/* 진로/취업 상담 */}
          <div className="d5-counsel-block">
            <div className="d5-counsel-header">
              <div className="d5-counsel-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                <i className="fa-solid fa-compass" />
              </div>
              <div>
                <div className="d5-counsel-type">진로/취업 상담</div>
                <div className="d5-counsel-date">2025.04.10 · 김영희 상담사</div>
              </div>
            </div>
            <div className="d5-counsel-quote">
              <i className="fa-solid fa-quote-left" />
              "학과와 안 맞는 것 같아서 진로에 대한 고민이 드는 중"
            </div>
            <div className="d5-counsel-ai">
              <div className="d5-counsel-ai-label"><i className="fa-solid fa-robot" /> AI 조언</div>
              <p>
                전공 적합성에 대한 고민은 <strong>매우 자연스러운 탐색 과정</strong>입니다. 김민준님의 CARES 검사 결과 자기이해(90점)와 의사결정(89점)이 높으므로,
                이미 스스로를 잘 파악하고 있습니다. 컴퓨터공학과의 역량을 IT PM이라는 <strong>융합 직무</strong>로 연결하면 학과 지식이 강력한 무기가 됩니다.
                비교과 프로그램에서 다양한 직무를 체험해보며 확신을 쌓아보세요.
              </p>
            </div>
          </div>

          {/* 심리 상담 */}
          <div className="d5-counsel-block">
            <div className="d5-counsel-header">
              <div className="d5-counsel-icon" style={{ background: '#FDF2F8', color: '#DB2777' }}>
                <i className="fa-solid fa-hand-holding-heart" />
              </div>
              <div>
                <div className="d5-counsel-type">심리 상담</div>
                <div className="d5-counsel-date">2025.04.12 · 박지은 상담사</div>
              </div>
            </div>
            <div className="d5-counsel-quote">
              <i className="fa-solid fa-quote-left" />
              "최근 이별을 한 상태로 학업과 진로에도 집중을 하지 못하는 모습"
            </div>
            <div className="d5-counsel-ai d5-counsel-ai-warm">
              <div className="d5-counsel-ai-label"><i className="fa-solid fa-robot" /> AI 위로 &amp; 조언</div>
              <p>
                힘든 시기를 보내고 계시군요. 감정이 흔들릴 때 학업에 집중하기 어려운 것은 <strong>당연한 일</strong>이에요.
                지금 가장 중요한 건 자신을 너무 다그치지 않는 것입니다. 인적성검사(80점)와 학점(4.3)이 보여주듯,
                김민준님은 <strong>이미 충분히 잘하고 있습니다</strong>. 잠시 속도를 늦추더라도 지금까지 쌓아온 것은 사라지지 않아요.
                심리상담센터의 후속 상담을 이어가시면서, 작은 일상 루틴부터 하나씩 회복해보세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 역량프로그램 AI 평가 ── */}
      <div className="d5-section">
        <div className="d5-card">
          <div className="d5-card-head">
            <h3><i className="fa-solid fa-list-check" style={{ color: '#10B981' }} /> 역량프로그램 AI 평가</h3>
            <button className="d5-text-btn" onClick={() => onNavigate('program-apply')}>
              전체 보기 <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
          <div className="d5-program-list">
            {programs.map((p, i) => (
              <div key={i} className="d5-program-item">
                <div className="d5-program-top">
                  <span className="d5-program-name">{p.name}</span>
                  <span className="d5-program-badge">{p.category}</span>
                </div>
                <div className="d5-program-bottom">
                  <span>{p.hours}시간 이수</span>
                  <span className="d5-program-score">기여도 {p.score}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="d5-ai-comment">
            <div className="d5-ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
            총 3개 프로그램 수료(59시간). 취업 분야 집중도가 높습니다.
            진로탐색 및 디지털 역량 프로그램 추가 이수를 권장합니다.
          </div>
        </div>
      </div>

      {/* ── 역량 현황 (6항목 바) ── */}
      <div className="d5-section">
        <div className="d5-section-head">
          <h2>역량 현황</h2>
          <button className="d5-text-btn" onClick={() => onNavigate('ai-evaluation')}>
            상세 분석 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
        <div className="d5-skills-grid">
          {skills.map((s, i) => {
            const gap = s.target - s.score;
            const status = gap <= 0 ? '달성' : gap <= 20 ? '근접' : '보강필요';
            return (
              <div key={i} className="d5-skill-card">
                <div className="d5-skill-icon" style={{ color: s.color, background: `${s.color}12` }}>
                  <i className={s.icon} />
                </div>
                <div className="d5-skill-info">
                  <div className="d5-skill-name">{s.name}</div>
                  <div className="d5-skill-bar-track">
                    <div className="d5-skill-bar-fill" style={{ width: `${s.score}%`, background: s.color }} />
                    <div className="d5-skill-target" style={{ left: `${s.target}%` }} />
                  </div>
                  <div className="d5-skill-meta">
                    <span>{s.score}점 / 목표 {s.target}점</span>
                    <span className={`d5-skill-status d5-status-${status === '달성' ? 'good' : status === '근접' ? 'mid' : 'low'}`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI 종합 코멘트 ── */}
      <div className="d5-section">
        <div className="d5-card">
          <div className="d5-card-head">
            <h3><i className="fa-solid fa-robot" style={{ color: '#2563EB' }} /> AI 종합 코멘트</h3>
          </div>
          <div className="d5-ai-comment" style={{ margin: 0 }}>
            <p style={{ marginBottom: 12, lineHeight: 1.7 }}>
              김민준님은 <strong>학업 역량(4.3/4.5)과 프로그래밍 실력이 우수</strong>하며,
              인적성검사에서도 80점으로 양호한 수준입니다. 현재 전체 역량 종합 점수는 <strong>68점</strong>으로
              상위 32%에 해당합니다.
            </p>
            <p style={{ lineHeight: 1.7 }}>
              <strong>추천 전략:</strong> 어학(TOEIC 700+)과 프로젝트 경험 보완에 집중하세요.
              CARES 검사 결과(88점) 기반으로 진로 결정력은 충분하므로, 실행 단계에 집중하는 것이 효과적입니다.
              9CORE 글로벌 역량(35점)도 어학 준비와 함께 개선될 것으로 예측됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* ── 여정 타임라인 ── */}
      <div className="d5-section">
        <div className="d5-section-head">
          <h2>나의 커리어 여정</h2>
          <p>단계별로 진행하면 AI가 다음을 추천합니다</p>
        </div>
        <div className="d5-journey">
          {journey.map((j, i) => (
            <div
              key={i}
              className={`d5-journey-item ${j.done ? 'd5-done' : ''} ${currentStep?.step === j.step ? 'd5-current' : ''}`}
              onClick={() => onNavigate(j.page)}
            >
              <div className="d5-journey-emoji">{j.emoji}</div>
              <div className="d5-journey-step">STEP {j.step}</div>
              <div className="d5-journey-title">{j.title}</div>
              <div className="d5-journey-sub">{j.sub}</div>
              {j.done && <div className="d5-journey-check"><i className="fa-solid fa-circle-check" /></div>}
              {currentStep?.step === j.step && <div className="d5-journey-badge">NOW</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── AI 기능 카드 ── */}
      <div className="d5-section">
        <div className="d5-section-head">
          <h2>AI 기능</h2>
          <p>AI가 분석하고 추천하는 스마트 기능</p>
        </div>
        <div className="d5-ai-grid">
          {aiCards.map((card, i) => (
            <button key={i} className="d5-ai-card" onClick={() => onNavigate(card.page)}>
              <div className="d5-ai-card-icon" style={{ background: card.gradient }}>
                <i className={card.icon} />
              </div>
              <div className="d5-ai-card-title">{card.title}</div>
              <div className="d5-ai-card-desc">{card.desc}</div>
              <div className="d5-ai-card-arrow"><i className="fa-solid fa-arrow-right" /></div>
            </button>
          ))}
        </div>
      </div>

      </div>{/* end d5-body-main */}

      {/* ── 우측 사이드바 ── */}
      <aside className="d5-sidebar">
        {/* 우선순위 요약 */}
        <div className="d5-sidebar-card">
          <h4 className="d5-sidebar-title">우선순위 요약</h4>
          <div className="d5-priority-list">
            {priorities.map((p, i) => (
              <div key={i} className="d5-priority-row">
                <span className="d5-priority-dot" style={{ background: p.level === '긴급' ? '#DC2626' : '#D1D5DB' }} />
                <span className="d5-priority-label">
                  {p.level} ({p.level === '긴급' ? 'High' : p.level === '보통' ? 'Medium' : 'Low'})
                </span>
                <span className="d5-priority-count" style={{ color: p.level === '긴급' ? '#DC2626' : '#6B7280' }}>
                  {p.count}개
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 추천 다음 행동 */}
        <div className="d5-sidebar-card">
          <h4 className="d5-sidebar-title">추천 다음 행동</h4>
          <div className="d5-action-list">
            {nextActions.map((a) => (
              <button key={a.rank} className="d5-action-item" onClick={() => onNavigate(a.page)}>
                <span className={`d5-action-rank ${a.urgent ? 'd5-action-urgent' : ''}`}>{a.rank}</span>
                <span className="d5-action-text">{a.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 빠른 링크 */}
        <div className="d5-sidebar-card">
          <h4 className="d5-sidebar-title">빠른 이동</h4>
          <div className="d5-quick-links">
            <button onClick={() => onNavigate('ai-roadmap')}><i className="fa-solid fa-route" /> AI 로드맵</button>
            <button onClick={() => onNavigate('program-apply')}><i className="fa-solid fa-calendar-check" /> 프로그램 신청</button>
            <button onClick={() => onNavigate('career-manage')}><i className="fa-solid fa-folder-open" /> 경력관리</button>
            <button onClick={() => onNavigate('my-portfolio')}><i className="fa-solid fa-id-badge" /> 포트폴리오</button>
          </div>
        </div>
      </aside>
      </div>{/* end d5-body-layout */}

      {/* ── AI 어시스턴트 FAB ── */}
      <button className="d5-ai-fab" onClick={() => setShowAiChat(!showAiChat)}>
        <i className={`fa-solid ${showAiChat ? 'fa-xmark' : 'fa-robot'}`} />
      </button>
      {showAiChat && (
        <div className="d5-ai-chat">
          <div className="d5-ai-chat-header">
            <i className="fa-solid fa-robot" /> AI 커리어 어시스턴트
          </div>
          <div className="d5-ai-chat-body">
            <div className="d5-ai-msg">
              안녕하세요! 김민준님의 현재 상태를 분석한 결과,
              <strong> 어학 성적 준비</strong>가 가장 시급합니다.
              TOEIC 준비 프로그램을 추천드릴까요?
            </div>
            <div className="d5-ai-suggestions">
              <button onClick={() => { onNavigate('program-apply'); setShowAiChat(false); }}>
                프로그램 추천받기
              </button>
              <button onClick={() => { onNavigate('counsel-career'); setShowAiChat(false); }}>
                상담 신청하기
              </button>
              <button onClick={() => { onNavigate('ai-roadmap'); setShowAiChat(false); }}>
                로드맵 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 검사 결과 상세 모달 ── */}
      <Modal open={examModal !== null} onClose={() => setExamModal(null)}
        title={examModal !== null ? `${examSummary[examModal].name} 세부 결과` : ''} size="lg">
        {examModal !== null && (() => {
          const ex = examSummary[examModal];
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  검사일: {ex.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>종합점수</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: ex.color }}>{ex.score}점</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* 레이더 차트 */}
                <div style={{ height: 300 }}>
                  <Radar data={makeRadarData(ex)} options={radarOptions} />
                </div>

                {/* 항목별 점수 바 */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 14 }}>항목별 점수</div>
                  {ex.items.map((item, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{item.name}</span>
                        <span style={{ color: ex.color, fontWeight: 700 }}>{item.score}점</span>
                      </div>
                      <div className="d5-bar-track" style={{ height: 8 }}>
                        <div className="d5-bar-fill" style={{ width: `${item.score}%`, background: ex.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 분석 코멘트 */}
              <div className="d5-ai-comment" style={{ marginTop: 20 }}>
                <div className="d5-ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
                {ex.aiComment}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── 진로 목표 편집 모달 ── */}
      <Modal open={goalModal} onClose={() => setGoalModal(false)} title="진로 목표 편집" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setGoalModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#2563EB', color: '#fff' }}
            onClick={() => { setGoalModal(false); onToast('진로 목표가 저장되었습니다'); }}>
            저장
          </button>
        </div>
      }>
        <FormField label="희망 기업" value={goalForm.company} onChange={v => setGoalForm({ ...goalForm, company: v })} />
        <FormField label="희망 직무" value={goalForm.role} onChange={v => setGoalForm({ ...goalForm, role: v })} />
        <FormField label="업종" value={goalForm.industry} onChange={v => setGoalForm({ ...goalForm, industry: v })} />
        <FormField label="목표 학점" type="number" value={goalForm.gpa} onChange={v => setGoalForm({ ...goalForm, gpa: v })} />
      </Modal>
    </div>
  );
}
