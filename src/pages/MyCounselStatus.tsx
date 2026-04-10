interface MyCounselStatusProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const counsels = [
  { type: '진로상담', counselor: '김진로 상담사', date: '2026-04-10', time: '14:00', status: '예약확정' },
  { type: '심리상담', counselor: '박심리 상담사', date: '2026-04-03', time: '10:00', status: '완료' },
  { type: '교수상담', counselor: '이교수 (컴퓨터공학과)', date: '2026-03-25', time: '15:00', status: '완료' },
  { type: '취업상담', counselor: '최취업 상담사', date: '2026-03-15', time: '11:00', status: '완료' },
  { type: '심리상담', counselor: '박심리 상담사', date: '2026-03-05', time: '10:00', status: '완료' },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  '예약확정': { bg: '#EEF2FF', color: '#4F46E5' },
  '완료': { bg: '#F0FDF4', color: '#16A34A' },
  '취소': { bg: '#FEF2F2', color: '#EF4444' },
};

export default function MyCounselStatus({ onToast }: MyCounselStatusProps) {
  return (
    <div>
      <div className="page-header">
        <h1>상담현황</h1>
        <p>나의 상담 예약 및 이력을 확인하세요</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {counsels.map((c, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer' }}
            onClick={() => onToast(`${c.type} 상세 보기`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{c.type}</span>
                  <span className="badge" style={{ ...(statusStyle[c.status] || statusStyle['완료']), fontSize: 11 }}>{c.status}</span>
                </div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  {c.counselor}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.date}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{c.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
