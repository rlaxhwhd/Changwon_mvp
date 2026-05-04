interface MyHomeProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

export default function MyHome({ onToast }: MyHomeProps) {
  return (
    <div>
      <div className="page-header">
        <h1>마이홈</h1>
        <p>나의 활동 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid-2" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <i className="fa-solid fa-user-circle" style={{ fontSize: 48, color: '#6366F1', marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>김창원</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>컴퓨터공학과 3학년</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>학번: 2024123456</div>
        </div>
        <div className="card" style={{ padding: '24px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>활동 요약</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: '참여 프로그램', value: '5건', icon: 'fa-solid fa-calendar-check', color: '#6366F1' },
              { label: '상담 이력', value: '3건', icon: 'fa-solid fa-comments', color: '#3B82F6' },
              { label: '검사 완료', value: '2건', icon: 'fa-solid fa-clipboard-check', color: '#22C55E' },
              { label: '보유 마일리지', value: '1,250P', icon: 'fa-solid fa-coins', color: '#EAB308' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                  <i className={item.icon} style={{ color: item.color, width: 16 }} />
                  {item.label}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>최근 활동</div>
        {[
          { date: '2026-04-05', text: '9CORE 역량검사 완료', type: '검사' },
          { date: '2026-04-03', text: '진로상담 신청', type: '상담' },
          { date: '2026-03-28', text: '취업캠프 프로그램 참여', type: '프로그램' },
          { date: '2026-03-20', text: 'AI 진로 로드맵 생성', type: 'AI' },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #F3F4F6' : 'none' }}
            onClick={() => onToast(`${a.text} 상세 보기`)}>
            <div style={{ fontSize: 13, color: '#374151' }}>{a.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge" style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11 }}>{a.type}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{a.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
