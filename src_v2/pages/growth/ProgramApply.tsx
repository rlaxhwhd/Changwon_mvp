import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveStudent } from '../../data/students'
import { getWishlist, toggleWish as toggleWishStore } from '../../data/wishlist'
import './ProgramApply.css'
import './ProgramReco.css'

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
  const profile = getActiveStudent()
  // 자격증·어학 카드는 별도 페이지로 분리됨 — 여기는 비교과·외부활동 2개만
  const recoGroups = [
    { key: 'programs', label: '비교과 프로그램', icon: 'fa-graduation-cap', items: profile.recommendations.programs },
    { key: 'activities', label: '외부활동 · 인턴', icon: 'fa-briefcase', items: profile.recommendations.activities },
  ]
  const [activeTab, setActiveTab] = useState<Category>('전체')
  const [page, setPage] = useState(1)
  const [wishlist, setWishlist] = useState<Set<number>>(() => new Set(getWishlist()))
  const [showWishOnly, setShowWishOnly] = useState(false)
  const PAGE_SIZE = 3

  // ── AI 맞춤 추천 잠금 상태 (locked → loading → unlocked) ───────
  const [recoState, setRecoState] = useState<'locked' | 'loading' | 'unlocked'>('locked')
  const handleUnlock = () => {
    setRecoState('loading')
    window.setTimeout(() => setRecoState('unlocked'), 1800)
  }

  const toggleWish = (id: number) => {
    setWishlist(new Set(toggleWishStore(id)))
  }

  const filtered = PROGRAMS.filter(p => {
    if (showWishOnly && !wishlist.has(p.id)) return false
    if (activeTab !== '전체' && p.category !== activeTab) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE)

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

        {/* AI 맞춤 추천 — 잠금 → 로딩 → 잠금해제 3단계 */}
        <section className="pr-reco" aria-label="AI 맞춤 추천">
          <div className="pr-reco-head">
            <span className="pr-reco-badge">
              <i className="fa-solid fa-wand-magic-sparkles" /> AI 맞춤 추천
            </span>
            <h2>{profile.name}님께 추천</h2>
            <p>
              진단 결과 · 역량 점수 · 로드맵 GAP을 종합해 학생에게 가장 적합한
              비교과·외부활동을 AI가 자동으로 선별합니다.
            </p>
          </div>

          {recoState === 'loading' ? (
            <div className="pr-reco-loading" role="status" aria-live="polite">
              <div className="pr-reco-spinner">
                <i className="fa-solid fa-wand-magic-sparkles" />
                <span className="pr-reco-spinner-ring" />
              </div>
              <p className="pr-reco-loading-title">AI가 {profile.name}님의 데이터를 분석하고 있어요</p>
              <p className="pr-reco-loading-sub">
                진단·역량 점수·로드맵·관심 직무를 종합 중입니다…
              </p>
              <div className="pr-reco-loading-bar">
                <div className="pr-reco-loading-fill" />
              </div>
            </div>
          ) : (
            <div className={`pr-reco-stage${recoState === 'locked' ? ' pr-reco-stage--locked' : ''}`}>
              <div className="pr-reco-cols">
                {recoGroups.map(group => (
                  <div key={group.key} className="pr-reco-col">
                    <h3><i className={`fa-solid ${group.icon}`} />{group.label}</h3>
                    <ul>
                      {group.items.map(item => (
                        <li key={item.title}>
                          <div className="pr-reco-item-top">
                            <strong>{item.title}</strong>
                            <span className={`pr-reco-tag pr-reco-tag-${item.tag}`}>{item.tag}</span>
                          </div>
                          <p>{item.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {recoState === 'locked' && (
                <div className="pr-reco-lock-overlay">
                  <div className="pr-reco-lock-card">
                    <span className="pr-reco-lock-icon">
                      <i className="fa-solid fa-lock" />
                    </span>
                    <h4>AI 맞춤 추천이 잠겨 있어요</h4>
                    <p>버튼을 누르면 AI가 학생 데이터를 분석해 맞춤 비교과·외부활동을 추천해 드립니다.</p>
                    <button type="button" className="pr-reco-cta" onClick={handleUnlock}>
                      <i className="fa-solid fa-wand-magic-sparkles" />
                      나에게 맞는 비교과 프로그램 보기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

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
          <div className="pa-filter-right">
            <button
              type="button"
              className={`pa-wish-toggle${showWishOnly ? ' active' : ''}`}
              onClick={() => {
                setShowWishOnly(prev => !prev)
                setPage(1)
              }}
              aria-pressed={showWishOnly}
            >
              <i className={showWishOnly ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
              찜 목록 보기
              {wishlist.size > 0 && <span className="pa-wish-count">{wishlist.size}</span>}
            </button>
            <select className="pa-sort-select" aria-label="정렬">
              <option>기간순</option>
              <option>최신순</option>
              <option>인기순</option>
            </select>
          </div>
        </div>

        <div className="pa-list">
          {paged.map((program, idx) => {
            const isFeatured = !showWishOnly && activeTab === '전체' && currentPage === 1 && idx <= 1
            const isWished = wishlist.has(program.id)
            return (
            <div
              key={program.id}
              className={`pa-card${isFeatured ? ' pa-card--featured' : ''}`}
              onClick={() => navigate(`/growth/program/${program.id}`)}
            >
              {isFeatured && (
                <span className="pa-featured-badge">
                  <i className="fa-solid fa-wand-magic-sparkles" /> 추천
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
                  {(program.id === 1 || program.id === 4) && (
                    <span className="pa-multi-badge">다회차</span>
                  )}
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
                <button
                  className={`pa-wish-btn${isWished ? ' active' : ''}`}
                  title={isWished ? '찜 해제' : '찜하기'}
                  aria-label={isWished ? '찜 해제' : '찜하기'}
                  aria-pressed={isWished}
                  onClick={() => toggleWish(program.id)}
                >
                  <i className={isWished ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
                </button>
              </div>
            </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="pa-empty">
              <i className="fa-solid fa-box-open" />
              <p>
                {showWishOnly
                  ? '찜한 공고가 없습니다. 하트 버튼으로 관심 공고를 저장해보세요.'
                  : '해당 카테고리의 프로그램이 없습니다.'}
              </p>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="pa-pagination">
            <button className="pa-page-btn" disabled={currentPage === 1} onClick={() => setPage(current => Math.max(1, current - 1))}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
              <button
                key={pageNumber}
                className={`pa-page-btn${currentPage === pageNumber ? ' active' : ''}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button className="pa-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
