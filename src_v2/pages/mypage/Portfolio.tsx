import { useMemo, useState } from 'react'
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
import './Portfolio.css'
import { usePageHead } from '../../components/PageCrumb'

type TabId = 'profile' | 'skills' | 'experience' | 'documents' | 'resume'

/** 아직 읽기 전이거나 아무것도 쓰지 않은 상태. 빈 값은 빈 값이다 — 합성하지 않는다. */
const EMPTY_PROFILE: ProfileData = {
  name: '', studentId: '', school: '국립창원대학교', dept: '', grade: '',
  email: '', phone: '', gpa: '', major: '', intro: '',
}

interface TabDef {
  id: TabId
  label: string
  icon: string
}

/** 스킬 분류 — DB 코드다(GROWTH_SKILL_CATEGORY). 한글은 표시용 라벨이다. */
const SKILL_CATEGORY_LABEL: Record<string, string> = {
  LANGUAGE: '언어', FRAMEWORK: '프레임워크', TOOL: '도구', DATABASE: 'DB', DESIGN: '디자인',
}

const TABS: TabDef[] = [
  { id: 'profile',    label: '기본 정보',  icon: 'fa-id-card' },
  { id: 'skills',     label: '스킬·자격증', icon: 'fa-screwdriver-wrench' },
  { id: 'experience', label: '경험·수상',  icon: 'fa-trophy' },
  { id: 'documents',  label: '자소서',     icon: 'fa-file-lines' },
  { id: 'resume',     label: '이력서',     icon: 'fa-id-badge' },
]


