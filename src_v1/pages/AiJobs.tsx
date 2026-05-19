import { useState } from 'react';
import Modal from '../components/Modal';
import FormField from '../components/FormField';

interface AiJobsProps {
  onToast: (msg: string) => void;
}

interface Job {
  company: string;
  initial: string;
  color: string;
  title: string;
  role: string;
  tags: string[];
  match: number;
  deadline: string;
  location: string;
  salary: string;
  desc: string;
  requirements: string[];
  preferred: string[];
  matchReasons: string[];
}

const JOBS: Job[] = [
  {
    company: '넥슨코리아', initial: 'N', color: '#6366F1',
    title: '[신입] 게임 프로젝트 매니저',
    role: 'PM / IT기획', tags: ['대기업', 'PM'],
    match: 87, deadline: 'D-14', location: '판교', salary: '4,000 ~ 5,000만원',
    desc: '넥슨코리아의 게임 프로젝트 매니저로서 글로벌 게임 서비스의 기획 및 운영을 담당합니다.',
    requirements: ['학사 이상 (컴퓨터공학, 경영학 등)', 'TOEIC 700점 이상', '프로젝트 관리 경험 우대'],
    preferred: ['PMP 자격증 보유자', '게임 산업 이해도 높은 자', 'Jira/Confluence 사용 경험'],
    matchReasons: ['학점 4.3 (상위 10%)', 'SQLD 자격증 보유', '인적성 80점 (상위 20%)'],
  },
  {
    company: '카카오게임즈', initial: 'K', color: '#F59E0B',
    title: '서비스 기획자 (신입/경력)',
    role: '기획 / 서비스운영', tags: ['대기업', '기획'],
    match: 72, deadline: '상시채용', location: '판교', salary: '3,800 ~ 4,800만원',
    desc: '카카오게임즈의 서비스 기획자로서 모바일 게임 서비스 운영 기획을 담당합니다.',
    requirements: ['학사 이상', '서비스 기획 경험 또는 관련 프로젝트'],
    preferred: ['게임 서비스 운영 경험', '데이터 분석 능력'],
    matchReasons: ['학점 우수', 'IT 기초 역량 보유'],
  },
  {
    company: 'NHN', initial: 'NH', color: '#3B82F6',
    title: 'IT 프로젝트 관리자',
    role: 'PM / 일정관리', tags: ['중견기업', 'PM'],
    match: 68, deadline: 'D-21', location: '삼성동', salary: '3,500 ~ 4,500만원',
    desc: 'NHN의 IT 프로젝트 관리자로서 다양한 IT 프로젝트의 일정/품질/리스크를 관리합니다.',
    requirements: ['학사 이상', 'IT 프로젝트 경험 우대', '원활한 커뮤니케이션 능력'],
    preferred: ['PMP 또는 CAPM 자격증', 'Agile/Scrum 경험'],
    matchReasons: ['학점 양호', '프로그래밍 역량'],
  },
  {
    company: '넷마블', initial: 'NM', color: '#EF4444',
    title: '게임 서비스 운영 PM',
    role: '운영 / PM', tags: ['대기업', '운영'],
    match: 64, deadline: 'D-7', location: '구로', salary: '3,600 ~ 4,600만원',
    desc: '넷마블의 게임 서비스 운영 PM으로서 라이브 서비스의 안정적 운영을 책임집니다.',
    requirements: ['학사 이상', '게임 산업에 대한 이해'],
    preferred: ['서비스 운영 경험', 'SQL 능력'],
    matchReasons: ['SQLD 보유', '학점 양호'],
  },
  {
    company: '쿠팡', initial: 'C', color: '#F97316',
    title: '프로덕트 매니저 (Junior)',
    role: 'PM / 데이터분석', tags: ['대기업', 'PM'],
    match: 58, deadline: '상시채용', location: '잠실', salary: '4,200 ~ 5,200만원',
    desc: '쿠팡의 주니어 프로덕트 매니저로서 이커머스 서비스 개선을 주도합니다.',
    requirements: ['학사 이상', '데이터 기반 사고력', '영어 커뮤니케이션 가능'],
    preferred: ['SQL 능력', 'A/B 테스트 경험', 'Figma 활용 가능'],
    matchReasons: ['SQLD 보유'],
  },
  {
    company: '라인플러스', initial: 'L', color: '#22C55E',
    title: '서비스 PM (신입)',
    role: 'PM / 글로벌', tags: ['대기업', '글로벌'],
    match: 55, deadline: 'D-30', location: '분당', salary: '4,000 ~ 5,000만원',
    desc: '라인플러스의 서비스 PM으로서 글로벌 메시징 플랫폼 서비스 기획에 참여합니다.',
    requirements: ['학사 이상', '일본어 또는 영어 능통', '서비스 기획 관심'],
    preferred: ['글로벌 서비스 경험', 'UX 리서치 경험'],
    matchReasons: ['학점 양호'],
  },
];

