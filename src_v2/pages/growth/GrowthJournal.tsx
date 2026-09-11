import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, CATEGORY_LABEL, loadJournalEntries, setJournalBookmark,
         type Category, type Entry } from '../../data/growthJournal'
import { getActiveStudentId } from '../../data/students'
import { useGrowth } from '../../../shared/useRoadmapStore'
import './GrowthJournal.css'
import { usePageHead } from '../../components/PageCrumb'

const KEYWORDS = [
  { tag: '고객응대', cnt: 3 }, { tag: '문제해결', cnt: 3 },
  { tag: '협업', cnt: 3 },    { tag: '커뮤니케이션', cnt: 3 },
  { tag: '기획력', cnt: 2 },  { tag: '분석력', cnt: 2 },
  { tag: '책임감', cnt: 2 },  { tag: '개선', cnt: 2 },
]

const GUIDE = [
  { title: '구체적인 상황을 작성해요', desc: '언제, 어디서, 누구와, 무엇을 했는지 자세히 작성해보세요.' },
  { title: '나의 역할과 행동을 중심으로', desc: '그 상황에서 내가 맡은 역할과 구체적인 행동을 작성하세요.' },
  { title: '배운 점과 느낀 점을 남겨요', desc: '경험을 통해 무엇을 배우고 어떻게 성장했는지 작성해보세요.' },
  { title: '자소서에 어떻게 활용할지', desc: '이 경험을 자소서의 어떤 항목에 활용할 수 있는지 메모해보세요.' },
]

const CTA_STEPS = [
  { icon: 'fa-pencil',     label: '1. 경험 기록하기',    desc: '일상 속 다양한 경험을 구체적으로 기록해요' },
  { icon: 'fa-tags',       label: '2. 키워드 정리하기',   desc: '경험에서 얻은 역량과 키워드를 정리해요' },
  { icon: 'fa-file-lines', label: '3. 자소서에 활용하기', desc: '기록된 경험을 자소서 항목에 맞게 활용해요' },
  { icon: 'fa-trophy',     label: '4. 나만의 스토리 완성!', desc: '진정성 있는 나만의 스토리로 면접에서 빛을 발해요' },
]

// 분류는 코드다. 한글은 표시용 라벨이며 값 자체가 아니다(CLAUDE.md 4조).
const CAT_STYLE: Record<Category, { bg: string; color: string }> = {
  PARTTIME: { bg: '#F0F9FF', color: '#0284C7' },
  TEAM_PROJECT: { bg: 'var(--color-primary-bg)', color: 'var(--color-primary)' },
  ETC: { bg: '#F0FDF4', color: '#16A34A' },
}

const ALL = 'ALL'
const TABS: { key: string; label: string }[] = [
  { key: ALL, label: '전체' },
  ...CATEGORIES.map(code => ({ key: code as string, label: CATEGORY_LABEL[code] })),
]

const PAGE_SIZE = 5

