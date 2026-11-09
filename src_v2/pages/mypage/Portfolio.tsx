import { studentDisplayName } from '../../../shared/studentDisplayName'
import { useMemo, useState, type ReactNode } from 'react'
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
// 2026-11-09 재개편 — 이 화면은 자체 문서형 스타일을 쓴다(내 성장 화면 CSS 를 더는 불러오지 않는다).
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

/** 비어 있으면 「-」 대신 옅은 「미입력」으로 둔다 — 빈 값과 값을 한눈에 가른다. */
function Value({ children }: { children: string }) {
  return children ? <dd>{children}</dd> : <dd className="is-blank">미입력</dd>
}

function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="pf-empty">
      <strong>{title}</strong>
      {children && <span>{children}</span>}
      {action}
    </div>
  )
}


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
  // 머리말의 구성 칸 — 누르면 그 항목이 있는 탭으로 간다.
  const ledger: { label: string; count: number; tab: TabId }[] = [
    { label: '스킬', count: skills.length, tab: 'skills' },
    { label: '자격증', count: certs.length, tab: 'skills' },
    { label: '어학', count: langs.length, tab: 'skills' },
    { label: '수상', count: awards.length, tab: 'experience' },
    { label: '프로젝트', count: projects.length, tab: 'experience' },
    { label: '자소서', count: resumes.length, tab: 'documents' },
  ]
  const tabCount: Partial<Record<TabId, number>> = {
    skills: skills.length + certs.length + langs.length,
    experience: awards.length + projects.length,
    documents: resumes.length,
  }

  return (
    <main className="pf-shell">
      <section className="pf-mast" aria-labelledby="portfolio-title">
        <div className="pf-mast-top">
          <div className="pf-mast-id">
            <div className="pf-monogram" aria-hidden="true">{profile.name.slice(-2)}</div>
            <div>
              <h2 id="portfolio-title">{coverName}</h2>
              {coverLine && <p className="pf-mast-meta">{coverLine}</p>}
            </div>
          </div>
          <div className="pf-mast-actions">
            <button type="button" className="pf-action" onClick={() => setTab('resume')}>
              <i className="fa-regular fa-file-lines" aria-hidden="true" /> 이력서 미리보기
            </button>
            <button type="button" className="pf-action pf-action--primary" onClick={exportPdf}>
              <i className="fa-solid fa-file-pdf" aria-hidden="true" /> 이력서 PDF
            </button>
          </div>
        </div>
        <div className="pf-ledger">
          <div className="pf-score">
            <strong>{completeness}<small>%</small></strong>
            <span>이력서 완성도</span>
            <div className="pf-score-bar" role="progressbar" aria-label="이력서 완성도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness}>
              <i style={{ width: `${completeness}%` }} />
            </div>
          </div>
          {ledger.map(cell => (
            <button
              key={cell.label}
              type="button"
              className={`pf-seg ${cell.count > 0 ? 'is-filled' : 'is-empty'}`}
              onClick={() => setTab(cell.tab)}
              aria-label={`${cell.label} ${cell.count}건 — ${TABS.find(t => t.id === cell.tab)?.label}로 이동`}
            >
              <span>{cell.label}</span>
              <b>{cell.count}</b>
              {cell.count === 0 && <em>채우기</em>}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="pf-alert" role="alert">{error}</p>}

      <div className="pf-layout">
        <nav className="pf-index" aria-label="포트폴리오 목차">
          <p className="pf-index-label">목차</p>
          <ul>
            {TABS.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  className="pf-index-btn"
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {tabCount[t.id] !== undefined && <small>{tabCount[t.id]}</small>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pf-body">
          {tab === 'profile' && <ProfileSection key="profile" profile={profile} onChange={setProfile} />}
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
              onPreview={() => setTab('resume')}
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
      </div>

      {/* Add Skill Modal */}
      <Modal open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="스킬 추가" size="sm">
        <form className="pf-form" onSubmit={event => { event.preventDefault(); addSkill() }}>
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
          <div className="pf-form-actions">
            <button type="button" className="pf-action" onClick={() => setAddSkillOpen(false)}>취소</button>
            <button type="submit" className="pf-action pf-action--primary">추가</button>
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
              <span className="pf-badge">{viewResume.category}</span>
              {viewResume.isAi && <span className="pf-badge">AI 작성</span>}
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
    <div className="pf-stack">
      <article className="pf-panel">
        <header className="pf-panel-head">
          <div><h2>자기소개</h2><p>이력서 맨 앞에 들어가는 글입니다. 지원하는 일과 이어지는 경험을 중심으로 적어 주세요.</p></div>
          {!editing && profile.intro && (
            <button type="button" className="pf-action pf-action--sm" onClick={startEdit}><i className="fa-solid fa-pen" aria-hidden="true" /> 고치기</button>
          )}
        </header>
        {profile.intro
          ? <p className="pf-prose">{profile.intro}</p>
          : (
            <Empty
              title="아직 자기소개가 없습니다"
              action={!editing && <button type="button" className="pf-action pf-action--sm" onClick={startEdit}><i className="fa-solid fa-pen" aria-hidden="true" /> 자기소개 쓰기</button>}
            >
              한두 문단이면 충분합니다. 쓰고 나면 완성도가 올라갑니다.
            </Empty>
          )}
      </article>

      <div className="pf-split">
        <article className="pf-panel">
          <header className="pf-panel-head">
            <div><h2>학사 정보</h2><p className="pf-source"><i className="fa-solid fa-lock" aria-hidden="true" /> 학사 기록에서 가져와 여기서는 고칠 수 없습니다.</p></div>
          </header>
          <dl className="pf-dl pf-dl--single">
            <div><dt>학교</dt><Value>{profile.school}</Value></div>
            <div><dt>학과</dt><Value>{profile.dept}</Value></div>
            <div><dt>학년</dt><Value>{profile.grade}</Value></div>
            <div><dt>학번</dt><Value>{profile.studentId}</Value></div>
            <div><dt>GPA</dt><Value>{profile.gpa}</Value></div>
            <div><dt>주전공</dt><Value>{profile.major}</Value></div>
          </dl>
        </article>

        <article className="pf-panel">
          <header className="pf-panel-head">
            <div><h2>연락처</h2><p>이력서와 지원서에 표시됩니다.</p></div>
            {!editing && <button type="button" className="pf-action pf-action--sm" onClick={startEdit}><i className="fa-solid fa-pen" aria-hidden="true" /> 정보 수정</button>}
          </header>
          {editing ? (
            <form className="pf-form" onSubmit={event => { event.preventDefault(); save() }}>
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
                <textarea rows={5} value={form.intro} onChange={e => setForm({ ...form, intro: e.target.value })} />
              </label>
              <div className="pf-form-actions">
                <button type="button" className="pf-action" onClick={cancel}>취소</button>
                <button type="submit" className="pf-action pf-action--primary">저장</button>
              </div>
            </form>
          ) : (
            <dl className="pf-dl pf-dl--single">
              <div><dt>이메일</dt><Value>{profile.email}</Value></div>
              <div><dt>휴대폰</dt><Value>{profile.phone}</Value></div>
            </dl>
          )}
        </article>
      </div>
    </div>
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
    <div className="pf-stack">
      <article className="pf-panel">
        <header className="pf-panel-head">
          <div><h2>보유 스킬</h2><p>프로젝트와 학습 활동으로 쌓은 기술 역량입니다. 숙련도는 다섯 칸으로 표시됩니다.</p></div>
          <button type="button" className="pf-action pf-action--sm" onClick={onAddSkill}><i className="fa-solid fa-plus" aria-hidden="true" /> 스킬 추가</button>
        </header>
        {skills.length === 0 ? (
          <Empty
            title="등록된 스킬이 없습니다"
            action={<button type="button" className="pf-action pf-action--sm" onClick={onAddSkill}><i className="fa-solid fa-plus" aria-hidden="true" /> 첫 스킬 추가</button>}
          >
            다룰 줄 아는 언어·도구를 숙련도와 함께 남겨 두면 이력서에 분류별로 정리됩니다.
          </Empty>
        ) : (
          <div>
            {Object.keys(byCategory).map(cat => (
              <section key={cat} className="pf-skill-row">
                <h3>{SKILL_CATEGORY_LABEL[cat] ?? '기타'}</h3>
                <ul className="pf-skill-list">
                  {byCategory[cat].map(s => (
                    <li key={s.id} className="pf-skill">
                      <div className="pf-skill-name"><strong>{s.name}</strong><span>{LEVEL_LABELS[s.level]}</span></div>
                      <div className="pf-meter" role="img" aria-label={`${s.name} 숙련도 ${s.level}/5`}>
                        {[1, 2, 3, 4, 5].map(lv => <i className={lv <= s.level ? 'on' : ''} key={lv} />)}
                      </div>
                      <button type="button" className="pf-icon-btn" onClick={() => onRemoveSkill(s.id)} aria-label={`${s.name} 삭제`}>
                        <i className="fa-regular fa-trash-can" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </article>

      <div className="pf-split">
        <article className="pf-panel">
          <header className="pf-panel-head">
            <div><h2>자격증</h2></div>
            <button type="button" className="pf-action pf-action--sm" aria-label="자격증 추가"><i className="fa-solid fa-plus" aria-hidden="true" /> 추가</button>
          </header>
          {certs.length === 0 ? <Empty title="등록된 자격증이 없습니다" /> : (
            <ul className="pf-records">
              {certs.map(c => (
                <li key={c.id}>
                  <div><strong>{c.name}</strong><small>{c.issuer}</small></div>
                  <span />
                  <time>{c.acquiredAt}</time>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="pf-panel">
          <header className="pf-panel-head">
            <div><h2>어학</h2></div>
            <button type="button" className="pf-action pf-action--sm" aria-label="어학 추가"><i className="fa-solid fa-plus" aria-hidden="true" /> 추가</button>
          </header>
          {langs.length === 0 ? <Empty title="등록된 어학 성적이 없습니다" /> : (
            <ul className="pf-records">
              {langs.map(l => (
                <li key={l.id}>
                  <div><strong>{l.name}</strong><small>{l.test}</small></div>
                  <span className="pf-badge">{l.score}</span>
                  <time>{l.acquiredAt}</time>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  )
}

interface ExperienceSectionProps {
  awards: Award[]
  projects: Project[]
}

function ExperienceSection({ awards, projects }: ExperienceSectionProps) {
  return (
    <div className="pf-stack">
      <article className="pf-panel">
        <header className="pf-panel-head">
          <div><h2>프로젝트</h2><p>맡은 역할과 결과가 드러나게 적으면 이력서에서 가장 먼저 읽힙니다.</p></div>
          <button type="button" className="pf-action pf-action--sm"><i className="fa-solid fa-plus" aria-hidden="true" /> 프로젝트 추가</button>
        </header>
        {projects.length === 0 ? <Empty title="등록된 프로젝트가 없습니다" /> : (
          <ol className="pf-projects">
            {projects.map(p => (
              <li key={p.id} className="pf-project">
                <div className="pf-project-when">{p.period}</div>
                <div>
                  <h3>
                    {p.title}
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" aria-label={`${p.title} 링크 열기`}>
                        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                      </a>
                    )}
                  </h3>
                  {p.role && <p className="pf-project-role">{p.role}</p>}
                  {p.description && <p>{p.description}</p>}
                  {p.stack.length > 0 && <div className="pf-tags">{p.stack.map(s => <span key={s}>{s}</span>)}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="pf-panel">
        <header className="pf-panel-head">
          <div><h2>공모전·수상</h2></div>
          <button type="button" className="pf-action pf-action--sm"><i className="fa-solid fa-plus" aria-hidden="true" /> 수상 기록 추가</button>
        </header>
        {awards.length === 0 ? <Empty title="등록된 수상 기록이 없습니다" /> : (
          <ul className="pf-records">
            {awards.map(a => (
              <li key={a.id}>
                <div><strong>{a.title}</strong><small>{a.host}</small>{a.description && <p>{a.description}</p>}</div>
                {a.rank ? <span className="pf-badge pf-badge--warn">{a.rank}</span> : <span />}
                <time>{a.date}</time>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}

interface DocumentsSectionProps {
  profile: ProfileData
  resumes: Resume[]
  onView: (r: Resume) => void
  onRemove: (id: string) => void
  onPreview: () => void
}

function DocumentsSection({ profile, resumes, onView, onRemove, onPreview }: DocumentsSectionProps) {
  const aiCount = resumes.filter(r => r.isAi).length
  const manualCount = resumes.filter(r => !r.isAi).length

  return (
    <div className="pf-stack">
      <article className="pf-panel">
        <header className="pf-panel-head">
          <div><h2>자소서 보관함</h2><p>AI 작성 {aiCount}개 · 직접 작성 {manualCount}개</p></div>
          <div className="pf-panel-actions">
            <button type="button" className="pf-action pf-action--sm"><i className="fa-solid fa-pen" aria-hidden="true" /> 직접 작성하기</button>
            <button type="button" className="pf-action pf-action--sm"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> AI로 작성하기</button>
          </div>
        </header>

        {resumes.length === 0 ? (
          <Empty title="아직 등록된 자소서가 없습니다">취업지원 &gt; 자기소개서에서 쓴 글이 여기에 모입니다.</Empty>
        ) : (
          <ul className="pf-docs">
            {resumes.map(r => (
              <li key={r.id} className="pf-doc">
                <button type="button" className="pf-doc-open" onClick={() => onView(r)}>
                  <strong>
                    {r.title}
                    <span className="pf-badge">{r.category}</span>
                    {r.isAi && <span className="pf-badge">AI</span>}
                  </strong>
                  <span>{r.company} · {r.position}</span>
                  <p>{r.content}</p>
                </button>
                <span className="pf-doc-meta">{r.updatedAt}<br />{r.content.length}자</span>
                <button type="button" className="pf-icon-btn" onClick={() => onRemove(r.id)} aria-label={`${r.title} 삭제`}>
                  <i className="fa-regular fa-trash-can" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="pf-panel">
        <header className="pf-panel-head">
          <div><h2>이력서 요약</h2><p>위 정보를 모아 만든 이력서를 미리 보고 PDF로 내보낼 수 있습니다.</p></div>
          <button type="button" className="pf-action pf-action--sm" onClick={onPreview}><i className="fa-regular fa-file-lines" aria-hidden="true" /> 이력서 보기</button>
        </header>
        <dl className="pf-dl">
          <div><dt>기본 정보</dt><Value>{[studentDisplayName(profile.name, profile.studentId), profile.dept].filter(Boolean).join(' · ')}</Value></div>
          <div><dt>학점</dt><Value>{profile.gpa}</Value></div>
          <div><dt>강조 키워드</dt><dd>AI · 데이터 · 백엔드 · 풀스택</dd></div>
        </dl>
      </article>
    </div>
  )
}
