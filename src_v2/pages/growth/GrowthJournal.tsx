import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GrowthSidebar from '../../components/GrowthSidebar'
import './GrowthJournal.css'

/* ── Types ───────────────────────────────────────────────────────── */
export type Category = '아르바이트' | '팀프로젝트' | '기타 활동'

export interface Entry {
  id: number
  category: Category
  title: string
  desc: string
  situation: string
  role: string
  action: string
  result: string
  learning: string
  resumeMemo: string
  tags: string[]
  date: string
  bookmarked: boolean
  resumeUsed: boolean
}

/* ── Mock Data ───────────────────────────────────────────────────── */
export const INITIAL_ENTRIES: Entry[] = [
  {
    id: 1, category: '아르바이트',
    title: '카페 매장 아르바이트 – 고객 응대 개선 경험',
    desc: '주말에 고객이 몰려 주문 대기 시간이 길어지는 문제가 자주 발생했습니다. 저는 주문 프로세스를 분석하고, 메뉴판 가독성 개선과 키오스크 안내 문구를 추가하는 방안을 제안했습니다.',
    situation: '주말 피크 시간대에 주문 대기 시간이 길어져 고객 불만이 반복적으로 발생했습니다.',
    role: '매장 운영 흐름을 관찰하고 개선 아이디어를 정리해 점장님께 제안하는 역할을 맡았습니다.',
    action: '혼잡 시간대 주문 동선을 기록하고, 자주 묻는 메뉴 정보를 메뉴판 상단에 배치했으며 키오스크 안내 문구를 추가했습니다.',
    result: '주말 평균 대기 시간이 줄고 신규 아르바이트생도 주문 안내를 더 빠르게 익힐 수 있었습니다.',
    learning: '작은 안내 문구와 동선 개선도 고객 경험을 크게 바꿀 수 있다는 점을 배웠습니다.',
    resumeMemo: '문제 발견, 고객 관찰, 프로세스 개선 경험으로 서비스 운영 직무 자소서에 활용 가능',
    tags: ['고객응대', '문제해결', '커뮤니케이션'],
    date: '2025-05-20', bookmarked: false, resumeUsed: true,
  },
  {
    id: 2, category: '팀프로젝트',
    title: '앱 서비스 기획 프로젝트 – 일정 관리 앱',
    desc: '대학생의 효율적인 시간 관리를 돕는 앱을 기획하고 개발하는 프로젝트입니다. 팀의 기획 파트를 담당하여 시장 조사, 사용자 인터뷰, 기능 정의서를 작성하였고...',
    situation: '팀 프로젝트에서 대학생의 일정 관리 문제를 해결하는 앱 서비스를 기획했습니다.',
    role: '기획 담당자로서 사용자 조사, 요구사항 정리, 기능 우선순위 설정을 맡았습니다.',
    action: '사용자 인터뷰 8건을 진행하고 경쟁 서비스의 기능을 비교해 MVP 기능 정의서를 작성했습니다.',
    result: '팀원들이 개발 범위를 명확히 이해했고, 발표에서 사용자 문제 정의가 구체적이라는 평가를 받았습니다.',
    learning: '좋은 기획은 아이디어보다 문제를 정확히 정의하는 데서 시작한다는 것을 배웠습니다.',
    resumeMemo: '서비스 기획, 사용자 조사, 협업 경험으로 IT 서비스 기획 직무에 활용',
    tags: ['기획력', '협업', '분석력'],
    date: '2025-04-18', bookmarked: true, resumeUsed: true,
  },
  {
    id: 3, category: '기타 활동',
    title: '교내 마케팅 동아리 활동 – SNS 콘텐츠 제작',
    desc: '학교 축제 홍보를 위한 SNS 콘텐츠 제작을 맡았습니다. 인스타그램과 페이스북 타겟 분석을 통해 콘텐츠 컨셉을 기획하고, 카드뉴스 및 숏폼 영상을 제작하여...',
    situation: '학교 축제 홍보를 위해 동아리에서 SNS 콘텐츠 제작을 맡았습니다.',
    role: '채널별 타겟 분석과 콘텐츠 콘셉트 기획을 담당했습니다.',
    action: '인스타그램 카드뉴스와 숏폼 영상 시안을 제작하고 업로드 시간대별 반응을 비교했습니다.',
    result: '축제 게시물의 저장 수와 공유 수가 이전 행사 대비 증가했습니다.',
    learning: '콘텐츠 성과는 감각뿐 아니라 타겟과 채널 분석이 함께 필요하다는 점을 배웠습니다.',
    resumeMemo: '마케팅, 콘텐츠 기획, 데이터 기반 개선 경험으로 활용',
    tags: ['콘텐츠제작', '마케팅', '창의성'],
    date: '2025-03-30', bookmarked: false, resumeUsed: false,
  },
  {
    id: 4, category: '아르바이트',
    title: '편의점 아르바이트 – 재고 관리 효율화',
    desc: '재고 파악이 정확하지 않아 발주 오류가 자주 발생했습니다. 엑셀을 활용해 재고 관리표를 개선하고, 발주 주기와 수량을 조정하여 폐기율을 20% 감소시켰습니다.',
    situation: '재고 파악이 부정확해 발주 오류와 폐기가 반복적으로 발생했습니다.',
    role: '근무 중 확인 가능한 재고 데이터를 정리하고 관리 방식을 개선했습니다.',
    action: '엑셀 재고 관리표를 만들고 품목별 발주 주기와 폐기 수량을 기록했습니다.',
    result: '폐기율을 약 20% 줄이고 교대 근무자 간 재고 인수인계가 쉬워졌습니다.',
    learning: '반복 업무도 데이터를 기록하면 개선할 지점이 분명해진다는 것을 배웠습니다.',
    resumeMemo: '데이터 관리, 책임감, 운영 개선 경험으로 활용',
    tags: ['데이터관리', '개선', '책임감'],
    date: '2025-03-10', bookmarked: false, resumeUsed: true,
  },
  {
    id: 5, category: '팀프로젝트',
    title: 'UX/UI 디자인 프로젝트 – 사용자 경험 개선',
    desc: '기존 서비스의 UX 문제점을 분석하여 개선 방안을 도출하는 프로젝트입니다. 사용자 리서치, 퍼소나 설정, 와이어프레임 제작을 담당하여 사용자 중심으로...',
    situation: '기존 서비스의 낮은 사용성을 개선하는 UX/UI 프로젝트를 진행했습니다.',
    role: '사용자 리서치와 퍼소나 설정, 와이어프레임 설계를 담당했습니다.',
    action: '사용자 불편 지점을 정리하고 핵심 화면의 흐름을 단순화한 와이어프레임을 제작했습니다.',
    result: '프로토타입 테스트에서 주요 과업 완료 시간이 단축되었습니다.',
    learning: '디자인은 보기 좋은 화면보다 사용자의 행동을 덜 막는 구조가 중요하다는 점을 배웠습니다.',
    resumeMemo: 'UX 리서치, 화면 설계, 사용자 중심 개선 경험으로 활용',
    tags: ['디자인', '사용자경험', '리서치'],
    date: '2025-02-18', bookmarked: false, resumeUsed: true,
  },
  {
    id: 6, category: '기타 활동',
    title: '봉사활동 – 지역 아동 학습 멘토링',
    desc: '지역 아동센터에서 초등학생 학습 멘토링 봉사활동을 진행했습니다. 아이들의 눈높이에 맞춰 학습 내용을 설명하고, 학습 계획을 함께 세워 스스로 공부할 수 있도록 도왔습니다.',
    situation: '지역 아동센터에서 학습 습관이 부족한 초등학생을 멘토링했습니다.',
    role: '학생의 수준을 파악하고 주간 학습 계획을 함께 세우는 멘토 역할을 맡았습니다.',
    action: '어려워하는 과목을 작은 단위로 나누어 설명하고 성취 체크표를 만들었습니다.',
    result: '학생이 숙제를 미루는 횟수가 줄고 스스로 공부 계획을 말할 수 있게 되었습니다.',
    learning: '상대의 눈높이에 맞춘 설명과 꾸준한 격려가 변화를 만든다는 것을 배웠습니다.',
    resumeMemo: '공감, 소통, 교육 봉사 경험으로 인성 문항에 활용',
    tags: ['공감', '소통', '나눔'],
    date: '2025-01-22', bookmarked: false, resumeUsed: false,
  },
]

