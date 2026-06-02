import { useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import './Portfolio.css'

type TabId = 'profile' | 'skills' | 'experience' | 'documents'

interface TabDef {
  id: TabId
  label: string
  icon: string
}

const TABS: TabDef[] = [
  { id: 'profile',    label: '기본 정보',  icon: 'fa-id-card' },
  { id: 'skills',     label: '스킬·자격증', icon: 'fa-screwdriver-wrench' },
  { id: 'experience', label: '경험·수상',  icon: 'fa-trophy' },
  { id: 'documents',  label: '자소서·이력서', icon: 'fa-file-lines' },
]

/* ── Data Models ────────────────────────────────────────────────── */
interface Skill {
  id: string
  name: string
  level: 1 | 2 | 3 | 4 | 5
  category: '언어' | '프레임워크' | '도구' | 'DB' | '디자인'
}

interface Cert {
  id: string
  name: string
  issuer: string
  acquiredAt: string
  score?: string
}

interface Language {
  id: string
  name: string
  test: string
  score: string
  acquiredAt: string
}

interface Award {
  id: string
  title: string
  rank: string
  host: string
  date: string
  description: string
}

interface Project {
  id: string
  title: string
  role: string
  period: string
  stack: string[]
  description: string
  link?: string
}

interface Resume {
  id: string
  title: string
  category: string
  company: string
  position: string
  content: string
  isAi: boolean
  updatedAt: string
}

/* ── Mock Data ──────────────────────────────────────────────────── */
const PROFILE = {
  name: '김채원',
  studentId: '20221234',
  school: '국립창원대학교',
  dept: '컴퓨터공학과',
  grade: '3학년',
  email: 'chae.kim@cwnu.ac.kr',
  phone: '010-1234-5678',
  gpa: '3.68 / 4.5',
  major: 'AI · 데이터',
  intro:
    '데이터와 사람이 만나는 지점에 관심이 많은 컴퓨터공학과 3학년입니다. 캡스톤과 비교과를 통해 실제 사용자가 쓰는 제품을 만들어 보는 경험을 쌓고 있어요.',
}

const INITIAL_SKILLS: Skill[] = [
  { id: 's1', name: 'Java',       level: 4, category: '언어' },
  { id: 's2', name: 'Python',     level: 4, category: '언어' },
  { id: 's3', name: 'TypeScript', level: 3, category: '언어' },
  { id: 's4', name: 'React',      level: 4, category: '프레임워크' },
  { id: 's5', name: 'Spring Boot', level: 3, category: '프레임워크' },
  { id: 's6', name: 'Git / GitHub', level: 4, category: '도구' },
  { id: 's7', name: 'Figma',      level: 3, category: '디자인' },
  { id: 's8', name: 'MySQL',      level: 3, category: 'DB' },
  { id: 's9', name: 'PostgreSQL', level: 2, category: 'DB' },
]

const INITIAL_CERTS: Cert[] = [
  { id: 'c1', name: 'SQLD (데이터분석 준전문가)', issuer: '한국데이터산업진흥원', acquiredAt: '2025.06.20' },
  { id: 'c2', name: '정보처리기능사', issuer: '한국산업인력공단', acquiredAt: '2024.11.10' },
  { id: 'c3', name: '컴퓨터활용능력 1급', issuer: '대한상공회의소', acquiredAt: '2024.04.05' },
]

const INITIAL_LANGS: Language[] = [
  { id: 'l1', name: 'TOEIC',  test: '정기시험', score: '765점', acquiredAt: '2026.02.10' },
  { id: 'l2', name: 'OPIc',   test: '말하기',  score: 'IM2',    acquiredAt: '2025.12.08' },
]

const INITIAL_AWARDS: Award[] = [
  {
    id: 'a1',
    title: '교내 캡스톤디자인 경진대회',
    rank: '우수상',
    host: '국립창원대학교 공과대학',
    date: '2025.11.22',
    description: 'AI 기반 학사 일정 챗봇 프로젝트로 우수상 수상. 팀 4명 중 백엔드 + 프롬프트 설계 담당.',
  },
  {
    id: 'a2',
    title: 'SW중심대학 해커톤 (제8회)',
    rank: '본선 진출',
    host: 'SW중심대학협의회',
    date: '2025.08.18',
    description: '청년 1인가구를 위한 식단 추천 서비스. React + FastAPI 풀스택 구현.',
  },
  {
    id: 'a3',
    title: '2024 창원시 빅데이터 공모전',
    rank: '장려상',
    host: '창원특례시',
    date: '2024.10.15',
    description: '시내버스 노선 최적화 분석. Python + Pandas + Folium으로 시각화.',
  },
]

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'pj1',
    title: 'CWNU 학사 챗봇 — Mate',
    role: '백엔드 / 프롬프트 설계',
    period: '2025.09 ~ 2025.11',
    stack: ['Python', 'FastAPI', 'OpenAI API', 'PostgreSQL'],
    description: '학사 일정·강의 정보·식단을 자연어로 묻는 LINE 챗봇. 학생 250명 베타 사용.',
    link: 'https://github.com/example/mate-cwnu',
  },
  {
    id: 'pj2',
    title: '1인가구 식단 추천 — Soloplate',
    role: '풀스택 + 모델 튜닝',
    period: '2025.07 ~ 2025.08',
    stack: ['React', 'TypeScript', 'FastAPI', 'GPT-4o-mini'],
    description: '예산·알레르기·냉장고 재료를 입력하면 3끼 식단을 추천. 해커톤 본선 진출작.',
    link: 'https://github.com/example/soloplate',
  },
]

