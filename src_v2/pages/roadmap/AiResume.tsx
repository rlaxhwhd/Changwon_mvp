import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import { loadJournalEntries, type Entry } from '../growth/GrowthJournal'
import { deleteUserResume, getAllResumes, upsertUserResume, type SavedResume } from '../jobs/resumeMock'
import './AiResume.css'

type ResumeCategory =
  | '지원동기'
  | '성장과정'
  | '성격의 장단점'
  | '학업 및 전문성'
  | '경험 및 경력'
  | '입사 후 포부'
  | '직무역량'
  | '프로젝트 경험'
  | '팀워크 경험'
  | '리더십 경험'
  | '문제해결 경험'
  | '갈등관리 경험'
  | '도전 경험'
  | '실패 극복 경험'
  | '창의적 사고'
  | '고객중심 경험'
  | '데이터 활용 경험'
  | '전공 선택 이유'
  | '회사 선택 기준'
  | '사회공헌 및 가치관'
// 예전 mock(savedDocs) 관련 SavedDoc/DocStatus/statusClass는 저장된 자소서 sidebar가
// getAllResumes() 기반 SavedResume로 교체되며 함께 제거됨.

const resumeCategories: ResumeCategory[] = [
  '지원동기',
  '성장과정',
  '성격의 장단점',
  '학업 및 전문성',
  '경험 및 경력',
  '입사 후 포부',
  '직무역량',
  '프로젝트 경험',
  '팀워크 경험',
  '리더십 경험',
  '문제해결 경험',
  '갈등관리 경험',
  '도전 경험',
  '실패 극복 경험',
  '창의적 사고',
  '고객중심 경험',
  '데이터 활용 경험',
  '전공 선택 이유',
  '회사 선택 기준',
  '사회공헌 및 가치관',
]

function makeJournalSnippet(entry: Entry) {
  return [
    `[성장일지 첨부: ${entry.title}]`,
    `상황: ${entry.situation}`,
    `나의 역할: ${entry.role}`,
    `행동: ${entry.action}`,
    `결과: ${entry.result}`,
    `배운 점: ${entry.learning}`,
    `자소서 활용 메모: ${entry.resumeMemo}`,
  ].join('\n')
}

// 사용자가 제공한 시연용 자소서 초안 — 실제 AI 응답으로 가정
const AI_DRAFT_SAMPLE = `카페 매장에서 아르바이트를 하며 고객 응대와 매장 운영 흐름을 개선한 경험이 있습니다. 주말 피크 시간대에는 주문이 한꺼번에 몰리면서 대기 시간이 길어졌고, 이로 인해 고객 불만이 반복적으로 발생했습니다. 저는 단순히 바쁜 상황으로만 넘기기보다, 어떤 지점에서 고객이 불편을 느끼는지 직접 확인해보고자 했습니다.

먼저 혼잡 시간대의 주문 동선과 고객 문의 내용을 관찰하고 기록했습니다. 그 결과, 고객들이 메뉴 선택 과정에서 비슷한 질문을 반복하고, 키오스크 이용 방법을 몰라 주문이 지연되는 경우가 많다는 점을 파악했습니다. 이후 자주 묻는 메뉴 정보를 메뉴판 상단에 배치하고, 키오스크 주변에 간단한 안내 문구를 추가하는 방안을 정리해 점장님께 제안했습니다.

개선 후에는 고객들이 메뉴와 주문 방법을 더 빠르게 이해할 수 있었고, 주말 평균 대기 시간도 줄어들었습니다. 또한 신규 아르바이트생들도 고객에게 주문 방법을 안내하는 데 익숙해지는 시간이 짧아졌습니다.

이 경험을 통해 고객 응대는 친절한 말투뿐 아니라, 고객이 불편을 느끼기 전에 미리 안내하고 흐름을 정리하는 것에서 시작된다는 점을 배웠습니다. 앞으로도 현장의 문제를 세심하게 관찰하고, 작은 개선이라도 실질적인 변화를 만들 수 있도록 적극적으로 행동하겠습니다.`

type DraftState = 'idle' | 'loading' | 'done'

