import { useMemo, useState } from 'react'
import { loadJournalEntries, type Entry } from '../growth/GrowthJournal'
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
type DocStatus = '작성중' | '완료' | '임시저장'

interface SavedDoc {
  id: number
  status: DocStatus
  title: string
  company: string
  dept: string
  preview: string
  date: string
  chars: number
  starred: boolean
}

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

const savedDocs: SavedDoc[] = [
  {
    id: 1,
    status: '작성중',
    title: '삼성전자 SW직군 자기소개서',
    company: '삼성전자',
    dept: 'IT/SW · 백엔드 개발',
    preview: '컴퓨터공학을 전공하며 소프트웨어 개발에 대한 열정을 쌓았습니다. 다양한 프로젝트 경험을 통해...',
    date: '2026-03-21',
    chars: 513,
    starred: true,
  },
  {
    id: 2,
    status: '완료',
    title: '카카오 기술직군 자기소개서',
    company: '카카오',
    dept: 'IT 플랫폼 · 서버 개발',
    preview: '카카오의 기술로 더 나은 일상을 만들고 싶다는 목표를 가지고 지원했습니다. 대규모 트래픽...',
    date: '2026-03-18',
    chars: 621,
    starred: false,
  },
  {
    id: 3,
    status: '임시저장',
    title: '네이버 개발 직무 자기소개서',
    company: '네이버',
    dept: '서비스 개발 · 프론트엔드',
    preview: '사용자 경험을 향상시키는 개발자가 되고자 꾸준히 노력해왔습니다. 다양한 사이드 프로젝트를...',
    date: '2026-03-15',
    chars: 438,
    starred: false,
  },
]

const statusClass: Record<DocStatus, string> = {
  작성중: 'writing',
  완료: 'done',
  임시저장: 'draft',
}

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

export default function AiResume() {
  const [activeCategory, setActiveCategory] = useState<ResumeCategory>('지원동기')
  const [filterTab, setFilterTab] = useState('전체')
  const [text, setText] = useState('')
  const [showHelper, setShowHelper] = useState(true)
  const [attachedIds, setAttachedIds] = useState<number[]>([])
  const journalEntries = useMemo(() => loadJournalEntries(), [])

  const charLimit = 1000
  const attachedEntries = journalEntries.filter(entry => attachedIds.includes(entry.id))

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
          <label className="rs-category-select">
            <span>자소서 항목 카테고리</span>
            <select value={activeCategory} onChange={event => setActiveCategory(event.target.value as ResumeCategory)}>
              {resumeCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <div className="rs-editor-head">
            <div>
              <h2>{activeCategory}</h2>
              <p>지원한 기업과 직무에 대한 관심, 본인의 경험과 연결되는 지점을 작성해보세요.</p>
            </div>
            <span>{text.length} / {charLimit.toLocaleString()}자</span>
          </div>

          <textarea
            value={text}
            onChange={event => setText(event.target.value.slice(0, charLimit))}
            placeholder="자유롭게 작성하거나 성장일지 경험을 첨부해 AI 초안을 받아보세요."
          />

          <div className="rs-editor-actions">
            <button className="rs-primary-btn"><i className="fa-solid fa-wand-magic-sparkles" /> AI 초안 받기</button>
            <button className="rs-outline-btn">임시저장</button>
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
          {['전체', '임시저장', '완료', '즐겨찾기'].map(tab => (
            <button key={tab} className={filterTab === tab ? 'active' : ''} onClick={() => setFilterTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div className="rs-doc-list">
          {savedDocs.map(doc => (
            <article key={doc.id} className="rs-doc-card">
              <div className="rs-doc-top">
                <span className={`rs-status ${statusClass[doc.status]}`}>{doc.status}</span>
                <i className={`fa-${doc.starred ? 'solid' : 'regular'} fa-star`} />
              </div>
              <h3>{doc.title}</h3>
              <p className="rs-doc-meta"><i className="fa-solid fa-building" /> {doc.company} · {doc.dept}</p>
              <p className="rs-doc-preview">{doc.preview}</p>
              <div className="rs-doc-bottom">
                <span>{doc.date}</span>
                <span>{doc.chars.toLocaleString()}자</span>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  )
}
