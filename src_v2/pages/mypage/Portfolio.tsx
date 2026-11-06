import { studentDisplayName } from '../../../shared/studentDisplayName'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Modal from '../../components/Modal'
import ResumeSheet from '../../components/ResumeSheet'
import { getActiveStudentId } from '../../data/students'
// 정본은 서버다 — 교직원 학생 상세도 **같은 projection** 을 읽는다.
// 예전의 INITIAL_* 는 전 학생 공통 상수였고 buildProfile 은 연락처를 합성했다. 둘 다 걷었다.
import { LEVEL_LABELS, toPortfolioView } from '../../data/portfolio'
import type { ProfileData, Skill, Cert, Language, Award, Project, Resume } from '../../data/portfolio'
import { createGrowthEntry, deleteGrowthEntry, growthEntries, loadPortfolio,
         saveGrowthProfile } from '../../../shared/growthStore'
import type { PortfolioDTO } from '../../../shared/growthStore'
import { useGrowth } from '../../../shared/useRoadmapStore'
import { useEffect } from 'react'
// 이 화면은 내 성장 화면과 같은 표지·카드·폼을 쓴다. 값을 베끼지 않고 그 스타일을 불러온다.
import '../growth/GrowthHome.css'
import './Portfolio.css'
import { usePageHead } from '../../components/PageCrumb'
import PortfolioVersions from './portfolio/PortfolioVersions'

type TabId = 'profile' | 'skills' | 'experience' | 'documents' | 'resume' | 'versions'

/** 아직 읽기 전이거나 아무것도 쓰지 않은 상태. 빈 값은 빈 값이다 — 합성하지 않는다. */
const EMPTY_PROFILE: ProfileData = {
  name: '', studentId: '', school: '국립창원대학교', dept: '', grade: '',
  email: '', phone: '', gpa: '', major: '', intro: '',
}

interface TabDef {
  id: TabId
  label: string
}

/** 스킬 분류 — DB 코드다(GROWTH_SKILL_CATEGORY). 한글은 표시용 라벨이다. */
const SKILL_CATEGORY_LABEL: Record<string, string> = {
  LANGUAGE: '언어', FRAMEWORK: '프레임워크', TOOL: '도구', DATABASE: 'DB', DESIGN: '디자인',
}

const TABS: TabDef[] = [
  { id: 'profile',    label: '기본 정보' },
  { id: 'skills',     label: '스킬·자격증' },
  { id: 'experience', label: '경험·수상' },
  { id: 'documents',  label: '자소서' },
  { id: 'resume',     label: '이력서' },
  { id: 'versions',   label: '포트폴리오' },
]


