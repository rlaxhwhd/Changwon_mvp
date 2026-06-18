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
  whatToDo: string[]
  targetCompanies: string[]
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
  certification: SkillGroup
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
      iconColor: 'var(--color-primary)',
      iconBg: 'var(--color-primary-bg)',
      name: '진단',
      subtitle: '취업지원검사 완료',
      complete: true,
      progress: 100,
      progressLabel: '완료',
    },
    {
      id: 'program',
      icon: 'fa-layer-group',
      iconColor: 'var(--color-primary)',
      iconBg: 'var(--color-primary-bg)',
      name: '비교과 프로그램',
      subtitle: '참여 프로그램 기록',
      complete: true,
      progress: 100,
      progressLabel: '완료',
    },
    {
      id: 'counsel',
      icon: 'fa-user',
      iconColor: 'var(--color-primary)',
      iconBg: 'var(--color-primary-bg)',
      name: '진로 상담',
      subtitle: '진로취업 상담 이력',
      complete: true,
      progress: 100,
      progressLabel: '3회 완료',
    },
    {
      id: 'liberal',
      icon: 'fa-book',
      iconColor: 'var(--color-primary)',
      iconBg: 'var(--color-primary-bg)',
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
      { id: 'network', icon: 'fa-network-wired', name: '네트워크', subtitle: 'TCP/IP, 라우팅, 프로토콜', complete: false },
      { id: 'oss', icon: 'fa-code-branch', name: '오픈소스소프트웨어', subtitle: 'Git, GitHub, 라이선스 이해', complete: true },
      { id: 'bigdata', icon: 'fa-database', name: '빅데이터', subtitle: 'Hadoop, Spark, 분산 처리', complete: false },
    ],
  },
  certification: {
    title: '자격',
    subtitle: '학과 관련 및 공인 자격증',
    fitPercent: 60,
    skills: [
      { id: 'sqld', icon: 'fa-database', name: 'SQLD', subtitle: 'SQL 개발자 자격증', complete: true },
      { id: 'engineer-info', icon: 'fa-laptop-code', name: '정보처리기사', subtitle: '국가기술 자격증', complete: false },
      { id: 'linux', icon: 'fa-terminal', name: '리눅스마스터 2급', subtitle: '리눅스 운영 자격증', complete: false },
      { id: 'history', icon: 'fa-landmark', name: '한국사능력검정', subtitle: '한국사 3급 보유', complete: true },
      { id: 'computer', icon: 'fa-computer', name: '컴퓨터활용능력', subtitle: '컴활 1급 보유', complete: true },
    ],
  },
  directions: [
    {
      id: 'fullstack', icon: 'fa-database', name: '풀스택 개발자', subtitle: '웹 개발 전 영역', fitPercent: 81,
      whatToDo: [
        '프론트엔드와 백엔드 모두 직접 설계하고 구현',
        'REST API · 데이터베이스 스키마 설계 및 운영',
        '서비스 배포 환경 구축 및 운영 자동화 참여',
      ],
      targetCompanies: ['네이버', '카카오', '토스', '우아한형제들', 'IT 스타트업'],
    },
    {
      id: 'data-eng', icon: 'fa-cube', name: '데이터 엔지니어', subtitle: '데이터 수집, 처리 및 파이프라인', fitPercent: 74,
      whatToDo: [
        '대규모 데이터 수집 · ETL/ELT 파이프라인 설계',
        '데이터 웨어하우스 · 레이크 구조 운영',
        'Spark · Airflow 등 분산 처리 시스템 운영',
      ],
      targetCompanies: ['쿠팡', '배달의민족', '당근마켓', '라인', '뱅크샐러드'],
    },
    {
      id: 'cloud', icon: 'fa-cloud', name: '클라우드 엔지니어', subtitle: '클라우드 인프라 설계 및 운영', fitPercent: 69,
      whatToDo: [
        'AWS · GCP · Azure 인프라 설계 및 구축',
        'CI/CD 자동화와 컨테이너 오케스트레이션',
        '모니터링 · 로그 · 비용 최적화 운영',
      ],
      targetCompanies: ['AWS Korea', 'Microsoft Korea', '메가존클라우드', 'GS네오텍', 'NHN Cloud'],
    },
    {
      id: 'security', icon: 'fa-shield-halved', name: '보안 엔지니어', subtitle: '시스템 및 네트워크 보안 관리', fitPercent: 62, accent: '#FF6A2A',
      whatToDo: [
        '보안 정책 수립 및 취약점 점검',
        '침해 사고 대응 · 보안 솔루션 운영',
        '네트워크 · 시스템 보안 아키텍처 설계',
      ],
      targetCompanies: ['안랩', '시큐아이', 'KISA', '금융보안원', '대기업 보안팀'],
    },
  ],
  defaultDirectionId: 'fullstack',
  analysis: {
    connectedSkills: 23,
    totalSkills: 35,
    strongSkills: 8,
    weakSkills: 7,
    overallPercent: 78,
    description:
      '현재 웹 개발자 방향으로 핵심 역량의 88%를 달성했습니다. 운영체제, 데이터 분석, 네트워크 역량 보완이 우선 과제입니다. 추천 다음 학기 수강 과목을 확인해 보세요.',
  },
}

