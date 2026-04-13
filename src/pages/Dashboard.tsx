import { useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import RingGauge from '../components/RingGauge';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import type { PageId } from '../types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface DashboardProps {
  onToast: (msg: string) => void;
  onNavigate: (page: PageId) => void;
}

const radarData = {
  labels: ['학점', '어학', 'IT자격증', 'PM역량', '프로젝트 경험', '인성/심리'],
  datasets: [
    {
      label: '내 현재 역량',
      data: [90, 20, 40, 55, 45, 80],
      backgroundColor: 'rgba(99,102,241,.2)',
      borderColor: '#6366F1',
      borderWidth: 2,
      pointBackgroundColor: '#6366F1',
    },
    {
      label: '넥슨 합격자 평균',
      data: [85, 70, 75, 80, 85, 75],
      backgroundColor: 'rgba(34,197,94,.1)',
      borderColor: '#22C55E',
      borderWidth: 2,
      borderDash: [5, 5],
      pointBackgroundColor: '#22C55E',
    },
  ],
};

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: { stepSize: 25, font: { size: 10 }, backdropColor: 'transparent' },
      pointLabels: { font: { size: 12, family: 'Noto Sans KR' }, color: '#374151' },
      grid: { color: 'rgba(0,0,0,.06)' },
      angleLines: { color: 'rgba(0,0,0,.06)' },
    },
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { font: { size: 11 }, usePointStyle: true, pointStyle: 'rect', padding: 16 },
    },
  },
};

const EXAM_DETAILS: Record<string, { items: { name: string; score: number; max: number }[]; date: string }> = {
  '인적성검사': {
    date: '2025.04.15',
    items: [
      { name: '언어이해', score: 85, max: 100 },
      { name: '수리능력', score: 78, max: 100 },
      { name: '추리능력', score: 82, max: 100 },
      { name: '공간지각', score: 72, max: 100 },
      { name: '지각속도', score: 83, max: 100 },
    ],
  },
  '9CORE 검사': {
    date: '2025.03.20',
    items: [
      { name: '도전정신', score: 75, max: 100 },
      { name: '소통능력', score: 70, max: 100 },
      { name: '문제해결', score: 65, max: 100 },
      { name: '창의융합', score: 60, max: 100 },
      { name: '글로벌역량', score: 55, max: 100 },
      { name: '디지털역량', score: 72, max: 100 },
      { name: '자기관리', score: 68, max: 100 },
      { name: '대인관계', score: 73, max: 100 },
      { name: '윤리의식', score: 70, max: 100 },
    ],
  },
  'Cares 검사': {
    date: '2025.05.01',
    items: [
      { name: '자아인식', score: 90, max: 100 },
      { name: '진로탐색', score: 88, max: 100 },
      { name: '진로결정', score: 85, max: 100 },
      { name: '취업준비행동', score: 89, max: 100 },
    ],
  },
};

