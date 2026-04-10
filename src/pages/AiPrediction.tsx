import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Modal from '../components/Modal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const companies = [
  { name: '넥슨코리아', pct: 58, color: '#6366F1', strengths: ['학점 4.3 (상위 10%)', 'SQLD 보유', '인적성 80점'], weaknesses: ['어학 미취득', '인턴 경험 없음'], avgGpa: 3.8, avgToeic: 750, avgCerts: 2 },
  { name: '카카오게임즈', pct: 52, color: '#818CF8', strengths: ['학점 우수', 'IT 자격증 보유'], weaknesses: ['어학 미취득', '프로젝트 부족'], avgGpa: 3.7, avgToeic: 720, avgCerts: 2 },
  { name: 'NHN', pct: 47, color: '#A5B4FC', strengths: ['학점 우수'], weaknesses: ['어학 미취득', 'PM 경험 부족'], avgGpa: 3.6, avgToeic: 700, avgCerts: 2 },
  { name: '넷마블', pct: 43, color: '#C7D2FE', strengths: ['학점 양호'], weaknesses: ['어학, 프로젝트, 인턴 부족'], avgGpa: 3.5, avgToeic: 680, avgCerts: 1 },
  { name: '쿠팡', pct: 38, color: '#E0E7FF', strengths: ['학점 양호'], weaknesses: ['직무 적합도 낮음'], avgGpa: 3.7, avgToeic: 780, avgCerts: 2 },
];

const barData = {
  labels: companies.map(c => c.name),
  datasets: [{
    label: '합격 예측률 (%)',
    data: companies.map(c => c.pct),
    backgroundColor: companies.map(c => c.color),
    borderRadius: 6,
    barThickness: 36,
  }],
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  scales: {
    x: { max: 100, ticks: { callback: (v: string | number) => `${v}%` } },
    y: { grid: { display: false } },
  },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx: { parsed: { x: number | null } }) => `${ctx.parsed.x ?? 0}%` } },
  },
};

const weaknesses = [
  { area: '어학 성적', status: '미취득', impact: '높음', action: 'TOEIC 700+ 목표', detail: 'IT PM 직무는 글로벌 서비스 운영이 포함되어 TOEIC 700점 이상이 필수입니다. 현재 미취득 상태로 합격률에 가장 큰 영향을 미치고 있습니다.', programs: ['TOEIC 집중반 (2025-2학기)', 'OPIC 대비 특강'] },
  { area: '프로젝트 경험', status: '1건', impact: '높음', action: '팀 프로젝트 추가 참여', detail: '넥슨 PM 합격자 평균 프로젝트 경험은 3건입니다. 캡스톤 디자인이나 외부 공모전을 통해 경험을 쌓으세요.', programs: ['캡스톤 디자인 (3학년)', '교내 해커톤'] },
  { area: '인턴 경험', status: '없음', impact: '중간', action: '방학 중 인턴십 지원', detail: '게임/IT 분야 인턴 경험은 면접에서 큰 차별점이 됩니다. 방학 기간을 활용하세요.', programs: ['현장실습 프로그램', '산학협력 인턴십'] },
  { area: '자격증 보유', status: '1개 (SQLD)', impact: '중간', action: '정보처리기사 준비', detail: 'SQLD는 좋은 시작이지만, 정보처리기사를 추가로 취득하면 IT 역량 증명에 유리합니다.', programs: ['정보처리기사 스터디', '자격증 대비 특강'] },
];

