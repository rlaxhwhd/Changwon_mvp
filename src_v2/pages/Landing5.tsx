import { useEffect, useRef } from 'react';
import type { PageId } from '../types';

interface Landing5Props {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const routes = [
  {
    key: 'student',
    title: '학생 / 교직원',
    desc: '재학생과 교직원을 위한 역량개발 및 진로취업 지원 서비스',
    icon: 'fa-solid fa-graduation-cap',
    accent: '#10B981',
    navigateTo: 'home' as PageId,
  },
  {
    key: 'company',
    title: '기업',
    desc: '채용 정보 등록, 산학협력, 인재 매칭 서비스',
    icon: 'fa-solid fa-building-columns',
    accent: '#F59E0B',
    navigateTo: null,
  },
  {
    key: 'youth',
    title: '지역청년',
    desc: '창원 지역 청년을 위한 취업 지원 및 역량 강화 프로그램',
    icon: 'fa-solid fa-users',
    accent: '#06B6D4',
    navigateTo: null,
  },
];

const metrics = [
  { value: '47,200+', label: '누적 상담 건수' },
  { value: '4.87', label: '만족도 평점' },
  { value: '82.7%', label: '취업예측 정확도' },
  { value: '12개', label: '전문 서비스' },
];

export default function Landing5({ onNavigate, onToast }: Landing5Props) {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('l5-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    if (cardsRef.current) {
      observer.observe(cardsRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="l5-root">
      {/* ── Hero ── */}
      <section className="l5-hero">
        <div className="l5-hero-orb l5-hero-orb-a" />
        <div className="l5-hero-orb l5-hero-orb-b" />

        {/* Left image with gradient fade */}
        <div className="l5-hero-photo">
          <img src="/bg-hero-7.png" alt="" />
        </div>

        <div className="l5-hero-inner">
          <div className="l5-hero-content">
            <div className="l5-eyebrow">
              <span className="l5-eyebrow-dot" />
              DREAMCATCH 2026 · EDITION Ⅴ
            </div>
            <h1 className="l5-hero-title">
              너의 가능성을<br />
              <span className="l5-hero-title-accent">빛나게</span> 하는 순간
            </h1>
            <p className="l5-hero-desc">
              국립창원대학교 학생경력개발관리시스템.<br />
              AI 기반 역량 분석부터 취업 전략까지, 한 곳에서 완성합니다.
            </p>
            <div className="l5-hero-actions">
              <button className="l5-btn-primary" onClick={() => onNavigate('home')}>
                <span>지금 시작하기</span>
                <i className="fa-solid fa-arrow-right" />
              </button>
              <button className="l5-btn-ghost" onClick={() => onToast('준비 중인 기능입니다')}>
                서비스 소개 보기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics strip ── */}
      <section className="l5-metrics-section">
        <div className="l5-metrics-strip">
          {metrics.map((m, i) => (
            <div key={i} className="l5-metric-pill">
              <div className="l5-metric-value">{m.value}</div>
              <div className="l5-metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Route Cards ── */}
      <section className="l5-cards-section" ref={cardsRef}>
        <div className="l5-cards-head">
          <div className="l5-eyebrow l5-eyebrow-dark">SELECT YOUR PATH</div>
          <h2 className="l5-cards-title">어떤 경로로 시작하시겠어요?</h2>
          <p className="l5-cards-sub">나에게 맞는 서비스를 선택해 주세요</p>
        </div>
        <div className="l5-cards">
          {routes.map((r, i) => (
            <div
              key={r.key}
              className={`l5-card ${!r.navigateTo ? 'l5-card-disabled' : ''}`}
              style={{ '--accent': r.accent, '--idx': i } as React.CSSProperties}
              onClick={() => {
                if (r.navigateTo) {
                  onNavigate(r.navigateTo);
                } else {
                  onToast('준비 중인 서비스입니다');
                }
              }}
            >
              <div className="l5-card-icon">
                <i className={r.icon} />
              </div>
              <h2 className="l5-card-title">{r.title}</h2>
              <p className="l5-card-desc">{r.desc}</p>
              <div className="l5-card-footer">
                {r.navigateTo ? (
                  <div className="l5-card-arrow">
                    <span>바로가기</span>
                    <i className="fa-solid fa-arrow-right" />
                  </div>
                ) : (
                  <span className="l5-card-soon">준비중</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="l5-footer">
        <span className="l5-footer-brand">DREAMCATCH</span>
        <span className="l5-footer-dot" />
        <span>국립창원대학교 취업전략센터</span>
      </footer>
    </div>
  );
}
