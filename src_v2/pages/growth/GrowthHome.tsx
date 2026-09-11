// ★ 이 화면에 있던 공통 초기 상수(SKILLS·PROJECTS·QUALIFICATIONS·GROWTH_RECORDS)를 걷었다.
//   useStoredList 가 mount 직후 그 상수를 **학생별 키에 그대로 저장**해서, 아무도 쓴 적 없는
//   실적이 모든 학생에게 자기 것처럼 보였다. 정본은 서버(dc.growth_entry)이고, 소유자가
//   증명되지 않은 자료는 이관하지 않았다. 비어 있으면 비어 있는 것이 사실이다.
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import { getActiveStudent } from '../../data/students'
import { typeLabel } from '../../data/careerProcess'
import { RECORD_CATEGORY_LABEL, createGrowthRecord, deleteGrowthRecord, getGrowthRecords,
         updateGrowthRecord, type GrowthRecordCategory } from '../../data/growthRecords'
// 스킬 후보·분류는 사전 단일소스에서 온다 — 여기에 스킬명·분류 리터럴을 두지 않는다.
import { SKILL_CATEGORIES, SKILL_CUSTOM, SKILL_GROUPS, categoryOf } from '../../data/skillCatalog'
import { createGrowthEntry, deleteGrowthEntry, growthEntries, updateGrowthEntry } from '../../../shared/growthStore'
import type { GrowthEntry } from '../../../shared/growthStore'
import { useGrowth } from '../../../shared/useRoadmapStore'
import './GrowthHome.css'
import { usePageHead } from '../../components/PageCrumb'

interface Project { id: string; title: string; role: string; period: string; description: string
                    stack: string[]; result: string }
interface Skill { id: string; name: string; level: number; category: string }
interface Qualification { id: string; title: string; detail: string; date: string; icon: string }
type EditorKind = 'project' | 'skill' | 'qualification' | 'record'

const text = (content: Record<string, unknown>, field: string): string =>
  typeof content[field] === 'string' ? content[field] as string : ''

const dateOf = (entry: GrowthEntry): string => entry.occurredOn ?? entry.dateText ?? ''

function toProject(entry: GrowthEntry): Project {
  return { id: entry.id, title: entry.title, role: text(entry.content, 'role'),
           period: text(entry.content, 'periodText'), description: text(entry.content, 'description'),
           stack: Array.isArray(entry.content.stack) ? entry.content.stack as string[] : [],
           result: text(entry.content, 'result') }
}

function toSkill(entry: GrowthEntry): Skill {
  return { id: entry.id, name: entry.title, level: Number(entry.content.level) || 1,
           category: entry.categoryCode ?? SKILL_CATEGORIES[0] }
}

function toQualification(entry: GrowthEntry): Qualification {
  return { id: entry.id, title: entry.title, detail: text(entry.content, 'issuer'),
           date: dateOf(entry), icon: text(entry.content, 'icon') || 'fa-certificate' }
}

interface EditorState {
  kind: EditorKind
  index: number | null
  fields: Record<string, string>
}

const EDITOR_LABEL: Record<EditorKind, string> = {
  project: '프로젝트', skill: '스킬', qualification: '자격·어학', record: '성장 활동',
}