export default function AiPrediction() {
  const [companyModal, setCompanyModal] = useState<number | null>(null);
  const [gapDrawer, setGapDrawer] = useState<number | null>(null);

  const company = companyModal !== null ? companies[companyModal] : null;
  const gap = gapDrawer !== null ? weaknesses[gapDrawer] : null;

  return (
    <div>
      <div className="page-header">
        <h1>취업예측 분석</h1>
        <p>AI가 분석한 기업별 합격 예측 결과입니다</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-bar" style={{ color: '#6366F1' }} />
            기업별 합격 예측률
          </div>
          <div style={{ height: 260 }}>
            <Bar data={barData} options={barOptions} />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
            기업명을 아래 표에서 클릭하면 상세 분석을 확인할 수 있습니다
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-bullseye" style={{ color: '#EF4444' }} />
            목표 기업 상세
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#4F46E5' }}>58%</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>넥슨코리아 합격 예측률</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>3</div><div style={{ fontSize: 11, color: '#6B7280' }}>강점 영역</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: '#EF4444' }}>4</div><div style={{ fontSize: 11, color: '#6B7280' }}>보완 영역</div></div>
            </div>
          </div>
          <div className="ai-comment">
            <div className="ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
            김민준님은 프로그래밍 역량과 인적성 점수가 우수하지만, 어학 성적과 프로젝트 경험이 부족합니다.
            해당 영역을 보완하면 합격률이 75% 이상으로 상승할 것으로 예측됩니다.
          </div>
        </div>
      </div>

      {/* 기업 리스트 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <i className="fa-solid fa-building" style={{ color: '#6366F1' }} />
          기업별 상세 비교
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>기업명</th><th>합격 예측률</th><th>합격자 평균 학점</th><th>합격자 평균 TOEIC</th><th></th></tr></thead>
            <tbody>
              {companies.map((c, i) => (
                <tr key={c.name} className="clickable-row" onClick={() => setCompanyModal(i)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span style={{ fontWeight: 700, color: c.color }}>{c.pct}%</span></td>
                  <td>{c.avgGpa}</td>
                  <td>{c.avgToeic}</td>
                  <td><i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#F59E0B' }} />
          부족 역량 분석
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>역량 영역</th><th>현재 상태</th><th>영향도</th><th>추천 액션</th><th></th></tr></thead>
            <tbody>
              {weaknesses.map((w, i) => (
                <tr key={w.area} className="clickable-row" onClick={() => setGapDrawer(i)}>
                  <td style={{ fontWeight: 600 }}>{w.area}</td>
                  <td>{w.status}</td>
                  <td><span className={`badge ${w.impact === '높음' ? 'badge-red' : 'badge-yellow'}`}>{w.impact}</span></td>
                  <td>{w.action}</td>
                  <td><i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 기업 상세 모달 */}
      <Modal open={companyModal !== null} onClose={() => setCompanyModal(null)} title={company ? `${company.name} 상세 분석` : ''} size="md">
        {company && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: company.color }}>{company.pct}%</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>합격 예측률</div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">졸업자 스펙 비교</div>
              <div className="detail-row"><span className="detail-label">합격자 평균 학점</span><span className="detail-value">{company.avgGpa} (나: 4.3)</span></div>
              <div className="detail-row"><span className="detail-label">합격자 평균 TOEIC</span><span className="detail-value">{company.avgToeic}점 (나: 미취득)</span></div>
              <div className="detail-row"><span className="detail-label">합격자 평균 자격증</span><span className="detail-value">{company.avgCerts}개 (나: 1개)</span></div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title" style={{ color: '#22C55E' }}>강점</div>
              {company.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
                  <i className="fa-solid fa-check-circle" style={{ color: '#22C55E', marginTop: 2 }} />{s}
                </div>
              ))}
            </div>
            <div className="detail-section">
              <div className="detail-section-title" style={{ color: '#EF4444' }}>보완 필요</div>
              {company.weaknesses.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
                  <i className="fa-solid fa-exclamation-circle" style={{ color: '#EF4444', marginTop: 2 }} />{w}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* 역량 갭 Drawer */}
      <Modal size="lg"open={gapDrawer !== null} onClose={() => setGapDrawer(null)} title={gap ? `${gap.area} 개선 방법` : ''}>
        {gap && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className={`badge ${gap.impact === '높음' ? 'badge-red' : 'badge-yellow'}`}>영향도: {gap.impact}</span>
              <span className="badge badge-indigo">현재: {gap.status}</span>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">상세 분석</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{gap.detail}</p>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">추천 프로그램</div>
              {gap.programs.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 14 }}>
                  <i className="fa-solid fa-graduation-cap" style={{ color: '#6366F1' }} />{p}
                </div>
              ))}
            </div>
            <div className="ai-comment" style={{ marginTop: 16 }}>
              <div className="ai-label"><i className="fa-solid fa-robot" /> AI 추천</div>
              {gap.action}을 목표로 이번 학기부터 준비를 시작하세요.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
