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
import CRAReport from '../components/CRAReport';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface Core {
  name: string;
  score: number;
  color: string;
  detail: string;
  subItems: { name: string; score: number }[];
  suggestion: string;
}

const cores: Core[] = [
  { name: '의사소통', score: 78, color: '#6366F1', detail: '타인의 의견을 경청하고 자신의 생각을 명확하게 전달하는 능력입니다. 문서 작성, 발표, 토론 등 다양한 소통 역량을 평가합니다.', subItems: [{ name: '경청능력', score: 82 }, { name: '문서작성', score: 75 }, { name: '발표능력', score: 70 }, { name: '토론능력', score: 85 }], suggestion: '발표/프레젠테이션 비교과 활동에 참여하여 실전 경험을 쌓으세요.' },
  { name: '문제해결', score: 82, color: '#3B82F6', detail: '복잡한 상황에서 문제를 분석하고 창의적으로 해결하는 능력입니다. 논리적 사고와 분석력을 포함합니다.', subItems: [{ name: '분석력', score: 85 }, { name: '논리적사고', score: 88 }, { name: '창의적해결', score: 72 }, { name: '의사결정', score: 83 }], suggestion: '해커톤이나 공모전 참여로 실전 문제 해결 경험을 쌓으세요.' },
  { name: '자기관리', score: 70, color: '#22C55E', detail: '목표를 설정하고 체계적으로 실행하며, 시간과 자원을 효율적으로 관리하는 능력입니다.', subItems: [{ name: '목표설정', score: 75 }, { name: '시간관리', score: 68 }, { name: '스트레스관리', score: 65 }, { name: '자기개발', score: 72 }], suggestion: '일정 관리 앱을 활용한 체계적 시간관리 습관을 만드세요.' },
  { name: '대인관계', score: 65, color: '#F59E0B', detail: '다양한 사람들과 원만한 관계를 형성하고 유지하며, 갈등 상황을 건설적으로 해결하는 능력입니다.', subItems: [{ name: '협동능력', score: 70 }, { name: '갈등관리', score: 58 }, { name: '네트워킹', score: 60 }, { name: '공감능력', score: 72 }], suggestion: '팀 프로젝트와 동아리 활동으로 대인관계 역량을 강화하세요.' },
  { name: '정보활용', score: 88, color: '#6366F1', detail: '디지털 도구와 정보 기술을 활용하여 필요한 정보를 수집, 분석, 활용하는 능력입니다.', subItems: [{ name: '정보수집', score: 90 }, { name: '정보분석', score: 88 }, { name: '디지털활용', score: 92 }, { name: '정보윤리', score: 82 }], suggestion: '데이터 분석 관련 자격증 취득으로 역량을 공인받으세요.' },
  { name: '글로벌', score: 35, color: '#EF4444', detail: '외국어 능력과 다문화 이해를 바탕으로 글로벌 환경에서 소통하고 협업하는 능력입니다.', subItems: [{ name: '외국어능력', score: 25 }, { name: '다문화이해', score: 45 }, { name: '글로벌감각', score: 40 }, { name: '국제협력', score: 30 }], suggestion: 'TOEIC 700점 이상 취득과 국제 교류 프로그램 참여를 최우선으로 추진하세요.' },
  { name: '리더십', score: 60, color: '#F59E0B', detail: '조직을 이끌고 구성원의 역량을 이끌어내며, 공동의 목표를 달성하는 능력입니다.', subItems: [{ name: '비전제시', score: 55 }, { name: '동기부여', score: 62 }, { name: '팀빌딩', score: 65 }, { name: '책임감', score: 58 }], suggestion: '학생회, 동아리 임원 활동을 통해 리더십 경험을 쌓으세요.' },
  { name: '창의융합', score: 72, color: '#3B82F6', detail: '다양한 분야의 지식을 융합하여 새로운 아이디어를 창출하고 혁신적으로 사고하는 능력입니다.', subItems: [{ name: '융합적사고', score: 75 }, { name: '아이디어발상', score: 78 }, { name: '혁신추구', score: 65 }, { name: '유연성', score: 70 }], suggestion: '타 전공 수업 수강이나 융합 프로젝트 참여를 권장합니다.' },
  { name: '직업윤리', score: 75, color: '#22C55E', detail: '직업에 대한 올바른 가치관과 윤리의식을 갖추고, 성실하고 책임감 있게 행동하는 능력입니다.', subItems: [{ name: '성실성', score: 80 }, { name: '책임의식', score: 78 }, { name: '준법정신', score: 72 }, { name: '직업관', score: 70 }], suggestion: '봉사활동과 멘토링 프로그램에 참여하여 직업윤리 의식을 높이세요.' },
];

const historyData = [
  { date: '2026-03-15', label: '3차 검사', scores: [78, 82, 70, 65, 88, 35, 60, 72, 75] },
  { date: '2025-09-20', label: '2차 검사', scores: [72, 75, 65, 60, 82, 30, 55, 68, 70] },
  { date: '2025-03-10', label: '1차 검사', scores: [65, 68, 58, 55, 75, 20, 48, 60, 62] },
];