export default function GrowthHome() {
  usePageHead('홈대시보드', '퀘스트·레벨·성장 기록을 한 화면에서 확인합니다.')
  const student = getActiveStudent()
  // 서버가 정본이다. 저장 뒤 스토어가 다시 읽어 발행하면 그때 갱신된다.
  const revision = useGrowth(student.id)
  const projectRows = useMemo(() => growthEntries(student.id, 'PROJECT'), [student.id, revision])
  const skillRows = useMemo(() => growthEntries(student.id, 'SKILL'), [student.id, revision])
  const certRows = useMemo(() => growthEntries(student.id, 'CERTIFICATE'), [student.id, revision])
  const projects = useMemo(() => projectRows.map(toProject), [projectRows])
  const skills = useMemo(() => skillRows.map(toSkill), [skillRows])
  const qualifications = useMemo(() => certRows.map(toQualification), [certRows])
  const growthRecords = useMemo(() => getGrowthRecords(student.id), [student.id, revision])
  const [editor, setEditor] = useState<EditorState | null>(null)
  // 저장 실패는 사실대로 보여 준다 — 성공 토스트를 먼저 띄우거나 로컬로 되돌리지 않는다.
  const [error, setError] = useState('')
  const isSenior = student.grade >= 4
  const strengths = student.strengthWeakness.filter(item => item.type === 'strength')
  const completedPhases = student.phases.filter(phase => phase.status === 'done').length
  const activePhase = student.phases.find(phase => phase.status === 'active')
  const nextAction = student.finalRoadmap.thisWeek[0]

  const openCreate = (kind: EditorKind) => {
    const defaults: Record<EditorKind, Record<string, string>> = {
      project: { title: '', role: '', period: '', description: '', stack: '', result: '' },
      skill: { name: '', category: SKILL_CATEGORIES[0], level: '3', custom: '' },
      qualification: { title: '', detail: '', date: '', icon: 'fa-certificate' },
      record: { date: '', category: 'PROGRAM', title: '', description: '' },
    }
    setEditor({ kind, index: null, fields: defaults[kind] })
  }

  const openEdit = (kind: EditorKind, index: number) => {
    if (kind === 'project') {
      const item = projects[index]
      setEditor({ kind, index, fields: { title: item.title, role: item.role, period: item.period,
                                         description: item.description, stack: item.stack.join(', '),
                                         result: item.result } })
    } else if (kind === 'skill') {
      const item = skills[index]
      // 사전에 없는 이름(직접 입력해 둔 스킬)이면 드롭다운으로 되돌리지 않는다 —
      // 목록에 없으니 고를 수가 없어 이름이 비어 보인다.
      setEditor({ kind, index, fields: { name: item.name, category: item.category,
                                         level: String(item.level),
                                         custom: categoryOf(item.name) ? '' : '1' } })
    } else if (kind === 'qualification') {
      const item = qualifications[index]
      setEditor({ kind, index, fields: { title: item.title, detail: item.detail, date: item.date,
                                         icon: item.icon } })
    } else {
      const item = growthRecords[index]
      setEditor({ kind, index, fields: { date: item.date, category: item.category, title: item.title,
                                         description: item.description } })
    }
  }

  const run = (task: Promise<void>) => {
    task.then(() => setError('')).catch(cause => setError(
      cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.'))
  }

  const removeItem = (kind: EditorKind, index: number, label: string) => {
    if (!window.confirm(`'${label}' 기록을 삭제할까요?`)) return
    if (kind === 'project') run(deleteGrowthEntry(student.id, projectRows[index]))
    if (kind === 'skill') run(deleteGrowthEntry(student.id, skillRows[index]))
    if (kind === 'qualification') run(deleteGrowthEntry(student.id, certRows[index]))
    if (kind === 'record') run(deleteGrowthRecord(student.id, growthRecords[index].id))
  }

  const updateField = (name: string, value: string) => {
    setEditor(current => current ? { ...current, fields: { ...current.fields, [name]: value } } : current)
  }

  /**
   * 드롭다운에서 스킬을 고른다 — 분류는 사전이 알고 있으니 같이 채운다.
   * 「직접 입력」을 고르면 이름칸을 비우고 자유 입력으로 바꾼다(분류는 학생이 고른 값을 둔다).
   */
  const pickSkillName = (value: string) => {
    if (value === SKILL_CUSTOM) {
      setEditor(current => current ? { ...current, fields: { ...current.fields, name: '', custom: '1' } } : current)
      return
    }
    const category = categoryOf(value)
    setEditor(current => current
      ? { ...current, fields: { ...current.fields, name: value, ...(category ? { category } : {}) } }
      : current)
  }

  const saveEditor = (event: FormEvent) => {
    event.preventDefault()
    if (!editor) return
    const { kind, index, fields } = editor
    // 자기신고다(source_kind=SELF_REPORTED). 서버는 verified 같은 권한 필드를 받지 않는다.
    const write = (input: Parameters<typeof createGrowthEntry>[1], rows: GrowthEntry[]) =>
      index === null
        ? createGrowthEntry(student.id, input)
        : updateGrowthEntry(student.id, rows[index], input)
    if (kind === 'project') {
      run(write({ kind: 'PROJECT', title: fields.title.trim(),
                  content: { role: fields.role.trim(), periodText: fields.period.trim(),
                             description: fields.description.trim(), result: fields.result.trim(),
                             stack: fields.stack.split(',').map(item => item.trim()).filter(Boolean) } },
                 projectRows))
    } else if (kind === 'skill') {
      run(write({ kind: 'SKILL', title: fields.name.trim(), categoryCode: fields.category,
                  content: { level: Math.min(5, Math.max(1, Number(fields.level))) } }, skillRows))
    } else if (kind === 'qualification') {
      run(write({ kind: 'CERTIFICATE', title: fields.title.trim(), occurredOn: fields.date || null,
                  datePrecision: fields.date ? 'DAY' : 'UNKNOWN',
                  content: { issuer: fields.detail.trim(), icon: fields.icon || 'fa-certificate' } },
                 certRows))
    } else {
      const record = { date: fields.date, category: fields.category as GrowthRecordCategory,
                       title: fields.title.trim(), description: fields.description.trim() }
      run(index === null
        ? createGrowthRecord(student.id, record)
        : updateGrowthRecord(student.id, growthRecords[index].id, record))
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

      {error && <p className="gh-empty" role="alert">{error}</p>}

      <section className="gh-portfolio-grid" aria-label="개인 성장 기록">
        <article className="gh-card gh-projects">
          <header className="gh-card-head">
            <div><span className="gh-section-kicker">SELECTED WORK</span><h2>대표 프로젝트와 성과</h2><p>활동을 나열하지 않고 내가 맡은 역할과 결과가 보이도록 정리했습니다.</p></div>
            <div className="gh-head-actions"><span className="gh-count">{projects.length}개</span><button type="button" className="gh-add-btn" onClick={() => openCreate('project')}><i className="fa-solid fa-plus" /> 프로젝트 등록</button></div>
          </header>
          <div className="gh-project-list">
            {projects.map((project, index) => (
              <section className="gh-project" key={project.id}>
                {/* 띠에는 제목이 들어간다. 그림 아이콘은 프로젝트마다 index 로 골라 박아 둔
                    것이라(등록한 세 번째 프로젝트부터는 고를 것도 없었다) 걷어냈다. */}
                <div className={`gh-project-visual tone-${index + 1}`}><span>PROJECT 0{index + 1}</span><h3>{project.title}</h3></div>
                <div className="gh-project-body">
                  <div className="gh-project-meta"><span>{project.period}</span><b>{project.result}</b></div>
                  <div className="gh-item-actions"><button type="button" onClick={() => openEdit('project', index)} aria-label={`${project.title} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('project', index, project.title)} aria-label={`${project.title} 삭제`}><i className="fa-regular fa-trash-can" /></button></div>
                  <strong>{project.role}</strong><p>{project.description}</p>
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
            {skills.map((skill, index) => <div className="gh-skill" key={skill.id}><div><strong>{skill.name}</strong><span>{skill.category}</span></div><div className="gh-skill-controls"><div className="gh-level" aria-label={`${skill.name} 숙련도 ${skill.level}/5`}>{[1, 2, 3, 4, 5].map(level => <i className={level <= skill.level ? 'filled' : ''} key={level} />)}</div><div className="gh-item-actions"><button type="button" onClick={() => openEdit('skill', index)} aria-label={`${skill.name} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('skill', index, skill.name)} aria-label={`${skill.name} 삭제`}><i className="fa-regular fa-trash-can" /></button></div></div></div>)}
            {skills.length === 0 && <p className="gh-empty">등록된 스킬이 없습니다.</p>}
          </div>
        </article>

        <article className="gh-card gh-qualifications">
          <header className="gh-card-head"><div><span className="gh-section-kicker">CERTIFICATES</span><h2>자격·어학</h2><p>취득한 자격과 공인 어학 성적입니다.</p></div><button type="button" className="gh-add-btn" onClick={() => openCreate('qualification')}><i className="fa-solid fa-plus" /> 기록 등록</button></header>
          <div className="gh-qualification-list">
            {qualifications.map((item, index) => <div key={item.id}><span className="gh-record-icon"><i className={`fa-solid ${item.icon}`} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.date}</time><div className="gh-item-actions"><button type="button" onClick={() => openEdit('qualification', index)} aria-label={`${item.title} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('qualification', index, item.title)} aria-label={`${item.title} 삭제`}><i className="fa-regular fa-trash-can" /></button></div></div>)}
            {qualifications.length === 0 && <p className="gh-empty">등록된 자격·어학 기록이 없습니다.</p>}
          </div>
        </article>

        <article className="gh-card gh-archive">
          <header className="gh-card-head"><div><span className="gh-section-kicker">GROWTH ARCHIVE</span><h2>성장 활동 기록</h2><p>진단, 비교과, 로드맵 이행이 하나의 성장 서사로 축적됩니다.</p></div><div className="gh-head-actions"><Link to="/mypage/programs">활동 전체 보기</Link><button type="button" className="gh-add-btn" onClick={() => openCreate('record')}><i className="fa-solid fa-plus" /> 활동 기록</button></div></header>
          <div className="gh-timeline">
            {growthRecords.map((record, index) => <div className="gh-timeline-item" key={record.id}><time>{record.date}</time><span className={`gh-timeline-dot is-${record.tone}`} /><div><span>{record.type}</span><strong>{record.title}</strong><p>{record.description}</p></div><div className="gh-item-actions"><button type="button" onClick={() => openEdit('record', index)} aria-label={`${record.title} 수정`}><i className="fa-solid fa-pen" /></button><button type="button" onClick={() => removeItem('record', index, record.title)} aria-label={`${record.title} 삭제`}><i className="fa-regular fa-trash-can" /></button></div></div>)}
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
              <div className="gh-form-row">
                <label><span>스킬명</span>
                  {/* 사전은 드롭다운으로 고른다. 자유 입력이 필요하면 「직접 입력」으로 칸이 바뀐다 —
                      datalist 는 브라우저 네이티브 팝업이라 모달 밖으로 뚫고 나와 쓰지 않는다. */}
                  {editor.fields.custom === '1' ? (
                    <>
                      <input required autoFocus placeholder="예: 포토샵, 전산회계" value={editor.fields.name} onChange={event => updateField('name', event.target.value)} />
                      <small><button type="button" className="gh-link-btn" onClick={() => updateField('custom', '')}>목록에서 고르기</button></small>
                    </>
                  ) : (
                    <select required value={editor.fields.name} onChange={event => pickSkillName(event.target.value)}>
                      <option value="" disabled>스킬을 선택하세요</option>
                      {SKILL_GROUPS.map(group => (
                        <optgroup key={group.category} label={group.category}>
                          {group.names.map(name => <option key={name} value={name}>{name}</option>)}
                        </optgroup>
                      ))}
                      <option value={SKILL_CUSTOM}>직접 입력…</option>
                    </select>
                  )}
                </label>
                <label><span>분류</span><select value={editor.fields.category} onChange={event => updateField('category', event.target.value)}>{SKILL_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
                <label><span>숙련도</span><select value={editor.fields.level} onChange={event => updateField('level', event.target.value)}>{[1, 2, 3, 4, 5].map(level => <option value={level} key={level}>{level}단계</option>)}</select></label>
              </div>
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
                <div className="gh-form-row"><label><span>활동일</span><input required type="date" value={editor.fields.date} onChange={event => updateField('date', event.target.value)} /></label><label><span>활동 유형</span><select value={editor.fields.category} onChange={event => updateField('category', event.target.value)}>{(Object.keys(RECORD_CATEGORY_LABEL) as GrowthRecordCategory[]).map(code => <option key={code} value={code}>{RECORD_CATEGORY_LABEL[code]}</option>)}</select></label></div>
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