export default function AiResume() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<ResumeCategory>('지원동기')
  const [filterTab, setFilterTab] = useState('전체')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [showHelper, setShowHelper] = useState(true)
  const [attachedIds, setAttachedIds] = useState<number[]>([])
  const [draftState, setDraftState] = useState<DraftState>('idle')
  const [savedList, setSavedList] = useState<SavedResume[]>(() => getAllResumes())
  const [openResume, setOpenResume] = useState<SavedResume | null>(null)
  const journalEntries = useMemo(() => loadJournalEntries(), [])
  // 세션 내에서 자소서 id 유지 → 재생성 시 컨설팅 목록의 같은 항목을 덮어씀
  const resumeIdRef = useRef<string>(`user-${Date.now()}`)

  const charLimit = Math.max(1000, AI_DRAFT_SAMPLE.length + 200)

  const saveResume = (content: string) => {
    const finalTitle = title.trim() || `${activeCategory} 자소서 초안`
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const resume: SavedResume = {
      id: resumeIdRef.current,
      title: finalTitle,
      company: '지원 예정',
      jobType: 'IT/SW',
      position: '미정',
      categoryLabel: activeCategory,
      content,
      createdAt: dateStr,
    }
    upsertUserResume(resume)
    setSavedList(prev => {
      const idx = prev.findIndex(r => r.id === resume.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = resume
        return next
      }
      return [resume, ...prev]
    })
  }

  const isMockResume = (id: string) => /^r\d+$/.test(id)  // r1, r2, r3 → 기본 mock

  const handleEditResume = (resume: SavedResume) => {
    // editor로 자소서 로드 (수정 후 다시 저장 시 같은 id로 upsert)
    resumeIdRef.current = resume.id
    setTitle(resume.title)
    setText(resume.content)
    // categoryLabel이 ResumeCategory와 정확히 일치하면 세팅, 아니면 그대로 유지
    if (resumeCategories.includes(resume.categoryLabel as ResumeCategory)) {
      setActiveCategory(resume.categoryLabel as ResumeCategory)
    }
    setDraftState('done')
    setOpenResume(null)
    // editor 카드로 스크롤
    document.querySelector('.rs-editor-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleDeleteResume = (id: string) => {
    if (!window.confirm('이 자소서를 삭제하시겠습니까?')) return
    deleteUserResume(id)
    setSavedList(prev => prev.filter(r => r.id !== id))
    setOpenResume(null)
  }

  const handleGenerateDraft = () => {
    if (draftState === 'loading') return
    setDraftState('loading')
    window.setTimeout(() => {
      setText(AI_DRAFT_SAMPLE)
      setDraftState('done')
      // AI 초안 완성 시 자동 저장 → Consulting 페이지 목록에 즉시 노출
      saveResume(AI_DRAFT_SAMPLE)
    }, 2600)
  }

  const handleGoConsulting = () => {
    saveResume(text)  // 사용자가 수정한 최종본으로 갱신
    navigate('/jobs/home/consulting')
  }
  const attachedEntries = journalEntries.filter(entry => attachedIds.includes(entry.id))

  // 우측 사이드바에 노출할 자소서 목록 — 사용자 저장 + 기본 mock. filterTab은 카테고리별 필터.
  const filteredResumes = savedList.filter(r => {
    if (filterTab === '전체') return true
    return r.categoryLabel === filterTab
  })

  const attachJournal = (entry: Entry) => {
    if (attachedIds.includes(entry.id)) return
    const snippet = makeJournalSnippet(entry)
    setAttachedIds(prev => [...prev, entry.id])
    setText(prev => {
      const next = `${prev}${prev.trim() ? '\n\n' : ''}${snippet}`
      return next.slice(0, charLimit)
    })
  }

  const detachJournal = (entryId: number) => {
    setAttachedIds(prev => prev.filter(id => id !== entryId))
  }

  return (
    <div className="rs-wrap">
      <main className="rs-main">
        <header className="rs-header">
          <div>
            <h1><i className="fa-solid fa-wand-magic-sparkles" /> AI 자소서 작성</h1>
            <p>AI가 맞춤형 피드백과 예시를 제공하여 효과적인 자기소개서 작성을 도와드립니다.</p>
          </div>
          <div className="rs-header-actions">
            <button><i className="fa-regular fa-circle-question" /> 작성 가이드</button>
            <button className="tip"><i className="fa-solid fa-lightbulb" /> AI 활용 팁</button>
          </div>
        </header>

        <section className="rs-editor-card">
          <div className="rs-title-row">
            <label className="rs-category-select">
              <span>자소서 항목 카테고리</span>
              <select value={activeCategory} onChange={event => setActiveCategory(event.target.value as ResumeCategory)}>
                {resumeCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="rs-title-input">
              <span>자소서 제목</span>
              <input
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="예: 삼성전자 SW직군 지원동기"
                maxLength={60}
              />
            </label>
          </div>

          <div className="rs-editor-head">
            <div>
              <h2>{activeCategory}</h2>
              <p>지원한 기업과 직무에 대한 관심, 본인의 경험과 연결되는 지점을 작성해보세요.</p>
            </div>
            <span>{text.length} / {charLimit.toLocaleString()}자</span>
          </div>

          <div className="rs-editor-body">
            <textarea
              value={text}
              onChange={event => setText(event.target.value.slice(0, charLimit))}
              placeholder="자유롭게 작성하거나 성장일지 경험을 첨부해 AI 초안을 받아보세요."
            />

            {draftState === 'loading' && (
              <div className="rs-loading-overlay" role="status" aria-live="polite">
                <div className="rs-loading-inner">
                  <div className="rs-loading-spinner">
                    <i className="fa-solid fa-wand-magic-sparkles" />
                    <span className="rs-loading-ring" />
                  </div>
                  <p className="rs-loading-title">AI가 자소서 초안을 작성하고 있어요</p>
                  <p className="rs-loading-sub">
                    첨부하신 성장일지 · <strong>{activeCategory}</strong> 카테고리를 기반으로 문단 구조를 정리 중입니다…
                  </p>
                  <div className="rs-loading-bar">
                    <div className="rs-loading-fill" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rs-editor-actions">
            <button
              type="button"
              className="rs-primary-btn"
              onClick={handleGenerateDraft}
              disabled={draftState === 'loading'}
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              {draftState === 'loading' ? '생성 중…' : draftState === 'done' ? 'AI 초안 다시 받기' : 'AI 초안 받기'}
            </button>
            {draftState === 'done' && (
              <button type="button" className="rs-consult-btn" onClick={handleGoConsulting}>
                <i className="fa-solid fa-magnifying-glass-chart" /> 이 자소서로 AI 컨설팅
              </button>
            )}
            <button
              type="button"
              className="rs-save-btn"
              onClick={() => saveResume(text)}
              disabled={!text.trim()}
            >
              <i className="fa-regular fa-floppy-disk" /> 저장
            </button>
          </div>
        </section>

        <section className="rs-journal-card">
          <div className="rs-section-head">
            <div>
              <h2><i className="fa-solid fa-book-open" /> 성장일지 첨부</h2>
              <p>내 성장일지에 기록한 경험을 자소서 소재로 첨부할 수 있습니다.</p>
            </div>
            <span>{attachedEntries.length}개 첨부됨</span>
          </div>

          {attachedEntries.length > 0 && (
            <div className="rs-attached-list">
              {attachedEntries.map(entry => (
                <span key={entry.id}>
                  {entry.title}
                  <button onClick={() => detachJournal(entry.id)} aria-label={`${entry.title} 첨부 해제`}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="rs-journal-list">
            {journalEntries.slice(0, 5).map(entry => (
              <article key={entry.id} className="rs-journal-item">
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.resumeMemo || entry.desc}</p>
                  <small>{entry.date} · {entry.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}</small>
                </div>
                <button
                  className={attachedIds.includes(entry.id) ? 'attached' : ''}
                  onClick={() => attachJournal(entry)}
                  disabled={attachedIds.includes(entry.id)}
                >
                  {attachedIds.includes(entry.id) ? '첨부됨' : '첨부'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rs-helper-card">
          <button className="rs-helper-head" onClick={() => setShowHelper(prev => !prev)}>
            <span><i className="fa-solid fa-wand-magic-sparkles" /> AI 작성 도우미</span>
            <i className={`fa-solid fa-chevron-${showHelper ? 'up' : 'down'}`} />
          </button>
          {showHelper && (
            <div className="rs-helper-grid">
              {[
                ['fa-clipboard-list', '예시 문장 보기', '직무/기업에 맞는 문장 예시를 확인하세요.'],
                ['fa-pen-to-square', '키워드 기반 작성', '선택한 키워드로 초안을 구성합니다.'],
                ['fa-star', '문장 다듬기', '작성한 내용을 더 자연스럽게 다듬습니다.'],
              ].map(([icon, title, desc]) => (
                <button key={title}>
                  <i className={`fa-solid ${icon}`} />
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
          )}
        </section>

      </main>

      <aside className="rs-right">
        <div className="rs-doc-head">
          <h2>저장된 자소서</h2>
          <button><i className="fa-solid fa-plus" /> 새 문서</button>
        </div>

        <div className="rs-doc-tabs">
          {['전체', '지원동기', '강점', '직무관련경험'].map(tab => (
            <button key={tab} className={filterTab === tab ? 'active' : ''} onClick={() => setFilterTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div className="rs-doc-list">
          {filteredResumes.length === 0 ? (
            <div
              className="rs-doc-empty"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '48px 16px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              <i className="fa-regular fa-folder-open" style={{ fontSize: 36 }} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>해당하는 자소서가 없습니다.</p>
            </div>
          ) : (
            filteredResumes.map(resume => (
              <button
                key={resume.id}
                type="button"
                className="rs-doc-card rs-doc-card--button"
                onClick={() => setOpenResume(resume)}
              >
                <div className="rs-doc-top">
                  <span className="rs-status writing">{resume.categoryLabel}</span>
                  <span className="rs-doc-open-hint"><i className="fa-solid fa-arrow-up-right-from-square" /></span>
                </div>
                <h3>{resume.title}</h3>
                <p className="rs-doc-meta"><i className="fa-solid fa-building" /> {resume.company} · {resume.jobType} · {resume.position}</p>
                <p className="rs-doc-preview">{resume.content.slice(0, 80)}…</p>
                <div className="rs-doc-bottom">
                  <span>{resume.createdAt}</span>
                  <span>{resume.content.length.toLocaleString()}자</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── 저장된 자소서 상세 모달 ─────────────────────────────── */}
      <Modal
        open={openResume !== null}
        onClose={() => setOpenResume(null)}
        title={openResume?.title}
        size="lg"
      >
        {openResume && (
          <div className="rs-detail">
            <div className="rs-detail-meta">
              <span className="rs-detail-chip">{openResume.categoryLabel}</span>
              <span><i className="fa-solid fa-building" /> {openResume.company}</span>
              <span><i className="fa-solid fa-briefcase" /> {openResume.jobType} · {openResume.position}</span>
              <span><i className="fa-solid fa-calendar" /> {openResume.createdAt}</span>
              <span><i className="fa-solid fa-align-left" /> {openResume.content.length.toLocaleString()}자</span>
            </div>
            <div className="rs-detail-body">
              {openResume.content.split('\n').map((line, i) => (
                <p key={i}>{line || ' '}</p>
              ))}
            </div>
            <div className="rs-detail-actions">
              <button
                type="button"
                className="rs-detail-danger"
                onClick={() => handleDeleteResume(openResume.id)}
                disabled={isMockResume(openResume.id)}
                title={isMockResume(openResume.id) ? '기본 예시 자소서는 삭제할 수 없어요' : '삭제'}
              >
                <i className="fa-solid fa-trash-can" /> 삭제
              </button>
              <div className="rs-detail-right">
                <button type="button" className="rs-outline-btn" onClick={() => setOpenResume(null)}>닫기</button>
                <button type="button" className="rs-primary-btn" onClick={() => handleEditResume(openResume)}>
                  <i className="fa-solid fa-pen-to-square" /> 수정
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
