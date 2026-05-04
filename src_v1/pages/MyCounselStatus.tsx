import { useState } from 'react';
import Modal from '../components/Modal';

interface MyCounselStatusProps {
  onToast: (msg: string, type?: 'info' | 'success') => void;
}

interface CounselRecord {
  id: number;
  type: '진로상담' | '심리상담' | '교수상담' | '취업상담';
  counselor: string;
  date: string;
  time: string;
  status: '예약확정' | '완료' | '취소';
  summary: string;
  counselorComment?: string;
  professorComment?: string;
  topics: string[];
}

const counsels: CounselRecord[] = [
  {
    id: 1,
    type: '진로상담',
    counselor: '김진로 상담사',
    date: '2026-04-10',
    time: '14:00',
    status: '예약확정',
    summary: 'IT PM 진로 방향 점검 및 향후 6개월 로드맵 설정 예정.',
    topics: ['진로 설정', 'IT PM', '6개월 로드맵'],
  },
  {
    id: 2,
    type: '심리상담',
    counselor: '박심리 상담사',
    date: '2026-04-03',
    time: '10:00',
    status: '완료',
    summary: '학업 스트레스 관리 및 시간 관리 전략 수립.',
    counselorComment: '학생은 목표 의식이 뚜렷하나 완벽주의 성향으로 인한 번아웃 위험이 있음. 주 1회 휴식일 확보와 마인드풀니스 훈련을 권장함. 정서 안정도는 이전 대비 개선되었으며, 자기효능감이 높은 편.',
    topics: ['스트레스 관리', '시간 관리', '번아웃 예방'],
  },
  {
    id: 3,
    type: '교수상담',
    counselor: '이교수 (컴퓨터공학과)',
    date: '2026-03-25',
    time: '15:00',
    status: '완료',
    summary: '전공 심화 로드맵 및 대학원 진학 여부 논의.',
    professorComment: '학업 태도 매우 성실하며 전공 이해도 우수. 자료구조·알고리즘 기초가 탄탄하여 시스템 프로그래밍이나 백엔드 분야로 진로 확장 권장. 캡스톤 프로젝트에서 팀 리더 역할을 적극 제안함. 대학원 진학보다는 산업계 실무 경험 우선을 추천.',
    topics: ['전공 심화', '캡스톤 리더십', '진로 방향'],
  },
  {
    id: 4,
    type: '취업상담',
    counselor: '최취업 상담사',
    date: '2026-03-15',
    time: '11:00',
    status: '완료',
    summary: '넥슨코리아 등 목표 기업 분석 및 자소서 첨삭.',
    counselorComment: '목표 기업 분석이 구체적이고 준비가 체계적임. 다만 어학 스펙(TOEIC) 부재가 가장 큰 리스크. 자소서 내 프로젝트 경험 스토리텔링을 더 구체화할 필요가 있음. 모의면접 적극 참여 권장.',
    topics: ['기업 분석', '자소서 첨삭', '모의면접'],
  },
  {
    id: 5,
    type: '심리상담',
    counselor: '박심리 상담사',
    date: '2026-03-05',
    time: '10:00',
    status: '완료',
    summary: '대인관계 및 팀 프로젝트 갈등 상황 상담.',
    counselorComment: '대인관계 감수성이 높고 타인 의견 수용에 적극적임. 팀 내 갈등 발생 시 자기 의견 주장보다는 조율하는 성향. 리더십 포지션에서 주도성을 더 발휘할 수 있도록 점진적 연습 권장.',
    topics: ['대인관계', '팀 협업', '리더십'],
  },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  '예약확정': { bg: '#EEF2FF', color: '#4F46E5' },
  '완료': { bg: '#F0FDF4', color: '#16A34A' },
  '취소': { bg: '#FEF2F2', color: '#EF4444' },
};

const typeIcon: Record<CounselRecord['type'], { icon: string; color: string }> = {
  '진로상담': { icon: 'fa-solid fa-compass', color: '#6366F1' },
  '심리상담': { icon: 'fa-solid fa-heart-pulse', color: '#EC4899' },
  '교수상담': { icon: 'fa-solid fa-graduation-cap', color: '#F59E0B' },
  '취업상담': { icon: 'fa-solid fa-briefcase', color: '#22C55E' },
};

