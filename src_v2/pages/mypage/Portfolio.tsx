import { studentDisplayName } from '../../../shared/studentDisplayName'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Modal from '../../components/Modal'
import { getActiveStudentId } from '../../data/students'
// 정본은 서버다 — 교직원 학생 상세도 **같은 projection** 을 읽는다.
// 예전의 INITIAL_* 는 전 학생 공통 상수였고 buildProfile 은 연락처를 합성했다. 둘 다 걷었다.
import { LEVEL_LABELS, toPortfolioView } from '../../data/portfolio'
import type { ProfileData, Skill, Cert, Language, Award, Project, Resume } from '../../data/portfolio'
import { loadPortfolio, saveGrowthProfile } from '../../../shared/growthStore'
import type { PortfolioDTO } from '../../../shared/growthStore'
import { useGrowth } from '../../../shared/useRoadmapStore'
import { useEffect } from 'react'
// 2026-11-09 재개편 — 이 화면은 자체 문서형 스타일을 쓴다(내 성장 화면 CSS 를 더는 불러오지 않는다).
import './Portfolio.css'
import { usePageHead } from '../../components/PageCrumb'
import PortfolioVersions from './portfolio/PortfolioVersions'

// 이력서 탭은 없앴다(2026-11-09 사용자 확정 — 이력서와 포트폴리오는 같은 뜻). 대표 포트폴리오가 그 자리를 맡는다.
type TabId = 'profile' | 'skills' | 'experience' | 'documents' | 'versions'

/** 아직 읽기 전이거나 아무것도 쓰지 않은 상태. 빈 값은 빈 값이다 — 합성하지 않는다. */
const EMPTY_PROFILE: ProfileData = {
  name: '', studentId: '', school: '국립창원대학교', dept: '', grade: '',
  email: '', phone: '', gpa: '', major: '', intro: '',
}

/** 스킬 분류 — DB 코드다(GROWTH_SKILL_CATEGORY). 한글은 표시용 라벨이다. */
const SKILL_CATEGORY_LABEL: Record<string, string> = {
  LANGUAGE: '언어', FRAMEWORK: '프레임워크', TOOL: '도구', DATABASE: 'DB', DESIGN: '디자인',
}

/** 성장 기록의 PROJECT 를 내 성장 화면과 같은 이름으로 부른다(2026-11-09 사용자 확정). */
const ACTIVITY_LABEL = '수상, 공모전, 외부활동, 개인활동'
/** 스킬·자격증·활동은 내 성장에서 등록한다 — 포트폴리오는 보여 주기만 한다. */
const GROWTH_PATH = '/growth'
const RESUME_PATH = '/jobs/home/resume'

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile',    label: '기본 정보' },
  { id: 'skills',     label: '기술역량·자격증' },
  { id: 'experience', label: '수상·활동' },
  { id: 'documents',  label: '자소서' },
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

/** 내 성장으로 보내는 링크 — 등록·수정은 거기서 한다. */
function GrowthLink({ children = '내 성장에서 등록' }: { children?: ReactNode }) {
  return (
    <Link to={GROWTH_PATH} className="pf-action pf-action--sm">
      {children} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
    </Link>
  )
}


