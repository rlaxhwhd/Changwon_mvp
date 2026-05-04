import { useState } from 'react';
import Modal from '../components/Modal';

interface CompanyInfoProps {
  onToast: (msg: string) => void;
}

interface Posting {
  title: string;
  type: string;
  deadline: string;
  desc: string;
  requirements: string[];
  preferred: string[];
  salary: string;
}

const postings: Posting[] = [
  { title: '[신입] 게임 프로젝트 매니저', type: '정규직', deadline: '2026-04-15', desc: '글로벌 게임 서비스의 기획 및 프로젝트 관리를 담당합니다. 다양한 부서와 협업하며 프로젝트 일정, 품질, 리스크를 관리합니다.', requirements: ['학사 이상 (컴퓨터공학, 경영학 등)', 'TOEIC 700점 이상', '프로젝트 관리 경험 우대'], preferred: ['PMP 자격증 보유자', '게임 산업 이해도 높은 자'], salary: '4,000 ~ 5,000만원' },
  { title: '서비스 운영 매니저', type: '정규직', deadline: '2026-04-20', desc: '라이브 서비스의 안정적 운영을 책임지며, 유저 피드백을 분석하여 서비스 개선을 주도합니다.', requirements: ['학사 이상', '서비스 운영 경험 우대', 'SQL 활용 가능'], preferred: ['게임 서비스 운영 경험', '데이터 분석 능력'], salary: '3,800 ~ 4,800만원' },
  { title: 'QA 엔지니어 (인턴)', type: '인턴', deadline: '2026-05-01', desc: '게임 품질 보증 업무를 수행하며, 테스트 계획 수립 및 버그 리포팅을 담당합니다.', requirements: ['관련 학과 재학/졸업', '게임 플레이 경험'], preferred: ['자동화 테스트 경험', 'ISTQB 자격증'], salary: '월 200만원' },
  { title: '데이터 분석가', type: '정규직', deadline: '상시채용', desc: '게임 데이터를 분석하여 비즈니스 인사이트를 도출하고, 의사결정을 지원합니다.', requirements: ['학사 이상', 'SQL, Python 활용 가능', '통계 분석 역량'], preferred: ['게임 데이터 분석 경험', 'Tableau/Power BI'], salary: '4,200 ~ 5,200만원' },
];

