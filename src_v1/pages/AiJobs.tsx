import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';

interface AiJobsProps {
  onToast: (msg: string) => void;
}

const jobs = [
  {
    company: '넥슨코리아', title: '[신입] 게임 프로젝트 매니저', match: 87,
    tags: ['PM', 'IT기획', '서류마감 D-14'], location: '판교',
    desc: '넥슨코리아의 게임 프로젝트 매니저로서 글로벌 게임 서비스의 기획 및 운영을 담당합니다.',
    requirements: ['학사 이상 (컴퓨터공학, 경영학 등)', 'TOEIC 700점 이상', '프로젝트 관리 경험 우대'],
    preferred: ['PMP 자격증 보유자', '게임 산업 이해도 높은 자', 'Jira/Confluence 사용 경험'],
    matchReasons: ['학점 4.3 (상위 10%)', 'SQLD 자격증 보유', '인적성 80점 (상위 20%)'],
    salary: '4,000 ~ 5,000만원',
  },
  {
    company: '카카오게임즈', title: '서비스 기획자 (신입/경력)', match: 72,
    tags: ['기획', '서비스운영', '상시채용'], location: '판교',
    desc: '카카오게임즈의 서비스 기획자로서 모바일 게임 서비스 운영 기획을 담당합니다.',
    requirements: ['학사 이상', '서비스 기획 경험 또는 관련 프로젝트'],
    preferred: ['게임 서비스 운영 경험', '데이터 분석 능력'],
    matchReasons: ['학점 우수', 'IT 기초 역량 보유'],
    salary: '3,800 ~ 4,800만원',
  },
  {
    company: 'NHN', title: 'IT 프로젝트 관리자', match: 68,
    tags: ['PM', '일정관리', '서류마감 D-21'], location: '삼성동',
    desc: 'NHN의 IT 프로젝트 관리자로서 다양한 IT 프로젝트의 일정/품질/리스크를 관리합니다.',
    requirements: ['학사 이상', 'IT 프로젝트 경험 우대', '원활한 커뮤니케이션 능력'],
    preferred: ['PMP 또는 CAPM 자격증', 'Agile/Scrum 경험'],
    matchReasons: ['학점 양호', '프로그래밍 역량'],
    salary: '3,500 ~ 4,500만원',
  },
  {
    company: '넷마블', title: '게임 서비스 운영 PM', match: 64,
    tags: ['운영', 'PM', '서류마감 D-7'], location: '구로',
    desc: '넷마블의 게임 서비스 운영 PM으로서 라이브 서비스의 안정적 운영을 책임집니다.',
    requirements: ['학사 이상', '게임 산업에 대한 이해'],
    preferred: ['서비스 운영 경험', 'SQL 능력'],
    matchReasons: ['SQLD 보유', '학점 양호'],
    salary: '3,600 ~ 4,600만원',
  },
  {
    company: '쿠팡', title: '프로덕트 매니저 (Junior)', match: 58,
    tags: ['PM', '데이터분석', '상시채용'], location: '잠실',
    desc: '쿠팡의 주니어 프로덕트 매니저로서 이커머스 서비스 개선을 주도합니다.',
    requirements: ['학사 이상', '데이터 기반 사고력', '영어 커뮤니케이션 가능'],
    preferred: ['SQL 능력', 'A/B 테스트 경험', 'Figma 활용 가능'],
    matchReasons: ['SQLD 보유'],
    salary: '4,200 ~ 5,200만원',
  },
  {
    company: '라인플러스', title: '서비스 PM (신입)', match: 55,
    tags: ['PM', '글로벌', '서류마감 D-30'], location: '분당',
    desc: '라인플러스의 서비스 PM으로서 글로벌 메시징 플랫폼 서비스 기획에 참여합니다.',
    requirements: ['학사 이상', '일본어 또는 영어 능통', '서비스 기획 관심'],
    preferred: ['글로벌 서비스 경험', 'UX 리서치 경험'],
    matchReasons: ['학점 양호'],
    salary: '4,000 ~ 5,000만원',
  },
];

export default function AiJobs({ onToast }: AiJobsProps) {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [applyModal, setApplyModal] = useState(false);
  const [resume, setResume] = useState('');

  const job = selectedJob !== null ? jobs[selectedJob] : null;

  return (
    <div>
      <div className="page-header">
        <h1>AI 맞춤채용추천</h1>
        <p>AI가 분석한 적합도 기반 맞춤 채용공고입니다</p>
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        {jobs.map((j, i) => (
          <div key={i} className="job-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedJob(i)}>
            <div className="company">{j.company} · {j.location}</div>
            <div className="title">{j.title}</div>
            <div className="match-bar">
              <span>AI 적합도</span>
              <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                <div className="fill" style={{
                  width: `${j.match}%`,
                  background: j.match >= 80 ? '#22C55E' : j.match >= 60 ? '#6366F1' : '#F59E0B',
                }} />
              </div>
              <span style={{ fontWeight: 700, color: j.match >= 80 ? '#16A34A' : '#4F46E5' }}>{j.match}%</span>
            </div>
            <div className="tags">{j.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
            <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); setSelectedJob(i); }}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> 상세보기
            </button>
          </div>
        ))}
      </div>

      {/* 채용공고 상세 Drawer */}
      <Modal size="lg"open={selectedJob !== null} onClose={() => setSelectedJob(null)} title={job ? job.title : ''} footer={
        <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff', width: '100%' }}
          onClick={() => { setSelectedJob(null); setApplyModal(true); }}>
          <i className="fa-solid fa-paper-plane" /> 지원하기
        </button>
      }>
        {job && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span className="badge badge-indigo">{job.company}</span>
              <span className="badge" style={{ background: '#F3F4F6', color: '#374151' }}>{job.location}</span>
              <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{job.salary}</span>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">직무 설명</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{job.desc}</p>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">자격 요건</div>
              {job.requirements.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: '#6366F1', marginTop: 2 }} />{r}
                </div>
              ))}
            </div>
            <div className="detail-section">
              <div className="detail-section-title">우대 사항</div>
              {job.preferred.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
                  <i className="fa-solid fa-star" style={{ color: '#F59E0B', marginTop: 2 }} />{p}
                </div>
              ))}
            </div>
            <div className="ai-comment" style={{ marginTop: 16 }}>
              <div className="ai-label"><i className="fa-solid fa-robot" /> AI 매칭 근거 ({job.match}%)</div>
              {job.matchReasons.map((r, i) => (
                <div key={i} style={{ fontSize: 13, padding: '4px 0' }}>• {r}</div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* 지원하기 모달 */}
      <Modal open={applyModal} onClose={() => setApplyModal(false)} title="채용 지원" size="md" footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setApplyModal(false)}>취소</button>
          <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
            onClick={() => { setApplyModal(false); onToast('지원이 완료되었습니다'); }}>
            <i className="fa-solid fa-paper-plane" /> 지원 제출
          </button>
        </div>
      }>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>자기소개서를 첨부하고 지원을 완료하세요.</p>
        <FormField label="자기소개서 첨부" type="file" fileName={resume} onChange={setResume} />
        <FormField label="추가 메시지 (선택)" type="textarea" placeholder="지원 동기나 추가 사항을 입력하세요" />
      </Modal>
    </div>
  );
}