const SKILLS = [
  { label: '서비스 기획력', score: 78, color: '#6366F1' },
  { label: '데이터 분석', score: 64, color: '#22C55E' },
  { label: '커뮤니케이션', score: 82, color: '#F59E0B' },
  { label: '문서 작성', score: 71, color: '#3B82F6' },
  { label: '프로젝트 관리', score: 55, color: '#EF4444' },
];

const JOB_FIELDS = ['PM / 기획', '데이터분석', '백엔드개발', '프론트엔드', '마케팅'];
const COMPANY_SIZES = ['대기업', '중견기업', '중소기업', '스타트업'];
const REGIONS = ['서울', '경기', '부산', '대전', '기타'];

const RANK_STYLES = [
  { bg: '#FEF9C3', border: '#FDE047', color: '#854D0E' },
  { bg: '#F1F5F9', border: '#CBD5E1', color: '#475569' },
  { bg: '#FEF3E2', border: '#FCD34D', color: '#92400E' },
];

function matchColor(pct: number) {
  return pct >= 80 ? '#22C55E' : pct >= 60 ? '#6366F1' : '#F59E0B';
}

function matchGradient(pct: number) {
  return pct >= 80
    ? 'linear-gradient(90deg, #22C55E, #16A34A)'
    : pct >= 60
      ? 'linear-gradient(90deg, #6366F1, #4F46E5)'
      : 'linear-gradient(90deg, #F59E0B, #D97706)';
}

