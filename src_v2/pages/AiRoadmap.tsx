import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';
import type { PageId } from '../types';

interface AiRoadmapProps {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string) => void;
}

interface Phase {
  num: number;
  title: string;
  emoji: string;
  status: 'done' | 'active' | 'upcoming';
  period: string;
  tasks: { text: string; done: boolean }[];
  recommendation: string;
  nextPage: PageId;
}

interface TargetCompany {
  name: string;
  industry: string;
  role: string;
  matchScore: number;
  requirements: { label: string; current: number; target: number }[];
}

const PHASES: Phase[] = [
  {
    num: 1, title: '나를 알기', emoji: '🔍', status: 'done', period: '2025.03 ~ 2025.08',
    tasks: [
      { text: '9CORE 진로적성검사 완료 (종합 68점)', done: true },
      { text: 'CARES 직무역량검사 완료 (분석력 상위 25%)', done: true },
      { text: 'MBTI 성격유형검사 완료 (INTJ-A)', done: true },
      { text: '인적성검사 종합 80점 달성', done: true },
      { text: '진로심리상담 1회 완료 (목표 직무 설정)', done: true },
    ],
    recommendation: '모든 진단을 완료했습니다. 진단 결과를 바탕으로 목표 기업과 직무를 설정하세요.',
    nextPage: 'career-diagnosis',
  },
  {
    num: 2, title: '전문 상담', emoji: '💬', status: 'done', period: '2025.05 ~ 2025.08',
    tasks: [
      { text: '진로취업상담 2회 완료 (IT PM 직무 탐색)', done: true },
      { text: '심리상담 1회 완료 (취업 스트레스 관리)', done: true },
      { text: '선배 멘토링 참여 (넥슨 재직자 멘토)', done: true },
      { text: '직무 적합도 리포트 발급 완료', done: true },
    ],
    recommendation: '전문 상담을 통해 IT PM 직무 방향이 확정되었습니다. 로드맵 생성으로 진행하세요.',
    nextPage: 'counsel-career',
  },
  {
    num: 3, title: '로드맵 생성', emoji: '🗺️', status: 'active', period: '2025.09 ~ 현재',
    tasks: [
      { text: 'AI 맞춤 로드맵 1차 생성 완료', done: true },
      { text: '목표 기업 설정: 넥슨코리아 IT PM', done: true },
      { text: '역량 GAP 분석 리포트 확인', done: true },
      { text: '취업예측분석 리포트 확인 (합격률 68%)', done: false },
      { text: '로드맵 기반 학기별 세부 계획 수립', done: false },
    ],
    recommendation: '로드맵이 생성되었습니다. GAP 분석을 참고하여 역량 강화 단계를 준비하세요.',
    nextPage: 'ai-roadmap',
  },
  {
    num: 4, title: '역량 강화', emoji: '💪', status: 'upcoming', period: '2026.03 ~ 2026.12',
    tasks: [
      { text: 'TOEIC 700점 이상 취득 (현재 550점)', done: false },
      { text: 'PMP/CAPM 자격증 학습 및 취득', done: false },
      { text: '캡스톤디자인 프로젝트 참여 (PM 역할)', done: false },
      { text: '게임/IT 관련 인턴십 지원 및 참여', done: false },
      { text: '비교과 프로그램 3건 이상 이수', done: false },
      { text: '포트폴리오 프로젝트 2건 완성', done: false },
    ],
    recommendation: '프로젝트 경험과 어학 점수가 가장 시급합니다. 캡스톤디자인 참여를 적극 추천합니다.',
    nextPage: 'program-apply',
  },
  {
    num: 5, title: '취업 지원', emoji: '🚀', status: 'upcoming', period: '2027.03 ~ 2027.08',
    tasks: [
      { text: 'AI 자기소개서 작성 및 첨삭 (넥슨 IT PM 맞춤)', done: false },
      { text: 'AI 모의면접 3회 이상 연습', done: false },
      { text: '넥슨코리아 IT PM 공채 지원', done: false },
      { text: '이력서·포트폴리오 최종 점검', done: false },
      { text: '병행 지원: 삼성전자 DS, LG전자 PM 직군', done: false },
    ],
    recommendation: 'AI 이력서와 모의면접으로 최종 완성도를 높이세요. 목표 기업 외 2~3곳 병행 지원을 추천합니다.',
    nextPage: 'ai-resume',
  },
];

