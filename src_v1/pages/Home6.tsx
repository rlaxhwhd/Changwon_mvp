import { useState } from 'react';
import type { PageId } from '../types';

interface Home6Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

/* ── sidebar nav ── */
const sidebarSections = [
  {
    title: 'AI커리어라운지',
    items: [{ id: 'dashboard' as PageId, label: 'AI커리어라운지', icon: 'fa-solid fa-brain' }],
  },
  {
    title: '진단센터',
    items: [
      { id: 'career-diagnosis' as PageId, label: '진로취업진단', icon: 'fa-solid fa-clipboard-check' },
      { id: 'personality-diagnosis' as PageId, label: '성격심리진단', icon: 'fa-solid fa-heart-pulse' },
    ],
  },
  {
    title: '전문상담',
    items: [
      { id: 'counsel-career' as PageId, label: '진로취업상담', icon: 'fa-solid fa-comments' },
      { id: 'counsel-employ' as PageId, label: '심리상담', icon: 'fa-solid fa-hand-holding-heart' },
    ],
  },
  {
    title: '역량개발센터',
    items: [
      { id: 'program-apply' as PageId, label: '프로그램 신청', icon: 'fa-solid fa-calendar-check' },
      { id: 'career-manage' as PageId, label: '경력개발 관리', icon: 'fa-solid fa-folder-open' },
      { id: 'daily-mission' as PageId, label: '오늘의 성장미션', icon: 'fa-solid fa-star' },
    ],
  },
  {
    title: '경력개발 로드맵',
    items: [
      { id: 'ai-roadmap' as PageId, label: 'AI진로로드맵', icon: 'fa-solid fa-route' },
      { id: 'ai-prediction' as PageId, label: '취업예측분석', icon: 'fa-solid fa-chart-pie' },
      { id: 'ai-jobs' as PageId, label: 'AI맞춤채용', icon: 'fa-solid fa-briefcase' },
      { id: 'ai-resume' as PageId, label: 'AI자소서/면접', icon: 'fa-solid fa-file-lines' },
    ],
  },
  {
    title: '취업지원',
    items: [
      { id: 'job-posting' as PageId, label: '채용공고', icon: 'fa-solid fa-bullhorn' },
      { id: 'worknet-jobs' as PageId, label: '워크넷 채용', icon: 'fa-solid fa-building' },
    ],
  },
  {
    title: '마이페이지',
    items: [
      { id: 'my-home' as PageId, label: '마이홈', icon: 'fa-solid fa-house-user' },
      { id: 'my-portfolio' as PageId, label: '포트폴리오', icon: 'fa-solid fa-id-badge' },
      { id: 'mypage' as PageId, label: '내 정보', icon: 'fa-solid fa-user-gear' },
    ],
  },
];

/* ── mock data ── */
const statCards = [
  { label: '로드맵 달성률', value: 25, icon: 'fa-solid fa-route', color: '#0D8B7C', bg: '#F0FDFA', unit: '%' },
  { label: '역량점수', value: 55, icon: 'fa-solid fa-chart-line', color: '#0E7490', bg: '#ECFEFF', unit: '점' },
  { label: 'AI추천 프로그램', value: 8, icon: 'fa-solid fa-wand-magic-sparkles', color: '#047857', bg: '#ECFDF5', unit: '건' },
  { label: '한 달내 접속일수', value: 12, icon: 'fa-solid fa-calendar-check', color: '#1D4ED8', bg: '#EFF6FF', unit: '일' },
];

const targetCompany = {
  name: '두산에너빌리티',
  role: 'IT · 하드웨어 솔루션',
  employees: '7,491명',
  logo: 'fa-solid fa-building',
  matchScore: 68,
  gaps: [
    { label: '학점 (4.3/4.5)', pct: 96 },
    { label: 'NCS 역량점수', pct: 60 },
    { label: '외국어 (TOEIC 650)', pct: 45, warn: true },
    { label: '자격증 (SQLD)', pct: 80 },
    { label: '프로젝트 경험', pct: 35, warn: true },
  ],
};

const ranking = { rank: 12, total: 48, dept: '컴퓨터공학과' };

const competencyRadar = [
  { label: '9CORE', pct: 68 },
  { label: 'CARES', pct: 72 },
  { label: 'MBTI', pct: 85 },
  { label: '인적성', pct: 80 },
  { label: '이수프로그램', pct: 60 },
];

const recommendedCompanies = [
  { name: '두산에너빌리티', match: 68, icon: 'fa-solid fa-industry', color: '#0D8B7C' },
  { name: '삼성전자 DS', match: 62, icon: 'fa-solid fa-microchip', color: '#0E7490' },
  { name: 'LG전자', match: 58, icon: 'fa-solid fa-tv', color: '#047857' },
  { name: '현대자동차', match: 55, icon: 'fa-solid fa-car', color: '#1D4ED8' },
];