/* ── Donut Chart ─────────────────────────────────────────────────── */
function DonutChart({ value, total }: { value: number; total: number }) {
  const r = 38, cx = 50, cy = 50
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? value / total : 0
  const filled = pct * circ
  return (
    <div className="gj-donut-wrap" style={{ width: 100, height: 100 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="13" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="13"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="gj-donut-center">
        <span className="gj-donut-val">{value}/{total}건</span>
        <span className="gj-donut-pct">{Math.round(pct * 100)}%</span>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function GrowthJournal() {
  usePageHead('성장경험일지', '아르바이트·팀프로젝트·동아리 활동에서 겪은 일을 기록해 두면 자기소개서 작성에 활용할 수 있어요.')
  const navigate = useNavigate()
  const studentId = getActiveStudentId()
  // 서버가 정본이다 — 저장 뒤 스토어가 다시 읽어 발행하면 그때 갱신된다.
  const revision = useGrowth(studentId)
  const entries: Entry[] = useMemo(() => loadJournalEntries(studentId), [studentId, revision])
  const [activeTab, setActiveTab] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const filtered = entries.filter(e => {
    if (activeTab !== ALL && e.category !== activeTab) return false
    if (query && !e.title.includes(query) && !e.desc.includes(query)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pagedEntries = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const resumeUsed = entries.filter(e => e.resumeUsed).length
  const total = entries.length
  const resumePct = total > 0 ? Math.round(resumeUsed / total * 100) : 0

  const toggleBookmark = (id: string) => {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    setJournalBookmark(studentId, id, !entry.bookmarked)
      .then(() => setError(''))
      .catch(() => setError('북마크를 저장하지 못했습니다. 다시 시도해 주세요.'))
  }

  const toggleExpanded = (id: string) =>
    setExpandedId(prev => prev === id ? null : id)

  return (
    <div className="gj-wrapper">

      {/* ── Main Content ── */}
      <div className="gj-content">

        {/* Header */}
        <div className="gj-page-header">
          <button className="gj-btn-primary" onClick={() => navigate('/growth/journal/new')}>
            <i className="fa-solid fa-plus" /> 새로운 경험 기록하기
          </button>
        </div>

        {/* TIP */}
        <div className="gj-tip">
          <i className="fa-solid fa-location-dot" style={{ color: 'var(--color-primary)' }} />
          <span className="tip-label">TIP</span>
          구체적으로 기록할수록 더 좋은 스토리가 됩니다!
        </div>

        {/* Stats */}
        <div className="gj-stats">
          <div className="gj-stat">
            <span className="gj-stat-label">전체 기록</span>
            <span className="gj-stat-val">{total} <span className="gj-stat-unit">건</span></span>
          </div>
          <div className="gj-stat">
            <span className="gj-stat-label">
              <i className="fa-solid fa-bag-shopping" style={{ color: 'var(--color-warning)' }} />
              아르바이트
            </span>
            <span className="gj-stat-val">{entries.filter(e => e.category === 'PARTTIME').length} <span className="gj-stat-unit">건</span></span>
          </div>
          <div className="gj-stat">
            <span className="gj-stat-label">
              <i className="fa-solid fa-people-group" style={{ color: 'var(--color-primary)' }} />
              팀프로젝트
            </span>
            <span className="gj-stat-val">{entries.filter(e => e.category === 'TEAM_PROJECT').length} <span className="gj-stat-unit">건</span></span>
          </div>
          <div className="gj-stat">
            <span className="gj-stat-label">
              <i className="fa-solid fa-star" style={{ color: 'var(--color-warning)' }} />
              기타 활동
            </span>
            <span className="gj-stat-val">{entries.filter(e => e.category === 'ETC').length} <span className="gj-stat-unit">건</span></span>
          </div>
          <div className="gj-stat">
            <span className="gj-stat-label">
              <i className="fa-regular fa-file-lines" style={{ color: 'var(--color-primary)' }} />
              자소서 활용
            </span>
            <span className="gj-stat-val">{resumeUsed} <span className="gj-stat-unit">건</span></span>
          </div>
        </div>

        {/* Body */}
        <div className="gj-body">

          {/* Journal List */}
          <div className="gj-main">

            {error && <p className="gj-empty" role="alert">{error}</p>}
            {/* Filter Bar */}
            <div className="gj-filter-bar">
              <div className="gj-tabs">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    className={`gj-tab${activeTab === tab.key ? ' active' : ''}`}
                    onClick={() => { setActiveTab(tab.key); setPage(1) }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="gj-search-wrap">
                <i className="fa-solid fa-magnifying-glass gj-search-ico" />
                <input
                  className="gj-search"
                  type="text"
                  placeholder="제목, 내용 검색"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <button className="gj-filter-btn">
                <i className="fa-solid fa-sliders" /> 필터
              </button>
            </div>

            {/* Entries */}
            <div className="gj-list">
              {filtered.length === 0 && (
                <div className="gj-empty">
                  <i className="fa-solid fa-inbox" />
                  <p>기록이 없습니다</p>
                </div>
              )}
              {pagedEntries.map(entry => {
                const cs = CAT_STYLE[entry.category]
                return (
                  <div
                    key={entry.id}
                    className={`gj-entry${expandedId === entry.id ? ' expanded' : ''}`}
                    data-cat={entry.category}
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <div className="gj-entry-top">
                      <span className="gj-badge" style={{ background: cs.bg, color: cs.color }}>
                        {CATEGORY_LABEL[entry.category]}
                      </span>
                      <div className="gj-entry-acts">
                        <button
                          className={`gj-act-btn${entry.bookmarked ? ' bookmarked' : ''}`}
                          onClick={(event) => { event.stopPropagation(); toggleBookmark(entry.id) }}
                          title="북마크"
                        >
                          <i className={`fa-${entry.bookmarked ? 'solid' : 'regular'} fa-bookmark`} />
                        </button>
                        <button
                          className="gj-act-btn"
                          title="상세 보기 및 수정"
                          onClick={(event) => { event.stopPropagation(); navigate(`/growth/journal/${entry.id}/edit`) }}
                        >
                          <i className="fa-solid fa-ellipsis" />
                        </button>
                      </div>
                    </div>
                    <h3 className="gj-entry-title">{entry.title}</h3>
                    <p className="gj-entry-desc">{entry.desc}</p>
                    <div className="gj-tags">
                      {entry.tags.map(t => <span key={t} className="gj-tag">{t}</span>)}
                    </div>
                    <span className="gj-entry-date">{entry.date}</span>
                    {expandedId === entry.id && (
                      <div className="gj-entry-detail" onClick={(event) => event.stopPropagation()}>
                        <div className="gj-detail-grid">
                          <div className="gj-detail-block">
                            <span className="gj-detail-label">상황</span>
                            <p>{entry.situation}</p>
                          </div>
                          <div className="gj-detail-block">
                            <span className="gj-detail-label">나의 역할</span>
                            <p>{entry.role}</p>
                          </div>
                          <div className="gj-detail-block">
                            <span className="gj-detail-label">행동</span>
                            <p>{entry.action}</p>
                          </div>
                          <div className="gj-detail-block">
                            <span className="gj-detail-label">결과</span>
                            <p>{entry.result}</p>
                          </div>
                          <div className="gj-detail-block gj-detail-wide">
                            <span className="gj-detail-label">배운 점</span>
                            <p>{entry.learning}</p>
                          </div>
                          <div className="gj-detail-block gj-detail-wide">
                            <span className="gj-detail-label">자소서 활용 메모</span>
                            <p>{entry.resumeMemo}</p>
                          </div>
                        </div>
                        <div className="gj-detail-actions">
                          <button className="gj-outline-btn gj-detail-edit" onClick={() => navigate(`/growth/journal/${entry.id}/edit`)}>
                            상세 보기 및 수정 <i className="fa-solid fa-arrow-right" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="gj-pager">
                <button className="gj-page-btn" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <i className="fa-solid fa-chevron-left" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} className={`gj-page-btn${currentPage === n ? ' on' : ''}`} onClick={() => setPage(n)}>
                    {n}
                  </button>
                ))}
                <button className="gj-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages))}>
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column */}
          <aside className="gj-right">

            {/* Keywords */}
            <div className="gj-widget">
              <div className="gj-widget-head">
                <span className="gj-widget-title">주요 키워드</span>
                <button className="gj-widget-more">
                  전체 보기 <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
              {KEYWORDS.map(kw => (
                <div key={kw.tag} className="gj-kw-row">
                  <span className="gj-kw-name">#{kw.tag}</span>
                  <span className="gj-kw-cnt">{kw.cnt}</span>
                </div>
              ))}
            </div>

            {/* Resume Usage */}
            <div className="gj-widget">
              <p className="gj-widget-title" style={{ marginBottom: 14 }}>자소서 활용 현황</p>
              <DonutChart value={resumeUsed} total={total} />
              <p className="gj-usage-desc">
                기록한 경험 중 {resumePct}%를<br />
                자소서에 활용했어요!
              </p>
              <button className="gj-outline-btn">활용한 경험 보기</button>
            </div>

            {/* Guide */}
            <div className="gj-widget">
              <p className="gj-widget-title" style={{ marginBottom: 14 }}>기록 가이드</p>
              <div className="gj-guide-list">
                {GUIDE.map((g, i) => (
                  <div key={i} className="gj-guide-item">
                    <i className="fa-solid fa-circle-check gj-guide-ico" />
                    <div>
                      <p className="gj-guide-name">{g.title}</p>
                      <p className="gj-guide-desc">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom CTA */}
        <div className="gj-cta">
          <h2 className="gj-cta-title">성장경험일지, 이렇게 활용하세요!</h2>
          <div className="gj-cta-steps">
            {CTA_STEPS.map((s, i) => (
              <div key={i} className="gj-cta-step">
                <div className="gj-cta-step-ico">
                  <i className={`fa-solid ${s.icon}`} />
                </div>
                <div>
                  <p className="gj-cta-step-name">{s.label}</p>
                  <p className="gj-cta-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Help */}
      <div className="gj-float">
        <span className="gj-float-label">도움이 필요하세요?</span>
        <button className="gj-float-btn">
          1:1 상담 신청하기 <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
    </div>
  )
}
