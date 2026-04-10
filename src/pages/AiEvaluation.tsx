import { useState } from 'react';
import RingGauge from '../components/RingGauge';
import Modal from '../components/Modal';

const abilities = [
  { name: '학업 역량', score: 88, color: '#6366F1', detail: '학점 4.3/4.5, 전공 GPA 4.5. 전체 상위 10%에 해당합니다.', trend: [75, 80, 85, 88], suggestion: '현재 학점 유지를 목표로 하세요.' },
  { name: '프로그래밍', score: 85, color: '#3B82F6', detail: 'Java, Python 등 기초 프로그래밍 역량 보유. SQLD 취득으로 DB 역량 입증.', trend: [60, 70, 80, 85], suggestion: '웹 프레임워크(Spring, React) 학습을 추가하세요.' },
  { name: '인적성', score: 80, color: '#22C55E', detail: '인적성검사 80점, 상위 20% 수준. 언어이해, 수리능력이 우수합니다.', trend: [72, 75, 78, 80], suggestion: '추리능력 영역을 보완하면 90점 이상 가능합니다.' },
  { name: '커뮤니케이션', score: 70, color: '#F59E0B', detail: '9CORE 소통능력 70점. 대인관계 73점. 평균 수준입니다.', trend: [60, 65, 68, 70], suggestion: '발표/토론 비교과 활동 참여를 권장합니다.' },
  { name: '프로젝트 경험', score: 45, color: '#EF4444', detail: '팀 프로젝트 1건 참여. PM 직무 지원을 위해 추가 경험이 필요합니다.', trend: [0, 20, 35, 45], suggestion: '캡스톤 디자인, 공모전 참여로 경험을 쌓으세요.' },
  { name: '어학', score: 10, color: '#EF4444', detail: '어학 성적 미보유. IT PM 직무의 핵심 요구 역량입니다.', trend: [0, 0, 0, 10], suggestion: 'TOEIC 700점 이상 취득을 최우선으로 준비하세요.' },
  { name: '자격증', score: 35, color: '#F59E0B', detail: 'SQLD 1개 보유. 목표 기업 합격자 평균 2개 대비 부족합니다.', trend: [0, 0, 20, 35], suggestion: '정보처리기사 취득을 다음 목표로 설정하세요.' },
];

export default function AiEvaluation() {
  const [abilityModal, setAbilityModal] = useState<number | null>(null);
  const [reportDrawer, setReportDrawer] = useState(false);
  const total = 68;
  const ability = abilityModal !== null ? abilities[abilityModal] : null;

  return (
    <div>
      <div className="page-header">
        <h1>AI 종합평가</h1>
        <p>AI가 분석한 종합 역량 평가 결과입니다</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-title" style={{ justifyContent: 'center' }}>
            <i className="fa-solid fa-star" style={{ color: '#F59E0B' }} /> 종합 점수
          </div>
          <RingGauge score={total} max={100} label="100점 만점" color="#6366F1" size={160} />
          <div style={{ marginTop: 12 }}>
            <span className="badge badge-indigo" style={{ fontSize: 13, padding: '4px 14px' }}>상위 32%</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-simple" style={{ color: '#6366F1' }} /> 역량별 상세
          </div>
          {abilities.map((a, i) => (
            <div key={a.name} style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => setAbilityModal(i)}>
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

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-robot" style={{ color: '#6366F1' }} /> AI 종합 코멘트</span>
          <button className="btn btn-sm btn-outline" onClick={() => setReportDrawer(true)}>
            <i className="fa-solid fa-expand" /> 전체 리포트 보기
          </button>
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

      {/* 역량별 상세 모달 */}
      <Modal open={abilityModal !== null} onClose={() => setAbilityModal(null)} title={ability ? `${ability.name} 상세 분석` : ''} size="md">
        {ability && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: ability.color }}>{ability.score}점</div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">상세 분석</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{ability.detail}</p>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">변화 추이</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 80, padding: '8px 0' }}>
                {ability.trend.map((v, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ background: ability.color, height: `${(v / 100) * 60}px`, borderRadius: 4, marginBottom: 4, opacity: 0.3 + (i * 0.2) }} />
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{['1학기', '2학기', '3학기', '현재'][i]}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ai-comment" style={{ marginTop: 16 }}>
              <div className="ai-label"><i className="fa-solid fa-lightbulb" /> AI 제안</div>
              {ability.suggestion}
            </div>
          </div>
        )}
      </Modal>

      {/* 전체 리포트 Drawer */}
      <Modal size="lg"open={reportDrawer} onClose={() => setReportDrawer(false)} title="AI 종합 분석 리포트">
        <div className="detail-section">
          <div className="detail-section-title">종합 평가</div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
            김민준님의 종합 역량 점수는 <strong>68점 (상위 32%)</strong>입니다.
            학업 역량(88점)과 프로그래밍(85점)이 강점이며,
            어학(10점)과 프로젝트 경험(45점)이 가장 시급한 보완 영역입니다.
          </p>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">강점 분석</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p>• <strong>학점 4.3/4.5</strong> — 전체 학생 상위 10%</p>
            <p>• <strong>SQLD 자격증</strong> — 데이터베이스 역량 입증</p>
            <p>• <strong>인적성 80점</strong> — 언어이해, 수리능력 우수</p>
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">보완 전략</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p>1. <strong>어학 (최우선)</strong> — TOEIC 700점 이상 목표. 이번 학기 내 취득 권장.</p>
            <p>2. <strong>프로젝트 경험</strong> — 캡스톤 디자인, 교내 해커톤, 공모전 참여.</p>
            <p>3. <strong>자격증 추가</strong> — 정보처리기사 취득으로 IT 역량 보강.</p>
            <p>4. <strong>인턴십</strong> — 3학년 방학 기간 게임/IT 분야 인턴 지원.</p>
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">예상 성장 시나리오</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p>위 전략 실행 시 3학년 2학기까지 종합 점수 <strong>85점 이상</strong>,
            넥슨코리아 합격 예측률 <strong>75% 이상</strong> 달성이 가능합니다.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
