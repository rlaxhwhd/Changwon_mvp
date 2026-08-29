import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveStudent } from '../../data/students'
import { getWishlist, toggleWish as toggleWishStore } from '../../data/wishlist'
import { getPrograms, sortByPriority } from '../../../src_admin/data/programs'
import { PROGRAM_CATEGORIES } from '../../../src_admin/data/schema/program'
import type { ProgramCategory } from '../../../src_admin/data/schema/program'
import ProgramCardGrid from './ProgramCardGrid'
import type { ProgramCardVM } from './ProgramCardGrid'
import './ProgramApply.css'
import './ProgramReco.css'
import { usePageHead } from '../../components/PageCrumb'

type Category = '전체' | ProgramCategory

const CATEGORIES: Category[] = ['전체', ...PROGRAM_CATEGORIES]

export default function ProgramApply() {
  usePageHead('비교과 프로그램 신청', 'CWNU 학생을 위한 진로·취업 역량 강화 프로그램을 신청하고 XP와 수료증을 획득하세요.')
  const navigate = useNavigate()
  const profile = getActiveStudent()
  // 자격증·어학 카드는 별도 페이지로 분리됨 — 여기는 비교과·외부활동 2개만
  const recoGroups = [
    { key: 'programs', label: '비교과 프로그램', icon: 'fa-graduation-cap', items: profile.recommendations.programs },
    { key: 'activities', label: '외부활동 · 인턴', icon: 'fa-briefcase', items: profile.recommendations.activities },
  ]
  const [activeTab, setActiveTab] = useState<Category>('전체')
  const [page, setPage] = useState(1)
  const programs = useMemo<ProgramCardVM[]>(() => sortByPriority(getPrograms()).map(program => ({
    id: program.id,
    title: program.title,
    desc: program.desc,
    category: program.category,
    startDate: program.startDate,
    endDate: program.endDate,
    runStartDate: program.runStartDate,
    runEndDate: program.runEndDate,
    capacity: program.capacity,
    image: program.image,
  })), [])
  const [wishlist, setWishlist] = useState<Set<string>>(() => new Set(getWishlist()))
  const [showWishOnly, setShowWishOnly] = useState(false)
  const PAGE_SIZE = 8

  // ── AI 맞춤 추천 잠금 상태 (locked → loading → unlocked) ───────
  const [recoState, setRecoState] = useState<'locked' | 'loading' | 'unlocked'>('locked')
  const handleUnlock = () => {
    setRecoState('loading')
    window.setTimeout(() => setRecoState('unlocked'), 1800)
  }

  const toggleWish = (id: string) => {
    setWishlist(new Set(toggleWishStore(id)))
  }

  const filtered = programs.filter(p => {
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

        {filtered.length > 0 ? (
          <ProgramCardGrid
            programs={paged}
            onSelect={id => navigate(`/growth/program/${id}`)}
            wished={wishlist}
            onToggleWish={toggleWish}
          />
        ) : (
            <div className="pa-empty">
              <i className="fa-solid fa-box-open" />
              <p>
                {showWishOnly
                  ? '찜한 공고가 없습니다. 하트 버튼으로 관심 공고를 저장해보세요.'
                  : '해당 카테고리의 프로그램이 없습니다.'}
              </p>
            </div>
        )}

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
