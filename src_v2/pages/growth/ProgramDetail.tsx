import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import ProgramApplyModal from '../../components/ProgramApplyModal'
import './ProgramDetail.css'

type DetailTab = '프로그램 소개' | '공지 사항' | '수강 후기' | 'Q&A'
const DETAIL_TABS: DetailTab[] = ['프로그램 소개', '공지 사항', '수강 후기', 'Q&A']

interface ProgramData {
  id: number
  title: string
  category: string
  tags: string[]
  period: string
  location: string
  capacity: number
  fee: string
  contact: string
  email: string
  schedule: { date: string; label: string }[]
  intro: string
  howTo: string[]
  contents: string[]
  effects: string[]
  image?: string
}

const MOCK_PROGRAMS: Record<string, ProgramData> = {
  '1': {
    id: 1,
    title: '데이터 기초 프로그래밍 교육',
    category: '취업',
    tags: ['추천', '인기'],
    period: '2025-09-09 ~ 2025-09-04 매주 화요일',
    location: '창원대학교 정보과학관',
    capacity: 30,
    fee: '무료',
    contact: '남진우(CWNU)',
    email: 'program@cwnu.ac.kr',
    image: '/비교과프로그램1.png',
    schedule: [
      { date: '2025-09-09', label: '1주차: Python 기초 문법' },
      { date: '2025-09-16', label: '2주차: 데이터 구조' },
      { date: '2025-09-23', label: '3주차: 실습 프로젝트' },
      { date: '2025-09-30', label: '4주차: 최종 발표' },
    ],
    intro: `Python 언어 기반의 실습위주 프로그래밍 강의입니다. 컴퓨터를 이용하여 다양한 복잡한 일을 처리하는 법을 알 수 있습니다.\n\n이 Python 프로그램은 Python 라이브러리와 새로운 트렌드를 활용한 코드를 작성할 수 있는 능력 향상에 초점을 맞추고 있습니다. 실제 현업에서 사용되는 예제와 함께 실습을 진행합니다.`,
    howTo: [
      '온라인 신청 → 접수 확인 → 교육 참여 → 수료증 발급',
      '신청 후 담당자 이메일로 참가 확인서 발송',
      '모든 수강생은 출석률 80% 이상 유지 시 수료증 발급',
    ],
    contents: [
      '파이썬 기초 문법 및 자료형',
      '조건문, 반복문, 함수 활용',
      '파일 입출력 및 예외 처리',
      '모듈과 패키지 활용',
      '실전 미니 프로젝트',
    ],
    effects: [
      '취업 포트폴리오에 활용 가능한 Python 역량 습득',
      '데이터 분석 및 자동화 업무 처리 능력 향상',
      '코딩 테스트 대비 기초 알고리즘 이해',
    ],
  },
  '2': {
    id: 2,
    title: '데이터 직무역량 개발 교육',
    category: '취업',
    tags: ['추천', '심화'],
    period: '2025-10-07 ~ 2025-11-04 매주 화요일',
    location: '창원대학교 정보과학관',
    capacity: 25,
    fee: '무료',
    contact: '남진우(CWNU)',
    email: 'program@cwnu.ac.kr',
    image: '/비교과프로그램2.png',
    schedule: [
      { date: '2025-10-07', label: '1주차: 업무 자동화 기초' },
      { date: '2025-10-14', label: '2주차: Pandas 데이터 분석' },
      { date: '2025-10-21', label: '3주차: 시각화 실습' },
      { date: '2025-10-28', label: '4주차: 미니 프로젝트' },
    ],
    intro: `기업 실무에서 활용되는 Python 데이터 분석 및 자동화 역량을 기르는 심화 교육 과정입니다.\n\n현장 데이터를 기반으로 분석, 리포트 자동화, 시각화까지 한 번에 학습합니다.`,
    howTo: [
      '온라인 신청 → 접수 확인 → 교육 참여 → 수료증 발급',
      '신청 후 담당자 이메일로 참가 확인서 발송',
      '출석률 80% 이상 유지 시 수료증 발급',
    ],
    contents: [
      'Pandas · Numpy 활용',
      '데이터 시각화 (Matplotlib · Seaborn)',
      'API 호출 및 데이터 수집',
      '엑셀 · 업무 자동화 스크립트',
      '실전 데이터 분석 프로젝트',
    ],
    effects: [
      '실무 데이터 처리 역량 강화',
      '직무 지원 시 차별화된 포트폴리오 확보',
      '데이터 직군 전환 기회 마련',
    ],
  },
  '3': {
    id: 3,
    title: 'ChatGPT 서비스의 발전 방향',
    category: '진로',
    tags: ['특강', '신규'],
    period: '2025-11-12 단일 특강',
    location: '창원대학교 대강당',
    capacity: 40,
    fee: '무료',
    contact: '진로지원센터',
    email: 'career@cwnu.ac.kr',
    image: '/비교과프로그램3.png',
    schedule: [
      { date: '2025-11-12', label: '특강: 생성형 AI의 현재와 미래' },
    ],
    intro: `ChatGPT를 비롯한 생성형 AI 서비스의 현황과 미래 진로 방향을 탐색하는 진로 특강입니다.\n\n현직 AI 엔지니어가 직접 산업 동향과 진로 인사이트를 공유합니다.`,
    howTo: [
      '온라인 신청 → 참가 확인 → 특강 참여',
      '특강 종료 후 Q&A 진행',
    ],
    contents: [
      '생성형 AI 기술 트렌드',
      'ChatGPT 서비스 사례 분석',
      'AI 직무로 진출하는 커리어 로드맵',
      '현직자 Q&A',
    ],
    effects: [
      '생성형 AI 산업 동향 이해',
      'AI 관련 진로 방향 설정',
      '현직자 네트워크 경험',
    ],
  },
  '4': {
    id: 4,
    title: '자기탐색으로 개인 역량 찾기',
    category: '진로',
    tags: ['추천', '워크숍'],
    period: '2025-09-23 ~ 2025-10-14 매주 화요일',
    location: '창원대학교 학생회관 상담실',
    capacity: 20,
    fee: '무료',
    contact: '학생상담센터',
    email: 'counsel@cwnu.ac.kr',
    image: '/비교과프로그램4.png',
    schedule: [
      { date: '2025-09-23', label: '1주차: 강점 탐색 워크숍' },
      { date: '2025-09-30', label: '2주차: 가치관·흥미 진단' },
      { date: '2025-10-07', label: '3주차: 진로 비전 수립' },
      { date: '2025-10-14', label: '4주차: 실행 계획 작성' },
    ],
    intro: `자기 탐색과 강점 발견을 통해 진로를 설계하는 진로 역량 강화 프로그램입니다.\n\n전문 상담사와 함께 진행되는 워크숍 형식으로, 자기 이해를 깊이 있게 다질 수 있습니다.`,
    howTo: [
      '온라인 신청 → 사전 검사지 작성 → 워크숍 참여',
      '회차별 출석 80% 이상 시 수료증 발급',
    ],
    contents: [
      '강점 진단 및 셀프 코칭',
      '가치관·흥미 분석',
      '진로 비전 보드 작성',
      '실행 계획 수립 워크숍',
    ],
    effects: [
      '자기 이해와 진로 명확성 향상',
      '취업 자기소개서 작성 기반 마련',
      '진로 결정 자신감 향상',
    ],
  },
  '5': {
    id: 5,
    title: '해외 단기 어학연수 프로그램',
    category: '어학',
    tags: ['글로벌', '인기'],
    period: '2026-01-05 ~ 2026-01-30 (4주)',
    location: '필리핀 세부 / 호주 시드니',
    capacity: 15,
    fee: '일부 지원',
    contact: '국제교류처',
    email: 'global@cwnu.ac.kr',
    image: '/비교과프로그램5.png',
    schedule: [
      { date: '2026-01-05', label: '출국 및 오리엔테이션' },
      { date: '2026-01-06', label: '주간 어학 수업 시작' },
      { date: '2026-01-23', label: '문화 체험 프로그램' },
      { date: '2026-01-30', label: '수료식 및 귀국' },
    ],
    intro: `해외 현지에서 진행하는 4주간의 단기 어학연수 프로그램입니다.\n\n현지 어학원 정규 수업과 다양한 문화 체험을 통해 글로벌 역량을 강화합니다.`,
    howTo: [
      '온라인 신청 → 서류 심사 → 면접 → 최종 선발',
      '선발자 사전 OT 참석 필수',
      '학교 지원금은 일부 자기 부담금 발생',
    ],
    contents: [
      '주 20시간 영어 정규 수업',
      '문화 체험 (현지 투어, 봉사활동)',
      '글로벌 네트워킹 이벤트',
      '귀국 후 영어 발표 활동',
    ],
    effects: [
      '실용 영어 회화 능력 향상',
      '해외 문화 이해 및 글로벌 마인드 확장',
      '국제 인증 어학연수 이수증 획득',
    ],
  },
  default: {
    id: 0,
    title: '프로그램 상세',
    category: '기타',
    tags: ['추천'],
    period: '2025.04.01 ~ 2025.04.04',
    location: '창원대학교',
    capacity: 30,
    fee: '무료',
    contact: '담당자',
    email: 'program@cwnu.ac.kr',
    schedule: [],
    intro: '프로그램 소개 내용입니다.',
    howTo: ['신청 → 참여 → 수료'],
    contents: ['내용 1', '내용 2'],
    effects: ['효과 1', '효과 2'],
  },
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<DetailTab>('프로그램 소개')
  const [wished, setWished] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applied, setApplied] = useState(false)

  const prog = (id && MOCK_PROGRAMS[id]) ? MOCK_PROGRAMS[id] : MOCK_PROGRAMS['default']

  const handleApplySubmit = () => {
    setApplyOpen(false)
    setApplied(true)
    window.setTimeout(() => setApplied(false), 3000)
  }

  return (
    <div className="pd-wrap">
      {/* Breadcrumb */}
      <nav className="pd-breadcrumb">
        <Link to="/growth">역량개발</Link>
        <i className="fa-solid fa-chevron-right" />
        <Link to="/growth/program">비교과 프로그램</Link>
        <i className="fa-solid fa-chevron-right" />
        <span>프로그램 상세</span>
      </nav>

      <div className="pd-layout">
        {/* ── Left Column ─────────────────────────────────── */}
        <div className="pd-left">
          {/* Title area */}
          <div className="pd-title-area">
            <div className="pd-tags">
              {prog.tags.map(t => (
                <span key={t} className={`pd-tag pd-tag--${t}`}>{t}</span>
              ))}
              <span className="pd-tag pd-tag--cat">{prog.category}</span>
            </div>
            <h1 className="pd-title">{prog.title}</h1>
            <div className="pd-title-meta">
              <span><i className="fa-regular fa-calendar" /> 신청기간: {prog.period}</span>
              <span><i className="fa-solid fa-users" /> 정원 {prog.capacity}명</span>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="pd-thumb">
            {prog.image ? (
              <img src={prog.image} alt={prog.title} />
            ) : (
              <>
                <i className="fa-solid fa-image" />
                <span>프로그램 대표 이미지</span>
              </>
            )}
          </div>

          {/* Tab navigation */}
          <div className="pd-tabs">
            {DETAIL_TABS.map(tab => (
              <button
                key={tab}
                className={`pd-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === '프로그램 소개' && (
            <div className="pd-content">
              <section className="pd-section">
                <h3 className="pd-section-title">
                  <i className="fa-solid fa-circle-info" /> 프로그램 소개
                </h3>
                {prog.intro.split('\n\n').map((para, i) => (
                  <p key={i} className="pd-para">{para}</p>
                ))}
              </section>

              <section className="pd-section">
                <h3 className="pd-section-title">
                  <i className="fa-solid fa-list-check" /> 참여 방법
                </h3>
                <ol className="pd-ol">
                  {prog.howTo.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </section>

              <section className="pd-section">
                <h3 className="pd-section-title">
                  <i className="fa-solid fa-book" /> 프로그램 내용
                </h3>
                <ul className="pd-ul">
                  {prog.contents.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="pd-section">
                <h3 className="pd-section-title">
                  <i className="fa-solid fa-star" /> 프로그램 효과
                </h3>
                <ul className="pd-ul">
                  {prog.effects.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {activeTab !== '프로그램 소개' && (
            <div className="pd-tab-empty">
              <i className="fa-regular fa-folder-open" />
              <p>등록된 {activeTab} 내용이 없습니다.</p>
            </div>
          )}
        </div>

        {/* ── Right Column ─────────────────────────────────── */}
        <aside className="pd-right">
          {/* 신청 정보 */}
          <div className="pd-info-card">
            <h3 className="pd-info-title">신청 정보</h3>
            <dl className="pd-info-list">
              <dt><i className="fa-regular fa-calendar" /> 기간</dt>
              <dd>{prog.period}</dd>
              <dt><i className="fa-solid fa-location-dot" /> 장소</dt>
              <dd>{prog.location}</dd>
              <dt><i className="fa-solid fa-users" /> 정원</dt>
              <dd>{prog.capacity}명</dd>
              <dt><i className="fa-solid fa-won-sign" /> 수강료</dt>
              <dd>{prog.fee}</dd>
              <dt><i className="fa-regular fa-user" /> 담당자</dt>
              <dd>
                {prog.contact}<br />
                <a href={`mailto:${prog.email}`} className="pd-email">{prog.email}</a>
              </dd>
            </dl>
          </div>

          {/* Buttons */}
          <button className="pd-apply-btn" onClick={() => setApplyOpen(true)}>
            <i className="fa-solid fa-pen-to-square" /> 신청하기
          </button>
          {applied && (
            <div className="pd-applied-toast" role="status">
              <i className="fa-solid fa-circle-check" /> 신청이 완료되었습니다.
            </div>
          )}
          <button
            className={`pd-wish-btn${wished ? ' wished' : ''}`}
            onClick={() => setWished(w => !w)}
          >
            <i className={`fa-${wished ? 'solid' : 'regular'} fa-heart`} />
            {wished ? '찜 완료' : '찜 프로그램저장'}
          </button>

          {/* Schedule */}
          {prog.schedule.length > 0 && (
            <div className="pd-schedule-card">
              <h3 className="pd-info-title">프로그램 일정</h3>
              <ul className="pd-schedule-list">
                {prog.schedule.map((s, i) => (
                  <li key={i} className="pd-schedule-item">
                    <span className="pd-schedule-dot" />
                    <div>
                      <p className="pd-schedule-date">{s.date}</p>
                      <p className="pd-schedule-label">{s.label}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button className="pd-back-btn" onClick={() => navigate('/growth/program')}>
            <i className="fa-solid fa-arrow-left" /> 목록으로
          </button>
        </aside>
      </div>

      <ProgramApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        programTitle={prog.title}
        onSubmit={handleApplySubmit}
      />
    </div>
  )
}
