import type { PageId } from '../types';

interface PersonalityDiagnosisProps {
  onNavigate: (page: PageId) => void;
}

const tests = [
  {
    id: 'aptitude' as PageId,
    title: '인적성검사',
    desc: '언어이해, 수리논리, 추리력, 공간지각, 지각속도, 상황판단 6개 영역을 측정합니다.',
    icon: 'fa-solid fa-pen-to-square',
    color: '#3B82F6',
    tags: ['인적성', '직무적성', '문제풀이'],
    lastDate: '2026-03-15',
    score: '총점 80점',
  },
];

export default function PersonalityDiagnosis({ onNavigate }: PersonalityDiagnosisProps) {
  return (
    <div>
      <div className="page-header">
        <h1>성격심리진단</h1>
        <p>성격 및 심리 역량 진단을 위한 검사를 선택하세요</p>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {tests.map(t => (
          <div key={t.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow .2s, transform .2s' }}
            onClick={() => onNavigate(t.id)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(99,102,241,.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${t.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={t.icon} style={{ color: t.color, fontSize: 24 }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {t.tags.map(tag => (
                    <span key={tag} className="badge" style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>{t.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                <i className="fa-solid fa-clock" style={{ marginRight: 4 }} /> 최근 검사: {t.lastDate}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-indigo" style={{ fontSize: 12 }}>{t.score}</span>
                <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