export default function MyCounselStatus({ onToast }: MyCounselStatusProps) {
  const [detail, setDetail] = useState<CounselRecord | null>(null);
  const [aiReport, setAiReport] = useState(false);

  const byType = counsels.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});

  const completed = counsels.filter(c => c.status === '완료').length;
  const upcoming = counsels.filter(c => c.status === '예약확정').length;

  return (
    <div>
      <div className="page-header">
        <h1>상담현황</h1>
        <p>전문가 상담 내역과 AI 종합 분석을 확인하세요</p>
      </div>

      {/* 통계 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>총 상담 건수</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#6366F1' }}>{counsels.length}건</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>완료</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>{completed}건</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>예정</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4F46E5' }}>{upcoming}건</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>최근 상담</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 4 }}>2026-04-10</div>
        </div>
      </div>

      {/* 상담 유형별 분포 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <i className="fa-solid fa-chart-pie" style={{ color: '#6366F1' }} /> 상담 유형별 분포
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(['진로상담', '심리상담', '교수상담', '취업상담'] as const).map(t => (
            <div key={t} style={{
              padding: '14px 12px', border: '1px solid #E5E7EB', borderRadius: 8,
              background: '#F9FAFB', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: typeIcon[t].color + '20', color: typeIcon[t].color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>
                <i className={typeIcon[t].icon} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{t}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{byType[t] || 0}건</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 상담 내역 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-list" style={{ color: '#6366F1' }} /> 상담 내역</span>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>카드를 클릭하면 상세 코멘트를 볼 수 있습니다</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {counsels.map(c => (
            <div key={c.id} style={{
              padding: '14px 16px', border: '1px solid #E5E7EB', borderRadius: 10,
              cursor: 'pointer', background: '#FFFFFF',
            }}
              onClick={() => setDetail(c)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: typeIcon[c.type].color + '20', color: typeIcon[c.type].color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    <i className={typeIcon[c.type].icon} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{c.type}</span>
                      <span className="badge" style={{ ...(statusStyle[c.status] || statusStyle['완료']), fontSize: 11 }}>{c.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{c.counselor}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.date}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.time}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#4B5563', paddingLeft: 42 }}>{c.summary}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingLeft: 42 }}>
                {c.topics.map(t => (
                  <span key={t} style={{
                    padding: '2px 8px', background: '#EEF2FF', color: '#4F46E5',
                    borderRadius: 10, fontSize: 11, fontWeight: 500,
                  }}>#{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI 종합평가 */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-robot" style={{ color: '#6366F1' }} /> AI 종합평가</span>
          <button className="btn btn-sm btn-outline" onClick={() => setAiReport(true)}>
            <i className="fa-solid fa-expand" /> 전체 리포트
          </button>
        </div>
        <div className="ai-comment">
          <div className="ai-label"><i className="fa-solid fa-robot" /> 전문가 코멘트 종합 분석</div>
          <p style={{ marginBottom: 10 }}>
            <strong>심리상담사, 교수, 취업상담사 총 4명의 코멘트</strong>를 종합 분석한 결과,
            김민준님은 <strong>목표 의식과 성실성이 매우 높은 학생</strong>이지만
            <strong> 완벽주의 성향으로 인한 번아웃 리스크</strong>와 <strong>어학(TOEIC) 스펙 부재</strong>가
            주요 보완점으로 공통 지적됩니다.
          </p>
          <p style={{ marginBottom: 10 }}>
            교수 코멘트에서는 <strong>전공 이해도와 리더십 잠재력</strong>이 높게 평가되었으며,
            심리상담에서는 <strong>대인관계 감수성</strong>이 장점으로, 다만 팀 내에서
            <strong> 주도성 발휘에는 연습이 필요</strong>하다고 분석되었습니다.
          </p>
          <p>
            <strong>종합 추천:</strong> 번아웃 예방을 위한 주간 휴식 루틴 확보,
            TOEIC 700+ 단기 집중 준비, 캡스톤 프로젝트 리더 역할 도전을 권장합니다.
          </p>
        </div>
      </div>

      {/* 상세 모달 */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail ? `${detail.type} 상세` : ''} size="md">
        {detail && (
          <div>
            <div style={{
              padding: 14, background: '#F9FAFB', borderRadius: 8, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{detail.counselor}</span>
                <span className="badge" style={{ ...(statusStyle[detail.status] || statusStyle['완료']), fontSize: 11 }}>{detail.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{detail.date} {detail.time}</div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">상담 요약</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{detail.summary}</p>
            </div>

            {detail.counselorComment && (
              <div className="detail-section">
                <div className="detail-section-title">
                  <i className="fa-solid fa-user-tie" style={{ color: '#6366F1', marginRight: 6 }} />
                  상담사 코멘트
                </div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, padding: 12, background: '#EEF2FF', borderRadius: 8 }}>
                  {detail.counselorComment}
                </p>
              </div>
            )}

            {detail.professorComment && (
              <div className="detail-section">
                <div className="detail-section-title">
                  <i className="fa-solid fa-chalkboard-user" style={{ color: '#F59E0B', marginRight: 6 }} />
                  교수 코멘트
                </div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, padding: 12, background: '#FEF3C7', borderRadius: 8 }}>
                  {detail.professorComment}
                </p>
              </div>
            )}

            <div className="detail-section">
              <div className="detail-section-title">다룬 주제</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {detail.topics.map(t => (
                  <span key={t} style={{
                    padding: '4px 10px', background: '#EEF2FF', color: '#4F46E5',
                    borderRadius: 12, fontSize: 12, fontWeight: 500,
                  }}>#{t}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-sm btn-outline" onClick={() => onToast('상담 이력이 복사되었습니다', 'success')}>
                <i className="fa-solid fa-copy" /> 기록 복사
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => onToast('재상담 요청이 접수되었습니다', 'success')}>
                <i className="fa-solid fa-calendar-plus" /> 재상담 요청
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* AI 전체 리포트 */}
      <Modal size="lg" open={aiReport} onClose={() => setAiReport(false)} title="AI 종합 분석 리포트 - 전문가 코멘트 기반">
        <div className="detail-section">
          <div className="detail-section-title">종합 평가</div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
            총 <strong>5회 상담 (심리 2회, 교수 1회, 진로 1회, 취업 1회)</strong>의 전문가 코멘트를
            종합 분석한 결과, 김민준님은 <strong>학업·전공 역량 상위권, 목표 의식 뚜렷, 대인관계 감수성 우수</strong>의
            프로필을 보입니다. 동시에 <strong>번아웃 리스크, 어학 스펙 부재, 팀 내 주도성 부족</strong>이
            반복적으로 지적되는 보완 영역입니다.
          </p>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">전문가별 공통 강점 분석</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p>• <strong>성실성·목표 의식</strong> — 심리·취업·진로 상담사 공통 지적</p>
            <p>• <strong>전공 이해도</strong> — 교수 코멘트에서 특히 우수 평가</p>
            <p>• <strong>대인관계 감수성</strong> — 심리상담 2회 일관된 분석</p>
            <p>• <strong>자기효능감</strong> — 심리상담 추적 평가에서 지속 상승</p>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">반복 지적된 보완 영역</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p>1. <strong>번아웃 리스크 (심리상담 2회)</strong> — 완벽주의 성향 주의</p>
            <p>2. <strong>어학(TOEIC) 부재 (취업상담)</strong> — 목표 기업 합격 저해 요인</p>
            <p>3. <strong>팀 내 주도성 (심리상담)</strong> — 조율자 성향을 리더 역할로 확장 필요</p>
            <p>4. <strong>프로젝트 스토리텔링 (취업상담)</strong> — 경험 구체화 필요</p>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">AI 맞춤 액션 플랜</div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p>• <strong>주간 루틴</strong>: 주 1회 완전 휴식일 확보, 마인드풀니스 10분 훈련</p>
            <p>• <strong>단기 (3개월)</strong>: TOEIC 700+ 취득, 캡스톤 리더 역할 지원</p>
            <p>• <strong>중기 (6개월)</strong>: 자소서 프로젝트 스토리 2개 보강, 모의면접 5회 이상</p>
            <p>• <strong>재상담 권장</strong>: 3개월 후 심리상담 추적 세션, 교수 중간 점검</p>
          </div>
        </div>

        <div className="ai-comment" style={{ marginTop: 16 }}>
          <div className="ai-label"><i className="fa-solid fa-lightbulb" /> AI 제안</div>
          전문가 코멘트가 공통으로 가리키는 <strong>"완벽주의 × 어학 공백"</strong>이 현재 가장 큰 진로 리스크입니다.
          휴식 루틴 확보 + TOEIC 단기 집중을 병행하면, 4개월 내 목표 기업 합격 예측률을 크게 끌어올릴 수 있습니다.
        </div>
      </Modal>
    </div>
  );
}