const INITIAL_RESUMES: Resume[] = [
  {
    id: 'r1',
    title: '카카오 백엔드 신입 · 1번 문항',
    category: '본인 강점',
    company: '카카오',
    position: '백엔드 개발',
    isAi: true,
    updatedAt: '2026.04.20',
    content:
      '대학 4년 동안 가장 자주 마주한 문장은 "한 번 더 측정해 봐"였습니다. 캡스톤 챗봇 프로젝트에서 사용자 250명이 보낸 7,400건의 질문을 직접 라벨링하고...',
  },
  {
    id: 'r2',
    title: '네이버 클라우드 인턴 · 자기소개',
    category: '지원동기',
    company: '네이버 클라우드',
    position: '플랫폼 인턴',
    isAi: false,
    updatedAt: '2026.03.12',
    content:
      '클라우드 인프라를 처음 만난 건 1인가구 식단 추천 서비스를 AWS 프리티어에 올리던 2학년 여름이었습니다. 인스턴스를 켜자마자 비용 알림이 떠서 한 시간 만에 내렸지만...',
  },
  {
    id: 'r3',
    title: '쿠팡 SE 인턴 · 협업 경험',
    category: '협업 경험',
    company: '쿠팡',
    position: 'Software Engineer 인턴',
    isAi: true,
    updatedAt: '2026.02.28',
    content:
      '협업이 처음부터 순탄했던 건 아닙니다. 캡스톤 첫 2주, 우리 팀은 PR 리뷰 한 번 없이 main 브랜치에 직접 푸시하다가 같은 파일을 세 번 덮어쓴 적이 있어요...',
  },
]

const LEVEL_LABELS = ['', '초급', '초중급', '중급', '고급', '전문가']