export default function AiJobs({ onToast }: AiJobsProps) {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [applyModal, setApplyModal] = useState(false);
  const [resume, setResume] = useState('');
  const [checkedFields, setCheckedFields] = useState<string[]>([]);
  const [checkedSizes, setCheckedSizes] = useState<string[]>([]);
  const [checkedRegions, setCheckedRegions] = useState<string[]>([]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const job = selectedJob !== null ? JOBS[selectedJob] : null;
  const avgMatch = Math.round(JOBS.reduce((s, j) => s + j.match, 0) / JOBS.length);
  const maxMatch = Math.max(...JOBS.map(j => j.match));
  const urgentCount = JOBS.filter(j => j.deadline.startsWith('D-') && parseInt(j.deadline.slice(2)) <= 14).length;

  return (
    <div>
      <div className="page-header">
        <h1>AI 맞춤채용추천</h1>
        <p>학점, 자격증, 인적성 데이터를 기반으로 AI가 선별한 맞춤 채용공고입니다</p>
      </div>

      {/* Stats */}
      <div className="aj-stats-row">
        <div className="aj-stat-card">
          <div className="aj-stat-icon" style={{ background: '#EEF2FF', color: '#6366F1' }}>
            <i className="fa-solid fa-briefcase" />
          </div>
          <div>
            <div className="aj-stat-label">추천 공고</div>
            <div className="aj-stat-value">
              {JOBS.length}<span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginLeft: 3 }}>건</span>
            </div>
          </div>
        </div>
        <div className="aj-stat-card">
          <div className="aj-stat-icon" style={{ background: '#DCFCE7', color: '#22C55E' }}>
            <i className="fa-solid fa-bullseye" />
          </div>
          <div>
            <div className="aj-stat-label">최고 적합도</div>
            <div className="aj-stat-value" style={{ color: '#22C55E' }}>{maxMatch}%</div>
          </div>
        </div>
        <div className="aj-stat-card">
          <div className="aj-stat-icon" style={{ background: '#EEF2FF', color: '#6366F1' }}>
            <i className="fa-solid fa-chart-pie" />
          </div>
          <div>
            <div className="aj-stat-label">평균 적합도</div>
            <div className="aj-stat-value" style={{ color: '#6366F1' }}>{avgMatch}%</div>
          </div>
        </div>
        <div className="aj-stat-card">
          <div className="aj-stat-icon" style={{ background: '#FEF9C3', color: '#854D0E' }}>
            <i className="fa-regular fa-clock" />
          </div>
          <div>
            <div className="aj-stat-label">마감 임박</div>
            <div className="aj-stat-value" style={{ color: '#D97706' }}>
              {urgentCount}<span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginLeft: 3 }}>건</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-col body */}
      <div className="aj-body">

        {/* Left: Filter */}
        <aside className="aj-filter-panel">
          <div className="aj-filter-panel-title">
            <i className="fa-solid fa-sliders" /> 필터
          </div>
          <div className="aj-filter-section">
            <div className="aj-filter-section-label">직무 분야</div>
            {JOB_FIELDS.map(f => (
              <label key={f} className="aj-check-row">
                <input type="checkbox" checked={checkedFields.includes(f)}
                  onChange={() => toggle(checkedFields, setCheckedFields, f)} />
                {f}
              </label>
            ))}
          </div>
          <div className="aj-filter-section">
            <div className="aj-filter-section-label">기업 규모</div>
            {COMPANY_SIZES.map(s => (
              <label key={s} className="aj-check-row">
                <input type="checkbox" checked={checkedSizes.includes(s)}
                  onChange={() => toggle(checkedSizes, setCheckedSizes, s)} />
                {s}
              </label>
            ))}
          </div>
          <div className="aj-filter-section">
            <div className="aj-filter-section-label">채용 지역</div>
            {REGIONS.map(r => (
              <label key={r} className="aj-check-row">
                <input type="checkbox" checked={checkedRegions.includes(r)}
                  onChange={() => toggle(checkedRegions, setCheckedRegions, r)} />
                {r}
              </label>
            ))}
          </div>
          <button className="aj-filter-apply">필터 적용</button>
        </aside>

        {/* Center: Job list */}
        <div>
          <div className="aj-list-header">
            <span className="aj-list-count">총 <strong>{JOBS.length}</strong>개 기업 추천</span>
            <select className="aj-sort-sel">
              <option>매칭률 높은순</option>
              <option>최신 등록순</option>
              <option>마감임박순</option>
            </select>
          </div>
          {JOBS.map((j, i) => {
            const rankStyle = RANK_STYLES[i] ?? { bg: '#F8FAFC', border: '#E2E8F0', color: '#94A3B8' };
            return (
              <div key={i} className="aj-job-card" onClick={() => setSelectedJob(i)}>
                <div className="aj-job-rank"
                  style={{ background: rankStyle.bg, borderColor: rankStyle.border, color: rankStyle.color }}>
                  {i + 1}
                </div>
                <div className="aj-job-logo" style={{ background: j.color + '18', color: j.color }}>
                  {j.initial}
                </div>
                <div className="aj-job-info">
                  <div className="aj-job-top">
                    <span className="aj-job-company">{j.company}</span>
                    {j.tags.map(t => <span key={t} className="aj-job-tag">{t}</span>)}
                  </div>
                  <div className="aj-job-title">{j.title}</div>
                  <div className="aj-job-meta">
                    <span><i className="fa-solid fa-won-sign" /> {j.salary}</span>
                    <span><i className="fa-solid fa-location-dot" /> {j.location}</span>
                    <span><i className="fa-regular fa-clock" /> {j.deadline}</span>
                  </div>
                  <div className="aj-match-bar-track">
                    <div className="aj-match-bar-fill"
                      style={{ width: `${j.match}%`, background: matchGradient(j.match) }} />
                  </div>
                </div>
                <div className="aj-job-score">
                  <span className="aj-job-score-num" style={{ color: matchColor(j.match) }}>{j.match}</span>
                  <span className="aj-job-score-pct" style={{ color: matchColor(j.match) }}>%</span>
                  <span className="aj-job-score-label">매칭률</span>
                </div>
                <div className="aj-job-actions">
                  <button className="aj-detail-btn"
                    onClick={e => { e.stopPropagation(); setSelectedJob(i); }}>
                    상세보기
                  </button>
                  <button className="aj-wish-btn" onClick={e => e.stopPropagation()}>
                    <i className="fa-regular fa-heart" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Skills + Tips */}
        <aside className="aj-right-panel">
          <div className="aj-right-card">
            <div className="aj-right-card-title">
              <i className="fa-solid fa-bolt" style={{ color: '#F59E0B' }} /> 나의 기술 역량
            </div>
            <ul className="aj-skill-list">
              {SKILLS.map(sk => (
                <li key={sk.label}>
                  <div className="aj-skill-top">
                    <span className="aj-skill-label">{sk.label}</span>
                    <span className="aj-skill-score" style={{ color: sk.color }}>{sk.score}</span>
                  </div>
                  <div className="aj-skill-track">
                    <div className="aj-skill-fill" style={{ width: `${sk.score}%`, background: sk.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="aj-right-card">
            <div className="aj-right-card-title">
              <i className="fa-solid fa-lightbulb" style={{ color: '#6366F1' }} /> AI 추천 포인트
            </div>
            <ul className="aj-tip-list">
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-check" style={{ color: '#22C55E', flexShrink: 0 }} />
                <span>서비스 기획 역량이 상위 25%</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-check" style={{ color: '#22C55E', flexShrink: 0 }} />
                <span>SQLD 자격증 보유로 데이터 직무 강점</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#F59E0B', flexShrink: 0 }} />
                <span>데이터 분석 역량 보강 권장</span>
              </li>
              <li className="aj-tip-item">
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#F59E0B', flexShrink: 0 }} />
                <span>어학 점수 업데이트 필요</span>
              </li>
            </ul>
          </div>
          <div className="aj-right-card aj-right-cta">
            <div className="aj-right-card-title">
              <i className="fa-solid fa-robot" style={{ color: '#6366F1' }} /> AI 자소서 작성
            </div>
            <p className="aj-cta-desc">추천 기업에 맞는 자소서를 AI가 도와드립니다.</p>
            <button className="aj-cta-btn">
              자소서 작성하기 <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </aside>
      </div>

      {/* Detail Modal */}
      <Modal size="lg" open={selectedJob !== null} onClose={() => setSelectedJob(null)}
        title={job ? job.title : ''}
        footer={
          <button className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff', width: '100%', borderRadius: 10, padding: '11px 0', fontWeight: 700 }}
            onClick={() => { setSelectedJob(null); setApplyModal(true); }}>
            <i className="fa-solid fa-paper-plane" /> 지원하기
          </button>
        }
      >
        {job && (
          <div>
            <div className="aj-modal-company-row">
              <div className="aj-modal-logo" style={{ background: job.color + '18', color: job.color }}>
                {job.initial}
              </div>
              <div className="aj-modal-co-info">
                <div className="aj-modal-co-name">{job.company}</div>
                <div className="aj-modal-co-badges">
                  <span className="badge badge-indigo">{job.location}</span>
                  <span className="badge badge-yellow">{job.salary}</span>
                  <span className="badge badge-gray">{job.deadline}</span>
                </div>
              </div>
              <div className="aj-modal-match-block">
                <div className="aj-modal-match-num" style={{ color: matchColor(job.match) }}>{job.match}%</div>
                <div className="aj-modal-match-label">AI 적합도</div>
              </div>
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
            <div className="aj-ai-box">
              <div className="aj-ai-box-header">
                <div className="aj-ai-icon"><i className="fa-solid fa-robot" /></div>
                <div>
                  <div className="aj-ai-box-title">AI 매칭 분석</div>
                  <div className="aj-ai-box-sub">이 공고와 적합한 이유</div>
                </div>
                <div className="aj-ai-box-match" style={{ color: matchColor(job.match) }}>{job.match}%</div>
              </div>
              <div className="aj-ai-reasons">
                {job.matchReasons.map((r, i) => (
                  <div key={i} className="aj-ai-reason">
                    <div className="aj-ai-reason-dot" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Modal */}
      <Modal open={applyModal} onClose={() => setApplyModal(false)} title="채용 지원" size="md"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-outline" onClick={() => setApplyModal(false)}>취소</button>
            <button className="btn btn-sm" style={{ background: '#4F46E5', color: '#fff' }}
              onClick={() => { setApplyModal(false); onToast('지원이 완료되었습니다'); }}>
              <i className="fa-solid fa-paper-plane" /> 지원 제출
            </button>
          </div>
        }
      >
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>자기소개서를 첨부하고 지원을 완료하세요.</p>
        <FormField label="자기소개서 첨부" type="file" fileName={resume} onChange={setResume} />
        <FormField label="추가 메시지 (선택)" type="textarea" placeholder="지원 동기나 추가 사항을 입력하세요" />
      </Modal>
    </div>
  );
}
