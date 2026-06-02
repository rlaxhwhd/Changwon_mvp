import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ProgramApply.css'

type Category = '전체' | '진로' | '취업' | '어학' | '창업' | '자격증' | '기타'

const CATEGORIES: Category[] = ['전체', '진로', '취업', '어학', '창업', '자격증', '기타']

interface Program {
  id: number
  title: string
  desc: string
  category: Exclude<Category, '전체'>
  startDate: string
  endDate: string
  capacity: number
  dDay: number
  image?: string
}

const PROGRAMS: Program[] = [
  {
    id: 1,
    title: '데이터 기초 프로그래밍 교육',
    desc: 'Python 언어 기반의 실습 중심 프로그래밍 강의로 취업 실무 역량을 키울 수 있는 교육입니다.',
    category: '취업',
    startDate: '2025.04.01',
    endDate: '2025.04.04',
    capacity: 30,
    dDay: 5,
    image: '/비교과프로그램1.png',
  },
  {
    id: 2,
    title: '데이터 직무역량 개발 교육',
    desc: '기업에서 필요한 Python 데이터 분석 및 자동화 역량을 기르는 심화 교육 과정입니다.',
    category: '취업',
    startDate: '2025.04.01',
    endDate: '2025.04.04',
    capacity: 25,
    dDay: 12,
    image: '/비교과프로그램2.png',
  },
  {
    id: 3,
    title: 'ChatGPT 서비스의 발전 방향',
    desc: 'ChatGPT를 비롯한 생성형 AI 서비스의 현황과 미래 진로 방향을 탐색하는 진로 특강입니다.',
    category: '진로',
    startDate: '2025.04.01',
    endDate: '2025.04.04',
    capacity: 40,
    dDay: 20,
    image: '/비교과프로그램3.png',
  },
  {
    id: 4,
    title: '자기탐색으로 개인 역량 찾기',
    desc: '자기 탐색과 강점 발견을 통해 진로를 설계하는 진로 역량 강화 프로그램입니다.',
    category: '진로',
    startDate: '2025.04.01',
    endDate: '2025.04.04',
    capacity: 20,
    dDay: 3,
    image: '/비교과프로그램4.png',
  },
  {
    id: 5,
    title: '해외 단기 어학연수 프로그램',
    desc: '해외 현지에서 진행하는 단기 어학연수 프로그램으로 글로벌 역량을 강화합니다.',
    category: '어학',
    startDate: '2025.04.01',
    endDate: '2025.04.04',
    capacity: 15,
    dDay: 30,
    image: '/비교과프로그램5.png',
  },
]

const CAT_COLORS: Record<Exclude<Category, '전체'>, string> = {
  취업: '#2E5BFF',
  진로: '#22C55E',
  어학: '#F59E0B',
  창업: '#EF4444',
  자격증: '#8B5CF6',
  기타: '#6B7280',
}

function DDay({ n }: { n: number }) {
  return <span className={`pa-dday${n <= 5 ? ' urgent' : ''}`}>D-{n}</span>
}

export default function ProgramApply() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Category>('전체')
  const [page, setPage] = useState(1)
  const totalPages = 5

  const filtered = activeTab === '전체'
    ? PROGRAMS
    : PROGRAMS.filter(program => program.category === activeTab)

  return (
    <div className="pa-shell">
      <div className="pa-wrap">
        <div className="pa-header">
          <p className="pa-breadcrumb">역량개발 / 비교과 프로그램</p>
          <h1 className="pa-title">비교과 프로그램</h1>
          <p className="pa-desc">
            CWNU 학생을 위한 진로, 취업 역량 강화 프로그램을 신청하고 XP와 수료증을 획득하세요.
          </p>
        </div>

        <div className="pa-filter-bar">
          <div className="pa-tabs">
            {CATEGORIES.map(category => (
              <button
                key={category}
                className={`pa-tab${activeTab === category ? ' active' : ''}`}
                onClick={() => {
                  setActiveTab(category)
                  setPage(1)
                }}
              >
                {category}
              </button>
            ))}
          </div>
          <select className="pa-sort-select" aria-label="정렬">
            <option>기간순</option>
            <option>최신순</option>
            <option>인기순</option>
          </select>
        </div>

        <div className="pa-list">
          {filtered.map((program, idx) => (
            <div
              key={program.id}
              className={`pa-card${idx === 0 ? ' pa-card--featured' : ''}`}
              onClick={() => navigate(`/growth/program/${program.id}`)}
            >
              {idx === 0 && (
                <span className="pa-featured-badge">
                  <i className="fa-solid fa-wand-magic-sparkles" /> AI 추천
                </span>
              )}
              <div className="pa-thumb">
                {program.image
                  ? <img src={program.image} alt={program.title} />
                  : <i className="fa-solid fa-image" />}
              </div>

              <div className="pa-info">
                <div className="pa-info-top">
                  <span
                    className="pa-cat-badge"
                    style={{
                      background: CAT_COLORS[program.category] + '18',
                      color: CAT_COLORS[program.category],
                    }}
                  >
                    {program.category}
                  </span>
                  <DDay n={program.dDay} />
                </div>
                <h2 className="pa-card-title">{program.title}</h2>
                <p className="pa-card-desc">{program.desc}</p>
                <div className="pa-meta">
                  <span><i className="fa-regular fa-calendar" /> 신청기간: {program.startDate} ~ {program.endDate}</span>
                  <span><i className="fa-solid fa-users" /> 정원 {program.capacity}명</span>
                </div>
              </div>

              <div className="pa-actions" onClick={event => event.stopPropagation()}>
                <button className="pa-apply-btn" onClick={() => navigate(`/growth/program/${program.id}`)}>
                  신청하기
                </button>
                <button className="pa-wish-btn" title="찜하기" aria-label="찜하기">
                  <i className="fa-regular fa-heart" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="pa-empty">
              <i className="fa-solid fa-box-open" />
              <p>해당 카테고리의 프로그램이 없습니다.</p>
            </div>
          )}
        </div>

        <div className="pa-pagination">
          <button className="pa-page-btn" disabled={page === 1} onClick={() => setPage(current => current - 1)}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
            <button
              key={pageNumber}
              className={`pa-page-btn${page === pageNumber ? ' active' : ''}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button className="pa-page-btn" disabled={page === totalPages} onClick={() => setPage(current => current + 1)}>
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      </div>
    </div>
  )
}