/* ── Page ───────────────────────────────────────────────────────── */
export default function Portfolio() {
  usePageHead('포트폴리오', '내 성장에 쌓은 기록을 모아 보고, 회사에 낼 포트폴리오를 만들어 대표로 지정할 수 있어요.')
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

  // 연락처는 고치지 않는다(나중에 학사 연동값) — 자기소개만 저장하고 연락처는 받은 값 그대로 돌려보낸다.
  const saveIntro = (intro: string) =>
    saveGrowthProfile(studentId, { intro, email: profile.email, phone: profile.phone })
      .catch(() => setError('자기소개를 저장하지 못했습니다.'))
  const [viewResume, setViewResume] = useState<Resume | null>(null)

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

  const coverName = profile.name ? `${studentDisplayName(profile.name, profile.studentId)}의 포트폴리오` : '나의 포트폴리오'
  const coverLine = [profile.dept, profile.grade, profile.studentId].filter(Boolean).join(' · ')
  // 머리말의 구성 칸 — 누르면 그 항목이 있는 탭으로 간다. 칸마다 내 성장 화면의 카드 색을 따른다.
  const ledger: { label: string; count: number; tab: TabId; tone: string }[] = [
    { label: '기술역량', count: skills.length, tab: 'skills', tone: 'mint' },
    { label: '자격증', count: certs.length, tab: 'skills', tone: 'teal' },
    { label: '어학', count: langs.length, tab: 'skills', tone: 'sky' },
    { label: '수상·활동', count: projects.length + awards.length, tab: 'experience', tone: 'blue' },
    { label: '자소서', count: resumes.length, tab: 'documents', tone: 'amber' },
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
            <Link to={GROWTH_PATH} className="pf-action">
              <i className="fa-solid fa-seedling" aria-hidden="true" /> 내 성장에서 기록하기
            </Link>
            <button type="button" className="pf-action pf-action--primary" onClick={() => setTab('versions')}>
              <i className="fa-regular fa-file-lines" aria-hidden="true" /> 대표 포트폴리오
            </button>
          </div>
        </div>
        <div className="pf-ledger">
          <div className="pf-score">
            <strong>{completeness}<small>%</small></strong>
            <span>기록 완성도</span>
            <div className="pf-score-bar" role="progressbar" aria-label="기록 완성도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completeness}>
              <i style={{ width: `${completeness}%` }} />
            </div>
          </div>
          {ledger.map(cell => (
            <button
              key={cell.label}
              type="button"
              className={`pf-seg pf-tone-${cell.tone} ${cell.count > 0 ? 'is-filled' : 'is-empty'}`}
              onClick={() => setTab(cell.tab)}
              aria-label={`${cell.label} ${cell.count}건 — ${TABS.find(t => t.id === cell.tab)?.label}로 이동`}
            >
              <span>{cell.label}</span>
              <b>{cell.count}</b>
              {cell.count === 0 && <em>비어 있음</em>}
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
          {tab === 'profile' && <ProfileSection profile={profile} onSaveIntro={saveIntro} />}
          {tab === 'skills' && <SkillsSection skills={skills} certs={certs} langs={langs} />}
          {tab === 'experience' && <ExperienceSection awards={awards} projects={projects} />}
          {tab === 'documents' && <DocumentsSection resumes={resumes} onView={r => setViewResume(r)} />}
          {/* 탭을 열 때만 마운트한다 — 다른 탭의 API 호출을 늘리지 않는다. */}
          {versionsOpened && <div hidden={tab !== 'versions'}><PortfolioVersions studentId={studentId} initialId={searchParams.get('edit')} /></div>}
        </div>
      </div>

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
              <span className="pf-badge pf-tone-amber">{viewResume.category}</span>
              {viewResume.isAi && <span className="pf-badge">AI 작성</span>}
              <time>{viewResume.updatedAt}</time>
            </div>
            <p className="pf-view-info">{[viewResume.company, viewResume.position].filter(Boolean).join(' · ')}</p>
            <div className="pf-view-content">{viewResume.content}</div>
            <small>총 {viewResume.content.length}자</small>
          </div>
        )}
      </Modal>
    </main>
  )
}

/* ── Sections ───────────────────────────────────────────────────── */

function ProfileSection({ profile, onSaveIntro }: { profile: ProfileData; onSaveIntro: (intro: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [intro, setIntro] = useState(profile.intro)

  const startEdit = () => { setIntro(profile.intro); setEditing(true) }
  const save = () => { onSaveIntro(intro); setEditing(false) }

  return (
    <div className="pf-stack">
      <article className="pf-panel pf-tone-blue">
        <header className="pf-panel-head">
          <div><h2>자기소개</h2><p>포트폴리오 맨 앞에 들어가는 글입니다. 지원하는 일과 이어지는 경험을 중심으로 적어 주세요.</p></div>
          {!editing && profile.intro && (
            <button type="button" className="pf-action pf-action--sm" onClick={startEdit}><i className="fa-solid fa-pen" aria-hidden="true" /> 고치기</button>
          )}
        </header>
        {editing ? (
          <form className="pf-form" onSubmit={event => { event.preventDefault(); save() }}>
            <label>
              <span className="pf-sr">자기소개</span>
              <textarea rows={6} value={intro} onChange={e => setIntro(e.target.value)} autoFocus />
            </label>
            <div className="pf-form-actions">
              <button type="button" className="pf-action" onClick={() => setEditing(false)}>취소</button>
              <button type="submit" className="pf-action pf-action--primary">저장</button>
            </div>
          </form>
        ) : profile.intro
          ? <p className="pf-prose">{profile.intro}</p>
          : (
            <Empty
              title="아직 자기소개가 없습니다"
              action={<button type="button" className="pf-action pf-action--sm" onClick={startEdit}><i className="fa-solid fa-pen" aria-hidden="true" /> 자기소개 쓰기</button>}
            >
              한두 문단이면 충분합니다. 쓰고 나면 완성도가 올라갑니다.
            </Empty>
          )}
      </article>

      <div className="pf-split">
        <article className="pf-panel pf-tone-sky">
          <header className="pf-panel-head">
            <div><h2>학사 정보</h2><p className="pf-source"><i className="fa-solid fa-lock" aria-hidden="true" /> 학사 기록에서 가져옵니다.</p></div>
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

        <article className="pf-panel pf-tone-mint">
          <header className="pf-panel-head">
            <div>
              <h2>연락처</h2>
              <p className="pf-source"><i className="fa-solid fa-lock" aria-hidden="true" /> 여기서는 고칠 수 없습니다. 회사마다 다른 연락처는 회사 제출용 포트폴리오에서 바꿀 수 있습니다.</p>
            </div>
          </header>
          <dl className="pf-dl pf-dl--single">
            <div><dt>이메일</dt><Value>{profile.email}</Value></div>
            <div><dt>휴대폰</dt><Value>{profile.phone}</Value></div>
          </dl>
        </article>
      </div>
    </div>
  )
}

function SkillsSection({ skills, certs, langs }: { skills: Skill[]; certs: Cert[]; langs: Language[] }) {
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
      <article className="pf-panel pf-tone-mint">
        <header className="pf-panel-head">
          <div><h2>보유 기술역량</h2><p>내 성장에 등록한 기술역량입니다. 숙련도는 다섯 칸으로 표시됩니다.</p></div>
          <GrowthLink />
        </header>
        {skills.length === 0 ? (
          <Empty title="등록된 기술역량이 없습니다" action={<GrowthLink>내 성장에서 기술역량 등록</GrowthLink>}>
            다룰 줄 아는 언어·도구를 숙련도와 함께 남겨 두면 포트폴리오에 분류별로 정리됩니다.
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
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </article>

      <div className="pf-split">
        <article className="pf-panel pf-tone-teal">
          <header className="pf-panel-head">
            <div><h2>자격증</h2></div>
            <GrowthLink />
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

        <article className="pf-panel pf-tone-sky">
          <header className="pf-panel-head">
            <div><h2>어학</h2></div>
            <GrowthLink />
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

function ExperienceSection({ awards, projects }: { awards: Award[]; projects: Project[] }) {
  return (
    <div className="pf-stack">
      <article className="pf-panel pf-tone-blue">
        <header className="pf-panel-head">
          <div><h2>{ACTIVITY_LABEL}</h2><p>맡은 역할과 결과가 드러나게 적으면 포트폴리오에서 가장 먼저 읽힙니다.</p></div>
          <GrowthLink />
        </header>
        {projects.length === 0 ? (
          <Empty title="등록된 활동이 없습니다" action={<GrowthLink>내 성장에서 활동 등록</GrowthLink>} />
        ) : (
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

      {/* 예전 경로로 쌓인 수상 기록 — 새로 등록하는 곳은 없고 있는 기록만 보여 준다. */}
      {awards.length > 0 && (
        <article className="pf-panel pf-tone-amber">
          <header className="pf-panel-head"><div><h2>수상 기록</h2></div></header>
          <ul className="pf-records">
            {awards.map(a => (
              <li key={a.id}>
                <div><strong>{a.title}</strong><small>{a.host}</small>{a.description && <p>{a.description}</p>}</div>
                {a.rank ? <span className="pf-badge">{a.rank}</span> : <span />}
                <time>{a.date}</time>
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  )
}

function DocumentsSection({ resumes, onView }: { resumes: Resume[]; onView: (r: Resume) => void }) {
  const aiCount = resumes.filter(r => r.isAi).length
  const manualCount = resumes.filter(r => !r.isAi).length
  const write = (
    <Link to={RESUME_PATH} className="pf-action pf-action--sm">
      <i className="fa-solid fa-pen" aria-hidden="true" /> 자소서 작성하기
    </Link>
  )

  return (
    <div className="pf-stack">
      <article className="pf-panel pf-tone-amber">
        <header className="pf-panel-head">
          <div><h2>자소서 보관함</h2><p>AI 작성 {aiCount}개 · 직접 작성 {manualCount}개 · 회사 제출용 포트폴리오에 문항·답변 그대로 불러올 수 있습니다.</p></div>
          {write}
        </header>

        {resumes.length === 0 ? (
          <Empty title="아직 작성한 자소서가 없습니다" action={write}>취업지원의 자소서 화면에서 쓴 글이 여기에 모입니다.</Empty>
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
                  {(r.company || r.position) && <span>{[r.company, r.position].filter(Boolean).join(' · ')}</span>}
                  <p>{r.content}</p>
                </button>
                <span className="pf-doc-meta">{r.updatedAt}<br />{r.content.length}자</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