export const JOURNAL_STORAGE_KEY = 'cwnu-growth-journal-entries'

export function loadJournalEntries(): Entry[] {
  if (typeof window === 'undefined') return INITIAL_ENTRIES
  const stored = window.localStorage.getItem(JOURNAL_STORAGE_KEY)
  if (!stored) return INITIAL_ENTRIES

  try {
    const parsed = JSON.parse(stored) as Entry[]
    return Array.isArray(parsed) ? parsed : INITIAL_ENTRIES
  } catch {
    return INITIAL_ENTRIES
  }
}

export function saveJournalEntries(entries: Entry[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries))
}

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

const CAT_STYLE: Record<Category, { bg: string; color: string }> = {
  '아르바이트': { bg: '#FFF7ED', color: '#C05621' },
  '팀프로젝트': { bg: '#EEF2FF', color: '#2E5BFF' },
  '기타 활동':  { bg: '#F0FDF4', color: '#16A34A' },
}

const TABS = ['전체', '아르바이트', '팀프로젝트', '기타 활동'] as const

/* ── Donut Chart ─────────────────────────────────────────────────── */
function DonutChart({ value, total }: { value: number; total: number }) {
  const r = 38, cx = 50, cy = 50
  const circ = 2 * Math.PI * r
  const pct = value / total
  const filled = pct * circ
  return (
    <div className="gj-donut-wrap" style={{ width: 100, height: 100 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8ECF0" strokeWidth="13" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#2E5BFF"
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
  const navigate = useNavigate()
  const [entries, setEntries] = useState<Entry[]>(() => loadJournalEntries())
  const [activeTab, setActiveTab] = useState<string>('전체')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = entries.filter(e => {
    if (activeTab !== '전체' && e.category !== activeTab) return false
    if (query && !e.title.includes(query) && !e.desc.includes(query)) return false
    return true
  })

  const resumeUsed = entries.filter(e => e.resumeUsed).length
  const total = entries.length

  const toggleBookmark = (id: number) =>
    setEntries(prev => {
      const next = prev.map(e => e.id === id ? { ...e, bookmarked: !e.bookmarked } : e)
      saveJournalEntries(next)
      return next
    })

  const toggleExpanded = (id: number) =>
    setExpandedId(prev => prev === id ? null : id)

  return (
    <div className="gj-wrapper">

      {/* ── Left Sidebar ── */}
      <GrowthSidebar />

      {/* ── Main Content ── */}
      <div className="gj-content">

        {/* Header */}
        <div className="gj-page-header">
          <div>
            <h1 className="gj-page-title">
              <i className="fa-solid fa-book-open" /> 4. 성장경험일지
            </h1>
            <p className="gj-page-desc">
              아르바이트, 팀프로젝트, 동아리 활동 등 일상 속에서 경험한 다양한 일을 기록해보세요.<br />
              기록한 내용은 자기소개서 작성 시 유용하게 활용할 수 있어요.
            </p>
          </div>
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
              <i className="fa-solid fa-bag-shopping" style={{ color: '#F59E0B' }} />
              아르바이트
            </span>
            <span className="gj-stat-val">{entries.filter(e => e.category === '아르바이트').length} <span className="gj-stat-unit">건</span></span>
          </div>
          <div className="gj-stat">
            <span className="gj-stat-label">
              <i className="fa-solid fa-people-group" style={{ color: 'var(--color-primary)' }} />
              팀프로젝트
            </span>
            <span className="gj-stat-val">{entries.filter(e => e.category === '팀프로젝트').length} <span className="gj-stat-unit">건</span></span>
          </div>
          <div className="gj-stat">
            <span className="gj-stat-label">
              <i className="fa-solid fa-star" style={{ color: '#F59E0B' }} />
              기타 활동
            </span>
            <span className="gj-stat-val">{entries.filter(e => e.category === '기타 활동').length} <span className="gj-stat-unit">건</span></span>
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

            {/* Filter Bar */}
            <div className="gj-filter-bar">
              <div className="gj-tabs">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    className={`gj-tab${activeTab === tab ? ' active' : ''}`}
                    onClick={() => { setActiveTab(tab); setPage(1) }}
                  >
                    {tab}
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
              {filtered.map(entry => {
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
                        {entry.category}
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
            <div className="gj-pager">
              <button className="gj-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="fa-solid fa-chevron-left" />
              </button>
              {[1, 2].map(n => (
                <button key={n} className={`gj-page-btn${page === n ? ' on' : ''}`} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button className="gj-page-btn" onClick={() => setPage(p => Math.min(p + 1, 2))}>
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
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
                기록한 경험 중 {Math.round(resumeUsed / total * 100)}%를<br />
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
