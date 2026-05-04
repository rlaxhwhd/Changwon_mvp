import { useState } from 'react';
import Modal from '../components/Modal';

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
  const [aiModal, setAiModal] = useState(false);
  const completed = programs.filter(p => p.status === '수료');
  const totalHours = completed.reduce((a, p) => a + p.hours, 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>역량프로그램 현황</h1>
          <p>참여한 프로그램 이력을 확인하세요</p>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: '#6366F1', color: '#fff', marginTop: 4 }}
          onClick={() => setAiModal(true)}
        >
          <i className="fa-solid fa-robot" /> AI 평가
        </button>
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

      {/* AI 역량프로그램 평가 모달 */}
      <Modal open={aiModal} onClose={() => setAiModal(false)} title="AI 역량프로그램 종합 평가" size="lg">
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {[
              { label: '수료 프로그램', value: `${completed.length}건`, color: '#22C55E' },
              { label: '총 이수시간', value: `${totalHours}시간`, color: '#3B82F6' },
              { label: 'AI 역량점수', value: '78점', color: '#6366F1' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: 16, background: '#F9FAFB', borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">수료 프로그램별 AI 평가</div>
            {completed.map((p, i) => (
              <div key={i} style={{ marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                  <span className="badge" style={{ background: '#F0FDF4', color: '#16A34A', fontSize: 11 }}>{p.category}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>{p.period} · {p.hours}시간</div>
                <div className="progress-bar" style={{ marginBottom: 6 }}>
                  <div className="fill" style={{ width: `${70 + i * 8}%`, background: '#6366F1' }} />
                </div>
                <div style={{ fontSize: 12, color: '#6366F1', fontWeight: 600 }}>역량 기여도: {70 + i * 8}%</div>
              </div>
            ))}
          </div>

          <div className="ai-comment" style={{ marginTop: 16 }}>
            <div className="ai-label"><i className="fa-solid fa-robot" /> AI 종합 평가</div>
            <p style={{ lineHeight: 1.8, fontSize: 13, marginBottom: 10 }}>
              김민준님은 총 <strong>{completed.length}개 프로그램</strong>을 수료하여
              <strong> {totalHours}시간</strong>의 역량개발 활동을 완료했습니다.
            </p>
            <p style={{ lineHeight: 1.8, fontSize: 13, marginBottom: 10 }}>
              <strong>강점:</strong> 취업 분야 프로그램 이수율이 높아 취업 준비 역량이 우수합니다.
              특히 '취업역량강화 캠프(40시간)' 수료를 통해 실전 역량이 크게 향상되었습니다.
            </p>
            <p style={{ lineHeight: 1.8, fontSize: 13 }}>
              <strong>추천:</strong> 진로탐색 및 IT/디지털 분야 프로그램 참여를 권장합니다.
              '면접 실전 트레이닝' 수료 후 모의면접 캠프 추가 신청을 추천드립니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
