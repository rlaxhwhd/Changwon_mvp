interface JobPostingProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const jobs = [
  { company: '삼성전자', title: '2026 상반기 신입사원 채용', field: 'SW개발', deadline: '2026-05-15', type: '신입' },
  { company: 'LG에너지솔루션', title: '배터리 연구개발 인턴', field: '연구개발', deadline: '2026-04-30', type: '인턴' },
  { company: '현대자동차', title: '자율주행 SW 엔지니어', field: 'SW개발', deadline: '2026-05-10', type: '경력' },
  { company: 'SK하이닉스', title: '반도체 공정 엔지니어 채용', field: '생산/제조', deadline: '2026-04-25', type: '신입' },
  { company: 'NAVER', title: 'AI 연구 인턴십', field: 'AI/ML', deadline: '2026-05-20', type: '인턴' },
  { company: 'カカ오엔터프라이즈', title: '백엔드 개발자', field: 'SW개발', deadline: '2026-05-01', type: '경력' },
];

export default function JobPosting({ onToast }: JobPostingProps) {
  return (
    <div>
      <div className="page-header">
        <h1>채용공고</h1>
        <p>최신 채용 정보를 확인하세요</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs.map((job, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer', transition: 'box-shadow .2s' }}
            onClick={() => onToast(`${job.company} 채용공고 상세 페이지로 이동합니다`)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{job.title}</span>
                  <span className="badge" style={{
                    background: job.type === '신입' ? '#EEF2FF' : job.type === '인턴' ? '#F0FDF4' : '#FFF7ED',
                    color: job.type === '신입' ? '#4F46E5' : job.type === '인턴' ? '#16A34A' : '#EA580C',
                    fontSize: 11
                  }}>{job.type}</span>
                </div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  {job.company} · {job.field}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#EF4444' }}>마감 {job.deadline}</div>
                <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