const aiTips = [
  { icon: 'fa-solid fa-lightbulb', text: '어학성적(TOEIC)이 부족합니다. CARES에서 영어기초 강의부터 시작해보세요.' },
  { icon: 'fa-solid fa-route', text: '프로젝트경험이(1건)이 부족합니다. 캡스톤디자인이나 팀프로젝트에 참여하세요.' },
];

const todoItems = [
  { text: 'TOEIC 650점 달성 (현 0점)', done: false },
  { text: '실전 프로젝트 1건 추가', done: false },
  { text: '진로상담 완료 후 로드맵 확인', done: false },
  { text: '캡스톤디자인(2/1) or 현장실습 목표 설정', done: false },
  { text: '특강/세미나(취업) 최소 1건 참여', done: false },
];

export default function Home6({ onNavigate, onToast }: Home6Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorTheme, setColorTheme] = useState<'cyber' | 'blue'>('blue');

  return (
    <div className={`h6-layout h6-theme-${colorTheme}`}>
      {/* ── LEFT SIDEBAR ── */}
      <aside className="h6-sidebar">
        <div className="h6-sidebar-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-graduation-cap" />
          <div>
            <div className="h6-sidebar-brand-sub">Talent ON</div>
            <div className="h6-sidebar-brand">DREAMCATCH</div>
          </div>
        </div>

        <nav className="h6-sidebar-nav">
          {sidebarSections.map((sec) => (
            <div key={sec.title} className="h6-nav-section">
              <div className="h6-nav-section-title h6-nav-open">
                <span>{sec.title}</span>
              </div>
              <div className="h6-nav-items">
                {sec.items.map((item) => (
                  <button key={item.id} className="h6-nav-item" onClick={() => onNavigate(item.id)}>
                    <i className={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="h6-v2-link"
          onClick={() => { window.location.href = '/v2'; }}
          style={{
            margin: '12px 16px',
            padding: '10px 14px',
            border: '1px dashed rgba(148, 163, 184, 0.5)',
            borderRadius: 8,
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 13,
          }}
        >
          <span><i className="fa-solid fa-flask" style={{ marginRight: 8 }} />V2 시안 보기</span>
          <i className="fa-solid fa-arrow-right" />
        </button>

        <div className="h6-sidebar-user">
          <div className="h6-user-avatar">
            <i className="fa-solid fa-user" />
          </div>
          <div className="h6-user-info">
            <span className="h6-user-name">김민준</span>
            <span className="h6-user-dept">컴퓨터공학과 · 2학년</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="h6-main">
        {/* ── Search Bar ── */}
        <div className="h6-search-bar">
          <div className="h6-search-inner">
            <i className="fa-solid fa-search" />
            <input
              type="text"
              placeholder="프로그램, 채용정보, 상담 등을 검색하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="h6-theme-toggle">
            <button
              className={`h6-theme-btn ${colorTheme === 'cyber' ? 'h6-theme-active' : ''}`}
              onClick={() => setColorTheme('cyber')}
            >
              <i className="fa-solid fa-bolt" /> Cyber
            </button>
            <button
              className={`h6-theme-btn ${colorTheme === 'blue' ? 'h6-theme-active' : ''}`}
              onClick={() => setColorTheme('blue')}
            >
              <i className="fa-solid fa-droplet" /> Ocean
            </button>
          </div>
          <div className="h6-search-right">
            <button className="h6-search-icon-btn" onClick={() => onToast('알림이 없습니다', 'info')}>
              <i className="fa-solid fa-bell" />
            </button>
            <button className="h6-search-icon-btn" onClick={() => onNavigate('mypage')}>
              <i className="fa-solid fa-gear" />
            </button>
          </div>
        </div>

        {/* ── Hero + Mission Row ── */}
        <div className="h6-hero-row">
          <div className="h6-hero">
            <img src="/login.jpg" alt="" className="h6-hero-bg" />
            <div className="h6-hero-overlay" />
            <div className="h6-hero-content">
              <div className="h6-hero-badge">DREAMCATCH 2026 · EDITION Ⅴ</div>
              <h1 className="h6-hero-title">
                안녕하세요, <span>김민준</span>님
              </h1>
              <p className="h6-hero-sub">
                꿈을 향한 로드맵, 지금 당신의 역량을 AI로 진단하고 성장하세요.
              </p>
            </div>
          </div>

          {/* ── 보유 트로피 ── */}
          <div className="h6-trophy-card">
            <div className="h6-trophy-header">
              <i className="fa-solid fa-trophy" />
              <span>보유 트로피</span>
            </div>
            <div className="h6-trophy-body">
              {[
                { name: '미션왕', emoji: '📚', desc: '성장미션 7회 성공마다 +1', count: 2, current: 5, target: 7, color: '#F59E0B', bg: '#FFFBEB' },
                { name: '역량개발왕', emoji: '🏆', desc: '비교과 프로그램 7개 이수마다 +1', count: 1, current: 3, target: 7, color: '#7C3AED', bg: '#F5F3FF' },
                { name: '상담왕', emoji: '💬', desc: '상담 5회 완료마다 +1', count: 0, current: 2, target: 5, color: '#0D8B7C', bg: '#F0FDFA' },
              ].map((trophy, i) => (
                <div key={i} className="h6-trophy-item">
                  <div className="h6-trophy-icon" style={{ background: trophy.bg }}>{trophy.emoji}</div>
                  <div className="h6-trophy-info">
                    <span className="h6-trophy-name">{trophy.name}</span>
                    <span className="h6-trophy-desc">{trophy.desc}</span>
                    <div className="h6-trophy-progress">
                      <div className="h6-trophy-progress-fill" style={{ width: `${(trophy.current / trophy.target) * 100}%` }} />
                    </div>
                  </div>
                  <div className="h6-trophy-count">
                    {trophy.count}<span className="h6-trophy-unit">개</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 오늘의 성장미션 (히어로 옆) ── */}
          <div className="h6-hero-mission">
            <div className="h6-hero-mission-header">
              <i className="fa-solid fa-star" />
              <span>오늘의 성장미션</span>
            </div>
            <div className="h6-hero-mission-body">
              <div className="h6-hero-mission-emoji">🎯</div>
              <strong>TOEIC 영단어 일일미션</strong>
              <p>오늘의 영단어 10개를 학습하고 퀴즈를 풀어보세요</p>
            </div>
            <button className="h6-hero-mission-btn" onClick={() => onNavigate('daily-mission' as PageId)}>
              미션 시작하기 <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>

        {/* ── 신입생 가이드 플로우 ── */}
        <div className="h6-guide">
          <div className="h6-guide-header">
            <div className="h6-guide-title-row">
              <i className="fa-solid fa-map-signs" />
              <div>
                <h2 className="h6-guide-title">드림캐치 시작 가이드</h2>
                <p className="h6-guide-sub">처음이라면 아래 순서대로 진행해보세요. 각 단계를 클릭하면 바로 이동합니다.</p>
              </div>
            </div>
          </div>
          <div className="h6-guide-steps">
            {[
              { step: 1, title: '진단센터', desc: '나를 진단하고 이해해요', detail: '9CORE · 인적성 · CARES 검사로 내 역량과 성격을 파악합니다.', icon: 'fa-regular fa-circle-user', page: 'career-diagnosis' as PageId, color: '#334155' },
              { step: 2, title: '목표 기업 설정', desc: '꿈을 구체화해요', detail: 'AI가 희망 기업·직무 기반으로 합격률을 분석하고 부족한 역량을 알려줍니다.', icon: 'fa-regular fa-building', page: 'ai-prediction' as PageId, color: '#334155' },
              { step: 3, title: '전문 상담', desc: '전문가와 함께 설계해요', detail: '진로/취업 상담사, 심리 상담사와 1:1 상담으로 방향을 잡아보세요.', icon: 'fa-regular fa-comments', page: 'counsel-career' as PageId, color: '#334155' },
              { step: 4, title: '로드맵 생성', desc: 'AI가 경로를 그려줘요', detail: '진단 + 상담 데이터를 종합해서 나만의 커리어 로드맵을 생성합니다.', icon: 'fa-solid fa-route', page: 'ai-roadmap' as PageId, color: '#334155' },
              { step: 5, title: '역량 개발', desc: '부족한 부분을 채워요', detail: '로드맵에 따라 비교과 프로그램, 자격증, 어학 등에 참여합니다.', icon: 'fa-solid fa-chart-column', page: 'program-apply' as PageId, color: '#2563EB' },
              { step: 6, title: '취업 지원', desc: '꿈에 도달하세요', detail: 'AI 이력서·면접 준비, 맞춤 채용공고로 최종 취업까지 지원합니다.', icon: 'fa-solid fa-briefcase', page: 'ai-jobs' as PageId, color: '#334155' },
            ].map((s, i, arr) => {
              const isCurrent = s.step === 5;
              return (
              <div key={i} className={`h6-guide-step${isCurrent ? ' h6-guide-current' : ''}`} onClick={() => onNavigate(s.page)}>
                {isCurrent && <div className="h6-guide-current-label">현재 진행중</div>}
                <div className="h6-guide-step-num">{String(s.step).padStart(2, '0')}</div>
                <div className="h6-guide-step-icon" style={{ color: s.color }}>
                  <i className={s.icon} />
                </div>
                <div className="h6-guide-step-title">{s.title}</div>
                <div className="h6-guide-step-desc">{s.desc}</div>
                <div className="h6-guide-step-detail">{s.detail}</div>
                {i < arr.length - 1 && (
                  <div className="h6-guide-arrow">
                    <i className="fa-solid fa-chevron-right" />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* ── Body: Center + Right ── */}
        <div className="h6-body">
          {/* ── CENTER COLUMN ── */}
          <div className="h6-center">
            {/* Stat cards */}
            <div className="h6-stat-row">
              {statCards.map((s, i) => (
                <div key={i} className="h6-stat-card">
                  <div className="h6-stat-icon">
                    <i className={s.icon} />
                  </div>
                  <div className="h6-stat-label">{s.label}</div>
                  <div className="h6-stat-value">
                    {s.value}<span className="h6-stat-unit">{s.unit || '점'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Target company */}
            <div className="h6-card">
              <div className="h6-card-header">
                <h3><i className="fa-solid fa-bullseye" /> 목표 기업&middot;합격분석</h3>
                <button className="h6-text-btn" onClick={() => onNavigate('ai-prediction')}>
                  상세 분석 <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
              <div className="h6-target-row">
                <div className="h6-target-info">
                  <div className="h6-target-company">
                    <div className="h6-target-logo">
                      <i className={targetCompany.logo} />
                    </div>
                    <div>
                      <div className="h6-target-name">{targetCompany.name}</div>
                      <div className="h6-target-meta">{targetCompany.role} · {targetCompany.employees}</div>
                    </div>
                  </div>
                  <div className="h6-gap-list">
                    {targetCompany.gaps.map((g, i) => (
                      <div key={i} className="h6-gap-item">
                        <span className="h6-gap-label">{g.label}</span>
                        <div className="h6-gap-bar">
                          <div
                            className={`h6-gap-fill ${g.warn ? 'h6-gap-warn' : ''}`}
                            style={{ width: `${g.pct}%` }}
                          />
                        </div>
                        <span className="h6-gap-pct">{g.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h6-target-gauge">
                  <svg viewBox="0 0 100 100" className="h6-match-ring">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="7" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#0D8B7C" strokeWidth="7"
                      strokeDasharray={`${(targetCompany.matchScore / 100) * 264} 264`}
                      strokeLinecap="round" transform="rotate(-90 50 50)" />
                  </svg>
                  <div className="h6-match-text">
                    <span className="h6-match-num">{targetCompany.matchScore}%</span>
                    <span className="h6-match-label">합격예측</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI tips */}
            <div className="h6-card">
              <div className="h6-card-header">
                <h3><i className="fa-solid fa-robot" /> AI 커리어 팁</h3>
              </div>
              <div className="h6-tips">
                {aiTips.map((tip, i) => (
                  <div key={i} className="h6-tip-item">
                    <i className={tip.icon} />
                    <span>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="h6-right">
            {/* Ranking */}
            <div className="h6-card h6-card-sm">
              <div className="h6-card-header">
                <h3>내 순위 ({ranking.dept})</h3>
              </div>
              <div className="h6-rank-display">
                <span className="h6-rank-num">{ranking.rank}<span>위</span></span>
                <span className="h6-rank-total">/ {ranking.total}명</span>
              </div>
              <div className="h6-rank-bars">
                {competencyRadar.map((c, i) => (
                  <div key={i} className="h6-rank-bar-row">
                    <span className="h6-rank-bar-label">{c.label}</span>
                    <div className="h6-rank-bar-track">
                      <div className="h6-rank-bar-fill" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="h6-rank-bar-val">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended companies */}
            <div className="h6-card h6-card-sm">
              <div className="h6-card-header">
                <h3>추천 기업</h3>
              </div>
              <div className="h6-rec-list">
                {recommendedCompanies.map((c, i) => (
                  <div key={i} className="h6-rec-item" onClick={() => onNavigate('company-info')}>
                    <div className="h6-rec-icon" style={{ color: c.color, background: `${c.color}12` }}>
                      <i className={c.icon} />
                    </div>
                    <span className="h6-rec-name">{c.name}</span>
                    <span className="h6-rec-match">{c.match}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Todo */}
            <div className="h6-card h6-card-sm">
              <div className="h6-card-header">
                <h3>해야 할 일</h3>
              </div>
              <div className="h6-todo-list">
                {todoItems.map((t, i) => (
                  <div key={i} className="h6-todo-item">
                    <i className={t.done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} style={{ color: t.done ? '#0D8B7C' : '#D1D5DB' }} />
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