const targetCompany: TargetCompany = {
  name: '넥슨코리아',
  industry: '게임 · IT서비스',
  role: 'IT Project Manager',
  matchScore: 68,
  requirements: [
    { label: '어학(TOEIC)', current: 550, target: 700 },
    { label: 'IT자격증', current: 1, target: 3 },
    { label: '프로젝트 경험', current: 0, target: 2 },
    { label: '인턴 경험', current: 0, target: 1 },
  ],
};

const strengthWeakness = [
  { label: '학점', value: 90, type: 'strength' as const },
  { label: '인성/심리', value: 80, type: 'strength' as const },
  { label: '어학', value: 20, type: 'weakness' as const },
  { label: 'IT자격증', value: 40, type: 'weakness' as const },
];

interface GapItem {
  title: string;
  badges: { label: string; type: 'required' | 'preferred' | 'weight' }[];
  desc: string;
  pct: number;
  current: string;
  target: string;
  severity: 'critical' | 'warn' | 'info';
}

const gapItems: GapItem[] = [
  {
    title: '프로젝트 포트폴리오',
    badges: [{ label: '필수', type: 'required' }, { label: '가중치 0.4', type: 'weight' }],
    desc: '넥슨코리아 IT PM 지원 시 프로젝트 관리 경험은 필수입니다. 현재 관련 프로젝트 경험이 없어 가장 시급하게 준비해야 합니다.',
    pct: 0, current: '미보유', target: '프로젝트 2건+',
    severity: 'critical',
  },
  {
    title: '인턴/실무 경험',
    badges: [{ label: '우대', type: 'preferred' }, { label: '가중치 0.2', type: 'weight' }],
    desc: '게임/IT 관련 인턴 경험이 있으면 서류 합격률이 크게 올라갑니다. 대외활동은 있지만 직무 관련 인턴이 없습니다.',
    pct: 25, current: '대외활동 2건', target: '관련 인턴 1회+',
    severity: 'critical',
  },
  {
    title: 'TOEIC 점수',
    badges: [{ label: '30점 부족', type: 'required' }, { label: '가중치 0.3', type: 'weight' }],
    desc: '현재 550점으로 기준(700)에 미달입니다. 150점만 올리면 충족합니다.',
    pct: 78, current: '550점', target: '700점 이상',
    severity: 'warn',
  },
  {
    title: 'IT 자격증 (PMP 등)',
    badges: [{ label: '우대', type: 'preferred' }, { label: '가중치 0.1', type: 'weight' }],
    desc: 'SQLD는 보유하고 있으나 PM 직무에 PMP 또는 CAPM 자격증이 있으면 가산점이 부여됩니다.',
    pct: 30, current: 'SQLD만 보유', target: 'PMP 우대',
    severity: 'info',
  },
];