/* ── Page ───────────────────────────────────────────────────────── */
export default function Portfolio() {
  usePageHead('포트폴리오', '스킬·자격증·수상·자소서·이력서를 한 곳에서 관리하고 PDF로 내보낼 수 있어요.')
  // 지원 모달의 「포트폴리오 만들기·편집」 링크가 이 탭으로 바로 들어온다.
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<TabId>(searchParams.get('tab') === 'versions' ? 'versions' : 'profile')
  // 한 번 연 포트폴리오 탭은 숨기기만 한다 — 탭을 옮겨도 쓰던 내용이 남아야 한다.
  const [versionsOpened, setVersionsOpened] = useState(tab === 'versions')
  useEffect(() => { if (tab === 'versions') setVersionsOpened(true) }, [tab])
  const studentId = getActiveStudentId()
  // 성장 자료를 고치면 스토어가 서버에서 다시 읽는다 — 그때 포트폴리오도 다시 읽는다.
  const revision = useGrowth(studentId)
  const [dto, setDto] = useState<PortfolioDTO | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    loadPortfolio(studentId)
      .then(next => { if (alive) { setDto(next); setError('') } })
      .catch(() => { if (alive) setError('포트폴리오를 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [studentId, revision])
  const view = useMemo(() => dto && toPortfolioView(dto), [dto])
  const profile = view?.profile ?? EMPTY_PROFILE
  const skills = view?.skills ?? []
  const certs = view?.certs ?? []
  const langs = view?.languages ?? []
  const awards = view?.awards ?? []
  const projects = view?.projects ?? []
  const resumes = view?.resumes ?? []
  const [addSkillOpen, setAddSkillOpen] = useState(false)
  const [skillForm, setSkillForm] = useState<{ name: string; level: Skill['level']; category: string }>({
    name: '',
    level: 3,
    category: 'LANGUAGE',
  })

  const setProfile = (next: ProfileData) => {
    // 학사 유래 값(이름·학과·학점)은 여기서 고치지 않는다(CLAUDE.md 1조).
    saveGrowthProfile(studentId, { intro: next.intro, email: next.email, phone: next.phone })
      .catch(() => setError('프로필을 저장하지 못했습니다.'))
  }
  const [viewResume, setViewResume] = useState<Resume | null>(null)
  const [exportToast, setExportToast] = useState(false)

  const completeness = useMemo(() => {
    let score = 0
    if (profile.intro.length > 30) score += 15
    score += Math.min(skills.length, 8) * 3
    score += Math.min(certs.length, 4) * 4
    score += Math.min(langs.length, 2) * 5
    score += Math.min(awards.length, 4) * 4
    score += Math.min(projects.length, 4) * 5
    score += Math.min(resumes.length, 4) * 4
    return Math.min(score, 100)
  }, [profile.intro.length, skills.length, certs.length, langs.length, awards.length, projects.length, resumes.length])

  const exportPdf = () => {
    setExportToast(true)
    window.setTimeout(() => setExportToast(false), 2200)
  }

  const addSkill = () => {
    const name = skillForm.name.trim()
    if (!name) return
    // ID 는 서버가 발급한다. Date.now() 로 만든 ID 는 다른 브라우저에서 충돌한다.
    createGrowthEntry(studentId, { kind: 'SKILL', title: name, categoryCode: skillForm.category,
                                   content: { level: skillForm.level } })
      .catch(() => setError('스킬을 저장하지 못했습니다.'))
    setSkillForm({ name: '', level: 3, category: 'LANGUAGE' })
    setAddSkillOpen(false)
  }

  const removeSkill = (id: string) => {
    const row = growthEntries(studentId, 'SKILL').find(entry => entry.id === id)
    if (row) deleteGrowthEntry(studentId, row).catch(() => setError('스킬을 삭제하지 못했습니다.'))
  }

  // 자기소개서는 채용 도메인(dc.job_resume)이 정본이다 — 여기서 지우지 않는다.
  const removeResume = (_id: string) => setError('자기소개서는 취업지원 > 자기소개서에서 관리합니다.')

  const coverName = profile.name ? `${studentDisplayName(profile.name, profile.studentId)}의 포트폴리오` : '나의 포트폴리오'
  const coverLine = [profile.dept, profile.grade, profile.studentId].filter(Boolean).join(' · ')
  const coverTags: [string, number][] = [
    ['스킬', skills.length], ['자격증', certs.length], ['어학', langs.length],
    ['수상', awards.length], ['프로젝트', projects.length], ['자소서', resumes.length],
  ]

  return (
    <main className="gh-shell pf-shell">
      <section className="gh-cover" aria-labelledby="portfolio-title">
        <div className="gh-cover-profile">
          <div className="gh-avatar" aria-hidden="true">{profile.name.slice(-2)}</div>
          <div>
            <span className="gh-eyebrow">CAREER PORTFOLIO</span>
            <h2 id="portfolio-title">{coverName}</h2>
            <p>{coverLine}</p>
          </div>
        </div>
        <div className="gh-cover-copy">
          <strong>이력서 완성도 {completeness}%</strong>
          <div className="pf-progress" role="progressbar" aria-label="이력서 완성도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness}>
            <i style={{ width: `${completeness}%` }} />
          </div>
          <div className="gh-cover-tags">
            {coverTags.map(([label, count]) => <span key={label}>{label} {count}</span>)}
          </div>
        </div>
        <div className="gh-cover-actions">
          <button type="button" className="gh-primary-action" onClick={exportPdf}>
            <i className="fa-solid fa-file-pdf" /> 이력서 PDF
          </button>
        </div>
      </section>

      {error && <p className="gh-empty pf-error" role="alert">{error}</p>}

      <nav className="pf-tabs" aria-label="포트폴리오 섹션">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`pf-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="pf-body">
        {tab === 'profile' && <ProfileSection profile={profile} onChange={setProfile} />}
        {tab === 'skills' && (
          <SkillsSection
            skills={skills}
            certs={certs}
            langs={langs}
            onAddSkill={() => setAddSkillOpen(true)}
            onRemoveSkill={removeSkill}
          />
        )}
        {tab === 'experience' && <ExperienceSection awards={awards} projects={projects} />}
        {tab === 'documents' && (
          <DocumentsSection
            profile={profile}
            resumes={resumes}
            onView={r => setViewResume(r)}
            onRemove={removeResume}
          />
        )}
        {tab === 'resume' && (
          <ResumeSheet
            profile={profile}
            onProfileChange={setProfile}
            skills={skills}
            certs={certs}
            langs={langs}
            awards={awards}
            projects={projects}
            resumes={resumes}
            onJumpTab={setTab}
            onExportPdf={exportPdf}
          />
        )}
        {/* 탭을 열 때만 마운트한다 — 다른 탭의 API 호출을 늘리지 않는다. */}
        {versionsOpened && <div hidden={tab !== 'versions'}><PortfolioVersions studentId={studentId} initialId={searchParams.get('edit')} /></div>}
      </div>

      {/* Add Skill Modal */}
      <Modal open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="스킬 추가" size="sm">
        <form className="gh-editor-form" onSubmit={event => { event.preventDefault(); addSkill() }}>
          <label>
            <span>스킬 이름</span>
            <input
              type="text"
              value={skillForm.name}
              onChange={e => setSkillForm({ ...skillForm, name: e.target.value })}
              placeholder="예: Figma, Java, Spring Boot"
            />
          </label>
          <label>
            <span>분류</span>
            <select
              value={skillForm.category}
              onChange={e => setSkillForm({ ...skillForm, category: e.target.value })}
            >
              {Object.entries(SKILL_CATEGORY_LABEL).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>숙련도 — {LEVEL_LABELS[skillForm.level]}</span>
            <input
              type="range"
              className="pf-range"
              min={1}
              max={5}
              step={1}
              value={skillForm.level}
              onChange={e => setSkillForm({ ...skillForm, level: Number(e.target.value) as Skill['level'] })}
            />
            <div className="pf-level-marks">
              {LEVEL_LABELS.slice(1).map(l => <span key={l}>{l}</span>)}
            </div>
          </label>
          <div className="gh-form-actions">
            <button type="button" onClick={() => setAddSkillOpen(false)}>취소</button>
            <button type="submit">추가</button>
          </div>
        </form>
      </Modal>

      {/* View Resume Modal */}
      <Modal
        open={viewResume !== null}
        onClose={() => setViewResume(null)}
        title={viewResume?.title ?? ''}
        size="md"
      >
        {viewResume && (
          <div className="pf-view">
            <div className="pf-view-tags">
              <span className="pf-chip">{viewResume.category}</span>
              {viewResume.isAi && <span className="pf-chip pf-chip--sky">AI 작성</span>}
              <time>{viewResume.updatedAt}</time>
            </div>
            <p className="pf-view-info">{viewResume.company} · {viewResume.position}</p>
            <div className="pf-view-content">{viewResume.content}</div>
            <small>총 {viewResume.content.length}자</small>
          </div>
        )}
      </Modal>

      {exportToast && (
        <div className="pf-toast" role="status">
          <i className="fa-solid fa-circle-check" />
          이력서 PDF 내보내기가 시작되었어요. (브라우저 다운로드 폴더 확인)
        </div>
      )}
    </main>
  )
}

/* ── Sections ───────────────────────────────────────────────────── */

function ProfileSection({ profile, onChange }: { profile: ProfileData; onChange: (p: ProfileData) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileData>(profile)

  const startEdit = () => { setForm(profile); setEditing(true) }
  const cancel = () => setEditing(false)
  const save = () => { onChange(form); setEditing(false) }

  return (
    <section className="gh-portfolio-grid">
      <article className="gh-card pf-span-12">
        <header className="gh-card-head"><div><span className="gh-section-kicker">INTRODUCTION</span><h2>자기소개</h2></div></header>
        {profile.intro
          ? <p className="pf-text">{profile.intro}</p>
          : <p className="gh-empty">아직 자기소개가 없습니다. 연락처 카드의 「정보 수정」에서 작성할 수 있습니다.</p>}
      </article>

      <article className="gh-card pf-span-6 pf-tone-sky">
        <header className="gh-card-head"><div><span className="gh-section-kicker">ACADEMIC</span><h2>학사 정보</h2><p>학사 기록에서 가져온 정보입니다.</p></div></header>
        <dl className="gh-profile-list">
          <div><dt>학교</dt><dd>{profile.school}</dd></div>
          <div><dt>학과</dt><dd>{profile.dept}</dd></div>
          <div><dt>학년</dt><dd>{profile.grade}</dd></div>
          <div><dt>학번</dt><dd>{profile.studentId}</dd></div>
          <div><dt>GPA</dt><dd>{profile.gpa}</dd></div>
          <div><dt>주전공</dt><dd>{profile.major}</dd></div>
        </dl>
      </article>

      <article className="gh-card pf-span-6 pf-tone-mint">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">CONTACT</span><h2>연락처</h2><p>이력서에 표시되는 연락처입니다.</p></div>
          {!editing && <button type="button" className="gh-add-btn" onClick={startEdit}><i className="fa-solid fa-pen" /> 정보 수정</button>}
        </header>
        {editing ? (
          <form className="gh-editor-form" onSubmit={event => { event.preventDefault(); save() }}>
            <label>
              <span>이메일</span>
              <input type="text" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              <span>휴대폰</span>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              <span>자기소개</span>
              <textarea rows={4} value={form.intro} onChange={e => setForm({ ...form, intro: e.target.value })} />
            </label>
            <div className="gh-form-actions">
              <button type="button" onClick={cancel}>취소</button>
              <button type="submit">저장</button>
            </div>
          </form>
        ) : (
          <dl className="gh-profile-list">
            <div><dt>이메일</dt><dd>{profile.email || '-'}</dd></div>
            <div><dt>휴대폰</dt><dd>{profile.phone || '-'}</dd></div>
          </dl>
        )}
      </article>
    </section>
  )
}

interface SkillsSectionProps {
  skills: Skill[]
  certs: Cert[]
  langs: Language[]
  onAddSkill: () => void
  onRemoveSkill: (id: string) => void
}

function SkillsSection({ skills, certs, langs, onAddSkill, onRemoveSkill }: SkillsSectionProps) {
  const byCategory = useMemo(() => {
    const cats: Record<string, Skill[]> = {}
    for (const skill of skills) {
      const key = skill.category ?? 'ETC'
      if (!cats[key]) cats[key] = []
      cats[key].push(skill)
    }
    return cats
  }, [skills])

  return (
    <section className="gh-portfolio-grid">
      <article className="gh-card pf-span-12 pf-tone-mint">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">CAPABILITIES</span><h2>보유 스킬</h2><p>프로젝트와 학습 활동으로 쌓은 기술 역량입니다.</p></div>
          <button type="button" className="gh-add-btn" onClick={onAddSkill}><i className="fa-solid fa-plus" /> 스킬 추가</button>
        </header>
        {skills.length === 0 && <p className="gh-empty">등록된 스킬이 없습니다.</p>}
        {Object.keys(byCategory).map(cat => (
          <div key={cat} className="pf-skill-group">
            <h3>{SKILL_CATEGORY_LABEL[cat] ?? cat}</h3>
            <div className="gh-skill-grid">
              {byCategory[cat].map(s => (
                <div key={s.id} className="gh-skill">
                  <div><strong>{s.name}</strong><span>{LEVEL_LABELS[s.level]}</span></div>
                  <div className="gh-skill-controls">
                    <div className="gh-level" aria-label={`${s.name} 숙련도 ${s.level}/5`}>
                      {[1, 2, 3, 4, 5].map(lv => <i className={lv <= s.level ? 'filled' : ''} key={lv} />)}
                    </div>
                    <div className="gh-item-actions">
                      <button type="button" onClick={() => onRemoveSkill(s.id)} aria-label={`${s.name} 삭제`}>
                        <i className="fa-regular fa-trash-can" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </article>

      <article className="gh-card pf-span-6 pf-tone-teal">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">CERTIFICATES</span><h2>자격증</h2></div>
          <button type="button" className="gh-add-btn" aria-label="자격증 추가"><i className="fa-solid fa-plus" /></button>
        </header>
        <div className="gh-qualification-list">
          {certs.map(c => (
            <div key={c.id}>
              <span className="gh-record-icon"><i className="fa-solid fa-award" /></span>
              <div><strong>{c.name}</strong><small>{c.issuer}</small></div>
              <time>{c.acquiredAt}</time>
            </div>
          ))}
          {certs.length === 0 && <p className="gh-empty">등록된 자격증이 없습니다.</p>}
        </div>
      </article>

      <article className="gh-card pf-span-6 pf-tone-sky">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">LANGUAGES</span><h2>어학</h2></div>
          <button type="button" className="gh-add-btn" aria-label="어학 추가"><i className="fa-solid fa-plus" /></button>
        </header>
        <div className="gh-qualification-list">
          {langs.map(l => (
            <div key={l.id}>
              <span className="gh-record-icon"><i className="fa-solid fa-globe" /></span>
              <div><strong>{l.name} {l.score}</strong><small>{l.test}</small></div>
              <time>{l.acquiredAt}</time>
            </div>
          ))}
          {langs.length === 0 && <p className="gh-empty">등록된 어학 성적이 없습니다.</p>}
        </div>
      </article>
    </section>
  )
}

interface ExperienceSectionProps {
  awards: Award[]
  projects: Project[]
}

function ExperienceSection({ awards, projects }: ExperienceSectionProps) {
  return (
    <section className="gh-portfolio-grid">
      <article className="gh-card pf-span-12 pf-tone-amber">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">AWARDS</span><h2>공모전·수상</h2></div>
          <button type="button" className="gh-add-btn"><i className="fa-solid fa-plus" /> 수상 기록 추가</button>
        </header>
        <div className="gh-qualification-list">
          {awards.map(a => (
            <div key={a.id}>
              <span className="gh-record-icon"><i className="fa-solid fa-trophy" /></span>
              <div><strong>{a.title}</strong><small>{a.host}</small>{a.description && <p>{a.description}</p>}</div>
              <span className="pf-chip pf-chip--amber">{a.rank}</span>
              <time>{a.date}</time>
            </div>
          ))}
          {awards.length === 0 && <p className="gh-empty">등록된 수상 기록이 없습니다.</p>}
        </div>
      </article>

      <article className="gh-card pf-span-12">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">SELECTED WORK</span><h2>프로젝트</h2></div>
          <button type="button" className="gh-add-btn"><i className="fa-solid fa-plus" /> 프로젝트 추가</button>
        </header>
        <div className="gh-project-list">
          {projects.map((p, index) => (
            <section key={p.id} className="gh-project">
              <div className={`gh-project-visual tone-${index % 2 + 1}`}>
                <span>PROJECT {String(index + 1).padStart(2, '0')}</span>
                <h3>{p.title}</h3>
              </div>
              <div className="gh-project-body">
                <div className="gh-project-meta">
                  <span>{p.period}</span>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noopener noreferrer" aria-label={`${p.title} 링크`}>
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                    </a>
                  )}
                </div>
                <strong>{p.role}</strong>
                <p>{p.description}</p>
                <div className="gh-tag-list">{p.stack.map(s => <span key={s}>{s}</span>)}</div>
              </div>
            </section>
          ))}
          {projects.length === 0 && <p className="gh-empty">등록된 프로젝트가 없습니다.</p>}
        </div>
      </article>
    </section>
  )
}

interface DocumentsSectionProps {
  profile: ProfileData
  resumes: Resume[]
  onView: (r: Resume) => void
  onRemove: (id: string) => void
}

function DocumentsSection({ profile, resumes, onView, onRemove }: DocumentsSectionProps) {
  const aiCount = resumes.filter(r => r.isAi).length
  const manualCount = resumes.filter(r => !r.isAi).length

  return (
    <section className="gh-portfolio-grid">
      <article className="gh-card pf-span-12">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">COVER LETTERS</span><h2>자소서 보관함</h2><p>AI 작성 {aiCount}개 · 직접 작성 {manualCount}개</p></div>
          <div className="gh-head-actions">
            <button type="button" className="gh-add-btn"><i className="fa-solid fa-pen" /> 직접 작성하기</button>
            <button type="button" className="gh-add-btn"><i className="fa-solid fa-wand-magic-sparkles" /> AI로 작성하기</button>
          </div>
        </header>

        {resumes.length === 0 ? (
          <p className="gh-empty">아직 등록된 자소서가 없습니다.</p>
        ) : (
          <div className="pf-doc-grid">
            {resumes.map(r => (
              <article key={r.id} className="pf-doc" onClick={() => onView(r)}>
                <div className="pf-doc-top">
                  <span className="pf-chip">{r.category}</span>
                  {r.isAi && <span className="pf-chip pf-chip--sky">AI</span>}
                  <div className="gh-item-actions">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onRemove(r.id) }}
                      aria-label="삭제"
                    >
                      <i className="fa-regular fa-trash-can" />
                    </button>
                  </div>
                </div>
                <h3>{r.title}</h3>
                <small>{r.company} · {r.position}</small>
                <p>{r.content}</p>
                <div className="pf-doc-foot"><span>{r.updatedAt}</span><span>{r.content.length}자</span></div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="gh-card pf-span-12 pf-tone-teal">
        <header className="gh-card-head">
          <div><span className="gh-section-kicker">RESUME</span><h2>이력서 요약</h2><p>위 정보를 종합해서 만들어진 이력서를 미리 보고, PDF로 내보낼 수 있어요. 상단의 「이력서 PDF」 버튼을 눌러주세요.</p></div>
        </header>
        <dl className="pf-summary">
          <div><dt>기본 정보</dt><dd>{studentDisplayName(profile.name, profile.studentId)} · {profile.dept}</dd></div>
          <div><dt>학점</dt><dd>{profile.gpa}</dd></div>
          <div><dt>강조 키워드</dt><dd>AI · 데이터 · 백엔드 · 풀스택</dd></div>
        </dl>
      </article>
    </section>
  )
}