// ─── Job options (직무 추가) ──────────────────────────────────────────────────

interface JobOption {
  id: string
  icon: string
  name: string
  subtitle: string
  fitPercent: number
  whatToDo: string[]
  targetCompanies: string[]
}

const CERT_OPTIONS: SkillItem[] = [
  { id: 'security-eng', icon: 'fa-shield-halved', name: '정보보안기사', subtitle: '국가기술 자격증', complete: false },
  { id: 'aws-saa', icon: 'fa-cloud', name: 'AWS SAA', subtitle: 'AWS 솔루션스 아키텍트', complete: false },
  { id: 'bigdata-eng', icon: 'fa-chart-column', name: '빅데이터분석기사', subtitle: '국가기술 자격증', complete: false },
  { id: 'adsp', icon: 'fa-chart-pie', name: 'ADsP', subtitle: '데이터분석 준전문가', complete: false },
  { id: 'toeic-sp', icon: 'fa-language', name: 'TOEIC Speaking', subtitle: '영어 회화 능력시험', complete: false },
  { id: 'opic', icon: 'fa-comments', name: 'OPIc', subtitle: '영어 말하기 평가', complete: false },
  { id: 'info-industry', icon: 'fa-microchip', name: '정보처리산업기사', subtitle: '국가기술 자격증', complete: false },
  { id: 'network-admin', icon: 'fa-network-wired', name: '네트워크관리사 2급', subtitle: '네트워크 운영 자격증', complete: false },
  { id: 'mos', icon: 'fa-file-word', name: 'MOS Master', subtitle: 'MS 오피스 전문가', complete: false },
  { id: 'itq-oa', icon: 'fa-laptop', name: 'ITQ OA Master', subtitle: '정보기술자격', complete: false },
]

