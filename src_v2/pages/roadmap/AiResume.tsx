import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import { loadJournalEntries, type Entry } from '../../data/growthJournal'
import { getActiveStudentId } from '../../data/students'
import {
  deleteUserResume, getAllResumes, resumeCategoryOptions, upsertUserResume, type SavedResume,
} from '../jobs/resumeMock'
import { useMetadata } from '../../../shared/useMetadata'
import './AiResume.css'
import { useGrowth } from '../../../shared/useRoadmapStore'
import GrowthLoadNotice from '../../../shared/GrowthLoadNotice'
import { usePageHead } from '../../components/PageCrumb'
import ResumeApplicationFields, { type ResumeApplication } from './ResumeApplicationFields'

const emptyApplication: ResumeApplication = {
  occupation: '', industry: '', companyType: '', position: '', company: '', experience: '', keywords: [],
}

// 자소서 분야 선택지는 여기 배열이 아니라 DB(dc.code_item JOB_RESUME_CATEGORY)가 정본이다.
// 관리자가 항목을 더하면 배포 없이 나타난다(DB.md §8-5 · CLAUDE.md 규칙 4).

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

type DraftState = 'idle' | 'loading' | 'done'

export default function AiResume() {
  usePageHead('AI 자소서 생성', 'AI가 맞춤형 피드백과 예시를 제공해 효과적인 자기소개서 작성을 도와드립니다.')
  const navigate = useNavigate()
  useMetadata()
  const categories = resumeCategoryOptions()
  const [activeCategory, setActiveCategory] = useState<string>('MOTIVE')
  const [filterTab, setFilterTab] = useState('전체')
  const [title, setTitle] = useState('')
  const [application, setApplication] = useState(emptyApplication)
  const [text, setText] = useState('')
  const [showHelper, setShowHelper] = useState(true)
  // 일지 ID 는 서버가 발급한 문자열이다 — 학생마다 1,2,3… 이던 숫자는 학생 간에 겹쳤다.
  const [attachedIds, setAttachedIds] = useState<string[]>([])
  const [draftState, setDraftState] = useState<DraftState>('idle')
  // 자소서 정본은 서버다 — 저장·삭제 뒤 스토어를 다시 읽어 목록을 만든다.
  const [, bumpList] = useState(0)
  const savedList = getAllResumes()
  const [saveError, setSaveError] = useState('')
  const [openResume, setOpenResume] = useState<SavedResume | null>(null)
  const studentId = getActiveStudentId()
  useGrowth(studentId)
  const journalEntries = loadJournalEntries(studentId)
  // 세션 내에서 자소서 id 유지 → 재생성 시 컨설팅 목록의 같은 항목을 덮어씀
  const resumeIdRef = useRef<string | null>(null)

  const charLimit = 1000

  const categoryLabelOf = (code: string) => categories.find(c => c.code === code)?.label ?? code

  // id·작성일은 서버가 부여한다. 같은 문서를 다시 저장하면 회차가 아니라 수정이다.
  const saveResume = (content: string) => {
    setSaveError('')
    void upsertUserResume({
      id: resumeIdRef.current ?? undefined,
      title: title.trim() || `${categoryLabelOf(activeCategory)} 자소서 초안`,
      company: application.company.trim(),
      jobType: application.occupation,
      position: application.position.trim(),
      categoryCode: activeCategory,
      content,
    }).then(saved => {
      resumeIdRef.current = saved.id
      bumpList(x => x + 1)
    }).catch((cause: unknown) => {
      setSaveError(cause instanceof Error ? cause.message : '저장하지 못했습니다.')
    })
  }

  const handleEditResume = (resume: SavedResume) => {
    // editor로 자소서 로드 (수정 후 다시 저장 시 같은 id로 upsert)
    resumeIdRef.current = resume.id
    setTitle(resume.title)
    setText(resume.content)
    setApplication({ ...emptyApplication, company: resume.company, occupation: resume.jobType, position: resume.position })
    if (resume.categoryCode) setActiveCategory(resume.categoryCode)
    setDraftState('done')
    setOpenResume(null)
    // editor 카드로 스크롤
    document.querySelector('.rs-editor-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleDeleteResume = (id: string) => {
    if (!window.confirm('이 자소서를 삭제하시겠습니까?')) return
    void deleteUserResume(id).then(() => {
      if (resumeIdRef.current === id) resumeIdRef.current = null
      bumpList(x => x + 1)
      setOpenResume(null)
    }).catch((cause: unknown) => {
      setSaveError(cause instanceof Error ? cause.message : '삭제하지 못했습니다.')
    })
  }

  const handleGoConsulting = () => {
    saveResume(text)  // 사용자가 수정한 최종본으로 갱신
    navigate('/jobs/home/consulting')
  }
  const attachedEntries = journalEntries.filter(entry => attachedIds.includes(entry.id))

  // 우측 사이드바에 노출할 자소서 목록 — 사용자 저장 + 기본 mock. filterTab은 카테고리별 필터.
  const filteredResumes = savedList.filter(r => filterTab === '전체' || r.categoryLabel === filterTab)
  // 탭은 실제로 가진 분야에서 만든다 — 고정 3종을 박아 두면 다른 분야가 숨는다.
  const filterTabs = ['전체', ...Array.from(new Set(savedList.map(r => r.categoryLabel).filter(Boolean)))]

  const attachJournal = (entry: Entry) => {
    if (attachedIds.includes(entry.id)) return
    const snippet = makeJournalSnippet(entry)
    setAttachedIds(prev => [...prev, entry.id])
    setText(prev => {
      const next = `${prev}${prev.trim() ? '\n\n' : ''}${snippet}`
      return next.slice(0, charLimit)
    })
  }

  const detachJournal = (entryId: string) => {
    setAttachedIds(prev => prev.filter(id => id !== entryId))
  }

  return (
    <div className="rs-wrap">
      <main className="rs-main">
        <header className="rs-header">
          <div className="rs-header-actions">
            <button><i className="fa-regular fa-circle-question" /> 작성 가이드</button>
            <button className="tip"><i className="fa-solid fa-lightbulb" /> AI 활용 팁</button>
          </div>
        </header>

        <section className="rs-editor-card">
          <div className="rs-title-row">
            <label className="rs-category-select">
              <span>자소서 항목 카테고리</span>
              <select value={activeCategory} onChange={event => setActiveCategory(event.target.value)}>
                {categories.map(category => (
                  <option key={category.code} value={category.code}>{category.label}</option>
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

          <ResumeApplicationFields value={application} onChange={setApplication} />

          <div className="rs-editor-head">
            <div>
              <h2>{categoryLabelOf(activeCategory)}</h2>
              <p>지원한 기업과 직무에 대한 관심, 본인의 경험과 연결되는 지점을 작성해보세요.</p>
            </div>
            <span>{text.length} / {charLimit.toLocaleString()}자</span>
          </div>

          <div className="rs-editor-body">
            <textarea
              value={text}
              onChange={event => setText(event.target.value.slice(0, charLimit))}
              aria-label="자기소개서 내용"
              placeholder="자유롭게 작성하거나 성장일지 경험을 첨부해 자기소개서를 준비해 보세요."
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
              disabled
              aria-describedby="rs-generation-notice"
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              AI 초안 받기 · 연동 준비 중
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
          <p id="rs-generation-notice" className="rs-application-hint">AI 생성은 Deepresume 연동 후 이용할 수 있습니다. 직접 작성한 자소서는 저장할 수 있습니다.</p>
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
            <GrowthLoadNotice studentId={studentId} />
            {journalEntries.map(entry => (
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

        {saveError && <p className="rs-doc-empty" role="alert">{saveError}</p>}

        <div className="rs-doc-tabs">
          {filterTabs.map(tab => (
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
                title="삭제"
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
