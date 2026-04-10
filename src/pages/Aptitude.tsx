import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Modal from '../components/Modal';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip);

interface AptItem {
  name: string;
  score: number;
  max: number;
  detail: string;
  subItems: { name: string; score: number }[];
  suggestion: string;
}

const items: AptItem[] = [
  { name: '언어이해', score: 85, max: 100, detail: '어휘력, 독해력, 문법 활용 능력을 측정합니다. 복잡한 지문을 읽고 핵심 내용을 파악하는 능력이 포함됩니다.', subItems: [{ name: '어휘력', score: 88 }, { name: '독해력', score: 82 }, { name: '문법활용', score: 85 }], suggestion: '현재 수준을 유지하면서, 비문학 지문 독해 연습을 추가하세요.' },
  { name: '수리논리', score: 78, max: 100, detail: '수학적 사고력과 논리적 추론 능력을 측정합니다. 자료해석, 수열, 방정식 등을 포함합니다.', subItems: [{ name: '자료해석', score: 82 }, { name: '수열추론', score: 75 }, { name: '응용계산', score: 77 }], suggestion: '자료해석 유형을 집중 연습하면 5점 이상 향상이 가능합니다.' },
  { name: '추리력', score: 82, max: 100, detail: '주어진 조건과 정보를 바탕으로 논리적 결론을 도출하는 능력을 측정합니다.', subItems: [{ name: '조건추리', score: 85 }, { name: '언어추리', score: 80 }, { name: '도형추리', score: 81 }], suggestion: '다양한 유형의 추리 문제를 풀어 사고의 유연성을 높이세요.' },
  { name: '공간지각', score: 72, max: 100, detail: '2차원, 3차원 도형의 회전, 전개, 조합 등 공간적 사고 능력을 측정합니다.', subItems: [{ name: '도형회전', score: 68 }, { name: '전개도', score: 75 }, { name: '공간조합', score: 73 }], suggestion: '3D 퍼즐 앱이나 블록 코딩으로 공간 감각을 훈련하세요.' },
  { name: '지각속도', score: 88, max: 100, detail: '빠르고 정확하게 정보를 인식하고 처리하는 능력을 측정합니다. 시간 제한 내 정보 비교, 오류 탐지 등을 포함합니다.', subItems: [{ name: '정보비교', score: 90 }, { name: '오류탐지', score: 85 }, { name: '패턴인식', score: 89 }], suggestion: '현재 최고 점수입니다. 유지에 집중하세요.' },
  { name: '상황판단', score: 76, max: 100, detail: '실제 업무 상황에서 적절한 대응 방법을 선택하는 능력을 측정합니다. 대인관계, 문제 대처 등을 포함합니다.', subItems: [{ name: '대인상황', score: 78 }, { name: '업무상황', score: 74 }, { name: '윤리판단', score: 76 }], suggestion: '케이스 스터디를 통해 다양한 상황 대처 능력을 기르세요.' },
];

const historyData = [
  { date: '2026-03-15', label: '3차 검사', scores: [85, 78, 82, 72, 88, 76], total: 80 },
  { date: '2025-09-10', label: '2차 검사', scores: [78, 72, 75, 68, 82, 70], total: 74 },
  { date: '2025-03-05', label: '1차 검사', scores: [70, 65, 68, 60, 75, 62], total: 67 },
];

