import { useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import Modal from '../components/Modal';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface CaresItem {
  name: string;
  score: number;
  color: string;
  detail: string;
  subItems: { name: string; score: number }[];
  suggestion: string;
}

const items: CaresItem[] = [
  { name: '자기이해', score: 80, color: '#059669', detail: '자신의 흥미, 적성, 가치관, 성격을 정확히 인식하고 이해하는 능력입니다.', subItems: [{ name: '흥미파악', score: 85 }, { name: '적성인식', score: 78 }, { name: '가치관탐색', score: 77 }], suggestion: '자기이해 워크숍이나 진로탐색 프로그램에 참여하여 자기인식을 심화하세요.' },
  { name: '진로탐색', score: 72, color: '#0EA5E9', detail: '다양한 직업과 진로 정보를 수집하고 비교 분석하는 능력입니다.', subItems: [{ name: '직업정보수집', score: 70 }, { name: '직업비교분석', score: 75 }, { name: '산업트렌드이해', score: 71 }], suggestion: '직무체험 프로그램과 현장실습에 참여하여 실전 경험을 쌓으세요.' },
  { name: '정보수집', score: 78, color: '#8B5CF6', detail: '취업에 필요한 정보(채용공고, 자격증, 기업정보 등)를 체계적으로 수집하는 능력입니다.', subItems: [{ name: '채용정보탐색', score: 82 }, { name: '자격증정보', score: 75 }, { name: '기업분석', score: 77 }], suggestion: '취업정보 사이트와 기업 리서치를 꾸준히 해보세요.' },
  { name: '의사결정', score: 68, color: '#F59E0B', detail: '수집한 정보를 바탕으로 합리적으로 진로를 결정하는 능력입니다.', subItems: [{ name: '합리적판단', score: 70 }, { name: '대안비교', score: 65 }, { name: '결정실행력', score: 69 }], suggestion: '멘토링 프로그램에 참여하여 진로 의사결정에 대한 조언을 받아보세요.' },
  { name: '실행계획', score: 76, color: '#EF4444', detail: '진로 목표를 달성하기 위한 구체적인 실행 계획을 수립하고 실천하는 능력입니다.', subItems: [{ name: '목표설정', score: 80 }, { name: '일정관리', score: 72 }, { name: '실천력', score: 76 }], suggestion: '단기·중기·장기 진로 로드맵을 작성하고 주기적으로 점검하세요.' },
];

const avg = Math.round(items.reduce((s, i) => s + i.score, 0) / items.length);

export default function Cares() {
  const [sel, setSel] = useState<CaresItem | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const radarData = {
    labels: items.map(i => i.name),
    datasets: [{
      label: '내 점수',
      data: items.map(i => i.score),
      backgroundColor: 'rgba(5,150,105,.18)',
      borderColor: '#059669',
      borderWidth: 2,
      pointBackgroundColor: '#059669',
    }],
  };

  const radarOpts = {
    responsive: true,
    scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, display: false }, pointLabels: { font: { size: 13, weight: 700 as const } } } },
    plugins: { tooltip: { callbacks: { label: (ctx: { raw: unknown }) => ` ${ctx.raw}점` } } },
  };

  const handleAi = () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiResult('');
    setTimeout(() => {
      setAiLoading(false);
      setAiResult(
        `[CARES 진로준비도 AI 평가분석]\n\n` +
        `전체 평균: ${avg}점\n\n` +
        `강점 영역:\n` +
        `- 자기이해(${items[0].score}점): 자신의 흥미와 적성에 대한 이해도가 높습니다. 이를 바탕으로 구체적인 직무 탐색을 확장하세요.\n` +
        `- 정보수집(${items[2].score}점): 취업 관련 정보를 체계적으로 수집하는 역량이 우수합니다.\n\n` +
        `개선 필요 영역:\n` +
        `- 의사결정(${items[3].score}점): 진로 결정에 대한 확신이 다소 부족합니다. 멘토링이나 진로상담을 통해 의사결정 능력을 강화하세요.\n` +
        `- 진로탐색(${items[1].score}점): 실제 직업 현장 경험이 보강되면 탐색 역량이 크게 향상될 것입니다.\n\n` +
        `종합 제언:\n` +
        `진로준비도가 전반적으로 양호하며, 자기이해를 토대로 구체적인 직무 경험(인턴십, 현장실습)을 확보하면 취업 경쟁력이 크게 높아질 것으로 분석됩니다.`
      );
    }, 1800);
  };

  return (
    <div>
      <div className="page-header">
        <h1>CARES 검사 결과</h1>
        <p>진로준비도(Career Readiness) 5개 영역 진단 결과입니다</p>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
        <h3 style={{ marginBottom: 4 }}>종합 진로준비도</h3>
        <div style={{ fontSize: 40, fontWeight: 800, color: '#059669' }}>{avg}<span style={{ fontSize: 18, fontWeight: 400, color: '#6B7280' }}> / 100</span></div>
      </div>

      <div className="card" style={{ maxWidth: 480, margin: '0 auto 24px' }}>
        <Radar data={radarData} options={radarOpts} />
      </div>

      {/* AI 평가분석 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <button className="btn" onClick={handleAi} style={{
          background: 'linear-gradient(135deg, #059669, #0EA5E9)', color: '#fff',
          padding: '14px 36px', fontSize: 16, fontWeight: 700, borderRadius: 10, border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 16px rgba(5,150,105,.25)', transition: 'transform .2s, box-shadow .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
        >
          <i className="fa-solid fa-brain" /> AI 평가분석 보기
        </button>
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        {items.map(item => (
          <div key={item.name} className="card" style={{ cursor: 'pointer' }} onClick={() => setSel(item)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>{item.name}</span>
              <span style={{ color: item.color, fontWeight: 800, fontSize: 20 }}>{item.score}점</span>
            </div>
            <div style={{ background: '#F3F4F6', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: 6, transition: 'width .6s' }} />
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>{item.detail.slice(0, 40)}...</p>
          </div>
        ))}
      </div>

      {sel && (
        <Modal title={sel.name} size="md" onClose={() => setSel(null)}>
          <p style={{ marginBottom: 16, lineHeight: 1.7 }}>{sel.detail}</p>
          <h4 style={{ marginBottom: 8 }}>세부 항목</h4>
          {sel.subItems.map(sub => (
            <div key={sub.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ width: 100, fontSize: 13 }}>{sub.name}</span>
              <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${sub.score}%`, height: '100%', background: sel.color, borderRadius: 6 }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, width: 40, textAlign: 'right' }}>{sub.score}점</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: '#F0FDF4', borderRadius: 8 }}>
            <strong><i className="fa-solid fa-lightbulb" style={{ color: '#059669', marginRight: 6 }} />추천</strong>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{sel.suggestion}</p>
          </div>
        </Modal>
      )}

      {aiOpen && (
        <Modal title="CARES AI 평가분석" size="lg" onClose={() => setAiOpen(false)}>
          {aiLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#059669' }} />
              <p style={{ marginTop: 12, color: '#6B7280' }}>AI가 검사 결과를 분석하고 있습니다...</p>
            </div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14 }}>{aiResult}</pre>
          )}
        </Modal>
      )}
    </div>
  );
}
