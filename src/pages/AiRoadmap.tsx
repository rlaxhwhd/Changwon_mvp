import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';

type StepStatus = 'completed' | 'in-progress' | 'locked';
type TaskStatus = 'done' | 'not-done' | 'locked';
type GapLevel = 'sufficient' | 'partial' | 'insufficient';
type ActionPriority = 'high' | 'medium' | 'maintain';

interface Task {
  text: string;
  status: TaskStatus;
}

interface Step {
  num: number;
  title: string;
  status: StepStatus;
  grade: string;
  period: string;
  tasks: Task[];
  detail: { desc: string; programs: string[]; tips: string[] };
}

interface Prerequisite {
  key: string;
  label: string;
  desc: string;
  done: boolean;
  weight: number;
  noCta?: boolean;
}

interface GapItem {
  label: string;
  level: GapLevel;
}

interface ActionItem {
  priority: ActionPriority;
  title: string;
  desc: string;
}

const INITIAL_STEPS: Step[] = [
  {
    num: 1, title: '기반 역량 구축', status: 'completed',
    grade: '2학년 1학기', period: '2025.03 ~ 2025.08',
    tasks: [
      { text: 'SQLD 자격증 취득', status: 'done' },
      { text: '9CORE 진로검사 완료 (68점)', status: 'done' },
      { text: '인적성검사 완료 (80점)', status: 'done' },
      { text: '학점 4.3 유지', status: 'done' },
    ],
    detail: {
      desc: '진로 설계를 위한 기초 데이터 수집 및 기반 역량 확보 단계입니다.',
      programs: ['SQLD 자격증 대비반', '9CORE 역량검사', '인적성검사'],
      tips: ['학점 관리가 가장 중요합니다', 'IT 관련 기초 자격증 1개 이상 보유 권장'],
    },
  },
  {
    num: 2, title: '핵심 역량 강화', status: 'in-progress',
    grade: '2학년 2학기', period: '2025.09 ~ 현재',
    tasks: [
      { text: 'TOEIC 700점 이상 취득', status: 'not-done' },
      { text: 'PMP 기초 학습 시작', status: 'not-done' },
      { text: '프로젝트 관리 비교과 프로그램 참여', status: 'not-done' },
      { text: '게임 기획 스터디 참여', status: 'not-done' },
    ],
    detail: {
      desc: '목표 직무에 필요한 핵심 역량을 집중 강화하는 단계입니다.',
      programs: ['TOEIC 집중반', 'PM 기초 워크숍', '게임 기획 스터디'],
      tips: ['TOEIC 700점은 IT PM의 기본 요건입니다', 'PMP 자격증은 3학년에 본격 준비하되 기초를 미리 쌓으세요'],
    },
  },
  {
    num: 3, title: '실전 경험 확대', status: 'locked',
    grade: '3학년', period: '2026.03 ~ 2026.12',
    tasks: [
      { text: '인턴십 또는 현장실습 참여', status: 'locked' },
      { text: 'OPIC 또는 TOEIC Speaking 취득', status: 'locked' },
      { text: '포트폴리오 프로젝트 1건 완성', status: 'locked' },
    ],
    detail: {
      desc: '실무 경험과 포트폴리오를 통해 취업 경쟁력을 높이는 단계입니다.',
      programs: ['현장실습 프로그램', 'OPIC 대비반', '캡스톤 디자인'],
      tips: ['게임/IT 분야 인턴십을 적극 지원하세요', '포트폴리오는 PM 관점의 프로젝트를 포함시키세요'],
    },
  },
  {
    num: 4, title: '취업 준비 완성', status: 'locked',
    grade: '4학년', period: '2027.03 ~ 2027.08',
    tasks: [
      { text: '넥슨코리아 IT PM 공채 지원', status: 'locked' },
      { text: '자소서·면접 준비 완성', status: 'locked' },
    ],
    detail: {
      desc: '최종 취업 목표 달성을 위한 마무리 준비 단계입니다.',
      programs: ['자소서 클리닉', '모의면접 프로그램', '취업캠프'],
      tips: ['넥슨 채용은 보통 상반기 / 하반기로 나뉩니다', '게임 산업에 대한 이해도를 보여주는 것이 중요합니다'],
    },
  },
];

const PREREQUISITES: Prerequisite[] = [
  { key: 'diagnosis', label: '진단검사', desc: '9CORE · 인적성검사 결과 보유', done: true, weight: 30 },
  { key: 'counseling', label: '진로 / 취업상담', desc: '상담사가 평가한 상담 이력 (DB 연동)', done: false, weight: 30, noCta: true },
  { key: 'form', label: 'AI 로드맵 입력 정보', desc: '희망기업 · 직무 · 학점 · 관심자격증', done: true, weight: 40 },
];