export default function CompanyInfo({ onToast }: CompanyInfoProps) {
  const [companyDrawer, setCompanyDrawer] = useState(false);
  const [postingModal, setPostingModal] = useState<number | null>(null);
  const posting = postingModal !== null ? postings[postingModal] : null;

  return (
    <div>
      <div className="page-header">
        <h1>기업정보 플랫폼</h1>
        <p>관심 기업 정보와 채용공고를 확인하세요</p>
      </div>

      {/* 관심기업 카드 */}
      <div className="card mb-24">
        <div className="card-title">
          <i className="fa-solid fa-heart" style={{ color: '#EF4444' }} /> 관심기업
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: 20, background: '#F9FAFB', borderRadius: 12, cursor: 'pointer',
        }} onClick={() => setCompanyDrawer(true)}>
          <div style={{
            width: 64, height: 64, borderRadius: 12,
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 24, fontWeight: 700,
          }}>
            N
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>넥슨코리아 <i className="fa-solid fa-chevron-right" style={{ fontSize: 12, color: '#9CA3AF' }} /></div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              게임 · IT · 판교 · 직원 3,000+
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className="badge badge-indigo">관심기업</span>
              <span className="badge badge-green">채용진행중</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#4F46E5' }}>58%</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>AI 합격 예측</div>
          </div>
        </div>
      </div>

      {/* 채용공고 테이블 */}
      <div className="card">
        <div className="card-title">
          <i className="fa-solid fa-briefcase" style={{ color: '#6366F1' }} /> 채용공고
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>공고명</th><th>고용형태</th><th>마감일</th><th></th></tr>
            </thead>
            <tbody>
              {postings.map((p, i) => (
                <tr key={i} className="clickable-row" onClick={() => setPostingModal(i)}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td><span className={`badge ${p.type === '정규직' ? 'badge-indigo' : 'badge-yellow'}`}>{p.type}</span></td>
                  <td>{p.deadline}</td>
                  <td><i className="fa-solid fa-chevron-right" style={{ color: '#9CA3AF', fontSize: 12 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 기업 상세 Drawer */}
      <Modal size="lg"open={companyDrawer} onClose={() => setCompanyDrawer(false)} title="넥슨코리아 기업 정보">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 16, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 32, fontWeight: 700,
          }}>N</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>넥슨코리아</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>게임 · IT · 판교</div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">기업 개요</div>
          <div className="detail-row"><span className="detail-label">설립연도</span><span className="detail-value">2002년</span></div>
          <div className="detail-row"><span className="detail-label">직원 수</span><span className="detail-value">3,000명+</span></div>
          <div className="detail-row"><span className="detail-label">매출</span><span className="detail-value">3조 5,000억원 (2025)</span></div>
          <div className="detail-row"><span className="detail-label">위치</span><span className="detail-value">경기도 성남시 분당구 판교</span></div>
          <div className="detail-row"><span className="detail-label">대표 서비스</span><span className="detail-value">메이플스토리, 던전앤파이터, FC 온라인</span></div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">채용 트렌드</div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            넥슨코리아는 매년 상반기/하반기 공채를 진행하며, 게임 기획, 개발, 아트, QA, PM 등
            다양한 직군에서 신입 및 경력 채용을 진행합니다. 최근에는 AI/ML, 데이터 분석 직군
            채용을 확대하고 있습니다.
          </p>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">졸업생 합격자 스펙 평균</div>
          <div className="detail-row"><span className="detail-label">평균 학점</span><span className="detail-value">4.0 / 4.5</span></div>
          <div className="detail-row"><span className="detail-label">평균 TOEIC</span><span className="detail-value">780점</span></div>
          <div className="detail-row"><span className="detail-label">평균 자격증</span><span className="detail-value">2.1개</span></div>
          <div className="detail-row"><span className="detail-label">프로젝트 경험</span><span className="detail-value">2.5건</span></div>
        </div>

        <div className="ai-comment" style={{ marginTop: 16 }}>
          <div className="ai-label"><i className="fa-solid fa-robot" /> AI 분석</div>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            현재 김민준님의 합격 예측률은 <strong>58%</strong>입니다.
            학점(4.3)은 합격자 평균을 상회하나, TOEIC 미보유와 프로젝트 경험 부족이
            주요 감점 요인입니다. TOEIC 700+ 취득 시 예측률이 <strong>72%</strong>로 상승합니다.
          </p>
        </div>
      </Modal>

      {/* 채용공고 상세 모달 */}
      <Modal open={postingModal !== null} onClose={() => setPostingModal(null)} title={posting ? posting.title : ''} size="lg">
        {posting && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className={`badge ${posting.type === '정규직' ? 'badge-indigo' : 'badge-yellow'}`}>{posting.type}</span>
              <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{posting.salary}</span>
              <span className="badge" style={{ background: '#F3F4F6', color: '#374151' }}>마감: {posting.deadline}</span>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">직무 설명</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{posting.desc}</p>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">자격 요건</div>
              {posting.requirements.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: '#6366F1', marginTop: 2 }} />{r}
                </div>
              ))}
            </div>

            <div className="detail-section">
              <div className="detail-section-title">우대 사항</div>
              {posting.preferred.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
                  <i className="fa-solid fa-star" style={{ color: '#F59E0B', marginTop: 2 }} />{p}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setPostingModal(null)}>닫기</button>
              <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
                onClick={() => { setPostingModal(null); onToast('지원서 작성 페이지로 이동합니다'); }}>
                <i className="fa-solid fa-paper-plane" /> 지원하기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
