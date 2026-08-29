import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import { getActiveStudent } from '../../data/students'
import { typeLabel } from '../../data/careerProcess'
import './GrowthHome.css'
import { usePageHead } from '../../components/PageCrumb'

const SKILLS = [
  { name: 'Java', level: 4, category: '언어' },
  { name: 'Python', level: 4, category: '언어' },
  { name: 'TypeScript', level: 3, category: '언어' },
  { name: 'React', level: 4, category: '프레임워크' },
  { name: 'Spring Boot', level: 3, category: '프레임워크' },
  { name: 'Git / GitHub', level: 4, category: '도구' },
]

const PROJECTS = [
  {
    title: 'CWNU 학사 챗봇 — Mate', role: '백엔드 · 프롬프트 설계', period: '2025.09 ~ 2025.11',
    description: '학사 일정과 강의 정보를 자연어로 안내하는 챗봇을 설계하고 학생 250명을 대상으로 베타 운영했습니다.',
    stack: ['Python', 'FastAPI', 'OpenAI API'], result: '캡스톤디자인 우수상',
  },
  {
    title: '1인가구 식단 추천 — Soloplate', role: '풀스택 · 모델 튜닝', period: '2025.07 ~ 2025.08',
    description: '예산과 알레르기 정보를 기반으로 식단을 추천하는 서비스를 구현해 해커톤 본선에 진출했습니다.',
    stack: ['React', 'TypeScript', 'FastAPI'], result: 'SW중심대학 해커톤 본선',
  },
]

const QUALIFICATIONS = [
  { title: 'SQLD', detail: '한국데이터산업진흥원', date: '2025.06.20', icon: 'fa-database' },
  { title: '정보처리기능사', detail: '한국산업인력공단', date: '2024.11.10', icon: 'fa-certificate' },
  { title: 'TOEIC 765점', detail: '정기시험', date: '2026.02.10', icon: 'fa-language' },
  { title: 'OPIc IM2', detail: '말하기', date: '2025.12.08', icon: 'fa-microphone-lines' },
]

const GROWTH_RECORDS = [
  { date: '2026.05.21', type: '진단', title: 'C3 역량성장 후속진단 완료', description: '직무 역량 강화가 필요한 핵심 영역을 확인했습니다.', tone: 'violet' },
  { date: '2026.04.22', type: '비교과', title: '데이터 분석 기초 참여', description: 'Python과 Pandas를 활용한 데이터 분석 실습을 진행 중입니다.', tone: 'mint' },
  { date: '2026.04.08', type: '비교과', title: 'AI 활용 자소서 특강 수료', description: '총 3시간의 취업역량 프로그램을 이수했습니다.', tone: 'blue' },
  { date: '2026.03.20', type: '성과', title: '취업역량강화 캠프 수료', description: '24시간 집중 과정의 모든 활동을 완료했습니다.', tone: 'amber' },
]

type Project = (typeof PROJECTS)[number]
type Skill = (typeof SKILLS)[number]
type Qualification = (typeof QUALIFICATIONS)[number]
type GrowthRecord = (typeof GROWTH_RECORDS)[number]
type EditorKind = 'project' | 'skill' | 'qualification' | 'record'

interface EditorState {
  kind: EditorKind
  index: number | null
  fields: Record<string, string>
}

const EDITOR_LABEL: Record<EditorKind, string> = {
  project: '프로젝트', skill: '스킬', qualification: '자격·어학', record: '성장 활동',
}

function useStoredList<T>(key: string, initial: T[]) {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) as T[] : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* 저장소 비활성 시 현재 세션만 유지 */ }
  }, [items, key])

  return [items, setItems] as const
}

function upsert<T>(items: T[], index: number | null, value: T): T[] {
  if (index === null) return [value, ...items]
  return items.map((item, itemIndex) => itemIndex === index ? value : item)
}