const GAP_ITEMS: GapItem[] = [
  { label: '학점 (GPA)', level: 'sufficient' },
  { label: '어학 성적', level: 'insufficient' },
  { label: 'IT 자격증', level: 'partial' },
  { label: '프로젝트 경험', level: 'insufficient' },
  { label: 'PM 역량', level: 'partial' },
  { label: '인적성', level: 'sufficient' },
];

const ACTION_ITEMS: ActionItem[] = [
  { priority: 'high', title: 'TOEIC 700점 취득', desc: '넥슨 IT PM 직무의 필수 어학 기준선' },
  { priority: 'medium', title: '프로젝트 관리 비교과 신청', desc: '실무 PM 사이클 경험 확보' },
  { priority: 'maintain', title: '학점 4.3 이상 유지', desc: '현재 충족 — 안정적으로 유지' },
];

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return <div className="roadmap-dot completed"><i className="fa-solid fa-check" /></div>;
  }
  if (status === 'in-progress') {
    return <div className="roadmap-dot in-progress"><div className="pulse" /></div>;
  }
  return <div className="roadmap-dot locked" />;
}

function TaskIcon({ status }: { status: TaskStatus }) {
  if (status === 'done') return <i className="fa-solid fa-circle-check" style={{ color: '#10B981', fontSize: 14 }} />;
  if (status === 'not-done') return <i className="fa-regular fa-circle" style={{ color: '#6366F1', fontSize: 14 }} />;
  return <i className="fa-solid fa-lock" style={{ color: '#D1D5DB', fontSize: 13 }} />;
}

function StatusBadge({ status }: { status: StepStatus }) {
  if (status === 'completed') return <span className="badge badge-green">완료</span>;
  if (status === 'in-progress') return <span className="badge badge-indigo">진행 중</span>;
  return null;
}

function GapBadge({ level }: { level: GapLevel }) {
  if (level === 'sufficient') return <span className="gap-pill sufficient">충족</span>;
  if (level === 'partial') return <span className="gap-pill partial">부분</span>;
  return <span className="gap-pill insufficient">미흡</span>;
}

function PriorityTag({ priority }: { priority: ActionPriority }) {
  if (priority === 'high') {
    return (
      <span className="action-tag high">
        <i className="fa-solid fa-circle-exclamation" /> 우선순위 1
      </span>
    );
  }
  if (priority === 'medium') {
    return (
      <span className="action-tag medium">
        <i className="fa-solid fa-thumbtack" /> 우선순위 2
      </span>
    );
  }
  return (
    <span className="action-tag maintain">
      <i className="fa-solid fa-circle-check" /> 유지사항
    </span>
  );
}

