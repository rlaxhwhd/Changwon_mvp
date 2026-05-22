import { useState } from 'react'
import Modal from '../../components/Modal'
import './SkillTree.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FoundationItem {
  id: string
  icon: string
  iconColor: string
  iconBg: string
  name: string
  subtitle: string
  complete: boolean
  progress: number
  progressLabel: string
}

interface SkillItem {
  id: string
  icon: string
  name: string
  subtitle: string
  complete: boolean
}

interface SkillGroup {
  title: string
  subtitle: string
  fitPercent: number
  skills: SkillItem[]
}

interface DirectionItem {
  id: string
  icon: string
  name: string
  subtitle: string
  fitPercent: number
  accent?: string
}

interface AnalysisSummary {
  connectedSkills: number
  totalSkills: number
  strongSkills: number
  weakSkills: number
  overallPercent: number
  description: string
}

export interface SkillTreeData {
  defaultJobDirection: string
  defaultFocusType: string
  foundation: FoundationItem[]
  core: SkillGroup
  expert: SkillGroup
  directions: DirectionItem[]
  defaultDirectionId: string
  analysis: AnalysisSummary
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DATA: SkillTreeData = {
  defaultJobDirection: '웹 개발자',
  defaultFocusType: '전공도',
  foundation: [
    {
      id: 'diagnosis',
      icon: 'fa-chart-simple',
      iconColor: '#2E5BFF',
      iconBg: '#EEF2FF',
      name: '진단',
      subtitle: '취업지원검사 완료',
      complete: true,
      progress: 100,
      progressLabel: '완료',
    },
    {
      id: 'program',
      icon: 'fa-layer-group',
      iconColor: '#2E5BFF',
      iconBg: '#EEF2FF',
      name: '비교과 프로그램',
      subtitle: '참여 프로그램 기록',
      complete: true,
      progress: 100,
      progressLabel: '완료',
    },
    {
      id: 'counsel',
      icon: 'fa-user',
      iconColor: '#2E5BFF',
      iconBg: '#EEF2FF',
      name: '진로 상담',
      subtitle: '진로취업 상담 이력',
      complete: true,
      progress: 100,
      progressLabel: '3회 완료',
    },
    {
      id: 'liberal',
      icon: 'fa-book',
      iconColor: '#2E5BFF',
      iconBg: '#EEF2FF',
      name: '필수 교양',
      subtitle: '필수 교양 이수 현황',
      complete: false,
      progress: 80,
      progressLabel: '8 / 10 과목',
    },
  ],
  core: {
    title: '핵심 역량',
    subtitle: '전공 필수 과목 이수',
    fitPercent: 88,
    skills: [
      { id: 'web', icon: 'fa-globe', name: '웹 개발 기초', subtitle: 'HTML, CSS, JS, React', complete: true },
      { id: 'db', icon: 'fa-database', name: '데이터베이스', subtitle: 'SQL, 데이터 모델링', complete: true },
      { id: 'algo', icon: 'fa-sitemap', name: '자료구조와 알고리즘', subtitle: '자료구조, 알고리즘', complete: true },
      { id: 'os', icon: 'fa-microchip', name: '운영체제', subtitle: '운영체제, 시스템 프로그래밍', complete: false },
    ],
  },
  expert: {
    title: '전문 역량',
    subtitle: '심화 전공 및 실무 역량',
    fitPercent: 76,
    skills: [
      { id: 'backend', icon: 'fa-code', name: '백엔드 개발', subtitle: 'Spring, Django, Node.js', complete: true },
      { id: 'api', icon: 'fa-mobile-screen-button', name: 'API 개발', subtitle: 'RESTful API 설계', complete: true },
      { id: 'data', icon: 'fa-chart-line', name: '데이터 분석', subtitle: 'Python, Pandas, 시각화', complete: false },
      { id: 'deploy', icon: 'fa-cloud', name: '배포 및 인프라', subtitle: 'AWS, Docker, CI/CD', complete: false },
    ],
  },
  directions: [
    { id: 'fullstack', icon: 'fa-database', name: '풀스택 개발자', subtitle: '웹 개발 전 영역', fitPercent: 81 },
    { id: 'data-eng', icon: 'fa-cube', name: '데이터 엔지니어', subtitle: '데이터 수집, 처리 및 파이프라인', fitPercent: 74 },
    { id: 'cloud', icon: 'fa-cloud', name: '클라우드 엔지니어', subtitle: '클라우드 인프라 설계 및 운영', fitPercent: 69 },
    { id: 'security', icon: 'fa-shield-halved', name: '보안 엔지니어', subtitle: '시스템 및 네트워크 보안 관리', fitPercent: 62, accent: '#FF6A2A' },
  ],
  defaultDirectionId: 'fullstack',
  analysis: {
    connectedSkills: 23,
    totalSkills: 35,
    strongSkills: 8,
    weakSkills: 7,
    overallPercent: 78,
    description:
      '현재 웹 개발자 방향으로 핵심 역량의 88%를 달성했습니다. 운영체제, 데이터 분석, 배포 및 인프라 역량 보완이 우선 과제입니다. 추천 다음 학기 수강 과목을 확인해 보세요.',
  },
}

// ─── Job options (직무 추가) ──────────────────────────────────────────────────

interface JobOption {
  id: string
  icon: string
  name: string
  subtitle: string
  fitPercent: number
}

const JOB_OPTIONS: JobOption[] = [
  { id: 'web-dev', icon: 'fa-globe', name: '웹개발자', subtitle: '웹 서비스 프론트·백엔드 개발', fitPercent: 88 },
  { id: 'uiux', icon: 'fa-pen-ruler', name: 'UI/UX 디자이너', subtitle: '사용자 경험·인터페이스 설계', fitPercent: 62 },
  { id: 'app-dev', icon: 'fa-mobile-screen-button', name: '앱개발자', subtitle: 'iOS·Android 모바일 앱 개발', fitPercent: 79 },
  { id: 'network', icon: 'fa-network-wired', name: '네트워크 엔지니어', subtitle: '네트워크 구축·운영 관리', fitPercent: 55 },
  { id: 'gov', icon: 'fa-building-columns', name: '공무원', subtitle: '행정·기술직 공직 진출', fitPercent: 43 },
  { id: 'infra', icon: 'fa-server', name: '인프라 설계', subtitle: '서버·클라우드 인프라 아키텍처', fitPercent: 67 },
  { id: 'public-it', icon: 'fa-building-shield', name: '공기업 전산직', subtitle: '공기업 IT·전산 직무', fitPercent: 71 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function DonutChart({ percent }: { percent: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - percent / 100)
  return (
    <svg className="st-donut-svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#F2F5FF" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#2E5BFF"
        strokeWidth="8"
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1C2442">
        {percent}%
      </text>
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  data?: SkillTreeData
}

export default function SkillTree({ data = MOCK_DATA }: Props) {
  const [selectedDirection, setSelectedDirection] = useState(data.defaultDirectionId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addedJobs, setAddedJobs] = useState<JobOption[]>([])

  const availableJobs = JOB_OPTIONS.filter(job => !addedJobs.some(a => a.id === job.id))

  const addJob = (job: JobOption) => {
    setAddedJobs(prev => [...prev, job])
    setSelectedDirection(job.id)
    setPickerOpen(false)
  }

  const removeJob = (id: string) => {
    setAddedJobs(prev => prev.filter(job => job.id !== id))
    setSelectedDirection(prev => (prev === id ? data.defaultDirectionId : prev))
  }

  return (
    <div className="st-wrapper">
      <div className="st-content">
        {/* ── Header ── */}
        <div className="st-header">
          <div className="st-header-left">
            <div className="st-header-icon">
              <i className="fa-solid fa-sitemap" />
            </div>
            <div>
              <h1 className="st-header-title">
                내 성장 <span className="st-header-title-sub">(스킬트리)</span>
              </h1>
              <p className="st-header-subtitle">수강 과목을 기반으로 직무 방향의 적합도를 확인하세요</p>
            </div>
          </div>
        </div>

        {/* ── 4-column Skill Grid ── */}
        <div className="st-grid">

          {/* Col 1: 기초 역량 */}
          <div className="st-col">
            <div className="st-col-header">
              <div className="st-col-title">기초 역량</div>
              <div className="st-col-subtitle">모든 역량의 시작점</div>
            </div>
            <div className="st-col-body">
              {data.foundation.map(item => (
                <div key={item.id} className="st-found-card">
                  <div className="st-found-top">
                    <div
                      className="st-found-icon"
                      style={{ background: item.iconBg, color: item.iconColor }}
                    >
                      <i className={`fa-solid ${item.icon}`} />
                    </div>
                    <div className="st-found-info">
                      <div className="st-found-name">{item.name}</div>
                      <div className="st-found-sub">{item.subtitle}</div>
                    </div>
                    <div className={`st-found-status${item.complete ? ' complete' : ''}`}>
                      {item.complete
                        ? <><i className="fa-solid fa-circle-check" /> 완료</>
                        : <><i className="fa-regular fa-circle" /> 진행중</>
                      }
                    </div>
                  </div>
                  <div className="st-prog-bar">
                    <div
                      className={`st-prog-fill${item.complete ? ' complete' : ''}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="st-found-prog-label">{item.progressLabel}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: 핵심 역량 */}
          <div className="st-col">
            <div className="st-col-header">
              <div className="st-col-title">{data.core.title}</div>
              <div className="st-col-subtitle">{data.core.subtitle}</div>
            </div>
            <div className="st-col-body st-skill-list">
              {data.core.skills.map(skill => (
                <div key={skill.id} className="st-skill-row">
                  <div className="st-skill-icon">
                    <i className={`fa-solid ${skill.icon}`} />
                  </div>
                  <div className="st-skill-info">
                    <span className={`st-skill-name${skill.complete ? ' done' : ''}`}>
                      {skill.name}
                    </span>
                    <span className="st-skill-sub">{skill.subtitle}</span>
                  </div>
                  <div className={`st-skill-check${skill.complete ? ' done' : ' todo'}`}>
                    {skill.complete && <i className="fa-solid fa-check" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="st-col-fit">진행도 {data.core.fitPercent}%</div>
          </div>

          {/* Col 3: 전문 역량 */}
          <div className="st-col">
            <div className="st-col-header">
              <div className="st-col-title">{data.expert.title}</div>
              <div className="st-col-subtitle">{data.expert.subtitle}</div>
            </div>
            <div className="st-col-body st-skill-list">
              {data.expert.skills.map(skill => (
                <div key={skill.id} className="st-skill-row">
                  <div className="st-skill-icon">
                    <i className={`fa-solid ${skill.icon}`} />
                  </div>
                  <div className="st-skill-info">
                    <span className={`st-skill-name${skill.complete ? ' done' : ''}`}>
                      {skill.name}
                    </span>
                    <span className="st-skill-sub">{skill.subtitle}</span>
                  </div>
                  <div className={`st-skill-check${skill.complete ? ' done' : ' todo'}`}>
                    {skill.complete && <i className="fa-solid fa-check" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="st-col-fit">진행도 {data.expert.fitPercent}%</div>
          </div>

          {/* Col 4: 직무 방향 */}
          <div className="st-col">
            <div className="st-col-header">
              <div className="st-col-title">직무 방향</div>
              <div className="st-col-subtitle">다양한 커리어로 확장</div>
            </div>
            <div className="st-col-body st-skill-list">
              {data.directions.map(dir => (
                <div
                  key={dir.id}
                  className="st-skill-row st-dir-row"
                  onClick={() => setSelectedDirection(dir.id)}
                >
                  <div className="st-skill-icon" style={{ color: dir.accent ?? undefined }}>
                    <i className={`fa-solid ${dir.icon}`} />
                  </div>
                  <div className="st-skill-info">
                    <span className={`st-skill-name${dir.id === selectedDirection ? ' done' : ''}`}>
                      {dir.name}
                    </span>
                    <span className="st-skill-sub">{dir.subtitle}</span>
                  </div>
                  <div className={`st-dir-fit${dir.id === selectedDirection ? ' selected' : ''}`}>
                    <span>{dir.fitPercent}%</span>
                    <small>적합도</small>
                  </div>
                </div>
              ))}

              {addedJobs.map(job => (
                <div
                  key={job.id}
                  className="st-skill-row st-dir-row"
                  onClick={() => setSelectedDirection(job.id)}
                >
                  <div className="st-skill-icon">
                    <i className={`fa-solid ${job.icon}`} />
                  </div>
                  <div className="st-skill-info">
                    <span className={`st-skill-name${job.id === selectedDirection ? ' done' : ''}`}>
                      {job.name}
                    </span>
                    <span className="st-skill-sub">{job.subtitle}</span>
                  </div>
                  <div className={`st-dir-fit${job.id === selectedDirection ? ' selected' : ''}`}>
                    <span>{job.fitPercent}%</span>
                    <small>적합도</small>
                  </div>
                  <button
                    className="st-dir-remove"
                    onClick={e => { e.stopPropagation(); removeJob(job.id) }}
                    aria-label={`${job.name} 삭제`}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}

              <button className="st-dir-add" onClick={() => setPickerOpen(true)}>
                <div className="st-dir-add-icon">
                  <i className="fa-solid fa-plus" />
                </div>
                <div className="st-dir-add-text">
                  <span className="st-dir-add-name">직무 추가</span>
                  <span className="st-dir-add-sub">관심 직무를 선택해 적합도를 확인하세요</span>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* ── Analysis Bar ── */}
        <div className="st-analysis">
          <div className="st-analysis-title">전체 역량 분석</div>
          <div className="st-analysis-stats">
            <div className="st-stat">
              <span className="st-stat-label">연결된 역량</span>
              <span className="st-stat-val">
                {data.analysis.connectedSkills}
                <span className="st-stat-total">/{data.analysis.totalSkills}</span>
              </span>
            </div>
            <div className="st-stat">
              <span className="st-stat-label">강점 역량</span>
              <span className="st-stat-val st-stat-strong">{data.analysis.strongSkills}</span>
            </div>
            <div className="st-stat">
              <span className="st-stat-label">보완 필요 역량</span>
              <span className="st-stat-val st-stat-weak">{data.analysis.weakSkills}</span>
            </div>
          </div>
          <div className="st-analysis-score">
            <span className="st-analysis-score-label">종합 적합도</span>
            <DonutChart percent={data.analysis.overallPercent} />
          </div>
          <p className="st-analysis-desc">다양한 경험을 통해<br />더 넓은 커리어로 성장해보세요!</p>
          <button className="st-analysis-btn">상세 분석 보기 <i className="fa-solid fa-arrow-right" /></button>
        </div>

        {/* ── TIP Bar ── */}
        <div className="st-tip">
          💡 <strong>TIP</strong>&nbsp; 스킬을 클릭하면 관련 강의, 추천 학습, 실무 프로젝트를 확인할 수 있어요!
        </div>
      </div>

      {/* ── 직무 선택 모달 ── */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="직무 추가" size="sm">
        <p className="st-picker-desc">관심 직무를 선택하면 현재 역량 기준 적합도를 분석해 드려요.</p>
        <div className="st-picker-list">
          {availableJobs.map(job => (
            <button key={job.id} className="st-picker-item" onClick={() => addJob(job)}>
              <div className="st-picker-icon">
                <i className={`fa-solid ${job.icon}`} />
              </div>
              <div className="st-picker-info">
                <span className="st-picker-name">{job.name}</span>
                <span className="st-picker-sub">{job.subtitle}</span>
              </div>
              <div className="st-picker-fit">적합도 {job.fitPercent}%</div>
            </button>
          ))}
          {availableJobs.length === 0 && (
            <p className="st-picker-empty">모든 직무를 추가했습니다.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