export default function Aptitude() {
  const [itemModal, setItemModal] = useState<number | null>(null);
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const total = 80;
  const item = itemModal !== null ? items[itemModal] : null;

  const barData = {
    labels: items.map(it => it.name),
    datasets: historyData.map((h, i) => ({
      label: h.label,
      data: h.scores,
      backgroundColor: i === 0 ? '#6366F1' : i === 1 ? '#22C55E' : '#F59E0B',
      borderRadius: 4,
      barPercentage: 0.7,
    })),
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { font: { size: 11 } } },
      x: { ticks: { font: { size: 11, family: 'Noto Sans KR' } } },
    },
    plugins: { legend: { display: true, position: 'bottom' as const, labels: { font: { size: 11, family: 'Noto Sans KR' } } } },
  };

  return (
    <div>
      <div className="page-header">
        <h1>인적성검사</h1>
        <p>인적성검사 결과 · 총점 {total}점</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-pen-to-square" style={{ color: '#6366F1' }} /> 항목별 점수</span>
            <button className="btn btn-sm btn-outline" onClick={() => setHistoryDrawer(true)}>
              <i className="fa-solid fa-clock-rotate-left" /> 검사 이력
            </button>
          </div>
          {items.map((it, i) => {
            const pct = (it.score / it.max) * 100;
            return (
              <div key={it.name} style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => setItemModal(i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{it.name} <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: '#9CA3AF' }} /></span>
                  <span style={{ fontWeight: 700, color: pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444' }}>
                    {it.score}점
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="fill" style={{
                    width: `${pct}%`,
                    background: pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <i className="fa-solid fa-robot" style={{ color: '#6366F1' }} /> AI 총평
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#4F46E5' }}>{total}<span style={{ fontSize: 20, color: '#9CA3AF' }}>/100</span></div>
            <span className="badge badge-green" style={{ fontSize: 12, padding: '4px 12px', marginTop: 8 }}>양호</span>
          </div>
          <div className="ai-comment" style={{ marginTop: 'auto' }}>
            <div className="ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
            <p>
              김민준님의 인적성검사 총점은 <strong>80점</strong>으로 양호한 수준입니다.
              특히 <strong>지각속도(88점)</strong>와 <strong>언어이해(85점)</strong>에서 높은 점수를 보여주고 있습니다.
              <strong>공간지각(72점)</strong> 영역이 상대적으로 낮으므로, 해당 유형의 문제를 추가 연습하면
              전체 점수를 더 끌어올릴 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 항목별 상세 모달 */}
      <Modal open={itemModal !== null} onClose={() => setItemModal(null)} title={item ? `${item.name} 상세 분석` : ''} size="md">
        {item && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: (item.score / item.max) * 100 >= 80 ? '#22C55E' : (item.score / item.max) * 100 >= 60 ? '#F59E0B' : '#EF4444' }}>{item.score}점</div>
              <span className="badge" style={{ background: item.score >= 80 ? '#DCFCE7' : item.score >= 60 ? '#FEF3C7' : '#FEE2E2', color: item.score >= 80 ? '#16A34A' : item.score >= 60 ? '#92400E' : '#DC2626' }}>
                {item.score >= 80 ? '우수' : item.score >= 60 ? '양호' : '보완필요'}
              </span>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">항목 설명</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{item.detail}</p>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">세부 영역</div>
              {item.subItems.map(s => (
                <div key={s.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{s.name}</span>
                    <span style={{ fontWeight: 600, color: s.score >= 80 ? '#22C55E' : s.score >= 60 ? '#F59E0B' : '#EF4444' }}>{s.score}점</span>
                  </div>
                  <div className="progress-bar">
                    <div className="fill" style={{ width: `${s.score}%`, background: s.score >= 80 ? '#22C55E' : s.score >= 60 ? '#F59E0B' : '#EF4444' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="ai-comment" style={{ marginTop: 16 }}>
              <div className="ai-label"><i className="fa-solid fa-lightbulb" /> AI 제안</div>
              {item.suggestion}
            </div>
          </div>
        )}
      </Modal>

      {/* 검사 이력 Drawer */}
      <Modal size="lg"open={historyDrawer} onClose={() => setHistoryDrawer(false)} title="인적성검사 이력">
        <div className="detail-section">
          <div className="detail-section-title">검사 이력 비교 (막대 차트)</div>
          <div style={{ height: 280, marginBottom: 16 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">검사별 상세</div>
          {historyData.map(h => (
            <div key={h.date} style={{ marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{h.label}</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{h.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>총점: <strong>{h.total}점</strong></span>
                <span>최고: <strong>{Math.max(...h.scores)}점</strong></span>
                <span>최저: <strong>{Math.min(...h.scores)}점</strong></span>
              </div>
            </div>
          ))}
        </div>

        <div className="ai-comment">
          <div className="ai-label"><i className="fa-solid fa-robot" /> AI 성장 분석</div>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            1차 검사 대비 총점이 <strong>67점 → 80점 (+13점)</strong> 상승했습니다.
            모든 영역에서 고르게 향상되었으며, 특히 지각속도(+13점)와 언어이해(+15점)의 성장이 두드러집니다.
            다음 목표는 공간지각 영역을 80점 이상으로 끌어올리는 것입니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}