export default function AiRoadmap() {
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [genModal, setGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ companyType: '', company: '', role: '', gpa: '', cert: '' });

  const accuracy = PREREQUISITES.reduce((sum, p) => sum + (p.done ? p.weight : 0), 0);
  const accuracyLevel: 'high' | 'mid' | 'low' =
    accuracy >= 80 ? 'high' : accuracy >= 50 ? 'mid' : 'low';

  const handleToggleTask = (stepIdx: number, taskIdx: number) => {
    setSteps(prev => prev.map((s, si) => {
      if (si !== stepIdx) return s;
      return {
        ...s,
        tasks: s.tasks.map((t, ti) => {
          if (ti !== taskIdx || t.status === 'locked') return t;
          return { ...t, status: t.status === 'done' ? 'not-done' as TaskStatus : 'done' as TaskStatus };
        }),
      };
    }));
  };

  const handleGenerate = () => {
    setGenModal(false);
    setGenerating(true);
    setTimeout(() => setGenerating(false), 3000);
  };

  const detail = selectedStep !== null ? steps[selectedStep] : null;

  return (
    <div>
      <div className="page-header">
        <h1>AI 진로 로드맵</h1>
        <p>AI가 분석한 김민준님의 맞춤 단계별 진로 로드맵</p>
      </div>

      {/* ── 인포그래픽 로드맵 ── */}
      <div className="card road-card">
        <div className="road-wrap">
          <svg viewBox="0 0 1000 320" className="road-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A5B4FC" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            {/* 도로 외곽 */}
            <path
              d="M 70 220 C 200 220, 240 80, 380 80 C 520 80, 540 220, 660 220 C 780 220, 820 80, 940 80"
              stroke="#E0E7FF" strokeWidth="42" fill="none" strokeLinecap="round"
            />
            {/* 도로 본체 */}
            <path
              d="M 70 220 C 200 220, 240 80, 380 80 C 520 80, 540 220, 660 220 C 780 220, 820 80, 940 80"
              stroke="url(#roadGrad)" strokeWidth="32" fill="none" strokeLinecap="round"
            />
            {/* 중앙 점선 */}
            <path
              d="M 70 220 C 200 220, 240 80, 380 80 C 520 80, 540 220, 660 220 C 780 220, 820 80, 940 80"
              stroke="#fff" strokeWidth="2" fill="none"
              strokeDasharray="8 8" strokeLinecap="round" opacity="0.85"
            />
          </svg>

          {/* 메인 단계 사이의 sub-노드 (베지어 곡선상의 t=0.33, 0.66 지점) */}
          {[
            { x: 17.6, y: 57.5, label: '기초진단', side: 'bottom' as const },
            { x: 26.4, y: 36.6, label: '상담', side: 'top' as const },
            { x: 48.7, y: 36.3, label: '비교과 프로그램', side: 'top' as const },
            { x: 56.3, y: 56.9, label: '스펙가꾸기', side: 'bottom' as const },
          ].map((s, i) => (
            <div
              key={`sub-${i}`}
              className={`road-sub ${s.side}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <div className="road-sub-dot" />
              <div className="road-sub-label">{s.label}</div>
            </div>
          ))}

          {steps.map((step, i) => {
            const positions = [
              { x: 7, y: 68.75, side: 'top' as const },
              { x: 38, y: 25, side: 'bottom' as const },
              { x: 66, y: 68.75, side: 'top' as const },
              { x: 94, y: 25, side: 'bottom' as const },
            ];
            const p = positions[i];
            return (
              <div key={step.num}>
                <div
                  className={`road-marker ${step.status}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onClick={() => setSelectedStep(i)}
                >
                  <span className="road-marker-num">0{step.num}</span>
                </div>
                <div
                  className={`road-label-card ${p.side} ${step.status}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <div className="road-label-title">STEP 0{step.num}</div>
                  <div className="road-label-name">{step.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 정확도 & 입력 데이터 체크리스트 ── */}
      <div className="card prereq-card">
        <div className="prereq-head">
          <div>
            <div className="prereq-title">
              <i className="fa-solid fa-shield-halved" /> 로드맵 정확도
            </div>
            <div className="prereq-sub">
              아래 항목을 모두 채워야 AI 로드맵의 정확도가 올라갑니다. 1·2학년이 놓치기 쉬운 항목들이에요.
            </div>
          </div>
          <div className={`accuracy-ring ${accuracyLevel}`}>
            <div className="accuracy-num">{accuracy}<span>%</span></div>
            <div className="accuracy-cap">정확도</div>
          </div>
        </div>

        <div className="accuracy-bar-wrap">
          <div className={`accuracy-bar ${accuracyLevel}`} style={{ width: `${accuracy}%` }} />
        </div>

        <div className="prereq-grid">
          {PREREQUISITES.map(p => (
            <div key={p.key} className={`prereq-item ${p.done ? 'done' : 'todo'}`}>
              <div className="prereq-icon">
                {p.done
                  ? <i className="fa-solid fa-circle-check" />
                  : <i className="fa-regular fa-circle" />}
              </div>
              <div className="prereq-body">
                <div className="prereq-row">
                  <span className="prereq-label">{p.label}</span>
                  <span className="prereq-weight">+{p.weight}%</span>
                </div>
                <div className="prereq-desc">{p.desc}</div>
              </div>
              {!p.done && !p.noCta && (
                <button className="prereq-cta">
                  입력하기 <i className="fa-solid fa-arrow-right" />
                </button>
              )}
              {!p.done && p.noCta && (
                <span className="prereq-tag">
                  <i className="fa-solid fa-clock" /> 대기중
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 메인 2열: 로드맵 + 갭/액션 ── */}
      <div className="roadmap-layout">
        {/* 좌: 단계별 로드맵 */}
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-map" style={{ color: '#4F46E5' }} />
              단계별 진로 로드맵
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600 }}>2학년 2학기 진행 중</span>
              <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
                onClick={() => setGenModal(true)}>
                <i className="fa-solid fa-wand-magic-sparkles" /> AI 로드맵 재생성
              </button>
            </div>
          </div>

          {generating ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ marginBottom: 16, color: '#4F46E5', fontWeight: 600 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                AI가 맞춤 로드맵을 분석하고 있습니다...
              </div>
              <Skeleton lines={6} height={20} />
            </div>
          ) : (
            <div className="roadmap">
              {steps.map((step, si) => (
                <div key={step.num} className={`roadmap-step ${step.status}`}>
                  <div className="roadmap-left">
                    <StepIcon status={step.status} />
                    {si < steps.length - 1 && (
                      <div className={`roadmap-line ${step.status === 'completed' ? 'filled' : ''}`} />
                    )}
                  </div>
                  <div className="roadmap-content">
                    <div className="roadmap-header">
                      <span className="roadmap-title" style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedStep(si)}>
                        STEP {step.num} — {step.title}
                        <i className="fa-solid fa-chevron-right" style={{ fontSize: 11, marginLeft: 6, color: '#9CA3AF' }} />
                      </span>
                      <StatusBadge status={step.status} />
                    </div>
                    <div className="roadmap-meta">{step.grade} · {step.period}</div>
                    <div className="roadmap-tasks">
                      {step.tasks.map((task, ti) => (
                        <div key={ti}
                          className={`roadmap-task ${task.status}`}
                          style={{ cursor: task.status !== 'locked' ? 'pointer' : 'default' }}
                          onClick={() => handleToggleTask(si, ti)}>
                          <TaskIcon status={task.status} />
                          <span>{task.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 우: 갭 분석 + AI 액션 */}
        <div className="side-panel">
          <div className="card side-card">
            <div className="side-title">
              <span className="side-icon gap"><i className="fa-solid fa-chart-column" /></span>
              <div>
                <div className="side-name">역량 갭 분석</div>
                <div className="side-sub">목표 대비 보유 역량 현황</div>
              </div>
            </div>
            <div className="gap-list">
              {GAP_ITEMS.map(g => (
                <div key={g.label} className="gap-row">
                  <span className="gap-label">{g.label}</span>
                  <GapBadge level={g.level} />
                </div>
              ))}
            </div>
          </div>

          <div className="card side-card">
            <div className="side-title">
              <span className="side-icon action"><i className="fa-solid fa-bolt" /></span>
              <div>
                <div className="side-name">AI 추천 액션</div>
                <div className="side-sub">지금 해야 할 일</div>
              </div>
            </div>
            <div className="action-list">
              {ACTION_ITEMS.map((a, i) => (
                <div key={i} className={`action-card ${a.priority}`}>
                  <PriorityTag priority={a.priority} />
                  <div className="action-title">{a.title}</div>
                  <div className="action-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI 로드맵 생성 모달 */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="AI 로드맵 재생성" size="md" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setGenModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }} onClick={handleGenerate}>
            <i className="fa-solid fa-wand-magic-sparkles" /> AI 분석 시작
          </button>
        </div>
      }>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          아래 정보를 입력하면 AI가 맞춤 로드맵을 재생성합니다.
        </p>
        <FormField label="희망 기업유형" type="select" value={genForm.companyType} onChange={v => setGenForm({ ...genForm, companyType: v })} options={[
          { value: '대기업', label: '대기업' },
          { value: '공기업', label: '공기업' },
          { value: '중견기업', label: '중견기업' },
          { value: '중소기업', label: '중소기업' },
          { value: '외국계기업', label: '외국계기업' },
        ]} />
        <FormField label="목표 기업 (선택)" value={genForm.company} onChange={v => setGenForm({ ...genForm, company: v })} placeholder="예: 넥슨코리아" />
        <FormField label="희망 직무" value={genForm.role} onChange={v => setGenForm({ ...genForm, role: v })} placeholder="예: IT Project Manager" />
        <FormField label="목표 학점" type="number" value={genForm.gpa} onChange={v => setGenForm({ ...genForm, gpa: v })} placeholder="예: 4.0" />
        <FormField label="관심 자격증" type="select" value={genForm.cert} onChange={v => setGenForm({ ...genForm, cert: v })} options={[
          { value: 'pmp', label: 'PMP' },
          { value: 'sqld', label: 'SQLD' },
          { value: 'adsp', label: 'ADsP' },
          { value: 'engineer', label: '정보처리기사' },
        ]} />
      </Modal>

      {/* STEP 상세 Drawer */}
      <Modal size="lg"open={selectedStep !== null} onClose={() => setSelectedStep(null)}
        title={detail ? `STEP ${detail.num} — ${detail.title}` : ''}>
        {detail && (
          <div>
            <div className="detail-section">
              <div className="detail-section-title">단계 설명</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{detail.detail.desc}</p>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">추천 프로그램</div>
              {detail.detail.programs.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <i className="fa-solid fa-graduation-cap" style={{ color: '#4F46E5', fontSize: 13 }} />
                  <span style={{ fontSize: 14 }}>{p}</span>
                </div>
              ))}
            </div>
            <div className="detail-section">
              <div className="detail-section-title">AI 추천 팁</div>
              {detail.detail.tips.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', fontSize: 13, color: '#374151' }}>
                  <i className="fa-solid fa-lightbulb" style={{ color: '#F59E0B', marginTop: 2 }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div className="detail-section">
              <div className="detail-section-title">과제 목록</div>
              {detail.tasks.map((t, i) => (
                <div key={i} className={`roadmap-task ${t.status}`} style={{ padding: '8px 0' }}>
                  <TaskIcon status={t.status} />
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
