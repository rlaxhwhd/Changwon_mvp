interface MyMileageProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

const history = [
  { date: '2026-04-05', desc: '9CORE 역량검사 완료', point: '+100', balance: '1,250' },
  { date: '2026-04-03', desc: '진로상담 신청', point: '+50', balance: '1,150' },
  { date: '2026-03-28', desc: '취업캠프 프로그램 수료', point: '+300', balance: '1,100' },
  { date: '2026-03-20', desc: 'AI 진로 로드맵 생성', point: '+50', balance: '800' },
  { date: '2026-03-15', desc: '인적성검사 완료', point: '+100', balance: '750' },
  { date: '2026-03-10', desc: '프로그램 후기 작성', point: '+50', balance: '650' },
  { date: '2026-02-28', desc: 'AI 자소서 첨삭 이용', point: '-200', balance: '600' },
  { date: '2026-02-15', desc: 'AI 활용 자소서 특강 수료', point: '+200', balance: '800' },
];

export default function MyMileage({ onToast }: MyMileageProps) {
  return (
    <div>
      <div className="page-header">
        <h1>마일리지 현황</h1>
        <p>활동으로 적립한 마일리지를 확인하세요</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 24, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff' }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>보유 마일리지</div>
        <div style={{ fontSize: 36, fontWeight: 800 }}>1,250 <span style={{ fontSize: 16, fontWeight: 400 }}>P</span></div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>총 적립 1,450P · 총 사용 200P</div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>적립/사용 내역</div>
        {history.map((h, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < history.length - 1 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer' }}
            onClick={() => onToast(`${h.desc} 상세`)}>
            <div>
              <div style={{ fontSize: 13, color: '#374151' }}>{h.desc}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{h.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: h.point.startsWith('+') ? '#4F46E5' : '#EF4444' }}>{h.point}P</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>잔액 {h.balance}P</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