export default function NineCore() {
  const [abilityModal, setAbilityModal] = useState<number | null>(null);
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [craReportDate, setCraReportDate] = useState<string | null>(null);
  const avg = Math.round(cores.reduce((a, c) => a + c.score, 0) / cores.length);
  const ability = abilityModal !== null ? cores[abilityModal] : null;

  const radarData = {
    labels: cores.map(c => c.name),
    datasets: [{
      label: '9CORE 점수',
      data: cores.map(c => c.score),
      backgroundColor: 'rgba(99,102,241,.2)',
      borderColor: '#6366F1',
      borderWidth: 2,
      pointBackgroundColor: '#6366F1',
    }],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, font: { size: 10 } },
        pointLabels: { font: { size: 11, family: 'Noto Sans KR' } },
      },
    },
    plugins: { legend: { display: false } },
  };

  const historyRadarData = {
    labels: cores.map(c => c.name),
    datasets: historyData.map((h, i) => ({
      label: h.label,
      data: h.scores,
      backgroundColor: i === 0 ? 'rgba(99,102,241,.2)' : 'transparent',
      borderColor: i === 0 ? '#6366F1' : i === 1 ? '#22C55E' : '#F59E0B',
      borderWidth: i === 0 ? 2 : 1.5,
      borderDash: i === 0 ? [] : [5, 5],
      pointBackgroundColor: i === 0 ? '#6366F1' : i === 1 ? '#22C55E' : '#F59E0B',
      pointRadius: i === 0 ? 4 : 3,
    })),
  };

  return (
    <div>
      <div className="page-header">
        <h1>9CORE 검사</h1>
        <p>9개 핵심 역량 검사 결과입니다 · 평균 {avg}점</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><i className="fa-solid fa-chart-radar" style={{ color: '#6366F1' }} /> 9CORE 레이더 차트</span>
            <button className="btn btn-sm btn-outline" onClick={() => setHistoryDrawer(true)}>
              <i className="fa-solid fa-clock-rotate-left" /> 검사 이력
            </button>
          </div>
          <div style={{ height: 320 }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-list-ol" style={{ color: '#6366F1' }} /> 역량별 점수
          </div>
          {cores.map((c, i) => (
            <div key={c.name} style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => setAbilityModal(i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{c.name} <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: '#9CA3AF' }} /></span>
                <span style={{ fontWeight: 700, color: c.color }}>{c.score}점</span>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${c.score}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 역량 상세 모달 */}
      <Modal open={abilityModal !== null} onClose={() => setAbilityModal(null)} title={ability ? `${ability.name} 상세 분석` : ''} size="md">
        {ability && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: ability.color }}>{ability.score}점</div>
              <span className="badge" style={{ background: ability.score >= 80 ? '#DCFCE7' : ability.score >= 60 ? '#FEF3C7' : '#FEE2E2', color: ability.score >= 80 ? '#16A34A' : ability.score >= 60 ? '#92400E' : '#DC2626' }}>
                {ability.score >= 80 ? '우수' : ability.score >= 60 ? '보통' : '보완필요'}
              </span>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">역량 설명</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{ability.detail}</p>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">세부 항목</div>
              {ability.subItems.map(s => (
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
              {ability.suggestion}
            </div>
          </div>
        )}
      </Modal>

      {/* 검사 이력 Drawer */}
      <Modal size="lg"open={historyDrawer} onClose={() => setHistoryDrawer(false)} title="9CORE 검사 이력">
        <div className="detail-section">
          <div className="detail-section-title">검사 이력 비교 (레이더 차트)</div>
          <div style={{ height: 300, marginBottom: 16 }}>
            <Radar data={historyRadarData} options={{ ...radarOptions, plugins: { legend: { display: true, position: 'bottom' as const, labels: { font: { size: 11, family: 'Noto Sans KR' } } } } }} />
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#6366F1' }}><i className="fa-solid fa-circle" /> 3차 (현재)</span>
            <span style={{ fontSize: 12, color: '#22C55E' }}><i className="fa-solid fa-circle" /> 2차</span>
            <span style={{ fontSize: 12, color: '#F59E0B' }}><i className="fa-solid fa-circle" /> 1차</span>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">검사별 상세</div>
          {historyData.map(h => (
            <div key={h.date} style={{ marginBottom: 16, padding: 12, background: '#F9FAFB', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{h.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{h.date}</span>
                  <button className="btn btn-sm btn-outline" style={{ padding: '2px 10px', fontSize: 11 }}
                    onClick={() => setCraReportDate(h.date)}>
                    <i className="fa-solid fa-file-lines" /> 결과 상세보기
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>평균: <strong>{Math.round(h.scores.reduce((a, b) => a + b, 0) / h.scores.length)}점</strong></span>
                <span>최고: <strong>{Math.max(...h.scores)}점</strong></span>
                <span>최저: <strong>{Math.min(...h.scores)}점</strong></span>
              </div>
            </div>
          ))}
        </div>

        <div className="ai-comment">
          <div className="ai-label"><i className="fa-solid fa-robot" /> AI 성장 분석</div>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            1차 검사 대비 평균 점수가 <strong>12.4점 상승</strong>했습니다.
            특히 정보활용(+13점)과 문제해결(+14점) 역량이 크게 향상되었습니다.
            글로벌 역량은 여전히 보완이 필요한 영역입니다.
          </p>
        </div>
      </Modal>
      {/* CRA 진로준비도 진단검사 결과표 */}
      <CRAReport open={craReportDate !== null} onClose={() => setCraReportDate(null)} examDate={craReportDate || ''} />
    </div>
  );
}
