interface MyProgramsProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const programs = [
  { name: '취업역량강화 캠프', status: '수료', period: '2026.01.10~01.24', hours: 40, category: '취업' },
  { name: 'AI 활용 자소서 특강', status: '수료', period: '2026.02.15', hours: 3, category: 'AI' },
  { name: '면접 실전 트레이닝', status: '진행중', period: '2026.04.01~04.30', hours: 20, category: '취업' },
  { name: '직무분석 워크숍', status: '신청완료', period: '2026.05.10~05.12', hours: 12, category: '진로' },
  { name: '창업아이디어 경진대회', status: '수료', period: '2025.11.20~11.22', hours: 16, category: '창업' },
];

const statusColor: Record<string, { bg: string; color: string }> = {
  '수료': { bg: '#F0FDF4', color: '#16A34A' },
  '진행중': { bg: '#EEF2FF', color: '#4F46E5' },
  '신청완료': { bg: '#FFF7ED', color: '#EA580C' },
};

export default function MyPrograms({ onToast }: MyProgramsProps) {
  return (
    <div>
      <div className="page-header">
        <h1>역량프로그램 현황</h1>
        <p>참여한 프로그램 이력을 확인하세요</p>
      </div>

      <div className="grid-3" style={{ gap: 12, marginBottom: 24 }}>
        {[
          { label: '총 참여', value: '5건', icon: 'fa-solid fa-list-check', color: '#6366F1' },
          { label: '수료 완료', value: '3건', icon: 'fa-solid fa-circle-check', color: '#22C55E' },
          { label: '총 이수시간', value: '91시간', icon: 'fa-solid fa-clock', color: '#3B82F6' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <i className={s.icon} style={{ fontSize: 24, color: s.color, marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {programs.map((p, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer' }}
            onClick={() => onToast(`${p.name} 상세 보기`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                  <span className="badge" style={{ ...statusColor[p.status], fontSize: 11 }}>{p.status}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {p.period} · {p.hours}시간 · {p.category}
                </div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