export default function Dashboard({ onToast, onNavigate }: DashboardProps) {
  const [examModal, setExamModal] = useState<string | null>(null);
  const [goalDrawer, setGoalDrawer] = useState(false);
  const [goalForm, setGoalForm] = useState({
    company: '넥슨코리아',
    role: 'IT Project Manager',
    gpa: '4.3',
    industry: '게임/IT',
  });

  const exam = examModal ? EXAM_DETAILS[examModal] : null;

  return (
    <div>
      <div className="page-header">
        <h1>대시보드</h1>
        <p>김민준님의 역량개발 현황을 한눈에 확인하세요</p>
      </div>

      {/* ── 핵심 지표 4카드 ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="icon-box" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <i className="fa-solid fa-graduation-cap" />
          </div>
          <div className="value">4.3</div>
          <div className="label">학점 (/ 4.5)</div>
          <div className="sub" style={{ color: '#22C55E' }}>
            <i className="fa-solid fa-arrow-up" style={{ fontSize: 10 }} /> 전학기 대비 +0.1
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-box" style={{ background: '#F0FDF4', color: '#16A34A' }}>
            <i className="fa-solid fa-robot" />
          </div>
          <div className="value">82<span style={{ fontSize: 16, fontWeight: 500, color: '#6B7280' }}>점</span></div>
          <div className="label">AI 역량 종합점수</div>
          <div className="sub" style={{ color: '#22C55E' }}>
            <i className="fa-solid fa-arrow-up" style={{ fontSize: 10 }} /> 이전 대비 +5점
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-box" style={{ background: '#FEF9C3', color: '#CA8A04' }}>
            <i className="fa-solid fa-certificate" />
          </div>
          <div className="value">1</div>
          <div className="label">보유 자격증</div>
          <div className="sub">— SQLD 보유</div>
        </div>
        <div className="stat-card">
          <div className="icon-box" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <i className="fa-solid fa-language" />
          </div>
          <div className="value">—</div>
          <div className="label">어학 성적</div>
          <div className="sub" style={{ color: '#EF4444' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 10 }} /> 미취득 (권고)
          </div>
        </div>
      </div>

      {/* ── 레이더 차트 (왼쪽) + 진로목표/검사결과 (오른쪽) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ gridRow: '1 / 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 2, fontSize: 16 }}>내 역량 레이더</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>목표 vs 현재 비교</div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => onToast('AI 분석 리포트를 준비 중입니다')}>
              <i className="fa-solid fa-robot" /> AI 분석
            </button>
          </div>
          <div style={{ height: 340 }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        {/* 진로 목표 */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <i className="fa-solid fa-bullseye" style={{ color: '#EF4444' }} />
              진로 목표
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setGoalDrawer(true)}>
              <i className="fa-solid fa-pen" /> 편집
            </button>
          </div>
          <table className="info-table" style={{ marginBottom: 16 }}>
            <tbody>
              <tr><th>희망 직무</th><td style={{ fontWeight: 600 }}>{goalForm.role}</td></tr>
              <tr><th>희망 기업</th><td style={{ fontWeight: 600 }}>{goalForm.company} ({goalForm.industry})</td></tr>
              <tr><th>현재 합격 예측</th><td><span style={{ fontWeight: 700, color: '#F59E0B' }}>58%</span></td></tr>
              <tr><th>목표 달성률</th><td><span style={{ fontWeight: 600 }}>64%</span></td></tr>
            </tbody>
          </table>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('ai-roadmap')}>
            <i className="fa-solid fa-route" /> AI 로드맵 보기
          </button>
        </div>

        {/* 검사 결과 요약 */}
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-simple" style={{ color: '#6366F1' }} />
            검사 결과 요약
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            {(['인적성검사', '9CORE 검사', 'Cares 검사'] as const).map(name => (
              <div key={name} style={{ cursor: 'pointer' }} onClick={() => setExamModal(name)}>
                <RingGauge
                  score={name === '인적성검사' ? 80 : name === '9CORE 검사' ? 68 : 88}
                  max={100}
                  label={name}
                  color={name === '인적성검사' ? '#6366F1' : name === '9CORE 검사' ? '#F59E0B' : '#22C55E'}
                />
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#9CA3AF' }}>
            클릭하면 세부 결과를 확인할 수 있습니다
          </div>
        </div>
      </div>

      {/* ── AI 종합평가 섹션 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-title" style={{ justifyContent: 'center' }}>
            <i className="fa-solid fa-star" style={{ color: '#F59E0B' }} /> AI 종합 점수
          </div>
          <RingGauge score={68} max={100} label="100점 만점" color="#6366F1" size={160} />
          <div style={{ marginTop: 12 }}>
            <span className="badge badge-indigo" style={{ fontSize: 13, padding: '4px 14px' }}>상위 32%</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-simple" style={{ color: '#6366F1' }} /> AI 역량별 상세
          </div>
          {[
            { name: '학업 역량', score: 88, color: '#6366F1' },
            { name: '프로그래밍', score: 85, color: '#3B82F6' },
            { name: '인적성', score: 80, color: '#22C55E' },
            { name: '커뮤니케이션', score: 70, color: '#F59E0B' },
            { name: '프로젝트 경험', score: 45, color: '#EF4444' },
            { name: '어학', score: 10, color: '#EF4444' },
            { name: '자격증', score: 35, color: '#F59E0B' },
          ].map(a => (
            <div key={a.name} style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => onNavigate('ai-evaluation')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{a.name} <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: '#9CA3AF' }} /></span>
                <span style={{ fontWeight: 700, color: a.color }}>{a.score}점</span>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${a.score}%`, background: a.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 9CORE AI 평가 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-radar" style={{ color: '#6366F1' }} /> 9CORE AI 평가
          </div>
          <div style={{ marginBottom: 12 }}>
            {[
              { name: '의사소통', score: 78 },
              { name: '문제해결', score: 82 },
              { name: '자기관리', score: 70 },
              { name: '대인관계', score: 65 },
              { name: '정보활용', score: 88 },
              { name: '글로벌', score: 35 },
              { name: '리더십', score: 60 },
              { name: '창의융합', score: 72 },
              { name: '직업윤리', score: 75 },
            ].map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, width: 64, flexShrink: 0 }}>{c.name}</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="fill" style={{
                    width: `${c.score}%`,
                    background: c.score >= 80 ? '#22C55E' : c.score >= 60 ? '#F59E0B' : '#EF4444'
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, width: 32, textAlign: 'right',
                  color: c.score >= 80 ? '#22C55E' : c.score >= 60 ? '#F59E0B' : '#EF4444' }}>{c.score}</span>
              </div>
            ))}
          </div>
          <div className="ai-comment" style={{ fontSize: 12 }}>
            <div className="ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
            정보활용(88점)과 문제해결(82점)이 강점입니다. 글로벌 역량(35점)은 시급한 보완이 필요합니다.
            TOEIC 학습과 국제 교류 프로그램 참여를 권장합니다.
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-list-check" style={{ color: '#22C55E' }} /> 역량프로그램 AI 평가
          </div>
          <div style={{ marginBottom: 12 }}>
            {[
              { name: '취업역량강화 캠프', hours: 40, category: '취업', score: 86 },
              { name: 'AI 활용 자소서 특강', hours: 3, category: 'AI', score: 78 },
              { name: '창업아이디어 경진대회', hours: 16, category: '창업', score: 70 },
            ].map((p, i) => (
              <div key={i} style={{ padding: 10, background: '#F9FAFB', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <span className="badge" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 11 }}>{p.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
                  <span>{p.hours}시간 이수</span>
                  <span style={{ color: '#6366F1', fontWeight: 700 }}>기여도 {p.score}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="ai-comment" style={{ fontSize: 12 }}>
            <div className="ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
            총 3개 프로그램 수료(59시간). 취업 분야 집중도가 높습니다.
            진로탐색 및 디지털 역량 프로그램 추가 이수를 권장합니다.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <span><i className="fa-solid fa-robot" style={{ color: '#6366F1' }} /> AI 종합 코멘트</span>
        </div>
        <div className="ai-comment">
          <div className="ai-label"><i className="fa-solid fa-robot" /> AI 분석 리포트</div>
          <p style={{ marginBottom: 12 }}>
            김민준님은 <strong>학업 역량(4.3/4.5)과 프로그래밍 실력이 우수</strong>하며,
            인적성검사에서도 80점으로 양호한 수준입니다. 현재 전체 역량 종합 점수는 <strong>68점</strong>으로
            상위 32%에 해당합니다.
          </p>
          <p>
            <strong>추천 전략:</strong> 어학(TOEIC 700+)과 프로젝트 경험 보완에 집중하세요.
          </p>
        </div>
      </div>

      {/* 검사 결과 상세 모달 */}
      <Modal open={!!examModal} onClose={() => setExamModal(null)} title={`${examModal} 세부 결과`} size="md">
        {exam && (
          <div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>검사일: {exam.date}</div>
            {exam.items.map(item => (
              <div key={item.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#4F46E5', fontWeight: 700 }}>{item.score}점</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(item.score / item.max) * 100}%`, background: '#6366F1' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 진로 목표 편집 Drawer */}
      <Modal size="lg"open={goalDrawer} onClose={() => setGoalDrawer(false)} title="진로 목표 편집" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setGoalDrawer(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => { setGoalDrawer(false); onToast('진로 목표가 저장되었습니다'); }}>
            저장
          </button>
        </div>
      }>
        <FormField label="희망 기업" value={goalForm.company} onChange={v => setGoalForm({ ...goalForm, company: v })} />
        <FormField label="희망 직무" value={goalForm.role} onChange={v => setGoalForm({ ...goalForm, role: v })} />
        <FormField label="업종" value={goalForm.industry} onChange={v => setGoalForm({ ...goalForm, industry: v })} />
        <FormField label="목표 학점" type="number" value={goalForm.gpa} onChange={v => setGoalForm({ ...goalForm, gpa: v })} />
        <FormField label="관심 자격증" type="select" value="" options={[
          { value: 'pmp', label: 'PMP' },
          { value: 'sqld', label: 'SQLD' },
          { value: 'adsp', label: 'ADsP' },
          { value: 'engineer', label: '정보처리기사' },
        ]} />
      </Modal>
    </div>
  );
}
