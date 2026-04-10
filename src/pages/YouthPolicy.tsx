interface YouthPolicyProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const policies = [
  { title: '청년내일채움공제', org: '고용노동부', target: '만 15~34세 청년', period: '2026.01~12', desc: '중소기업 취업 청년의 자산형성을 지원하는 공제사업' },
  { title: '국민취업지원제도', org: '고용노동부', target: '만 15~69세 구직자', period: '상시', desc: '취업을 원하는 사람에게 취업지원서비스와 수당을 제공' },
  { title: '청년도전 지원사업', org: '고용노동부', target: '만 18~34세 청년', period: '2026.03~11', desc: '자립준비를 위한 프로그램 참여 기회 및 수당 지원' },
  { title: '경남 청년 창업지원', org: '경남도청', target: '경남 거주 만 19~39세', period: '2026.04~09', desc: '창업 초기 자금 및 멘토링 지원' },
  { title: '지역주도형 청년일자리', org: '행정안전부', target: '만 18~34세 미취업 청년', period: '2026.02~12', desc: '지역 공공기관 근무 경험 제공' },
];

export default function YouthPolicy({ onToast }: YouthPolicyProps) {
  return (
    <div>
      <div className="page-header">
        <h1>청년고용정책</h1>
        <p>청년을 위한 고용 지원 정책을 확인하세요</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {policies.map((p, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer', transition: 'box-shadow .2s' }}
            onClick={() => onToast(`${p.title} 상세 페이지로 이동합니다`)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</div>
              <span className="badge" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 11 }}>{p.org}</span>
            </div>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 12 }}>{p.desc}</p>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280' }}>
              <span><i className="fa-solid fa-user" style={{ marginRight: 4 }} />{p.target}</span>
              <span><i className="fa-solid fa-calendar" style={{ marginRight: 4 }} />{p.period}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