export default function GrowthHome() {
  usePageHead('홈대시보드', '퀘스트·레벨·성장 기록을 한 화면에서 확인합니다.')
  const student = getActiveStudent()
  const storagePrefix = `dc_growth_portfolio_${student.id}`
  const [projects, setProjects] = useStoredList<Project>(`${storagePrefix}_projects`, PROJECTS)
  const [skills, setSkills] = useStoredList<Skill>(`${storagePrefix}_skills`, SKILLS)
  const [qualifications, setQualifications] = useStoredList<Qualification>(`${storagePrefix}_qualifications`, QUALIFICATIONS)
  const [growthRecords, setGrowthRecords] = useStoredList<GrowthRecord>(`${storagePrefix}_records`, GROWTH_RECORDS)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const isSenior = student.grade >= 4
  const strengths = student.strengthWeakness.filter(item => item.type === 'strength')
  const completedPhases = student.phases.filter(phase => phase.status === 'done').length
  const activePhase = student.phases.find(phase => phase.status === 'active')
  const nextAction = student.finalRoadmap.thisWeek[0]

  const openCreate = (kind: EditorKind) => {
    const defaults: Record<EditorKind, Record<string, string>> = {
      project: { title: '', role: '', period: '', description: '', stack: '', result: '' },
      skill: { name: '', category: '도구', level: '3' },
      qualification: { title: '', detail: '', date: '', icon: 'fa-certificate' },
      record: { date: '', type: '비교과', title: '', description: '', tone: 'violet' },
    }
    setEditor({ kind, index: null, fields: defaults[kind] })
  }

  const openEdit = (kind: EditorKind, index: number) => {
    if (kind === 'project') {
      const item = projects[index]
      setEditor({ kind, index, fields: { ...item, stack: item.stack.join(', ') } })
    } else if (kind === 'skill') {
      const item = skills[index]
      setEditor({ kind, index, fields: { ...item, level: String(item.level) } })
    } else if (kind === 'qualification') {
      setEditor({ kind, index, fields: { ...qualifications[index] } })
    } else {
      setEditor({ kind, index, fields: { ...growthRecords[index] } })
    }
  }

  const removeItem = (kind: EditorKind, index: number, label: string) => {
    if (!window.confirm(`'${label}' 기록을 삭제할까요?`)) return
    if (kind === 'project') setProjects(items => items.filter((_, i) => i !== index))
    if (kind === 'skill') setSkills(items => items.filter((_, i) => i !== index))
    if (kind === 'qualification') setQualifications(items => items.filter((_, i) => i !== index))
    if (kind === 'record') setGrowthRecords(items => items.filter((_, i) => i !== index))
  }

  const updateField = (name: string, value: string) => {
    setEditor(current => current ? { ...current, fields: { ...current.fields, [name]: value } } : current)
  }

  const saveEditor = (event: FormEvent) => {
    event.preventDefault()
    if (!editor) return
    const { kind, index, fields } = editor
    if (kind === 'project') {
      const value: Project = { title: fields.title.trim(), role: fields.role.trim(), period: fields.period.trim(), description: fields.description.trim(), stack: fields.stack.split(',').map(item => item.trim()).filter(Boolean), result: fields.result.trim() }
      setProjects(items => upsert(items, index, value))
    } else if (kind === 'skill') {
      const value: Skill = { name: fields.name.trim(), category: fields.category, level: Math.min(5, Math.max(1, Number(fields.level))) }
      setSkills(items => upsert(items, index, value))
    } else if (kind === 'qualification') {
      const value: Qualification = { title: fields.title.trim(), detail: fields.detail.trim(), date: fields.date, icon: fields.icon || 'fa-certificate' }
      setQualifications(items => upsert(items, index, value))
    } else {
      const value: GrowthRecord = { date: fields.date, type: fields.type.trim(), title: fields.title.trim(), description: fields.description.trim(), tone: fields.tone || 'violet' }
      setGrowthRecords(items => upsert(items, index, value))
    }
    setEditor(null)
  }

  return (
    <main className="gh-shell">
      <section className="gh-cover" aria-labelledby="growth-title">
        <div className="gh-cover-profile">
          <div className="gh-avatar" aria-hidden="true">{student.name.slice(-2)}</div>
          <div>
            <span className="gh-eyebrow">{isSenior ? 'CAREER PORTFOLIO' : 'MY GROWTH RECORD'}</span>
            <h2 id="growth-title">{student.name}의 {isSenior ? '성장 포트폴리오' : '성장 기록'}</h2>
            <p>{student.major} · {student.grade}학년 · {student.studentNo}</p>
          </div>
        </div>
        <div className="gh-cover-copy">
          <strong>{student.targetRole || '나에게 맞는 진로를 탐색하고 있어요'}</strong>
          <p>{student.insight}</p>
          <div className="gh-cover-tags">
            <span>{typeLabel(student.studentType)}</span>
            <span>목표 직무 · {student.finalRoadmap.studentGoal.role}</span>
            <span>관심 기업 · {student.finalRoadmap.studentGoal.company}</span>
          </div>
        </div>
        <div className="gh-cover-actions">
          {isSenior ? (
            <Link className="gh-primary-action" to="/mypage/portfolio">취업 포트폴리오 편집 <i className="fa-solid fa-arrow-right" /></Link>
          ) : (
            <div className="gh-grade-policy">
              <i className="fa-solid fa-seedling" />
              <div><strong>{student.grade}학년 {typeLabel(student.studentType)}</strong><span>지금은 서류 작성보다 경험과 역량을 충분히 쌓는 시기입니다.</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="gh-portfolio-grid" aria-label="개인 성장 기록">
        <article className="gh-card gh-projects">
          <header className="gh-card-head">
            <div><span className="gh-section-kicker">SELECTED WORK</span><h2>대표 프로젝트와 성과</h2><p>활동을 나열하지 않고 내가 맡은 역할과 결과가 보이도록 정리했습니다.</p></div>
            <div className="gh-head-actions"><span className="gh-count">{projects.length}개</span><button type="button" className="gh-add-btn" onClick={() => openCreate('project')}><i className="fa-solid fa-plus" /> 프로젝트 등록</button></div>
          </header>
          <div className="gh-project-list">
            {projects.map((project, index) => (
              <section className="gh-project" key={project.title}>
                <div className={`gh-project-visual tone-${index + 1}`}><span>PROJECT 0{index + 1}</span><i className={`fa-solid ${index === 0 ? 'fa-message' : 'fa-utensils'}`} /></div>
                <div className="gh-project-body">
                  <div className="gh-project-meta"><span>{project.period}</span><b>{project.result}</b></div>
                  <div className="gh-item-actions"><button type="button" onClick={() => openEdit('project', index)} aria-label={`${project.title} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('project', index, project.title)} aria-label={`${project.title} 삭제`}><i className="fa-regular fa-trash-can" /></button></div>
                  <h3>{project.title}</h3><strong>{project.role}</strong><p>{project.description}</p>
                  <div className="gh-tag-list">{project.stack.map(stack => <span key={stack}>{stack}</span>)}</div>
                </div>
              </section>
            ))}
            {projects.length === 0 && <p className="gh-empty">등록된 프로젝트가 없습니다. 첫 프로젝트를 추가해 보세요.</p>}
          </div>
        </article>

        <aside className="gh-card gh-profile-card">
          <header className="gh-card-head"><div><span className="gh-section-kicker">PROFILE</span><h2>나를 설명하는 정보</h2></div></header>
          <dl className="gh-profile-list">
            <div><dt>목표 직무</dt><dd>{student.finalRoadmap.studentGoal.role}</dd></div>
            <div><dt>관심 기업</dt><dd>{student.finalRoadmap.studentGoal.company}</dd></div>
            <div><dt>현재 유형</dt><dd>{typeLabel(student.studentType)}</dd></div>
            <div><dt>로드맵</dt><dd>{completedPhases}/{student.phases.length}단계 이행</dd></div>
          </dl>
          <div className="gh-strengths"><h3>진단에서 확인한 강점</h3>{strengths.map(item => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.value}%` }} /></div><strong>{item.value}</strong></div>)}</div>
        </aside>

        <article className="gh-card gh-skills">
          <header className="gh-card-head"><div><span className="gh-section-kicker">CAPABILITIES</span><h2>보유 스킬</h2><p>프로젝트와 학습 활동으로 확인된 기술 역량입니다.</p></div><button type="button" className="gh-add-btn" onClick={() => openCreate('skill')}><i className="fa-solid fa-plus" /> 스킬 등록</button></header>
          <div className="gh-skill-grid">
            {skills.map((skill, index) => <div className="gh-skill" key={`${skill.name}-${index}`}><div><strong>{skill.name}</strong><span>{skill.category}</span></div><div className="gh-skill-controls"><div className="gh-level" aria-label={`${skill.name} 숙련도 ${skill.level}/5`}>{[1, 2, 3, 4, 5].map(level => <i className={level <= skill.level ? 'filled' : ''} key={level} />)}</div><div className="gh-item-actions"><button type="button" onClick={() => openEdit('skill', index)} aria-label={`${skill.name} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('skill', index, skill.name)} aria-label={`${skill.name} 삭제`}><i className="fa-regular fa-trash-can" /></button></div></div></div>)}
            {skills.length === 0 && <p className="gh-empty">등록된 스킬이 없습니다.</p>}
          </div>
        </article>

        <article className="gh-card gh-qualifications">
          <header className="gh-card-head"><div><span className="gh-section-kicker">CERTIFICATES</span><h2>자격·어학</h2><p>취득한 자격과 공인 어학 성적입니다.</p></div><button type="button" className="gh-add-btn" onClick={() => openCreate('qualification')}><i className="fa-solid fa-plus" /> 기록 등록</button></header>
          <div className="gh-qualification-list">
            {qualifications.map((item, index) => <div key={`${item.title}-${index}`}><span className="gh-record-icon"><i className={`fa-solid ${item.icon}`} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.date}</time><div className="gh-item-actions"><button type="button" onClick={() => openEdit('qualification', index)} aria-label={`${item.title} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('qualification', index, item.title)} aria-label={`${item.title} 삭제`}><i className="fa-regular fa-trash-can" /></button></div></div>)}
            {qualifications.length === 0 && <p className="gh-empty">등록된 자격·어학 기록이 없습니다.</p>}
          </div>
        </article>

        <article className="gh-card gh-archive">
          <header className="gh-card-head"><div><span className="gh-section-kicker">GROWTH ARCHIVE</span><h2>성장 활동 기록</h2><p>진단, 비교과, 로드맵 이행이 하나의 성장 서사로 축적됩니다.</p></div><div className="gh-head-actions"><Link to="/mypage/programs">활동 전체 보기</Link><button type="button" className="gh-add-btn" onClick={() => openCreate('record')}><i className="fa-solid fa-plus" /> 활동 기록</button></div></header>
          <div className="gh-timeline">
            {growthRecords.map((record, index) => <div className="gh-timeline-item" key={`${record.date}-${record.title}-${index}`}><time>{record.date}</time><span className={`gh-timeline-dot is-${record.tone}`} /><div><span>{record.type}</span><strong>{record.title}</strong><p>{record.description}</p></div><div className="gh-item-actions"><button type="button" onClick={() => openEdit('record', index)} aria-label={`${record.title} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('record', index, record.title)} aria-label={`${record.title} 삭제`}><i className="fa-regular fa-trash-can" /></button></div></div>)}
            {growthRecords.length === 0 && <p className="gh-empty">아직 기록된 성장 활동이 없습니다.</p>}
          </div>
        </article>

        <aside className="gh-card gh-next">
          <header className="gh-card-head"><div><span className="gh-section-kicker">NEXT CHAPTER</span><h2>다음에 채울 기록</h2></div></header>
          <div className="gh-current-phase"><small>현재 로드맵 단계</small><strong>{activePhase?.title ?? '역량개발'}</strong><span>{activePhase?.period ?? '이번 학기'}</span></div>
          <div className="gh-next-action"><span>이번 주 실행</span><h3>{nextAction?.title ?? '비교과 활동을 시작해 보세요'}</h3><p>{nextAction?.why ?? '새로운 경험은 성장 기록의 다음 근거가 됩니다.'}</p><Link to={nextAction?.linkPath ?? '/growth/program'}>실행 항목 보기 <i className="fa-solid fa-arrow-right" /></Link></div>
          {!isSenior && <div className="gh-document-policy"><i className="fa-solid fa-lock" /><p><strong>이력서·취업 포트폴리오는 4학년부터 제공됩니다.</strong><span>1~3학년은 진단, 비교과 활동, 로드맵 이행 기록에 집중합니다.</span></p></div>}
        </aside>
      </section>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor ? `${EDITOR_LABEL[editor.kind]} ${editor.index === null ? '등록' : '수정'}` : undefined}
        size="md"
      >
        {editor && (
          <form className="gh-editor-form" onSubmit={saveEditor}>
            {editor.kind === 'project' && (
              <>
                <label><span>프로젝트명</span><input required value={editor.fields.title} onChange={event => updateField('title', event.target.value)} /></label>
                <div className="gh-form-row"><label><span>담당 역할</span><input required value={editor.fields.role} onChange={event => updateField('role', event.target.value)} /></label><label><span>활동 기간</span><input required placeholder="2026.03 ~ 2026.06" value={editor.fields.period} onChange={event => updateField('period', event.target.value)} /></label></div>
                <label><span>성과</span><input required placeholder="수상, 배포, 사용자 수 등" value={editor.fields.result} onChange={event => updateField('result', event.target.value)} /></label>
                <label><span>사용 기술</span><input required placeholder="React, TypeScript, Figma" value={editor.fields.stack} onChange={event => updateField('stack', event.target.value)} /><small>쉼표로 구분해 주세요.</small></label>
                <label><span>프로젝트 설명</span><textarea required rows={4} value={editor.fields.description} onChange={event => updateField('description', event.target.value)} /></label>
              </>
            )}
            {editor.kind === 'skill' && (
              <div className="gh-form-row"><label><span>스킬명</span><input required value={editor.fields.name} onChange={event => updateField('name', event.target.value)} /></label><label><span>분류</span><select value={editor.fields.category} onChange={event => updateField('category', event.target.value)}><option>언어</option><option>프레임워크</option><option>도구</option><option>DB</option><option>디자인</option></select></label><label><span>숙련도</span><select value={editor.fields.level} onChange={event => updateField('level', event.target.value)}>{[1, 2, 3, 4, 5].map(level => <option value={level} key={level}>{level}단계</option>)}</select></label></div>
            )}
            {editor.kind === 'qualification' && (
              <>
                <label><span>자격·시험명</span><input required value={editor.fields.title} onChange={event => updateField('title', event.target.value)} /></label>
                <label><span>발급기관·시험 구분</span><input required value={editor.fields.detail} onChange={event => updateField('detail', event.target.value)} /></label>
                <label><span>취득일</span><input required type="date" value={editor.fields.date} onChange={event => updateField('date', event.target.value)} /></label>
              </>
            )}
            {editor.kind === 'record' && (
              <>
                <div className="gh-form-row"><label><span>활동일</span><input required type="date" value={editor.fields.date} onChange={event => updateField('date', event.target.value)} /></label><label><span>활동 유형</span><select value={editor.fields.type} onChange={event => updateField('type', event.target.value)}><option>진단</option><option>상담</option><option>로드맵</option><option>비교과</option><option>프로젝트</option><option>성과</option></select></label></div>
                <label><span>활동명</span><input required value={editor.fields.title} onChange={event => updateField('title', event.target.value)} /></label>
                <label><span>성장 기록</span><textarea required rows={4} value={editor.fields.description} onChange={event => updateField('description', event.target.value)} /></label>
              </>
            )}
            <div className="gh-form-actions"><button type="button" onClick={() => setEditor(null)}>취소</button><button type="submit">{editor.index === null ? '등록하기' : '수정 완료'}</button></div>
          </form>
        )}
      </Modal>
    </main>
  )
}