export default function AiRoadmap({ onNavigate, onToast }: AiRoadmapProps) {
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());
  const [genModal, setGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ company: '', role: '', gpa: '', cert: '' });

  const activePhase = PHASES.find(p => p.status === 'active');
  const progress = Math.round((PHASES.filter(p => p.status === 'done').length / PHASES.length) * 100);

  const handleGenerate = () => {
    setGenModal(false);
    setGenerating(true);
    setTimeout(() => { setGenerating(false); onToast('로드맵이 업데이트되었습니다!'); }, 2500);
  };

  return (
    <div className="r5-root">
      {/* ── Hero (3번 스타일) ── */}
      <div className="r5-hero">
        <div className="r5-hero-bg" />
        <div className="r5-hero-inner">
          <div className="r5-hero-text">
            <p className="r5-hero-label">AI CAREER ROADMAP</p>
            <h1 className="r5-hero-title">
              AI가 설계한<br />
              <span className="r5-gradient-text">맞춤 진로 로드맵</span>
            </h1>
            <p className="r5-hero-sub">목표: 넥슨코리아 · IT Project Manager</p>
            <div className="r5-hero-actions">
              <button className="r5-btn-primary" onClick={() => setGenModal(true)}>
                <i className="fa-solid fa-wand-magic-sparkles" /> 로드맵 재생성
              </button>
              <button className="r5-btn-ghost" onClick={() => onNavigate('dashboard')}>
                대시보드로 <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
          <div className="r5-hero-right">
            <div className="r5-accuracy-ring">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(129,140,248,0.1)" strokeWidth="6" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#818CF8" strokeWidth="6"
                  strokeDasharray={`${(progress / 100) * 327} 327`}
                  strokeLinecap="round" transform="rotate(-90 60 60)"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.4))' }} />
              </svg>
              <div className="r5-accuracy-text">
                <span className="r5-accuracy-num">{progress}%</span>
                <span className="r5-accuracy-label">로드맵 달성률</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {generating && (
        <div style={{ padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20, color: '#3B82F6', fontWeight: 600 }}>
            <i className="fa-solid fa-spinner fa-spin" /> AI가 분석 중입니다...
          </div>
          <Skeleton lines={5} />
        </div>
      )}

      {!generating && (
        <div className="r5-body-layout">
        <div className="r5-body-main">
          {/* ── Phase Cards ── */}
          <div className="r5-phases">
            <h2 className="r5-section-title">커리어 로드맵</h2>
            <div className="r5-phase-list">
              {PHASES.map((phase, i) => {
                const phaseCard = (
                  <div
                    key={`phase-${i}`}
                    className={`r5-phase r5-phase-${phase.status}`}
                  >
                    <div className="r5-phase-header" style={{ cursor: 'pointer' }} onClick={() => {
                      const next = new Set(collapsedPhases);
                      if (next.has(phase.num)) { next.delete(phase.num); } else { next.add(phase.num); }
                      setCollapsedPhases(next);
                    }}>
                      <div className="r5-phase-left">
                        <span className="r5-phase-emoji">{phase.emoji}</span>
                        <div>
                          <div className="r5-phase-num">PHASE {phase.num}</div>
                          <div className="r5-phase-title">{phase.title}</div>
                        </div>
                      </div>
                      <div className="r5-phase-right">
                        <span className="r5-phase-period">{phase.period}</span>
                        <span className={`r5-phase-badge r5-badge-${phase.status}`}>
                          {phase.status === 'done' ? '✓ 완료' : phase.status === 'active' ? '진행 중' : '예정'}
                        </span>
                        <i className={`fa-solid fa-chevron-${collapsedPhases.has(phase.num) ? 'down' : 'up'}`} style={{ color: '#9CA3AF', fontSize: 12 }} />
                      </div>
                    </div>

                    {!collapsedPhases.has(phase.num) && <div className="r5-phase-body">
                        <div className="r5-phase-tasks">
                          {phase.tasks.map((t, ti) => (
                            <div key={ti} className={`r5-task ${t.done ? 'r5-task-done' : ''}`}>
                              <i className={t.done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} />
                              <span>{t.text}</span>
                            </div>
                          ))}
                        </div>
                        <div className="r5-phase-rec">
                          <i className="fa-solid fa-lightbulb" />
                          <span>{phase.recommendation}</span>
                        </div>
                        <button className="r5-btn-sm" onClick={() => onNavigate(phase.nextPage)}>
                          다음 단계로 <i className="fa-solid fa-arrow-right" />
                        </button>
                      </div>}
                  </div>
                );

                /* PHASE 1 다음에 목표기업 설정 카드 삽입 */
                if (phase.num === 1) {
                  return [
                    phaseCard,
                    <div key="target-company" className="r5-target-card">
                      <div className="r5-target-header">
                        <div className="r5-target-left">
                          <span className="r5-phase-emoji">🏢</span>
                          <div>
                            <div className="r5-phase-num" style={{ color: '#6366F1' }}>TARGET</div>
                            <div className="r5-phase-title">목표기업 설정</div>
                          </div>
                        </div>
                        <div className="r5-target-match">
                          <span className="r5-target-match-num">{targetCompany.matchScore}%</span>
                          <span className="r5-target-match-label">AI 매칭률</span>
                        </div>
                      </div>

                      <div className="r5-target-body">
                        <div className="r5-target-info">
                          <div className="r5-target-company-row">
                            <div className="r5-target-logo">
                              <i className="fa-solid fa-building" />
                            </div>
                            <div>
                              <div className="r5-target-name">{targetCompany.name}</div>
                              <div className="r5-target-meta">{targetCompany.industry} · {targetCompany.role}</div>
                            </div>
                          </div>
                        </div>

                        <div className="r5-target-reqs">
                          <div className="r5-target-reqs-title">
                            <i className="fa-solid fa-chart-bar" /> 주요 요건 vs 현재 수준
                          </div>
                          {targetCompany.requirements.map((r, ri) => {
                            const pct = Math.min(Math.round((r.current / r.target) * 100), 100);
                            return (
                              <div key={ri} className="r5-target-req-row">
                                <span className="r5-target-req-label">{r.label}</span>
                                <div className="r5-target-req-bar">
                                  <div
                                    className={`r5-target-req-fill ${pct >= 80 ? 'r5-target-fill-high' : pct >= 50 ? 'r5-target-fill-mid' : 'r5-target-fill-low'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="r5-target-req-val">{r.current}/{r.target}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="r5-target-ai-tip">
                          <i className="fa-solid fa-robot" />
                          <span>넥슨코리아 IT PM 합격을 위해 <strong>TOEIC 150점 향상</strong>과 <strong>IT자격증 2개 추가</strong>가 필요합니다. PHASE 2에서 집중 보강하세요.</span>
                        </div>
                      </div>
                    </div>,
                  ];
                }

                return phaseCard;
              })}
            </div>
          </div>

          {/* ── 강점 / 약점 ── */}
          <div className="r5-analysis">
            <h2 className="r5-section-title">AI 역량 분석</h2>
            <div className="r5-sw-grid">
              <div className="r5-sw-card r5-sw-strength">
                <h3><i className="fa-solid fa-arrow-up" /> 강점</h3>
                {strengthWeakness.filter(s => s.type === 'strength').map((s, i) => (
                  <div key={i} className="r5-sw-item">
                    <span>{s.label}</span>
                    <div className="r5-sw-bar">
                      <div className="r5-sw-fill r5-fill-good" style={{ width: `${s.value}%` }} />
                    </div>
                    <span className="r5-sw-val">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="r5-sw-card r5-sw-weakness">
                <h3><i className="fa-solid fa-arrow-down" /> 보강 필요</h3>
                {strengthWeakness.filter(s => s.type === 'weakness').map((s, i) => (
                  <div key={i} className="r5-sw-item">
                    <span>{s.label}</span>
                    <div className="r5-sw-bar">
                      <div className="r5-sw-fill r5-fill-bad" style={{ width: `${s.value}%` }} />
                    </div>
                    <span className="r5-sw-val">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 보강이 필요한 항목 ── */}
          <div className="r5-gap-section">
            <div className="r5-gap-section-header">
              <h2 className="r5-section-title">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#EF4444', marginRight: 8 }} />
                보강이 필요한 항목
              </h2>
              <span className="r5-gap-count">{gapItems.length}개 항목</span>
            </div>
            <div className="r5-gap-list">
              {gapItems.map((item, i) => (
                <div key={i} className={`r5-gap-card r5-gap-${item.severity}`}>
                  <div className="r5-gap-card-top">
                    <i className={`r5-gap-icon fa-solid ${item.severity === 'critical' ? 'fa-circle-exclamation' : item.severity === 'warn' ? 'fa-triangle-exclamation' : 'fa-minus'}`} />
                    <div className="r5-gap-card-title">{item.title}</div>
                    {item.badges.map((b, bi) => (
                      <span key={bi} className={`r5-gap-badge-tag r5-gap-badge-${b.type}`}>{b.label}</span>
                    ))}
                  </div>
                  <p className="r5-gap-card-desc">{item.desc}</p>
                  <div className="r5-gap-bar-row">
                    <div className="r5-gap-bar-track">
                      <div
                        className={`r5-gap-bar-fill r5-gap-fill-${item.severity}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className={`r5-gap-bar-pct r5-gap-pct-${item.severity}`}>{item.pct}%</span>
                  </div>
                  <div className="r5-gap-card-bottom">
                    <span>현재: <strong>{item.current}</strong></span>
                    <span>요구: <strong>{item.target}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          {activePhase && (
            <div className="r5-cta">
              <div className="r5-cta-inner">
                <span className="r5-cta-emoji">{activePhase.emoji}</span>
                <div className="r5-cta-text">
                  <strong>현재 단계: {activePhase.title}</strong>
                  <p>{activePhase.recommendation}</p>
                </div>
                <button className="r5-btn-primary" onClick={() => onNavigate(activePhase.nextPage)}>
                  다음 단계 <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="r5-sidebar">
          {/* AI 종합 인사이트 */}
          <div className="r5-side-card">
            <h3 className="r5-side-title">AI 종합 인사이트</h3>
            <div className="r5-insight-box">
              <div className="r5-insight-label"><i className="fa-solid fa-circle-info" /> AI 분석 요약</div>
              <p className="r5-insight-text">
                김민준님은 <strong>학업 역량이 우수</strong>하여 기본 서류 요건은 충족합니다.
                가중치 분석 결과, 핵심 GAP은 <strong>프로젝트 경험(가중치 0.4)</strong>과
                직무 관련 <strong>인턴 경험(가중치 0.2)</strong>입니다.
                필수 스펙 GAP(-35점)을 먼저 해소하면 <span className="r5-insight-highlight">달성 가능성 90% 이상</span> 도달이 가능합니다.
              </p>
            </div>
          </div>

          {/* 우선순위 요약 */}
          <div className="r5-side-card">
            <h3 className="r5-side-title">우선순위 요약</h3>
            <div className="r5-priority-list">
              <div className="r5-priority-row">
                <span className="r5-priority-dot" style={{ background: '#EF4444' }} />
                <span className="r5-priority-label">긴급 (High)</span>
                <span className="r5-priority-count" style={{ color: '#EF4444' }}>2개</span>
              </div>
              <div className="r5-priority-row">
                <span className="r5-priority-dot" style={{ background: '#F59E0B' }} />
                <span className="r5-priority-label">보통 (Medium)</span>
                <span className="r5-priority-count" style={{ color: '#F59E0B' }}>1개</span>
              </div>
              <div className="r5-priority-row">
                <span className="r5-priority-dot" style={{ background: '#9CA3AF' }} />
                <span className="r5-priority-label">낮음 (Low)</span>
                <span className="r5-priority-count" style={{ color: '#6B7280' }}>1개</span>
              </div>
            </div>
          </div>

          {/* 추천 다음 행동 */}
          <div className="r5-side-card">
            <h3 className="r5-side-title">추천 다음 행동</h3>
            <div className="r5-next-actions">
              <div className="r5-next-item">
                <span className="r5-next-num">1</span>
                <span className="r5-next-text"><strong>프로젝트 팀</strong> 모집 공고 확인 (캡스톤디자인 4월 마감)</span>
              </div>
              <div className="r5-next-item">
                <span className="r5-next-num">2</span>
                <span className="r5-next-text"><strong>넥슨코리아 하계 인턴</strong> 공고 확인 (5월 예상)</span>
              </div>
              <div className="r5-next-item">
                <span className="r5-next-num">3</span>
                <span className="r5-next-text"><strong>TOEIC 재응시</strong> — 목표 700+ (150점 상향)</span>
              </div>
              <div className="r5-next-item">
                <span className="r5-next-num">4</span>
                <span className="r5-next-text"><strong>PMP 기초과정</strong> 온라인 수강 시작</span>
              </div>
            </div>
          </div>
        </aside>
        </div>
      )}

      {/* ── 재생성 모달 ── */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="AI 로드맵 재생성" size="sm" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setGenModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#3B82F6', color: '#fff' }} onClick={handleGenerate}>
            <i className="fa-solid fa-wand-magic-sparkles" /> 생성하기
          </button>
        </div>
      }>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>정보를 수정하면 더 정확한 로드맵을 받을 수 있습니다.</p>
        <FormField label="희망 기업" value={genForm.company} onChange={v => setGenForm({ ...genForm, company: v })} placeholder="예: 넥슨코리아" />
        <FormField label="희망 직무" value={genForm.role} onChange={v => setGenForm({ ...genForm, role: v })} placeholder="예: IT PM" />
        <FormField label="현재 학점" value={genForm.gpa} onChange={v => setGenForm({ ...genForm, gpa: v })} placeholder="예: 4.3" />
        <FormField label="관심 자격증" value={genForm.cert} onChange={v => setGenForm({ ...genForm, cert: v })} placeholder="예: PMP, TOEIC" />
      </Modal>
    </div>
  );
}