/* ── Page ───────────────────────────────────────────────────────── */
export default function Portfolio() {
  usePageHead('포트폴리오', '스킬·자격증·수상·자소서·이력서를 한 곳에서 관리하고 PDF로 내보낼 수 있어요.')
  const [tab, setTab] = useState<TabId>('profile')
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

  return (
    <div className="pf-wrap">
      {error && <p className="pf-error" role="alert">{error}</p>}

      <header className="pf-hero">
        <div className="pf-hero-actions">
          <div className="pf-completeness">
            <span className="pf-completeness-num">{completeness}<small>%</small></span>
            <span className="pf-completeness-lbl">완성도</span>
            <div className="pf-completeness-track">
              <div className="pf-completeness-fill" style={{ width: `${completeness}%` }} />
            </div>
          </div>
          <button type="button" className="pf-pdf-btn" onClick={exportPdf}>
            <i className="fa-solid fa-file-pdf" /> 이력서 PDF
          </button>
        </div>
      </header>

      <nav className="pf-tabs" aria-label="포트폴리오 섹션">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`pf-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-solid ${t.icon}`} /> {t.label}
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
      </div>

      {/* Add Skill Modal */}
      <Modal open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="스킬 추가" size="sm">
        <div className="pf-form">
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
          <div className="pf-form-actions">
            <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setAddSkillOpen(false)}>
              취소
            </button>
            <button type="button" className="pf-btn pf-btn--primary" onClick={addSkill}>
              추가
            </button>
          </div>
        </div>
      </Modal>

      {/* View Resume Modal */}
      <Modal
        open={viewResume !== null}
        onClose={() => setViewResume(null)}
        title={viewResume?.title ?? ''}
        size="md"
      >
        {viewResume && (
          <div className="pf-resume-view">
            <div className="pf-resume-view-tags">
              <span className="pf-cat-badge">{viewResume.category}</span>
              {viewResume.isAi && (
                <span className="pf-ai-badge"><i className="fa-solid fa-wand-magic-sparkles" /> AI 작성</span>
              )}
              <span className="pf-resume-date">
                <i className="fa-regular fa-calendar" /> {viewResume.updatedAt}
              </span>
            </div>
            <div className="pf-resume-view-info">
              <span><i className="fa-solid fa-building" /> {viewResume.company}</span>
              <span><i className="fa-solid fa-briefcase" /> {viewResume.position}</span>
            </div>
            <div className="pf-resume-view-content">{viewResume.content}</div>
            <div className="pf-resume-view-foot">총 {viewResume.content.length}자</div>
          </div>
        )}
      </Modal>

      {exportToast && (
        <div className="pf-toast" role="status">
          <i className="fa-solid fa-circle-check" />
          이력서 PDF 내보내기가 시작되었어요. (브라우저 다운로드 폴더 확인)
        </div>
      )}
    </div>
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
    <section className="pf-section">
      <div className="pf-profile-card">
        <div className="pf-profile-avatar">
          <img className="pf-profile-photo" src="/student-profile.png" alt={`${profile.name} 프로필`} />
        </div>
        <div className="pf-profile-info">
          <h2>{profile.name} <small>· {profile.school}</small></h2>
          <p className="pf-profile-sub">
            {profile.dept} · {profile.grade} · 학번 {profile.studentId}
          </p>
          <p className="pf-profile-intro">{profile.intro}</p>
        </div>
      </div>

      <div className="pf-grid pf-grid--2">
        <article className="pf-card">
          <h3><i className="fa-solid fa-graduation-cap" /> 학사 정보</h3>
          <dl className="pf-dl">
            <div><dt>학교</dt><dd>{profile.school}</dd></div>
            <div><dt>학과</dt><dd>{profile.dept}</dd></div>
            <div><dt>학년</dt><dd>{profile.grade}</dd></div>
            <div><dt>학번</dt><dd>{profile.studentId}</dd></div>
            <div><dt>GPA</dt><dd><strong>{profile.gpa}</strong></dd></div>
            <div><dt>주전공</dt><dd>{profile.major}</dd></div>
          </dl>
        </article>

        <article className="pf-card">
          <header className="pf-card-head">
            <h3><i className="fa-solid fa-address-book" /> 연락처</h3>
          </header>
          {editing ? (
            <div className="pf-form">
              <label>
                <span>이메일</span>
                <input
                  type="text"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                <span>휴대폰</span>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label>
                <span>자기소개</span>
                <textarea
                  rows={4}
                  value={form.intro}
                  onChange={e => setForm({ ...form, intro: e.target.value })}
                />
              </label>
              <div className="pf-form-actions">
                <button type="button" className="pf-btn pf-btn--ghost" onClick={cancel}>취소</button>
                <button type="button" className="pf-btn pf-btn--primary" onClick={save}>저장</button>
              </div>
            </div>
          ) : (
            <>
              <dl className="pf-dl">
                <div><dt>이메일</dt><dd>{profile.email}</dd></div>
                <div><dt>휴대폰</dt><dd>{profile.phone}</dd></div>
              </dl>
              <button type="button" className="pf-edit-btn" onClick={startEdit}>
                <i className="fa-solid fa-pen" /> 정보 수정
              </button>
            </>
          )}
        </article>
      </div>
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
    <section className="pf-section">
      <article className="pf-card">
        <header className="pf-card-head">
          <h3><i className="fa-solid fa-screwdriver-wrench" /> 보유 스킬</h3>
          <button type="button" className="pf-add-btn" onClick={onAddSkill}>
            <i className="fa-solid fa-plus" /> 스킬 추가
          </button>
        </header>

        {Object.keys(byCategory).map(cat => (
          <div key={cat} className="pf-skill-group">
            <span className="pf-skill-group-title">{cat}</span>
            <div className="pf-skill-list">
              {byCategory[cat].map(s => (
                <div key={s.id} className="pf-skill-chip">
                  <div className="pf-skill-chip-head">
                    <span className="pf-skill-name">{s.name}</span>
                    <span className={`pf-skill-badge lv${s.level}`}>{LEVEL_LABELS[s.level]}</span>
                    <button
                      type="button"
                      className="pf-skill-remove"
                      onClick={() => onRemoveSkill(s.id)}
                      aria-label="삭제"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                  <div className="pf-skill-bar" title={`숙련도 ${s.level}/5 · ${LEVEL_LABELS[s.level]}`}>
                    {[1, 2, 3, 4, 5].map(lv => (
                      <span key={lv} className={`pf-skill-seg${lv <= s.level ? ` on lv${s.level}` : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </article>

      <div className="pf-grid pf-grid--2">
        <article className="pf-card">
          <header className="pf-card-head">
            <h3><i className="fa-solid fa-certificate" /> 자격증</h3>
            <button type="button" className="pf-add-btn-sm">
              <i className="fa-solid fa-plus" />
            </button>
          </header>
          <ul className="pf-list">
            {certs.map(c => (
              <li key={c.id} className="pf-list-item">
                <div className="pf-list-icon"><i className="fa-solid fa-award" /></div>
                <div className="pf-list-body">
                  <strong>{c.name}</strong>
                  <small>{c.issuer} · {c.acquiredAt}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="pf-card">
          <header className="pf-card-head">
            <h3><i className="fa-solid fa-language" /> 어학</h3>
            <button type="button" className="pf-add-btn-sm">
              <i className="fa-solid fa-plus" />
            </button>
          </header>
          <ul className="pf-list">
            {langs.map(l => (
              <li key={l.id} className="pf-list-item">
                <div className="pf-list-icon"><i className="fa-solid fa-globe" /></div>
                <div className="pf-list-body">
                  <strong>{l.name} <span className="pf-lang-score">{l.score}</span></strong>
                  <small>{l.test} · {l.acquiredAt}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}

interface ExperienceSectionProps {
  awards: Award[]
  projects: Project[]
}

function ExperienceSection({ awards, projects }: ExperienceSectionProps) {
  return (
    <section className="pf-section">
      <article className="pf-card">
        <header className="pf-card-head">
          <h3><i className="fa-solid fa-trophy" /> 공모전 · 수상</h3>
          <button type="button" className="pf-add-btn">
            <i className="fa-solid fa-plus" /> 수상 기록 추가
          </button>
        </header>
        <div className="pf-timeline">
          {awards.map(a => (
            <div key={a.id} className="pf-timeline-item">
              <div className="pf-timeline-dot" />
              <div className="pf-timeline-body">
                <div className="pf-timeline-head">
                  <strong>{a.title}</strong>
                  <span className="pf-award-rank">{a.rank}</span>
                </div>
                <p className="pf-timeline-meta">{a.host} · {a.date}</p>
                <p className="pf-timeline-desc">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="pf-card">
        <header className="pf-card-head">
          <h3><i className="fa-solid fa-code" /> 프로젝트</h3>
          <button type="button" className="pf-add-btn">
            <i className="fa-solid fa-plus" /> 프로젝트 추가
          </button>
        </header>
        <div className="pf-project-grid">
          {projects.map(p => (
            <div key={p.id} className="pf-project">
              <div className="pf-project-head">
                <strong>{p.title}</strong>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="pf-project-link">
                    <i className="fa-brands fa-github" />
                  </a>
                )}
              </div>
              <p className="pf-project-meta">
                <span>{p.role}</span><span>·</span><span>{p.period}</span>
              </p>
              <p className="pf-project-desc">{p.description}</p>
              <div className="pf-project-stack">
                {p.stack.map(s => <span key={s} className="pf-stack-tag">{s}</span>)}
              </div>
            </div>
          ))}
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
    <section className="pf-section">
      <article className="pf-card">
        <header className="pf-card-head">
          <h3><i className="fa-solid fa-file-lines" /> 자소서 보관함</h3>
          <div className="pf-doc-counts">
            <span className="pf-doc-count pf-doc-count--ai">
              <i className="fa-solid fa-wand-magic-sparkles" /> AI 작성 {aiCount}
            </span>
            <span className="pf-doc-count">
              <i className="fa-solid fa-pen" /> 직접 작성 {manualCount}
            </span>
          </div>
        </header>

        {resumes.length === 0 ? (
          <div className="pf-empty">
            <i className="fa-solid fa-file-circle-plus" />
            <p>아직 등록된 자소서가 없습니다.</p>
          </div>
        ) : (
          <div className="pf-resume-grid">
            {resumes.map(r => (
              <article key={r.id} className="pf-resume-card" onClick={() => onView(r)}>
                <div className="pf-resume-top">
                  <span className="pf-cat-badge">{r.category}</span>
                  {r.isAi && (
                    <span className="pf-ai-badge"><i className="fa-solid fa-wand-magic-sparkles" /> AI</span>
                  )}
                  <button
                    type="button"
                    className="pf-resume-del"
                    onClick={e => { e.stopPropagation(); onRemove(r.id) }}
                    aria-label="삭제"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
                <h4 className="pf-resume-title">{r.title}</h4>
                <p className="pf-resume-meta">
                  <span><i className="fa-solid fa-building" /> {r.company}</span>
                  <span><i className="fa-solid fa-briefcase" /> {r.position}</span>
                </p>
                <p className="pf-resume-preview">{r.content}</p>
                <div className="pf-resume-foot">
                  <span><i className="fa-regular fa-calendar" /> {r.updatedAt}</span>
                  <span>{r.content.length}자</span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pf-doc-actions">
          <button type="button" className="pf-btn pf-btn--primary">
            <i className="fa-solid fa-pen" /> 직접 작성하기
          </button>
          <button type="button" className="pf-btn pf-btn--ai">
            <i className="fa-solid fa-wand-magic-sparkles" /> AI로 작성하기
          </button>
        </div>
      </article>

      <article className="pf-card pf-resume-summary">
        <h3><i className="fa-solid fa-id-badge" /> 이력서 요약</h3>
        <p className="pf-resume-summary-desc">
          위 정보를 종합해서 만들어진 이력서를 미리 보고, PDF로 내보낼 수 있어요. 우측 상단의 "이력서 PDF" 버튼을 눌러주세요.
        </p>
        <div className="pf-resume-summary-grid">
          <div><strong>기본 정보</strong><span>{profile.name} · {profile.dept}</span></div>
          <div><strong>학점</strong><span>{profile.gpa}</span></div>
          <div><strong>강조 키워드</strong><span>AI · 데이터 · 백엔드 · 풀스택</span></div>
        </div>
      </article>
    </section>
  )
}