const JOB_OPTIONS: JobOption[] = [
  {
    id: 'web-dev', icon: 'fa-globe', name: '웹개발자', subtitle: '웹 서비스 프론트·백엔드 개발', fitPercent: 88,
    whatToDo: ['웹 서비스 UI · API 개발', '브라우저 호환성 · 성능 최적화', '서비스 배포와 운영 참여'],
    targetCompanies: ['네이버', '카카오', '쿠팡', '라인', 'IT 스타트업'],
  },
  {
    id: 'uiux', icon: 'fa-pen-ruler', name: 'UI/UX 디자이너', subtitle: '사용자 경험·인터페이스 설계', fitPercent: 62,
    whatToDo: ['사용자 리서치 · 정보 구조 설계', '와이어프레임 · 프로토타입 제작', '디자인 시스템 구축 및 운영'],
    targetCompanies: ['토스', '카카오', '배달의민족', '당근마켓', 'UX 에이전시'],
  },
  {
    id: 'app-dev', icon: 'fa-mobile-screen-button', name: '앱개발자', subtitle: 'iOS·Android 모바일 앱 개발', fitPercent: 79,
    whatToDo: ['iOS · Android 네이티브 앱 개발', '크로스 플랫폼(Flutter/RN) 개발', '앱 성능 · 스토어 배포 관리'],
    targetCompanies: ['카카오뱅크', '토스', '쿠팡', '라인', '당근마켓'],
  },
  {
    id: 'network', icon: 'fa-network-wired', name: '네트워크 엔지니어', subtitle: '네트워크 구축·운영 관리', fitPercent: 55,
    whatToDo: ['사내 · 데이터센터 네트워크 설계', '라우터 · 스위치 · 방화벽 운영', '네트워크 장애 진단 · 대응'],
    targetCompanies: ['KT', 'SKT', 'LG U+', 'CJ올리브네트웍스', '데이터센터 운영사'],
  },
  {
    id: 'gov', icon: 'fa-building-columns', name: '공무원', subtitle: '행정·기술직 공직 진출', fitPercent: 43,
    whatToDo: ['행정 · 정책 기획 및 집행', '대민 서비스 · 민원 응대', '공공 IT 시스템 운영(기술직)'],
    targetCompanies: ['국가직 7·9급', '지방직 7·9급', '기술직(전산직) 공무원'],
  },
  {
    id: 'infra', icon: 'fa-server', name: '인프라 설계', subtitle: '서버·클라우드 인프라 아키텍처', fitPercent: 67,
    whatToDo: ['대규모 서비스 인프라 아키텍처 설계', '서버 자원 · 트래픽 관리', 'IaC · 자동화 도구 운영'],
    targetCompanies: ['네이버 클라우드', '카카오 엔터프라이즈', 'LG CNS', '삼성SDS', 'SK C&C'],
  },
  {
    id: 'public-it', icon: 'fa-building-shield', name: '공기업 전산직', subtitle: '공기업 IT·전산 직무', fitPercent: 71,
    whatToDo: ['공기업 사내 시스템 운영 및 유지보수', '전산 자원 관리 · 정보보호 운영', '공공 SI 프로젝트 관리'],
    targetCompanies: ['한국전력', '한국수력원자력', '한국공항공사', '국민건강보험공단', 'IBK기업은행'],
  },
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
  const [expandedDirection, setExpandedDirection] = useState<string | null>(data.defaultDirectionId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addedJobs, setAddedJobs] = useState<JobOption[]>([])
  const [certPickerOpen, setCertPickerOpen] = useState(false)
  const [addedCerts, setAddedCerts] = useState<SkillItem[]>([])

  const availableJobs = JOB_OPTIONS.filter(job => !addedJobs.some(a => a.id === job.id))
  const availableCerts = CERT_OPTIONS.filter(
    cert => !addedCerts.some(a => a.id === cert.id) && !data.certification.skills.some(s => s.id === cert.id)
  )

  const allCerts = [...data.certification.skills, ...addedCerts]
  const ownedCertCount = allCerts.filter(c => c.complete).length

  const addCert = (cert: SkillItem) => {
    setAddedCerts(prev => [...prev, cert])
    setCertPickerOpen(false)
  }

  const removeCert = (id: string) => {
    setAddedCerts(prev => prev.filter(c => c.id !== id))
  }

  type DirectionLike = DirectionItem | JobOption
  const allDirections: DirectionLike[] = [...data.directions, ...addedJobs]

  const toggleDirection = (id: string) => {
    setSelectedDirection(id)
    setExpandedDirection(prev => (prev === id ? null : id))
  }

  const addJob = (job: JobOption) => {
    setAddedJobs(prev => [...prev, job])
    setSelectedDirection(job.id)
    setExpandedDirection(job.id)
    setPickerOpen(false)
  }

  const removeJob = (id: string) => {
    setAddedJobs(prev => prev.filter(job => job.id !== id))
    setSelectedDirection(prev => (prev === id ? data.defaultDirectionId : prev))
    setExpandedDirection(prev => (prev === id ? null : prev))
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
                AI 직무 로드맵
              </h1>
              <p className="st-header-subtitle">진단, 상담, 수강과목, 자격증을 기반으로 직무 방향의 적합도를 확인하세요</p>
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

          {/* Col 4: 자격 */}
          <div className="st-col">
            <div className="st-col-header">
              <div className="st-col-title">{data.certification.title}</div>
              <div className="st-col-subtitle">{data.certification.subtitle}</div>
            </div>
            <div className="st-col-body st-skill-list">
              {data.certification.skills.map(skill => (
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

              {addedCerts.map(cert => (
                <div key={cert.id} className="st-skill-row st-skill-row-added">
                  <div className="st-skill-icon">
                    <i className={`fa-solid ${cert.icon}`} />
                  </div>
                  <div className="st-skill-info">
                    <span className={`st-skill-name${cert.complete ? ' done' : ''}`}>
                      {cert.name}
                    </span>
                    <span className="st-skill-sub">{cert.subtitle}</span>
                  </div>
                  <div className={`st-skill-check${cert.complete ? ' done' : ' todo'}`}>
                    {cert.complete && <i className="fa-solid fa-check" />}
                  </div>
                  <button
                    className="st-skill-row-remove"
                    onClick={() => removeCert(cert.id)}
                    aria-label={`${cert.name} 삭제`}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}
            </div>

            <button className="st-cert-add" onClick={() => setCertPickerOpen(true)}>
              <i className="fa-solid fa-plus" /> 자격증 추가
            </button>

            <div className="st-col-fit">보유 {ownedCertCount} / {allCerts.length}</div>
          </div>

        </div>

        {/* ── Neon Flow: 4 역량 카드 → 직무 방향 카드 ── */}
        <svg
          className="st-flow"
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="st-neon"
              gradientUnits="userSpaceOnUse"
              x1="500" y1="0" x2="500" y2="260"
            >
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter
              id="st-glow"
              filterUnits="userSpaceOnUse"
              x="-40"
              y="-40"
              width="1080"
              height="340"
            >
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Four competency paths converge directly above the job cards. */}
          <path
            className="st-flow-path"
            d="M 125 0 C 125 82, 430 112, 500 210"
          />
          <path
            className="st-flow-path"
            d="M 375 0 C 375 82, 470 122, 500 210"
          />
          <path
            className="st-flow-path"
            d="M 625 0 C 625 82, 530 122, 500 210"
          />
          <path
            className="st-flow-path"
            d="M 875 0 C 875 82, 570 112, 500 210"
          />

        </svg>

        {/* ── 직무 방향 ── */}
        <div className="st-dir-section">
          <div className="st-dir-section-head">
            <div>
              <div className="st-dir-section-title">직무 방향</div>
              <div className="st-dir-section-sub">현재 역량과 가장 잘 맞는 커리어를 확인하세요</div>
            </div>
            <button className="st-dir-add-btn" onClick={() => setPickerOpen(true)}>
              <i className="fa-solid fa-plus" /> 직무 추가
            </button>
          </div>

          <div className="st-dir-grid">
            {allDirections.map(dir => {
              const isAdded = addedJobs.some(j => j.id === dir.id)
              const isExpanded = expandedDirection === dir.id
              return (
                <div
                  key={dir.id}
                  className={`st-dir-card${isExpanded ? ' expanded' : ''}${dir.id === selectedDirection ? ' selected' : ''}`}
                  onClick={() => toggleDirection(dir.id)}
                >
                  <div className="st-dir-card-icon" style={{ color: ('accent' in dir && dir.accent) ? dir.accent : undefined }}>
                    <i className={`fa-solid ${dir.icon}`} />
                  </div>
                  <div className="st-dir-card-info">
                    <div className="st-dir-card-name">{dir.name}</div>
                    <div className="st-dir-card-sub">{dir.subtitle}</div>
                  </div>
                  <div className="st-dir-card-fit">
                    <span>{dir.fitPercent}%</span>
                    <small>적합도</small>
                  </div>
                  <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} st-dir-card-chevron`} />
                  {isAdded && (
                    <button
                      className="st-dir-card-remove"
                      onClick={e => { e.stopPropagation(); removeJob(dir.id) }}
                      aria-label={`${dir.name} 삭제`}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* 펼쳐진 직무 상세 */}
          {expandedDirection && (() => {
            const dir = allDirections.find(d => d.id === expandedDirection)
            if (!dir) return null
            return (
              <div className="st-dir-detail">
                <div className="st-dir-detail-head">
                  <div className="st-dir-detail-icon" style={{ color: ('accent' in dir && dir.accent) ? dir.accent : undefined }}>
                    <i className={`fa-solid ${dir.icon}`} />
                  </div>
                  <div className="st-dir-detail-titles">
                    <div className="st-dir-detail-name">{dir.name}</div>
                    <div className="st-dir-detail-sub">{dir.subtitle}</div>
                  </div>
                  <div className="st-dir-detail-fit">
                    <span>{dir.fitPercent}%</span>
                    <small>적합도</small>
                  </div>
                </div>

                <div className="st-dir-detail-body">
                  <div className="st-dir-detail-block">
                    <div className="st-dir-detail-block-title">
                      <i className="fa-solid fa-briefcase" /> 이 직무가 하는 일
                    </div>
                    <ul className="st-dir-detail-list">
                      {dir.whatToDo.map(item => (
                        <li key={item}>
                          <span>{item}</span>
                          <i className="fa-solid fa-check" />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="st-dir-detail-block">
                    <div className="st-dir-detail-block-title">
                      <i className="fa-solid fa-building" /> 취업 기관 · 방향
                    </div>
                    <div className="st-dir-detail-tags">
                      {dir.targetCompanies.map(company => (
                        <span key={company} className="st-dir-detail-tag">{company}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
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

      {/* ── 자격증 추가 모달 ── */}
      <Modal open={certPickerOpen} onClose={() => setCertPickerOpen(false)} title="자격증 추가" size="sm">
        <p className="st-picker-desc">취득했거나 목표로 하는 자격증을 선택하세요.</p>
        <div className="st-picker-list">
          {availableCerts.map(cert => (
            <button key={cert.id} className="st-picker-item" onClick={() => addCert(cert)}>
              <div className="st-picker-icon">
                <i className={`fa-solid ${cert.icon}`} />
              </div>
              <div className="st-picker-info">
                <span className="st-picker-name">{cert.name}</span>
                <span className="st-picker-sub">{cert.subtitle}</span>
              </div>
            </button>
          ))}
          {availableCerts.length === 0 && (
            <p className="st-picker-empty">모든 자격증을 추가했습니다.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
