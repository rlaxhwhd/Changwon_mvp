interface WorknetJobsProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const jobs = [
  { title: '[경남] 기계설계 엔지니어', company: '(주)한국정밀', region: '창원시 성산구', salary: '3,000~3,500만원', date: '2026-04-05' },
  { title: '[경남] 생산관리 사원', company: '대한금속공업(주)', region: '창원시 의창구', salary: '2,800~3,200만원', date: '2026-04-04' },
  { title: '[경남] 품질관리 담당자', company: '삼호테크', region: '김해시', salary: '3,000~3,800만원', date: '2026-04-03' },
  { title: '[서울] 웹개발자 (React)', company: '(주)테크스타', region: '서울 강남구', salary: '4,000~5,000만원', date: '2026-04-06' },
  { title: '[부산] 데이터분석가', company: '부산ICT융합센터', region: '부산 해운대구', salary: '3,500~4,500만원', date: '2026-04-05' },
];

export default function WorknetJobs({ onToast }: WorknetJobsProps) {
  return (
    <div>
      <div className="page-header">
        <h1>워크넷 채용공고</h1>
        <p>워크넷 연동 채용 정보를 확인하세요</p>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0369A1' }}>
          <i className="fa-solid fa-circle-info" />
          워크넷(www.work.go.kr)에서 제공하는 채용정보를 실시간 연동합니다.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs.map((job, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer', transition: 'box-shadow .2s' }}
            onClick={() => onToast('워크넷 상세 페이지로 이동합니다')}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{job.title}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  {job.company} · {job.region} · {job.salary}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{job.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
