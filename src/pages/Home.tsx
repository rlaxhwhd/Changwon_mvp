import HeroBanner from '../components/HeroBanner';
import type { PageId } from '../types';

interface HomeProps {
  onNavigate: (page: PageId) => void;
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const programs = [
  { title: '이력서 클리닉', desc: 'AI 기반 이력서 첨삭 및 맞춤 피드백', date: '04.15 ~ 04.20', seats: 12, icon: 'fa-solid fa-file-lines', color: '#6366F1', category: '취업역량' },
  { title: '모의면접 캠프', desc: '실전 면접 시뮬레이션 및 전문가 코칭', date: '04.22 ~ 04.25', seats: 8, icon: 'fa-solid fa-microphone', color: '#3B82F6', category: '면접준비' },
  { title: 'IT PM 직무 특강', desc: '현직 PM이 알려주는 실무 노하우', date: '05.01', seats: 30, icon: 'fa-solid fa-chalkboard-user', color: '#22C55E', category: '직무탐색' },
  { title: '포트폴리오 워크숍', desc: '프로젝트 포트폴리오 제작 실습', date: '05.08 ~ 05.10', seats: 15, icon: 'fa-solid fa-palette', color: '#F59E0B', category: '취업역량' },
  { title: '기업탐방 프로그램', desc: 'IT 기업 현장 방문 및 직무 체험', date: '05.15', seats: 20, icon: 'fa-solid fa-building', color: '#EF4444', category: '직무탐색' },
  { title: '취업캠프 (2박3일)', desc: '집중 취업 준비 부트캠프', date: '05.20 ~ 05.22', seats: 0, icon: 'fa-solid fa-campground', color: '#8B5CF6', category: '취업캠프' },
];

const notices = [
  { id: 1, date: '2026-03-28', title: '2026-1학기 진로취업 프로그램 신청 안내', isNew: true },
  { id: 2, date: '2026-03-25', title: 'AI 역량 분석 서비스 오픈', isNew: true },
  { id: 3, date: '2026-03-20', title: '상반기 채용 박람회 안내', isNew: false },
  { id: 4, date: '2026-03-18', title: '드림캐치 시스템 업데이트 안내', isNew: false },
];

export default function Home({ onNavigate, onToast }: HomeProps) {
  return (
    <div>
      <HeroBanner />

      {/* ── 진로취업 프로그램 목록 ── */}
      <section className="home-section">
        <div className="section-header">
          <h2>
            <i className="fa-solid fa-calendar-check" style={{ color: '#22C55E' }} />
            진로·취업 프로그램
          </h2>
          <button className="btn btn-sm btn-outline" onClick={() => onNavigate('program-apply')}>
            전체보기 <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
          </button>
        </div>
        <div className="program-grid">
          {programs.map((p, i) => (
            <div key={i} className="program-card">
              <div className="program-card-top">
                <div className="program-icon" style={{ background: `${p.color}15`, color: p.color }}>
                  <i className={p.icon} />
                </div>
                <span className="badge badge-gray">{p.category}</span>
              </div>
              <div className="program-card-body">
                <div className="program-title">{p.title}</div>
                <div className="program-desc">{p.desc}</div>
                <div className="program-meta">
                  <span><i className="fa-regular fa-calendar" /> {p.date}</span>
                  <span style={{ color: p.seats === 0 ? '#EF4444' : '#6B7280' }}>
                    {p.seats === 0 ? '마감' : `잔여 ${p.seats}석`}
                  </span>
                </div>
              </div>
              <button
                className={`btn btn-sm ${p.seats === 0 ? 'btn-outline' : 'btn-primary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={p.seats === 0}
                onClick={() => onToast(`"${p.title}" 신청이 완료되었습니다!`, 'success')}
              >
                {p.seats === 0 ? '마감' : '신청하기'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 공지사항 ── */}
      <section className="home-section">
        <div className="section-header">
          <h2>
            <i className="fa-solid fa-bullhorn" style={{ color: '#F59E0B' }} />
            공지사항
          </h2>
          <button className="btn btn-sm btn-outline" onClick={() => onNavigate('notice')}>
            전체보기 <i className="fa-solid fa-chevron-right" style={{ fontSize: 10 }} />
          </button>
        </div>
        <div className="card">
          {notices.map((n, i) => (
            <div key={n.id}
              className="notice-row"
              style={{ borderBottom: i < notices.length - 1 ? '1px solid #F3F4F6' : 'none' }}
              onClick={() => onToast('준비 중인 기능입니다')}
            >
              <div className="notice-title">
                {n.title}
                {n.isNew && <span className="badge badge-red" style={{ marginLeft: 8 }}>NEW</span>}
              </div>
              <span className="notice-date">{n.date}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