/* ── Page ───────────────────────────────────────────────────────── */
export default function Portfolio() {
  const [tab, setTab] = useState<TabId>('profile')
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS)
  const [certs] = useState<Cert[]>(INITIAL_CERTS)
  const [langs] = useState<Language[]>(INITIAL_LANGS)
  const [awards] = useState<Award[]>(INITIAL_AWARDS)
  const [projects] = useState<Project[]>(INITIAL_PROJECTS)
  const [resumes, setResumes] = useState<Resume[]>(INITIAL_RESUMES)
  const [addSkillOpen, setAddSkillOpen] = useState(false)
  const [skillForm, setSkillForm] = useState<{ name: string; level: Skill['level']; category: Skill['category'] }>({
    name: '',
    level: 3,
    category: '언어',
  })
  const [viewResume, setViewResume] = useState<Resume | null>(null)
  const [exportToast, setExportToast] = useState(false)

  const completeness = useMemo(() => {
    let score = 0
    if (PROFILE.intro.length > 30) score += 15
    score += Math.min(skills.length, 8) * 3
    score += Math.min(certs.length, 4) * 4
    score += Math.min(langs.length, 2) * 5
    score += Math.min(awards.length, 4) * 4
    score += Math.min(projects.length, 4) * 5
    score += Math.min(resumes.length, 4) * 4
    return Math.min(score, 100)
  }, [skills.length, certs.length, langs.length, awards.length, projects.length, resumes.length])

  const exportPdf = () => {
    setExportToast(true)
    window.setTimeout(() => setExportToast(false), 2200)
  }

  const addSkill = () => {
    const name = skillForm.name.trim()
    if (!name) return
    const id = 's' + Date.now()
    setSkills(prev => [...prev, { id, name, level: skillForm.level, category: skillForm.category }])
    setSkillForm({ name: '', level: 3, category: '언어' })
    setAddSkillOpen(false)
  }

  const removeSkill = (id: string) => setSkills(prev => prev.filter(s => s.id !== id))
  const removeResume = (id: string) => setResumes(prev => prev.filter(r => r.id !== id))

  return (
    <div className="pf-wrap">
      <header className="pf-hero">
        <div className="pf-hero-copy">
          <span className="pf-breadcrumb">마이페이지 · 포트폴리오</span>
          <h1>나의 포트폴리오</h1>
          <p>스킬·자격증·수상·자소서·이력서를 한 곳에서 관리하고 PDF로 내보낼 수 있어요.</p>
        </div>
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
        {tab === 'profile' && <ProfileSection />}
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
            resumes={resumes}
            onView={r => setViewResume(r)}
            onRemove={removeResume}
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
              onChange={e => setSkillForm({ ...skillForm, category: e.target.value as Skill['category'] })}
            >
              <option value="언어">언어</option>
              <option value="프레임워크">프레임워크</option>
              <option value="도구">도구</option>
              <option value="DB">DB</option>
              <option value="디자인">디자인</option>
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

function ProfileSection() {
  return (
    <section className="pf-section">
      <div className="pf-profile-card">
        <div className="pf-profile-avatar">
          <i className="fa-solid fa-user" />
        </div>
        <div className="pf-profile-info">
          <h2>{PROFILE.name} <small>· {PROFILE.school}</small></h2>
          <p className="pf-profile-sub">
            {PROFILE.dept} · {PROFILE.grade} · 학번 {PROFILE.studentId}
          </p>
          <p className="pf-profile-intro">{PROFILE.intro}</p>
        </div>
      </div>

      <div className="pf-grid pf-grid--2">
        <article className="pf-card">
          <h3><i className="fa-solid fa-graduation-cap" /> 학사 정보</h3>
          <dl className="pf-dl">
            <div><dt>학교</dt><dd>{PROFILE.school}</dd></div>
            <div><dt>학과</dt><dd>{PROFILE.dept}</dd></div>
            <div><dt>학년</dt><dd>{PROFILE.grade}</dd></div>
            <div><dt>학번</dt><dd>{PROFILE.studentId}</dd></div>
            <div><dt>GPA</dt><dd><strong>{PROFILE.gpa}</strong></dd></div>
            <div><dt>주전공</dt><dd>{PROFILE.major}</dd></div>
          </dl>
        </article>

        <article className="pf-card">
          <h3><i className="fa-solid fa-address-book" /> 연락처</h3>
          <dl className="pf-dl">
            <div><dt>이메일</dt><dd>{PROFILE.email}</dd></div>
            <div><dt>휴대폰</dt><dd>{PROFILE.phone}</dd></div>
          </dl>
          <button type="button" className="pf-edit-btn">
            <i className="fa-solid fa-pen" /> 정보 수정
          </button>
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
    for (const s of skills) {
      if (!cats[s.category]) cats[s.category] = []
      cats[s.category].push(s)
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
                  <span className="pf-skill-name">{s.name}</span>
                  <span className="pf-skill-level">
                    {[1, 2, 3, 4, 5].map(lv => (
                      <span key={lv} className={`pf-skill-dot${lv <= s.level ? ' on' : ''}`} />
                    ))}
                  </span>
                  <button
                    type="button"
                    className="pf-skill-remove"
                    onClick={() => onRemoveSkill(s.id)}
                    aria-label="삭제"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
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
  resumes: Resume[]
  onView: (r: Resume) => void
  onRemove: (id: string) => void
}

function DocumentsSection({ resumes, onView, onRemove }: DocumentsSectionProps) {
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
          <div><strong>기본 정보</strong><span>{PROFILE.name} · {PROFILE.dept}</span></div>
          <div><strong>학점</strong><span>{PROFILE.gpa}</span></div>
          <div><strong>강조 키워드</strong><span>AI · 데이터 · 백엔드 · 풀스택</span></div>
        </div>
      </article>
    </section>
  )
}
