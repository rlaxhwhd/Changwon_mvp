import { useMemo, useState, type ReactNode } from 'react'
import type { ProfileData, Skill, Cert, Language, Award, Project, Resume } from '../data/portfolio'
import './ResumeSheet.css'

// ─────────────────────────────────────────────────────────────────────────
// 이력서 시트 — 포트폴리오 전체를 A4 한 장으로 펴 보여 준다.
//
// 학생의 「마이페이지 > 포트폴리오 > 이력서」 탭과 교직원 포털의 학생 상세
// 「포트폴리오」 탭이 같이 쓴다. 상담사가 보는 이력서가 학생이 보는 것과 다르면
// 상담이 성립하지 않으므로 한 벌만 둔다(CLAUDE.md 12조).
//
// 편집·이동은 주입받는다 — 넘기지 않으면 그 장치가 아예 그려지지 않는다.
// 교직원 쪽은 읽기 전용이라 아무것도 넘기지 않고, 탭 이동 링크도 v2 라우트라 못 쓴다.
// ─────────────────────────────────────────────────────────────────────────

export interface ResumeSheetProps {
  profile: ProfileData
  skills: Skill[]
  certs: Cert[]
  langs: Language[]
  awards: Award[]
  projects: Project[]
  resumes: Resume[]
  /** 없으면 인라인 편집 장치를 그리지 않는다(읽기 전용). */
  onProfileChange?: (p: ProfileData) => void
  /** 없으면 「탭에서 편집」 링크를 그리지 않는다. */
  onJumpTab?: (id: 'skills' | 'experience' | 'documents') => void
  /** 없으면 도구모음을 통째로 감춘다 — 인쇄만 남기지 않는다. */
  onExportPdf?: () => void
}

const SKILL_ORDER: Skill['category'][] = ['언어', '프레임워크', '도구', 'DB', '디자인']

export default function ResumeSheet({
  profile,
  skills,
  certs,
  langs,
  awards,
  projects,
  resumes,
  onProfileChange,
  onJumpTab,
  onExportPdf,
}: ResumeSheetProps) {
  const [editingField, setEditingField] = useState<null | 'intro' | 'contact' | 'name'>(null)
  const [draftProfile, setDraftProfile] = useState<ProfileData>(profile)
  const [pickedResumeId, setPickedResumeId] = useState<string>(resumes[0]?.id ?? '')

  const pickedResume = useMemo(
    () => resumes.find(r => r.id === pickedResumeId) ?? resumes[0] ?? null,
    [resumes, pickedResumeId],
  )

  // 편집을 안 받는 화면에서는 연필을 아예 그리지 않으므로 여기까지 오지 않는다.
  const editable = Boolean(onProfileChange)
  const startEdit = (field: NonNullable<typeof editingField>) => {
    setDraftProfile(profile)
    setEditingField(field)
  }
  const cancel = () => setEditingField(null)
  const save = () => {
    onProfileChange?.(draftProfile)
    setEditingField(null)
  }

  const skillsByCat = useMemo(() => {
    const out: Record<string, Skill[]> = {}
    for (const s of skills) {
      if (!out[s.category]) out[s.category] = []
      out[s.category].push(s)
    }
    return out
  }, [skills])

  const handlePrint = () => window.print()

  return (
    <section className="pf-resume-full">
      <div className="pf-resume-toolbar">
        <div className="pf-resume-toolbar-info">
          <i className="fa-solid fa-circle-info" />
          {editable
            ? '전체 이력서를 한 페이지로 보고 인라인 편집할 수 있어요. 각 섹션의 연필 아이콘을 눌러 수정하세요.'
            : '학생이 등록한 포트폴리오를 이력서 한 장으로 펼친 화면입니다. 여기서는 수정할 수 없습니다.'}
        </div>
        <div className="pf-resume-toolbar-actions">
          <button type="button" className="pf-resume-btn pf-resume-btn--ghost" onClick={handlePrint}>
            <i className="fa-solid fa-print" /> 인쇄
          </button>
          {onExportPdf && (
            <button type="button" className="pf-resume-btn pf-resume-btn--primary" onClick={onExportPdf}>
              <i className="fa-solid fa-file-pdf" /> PDF 내보내기
            </button>
          )}
        </div>
      </div>

      <div className="pf-resume-paper" id="resume-paper">
        {/* ── Header ────────────────────────────────────────────── */}
        <header className="pf-resume-header">
          <div className="pf-resume-name-block">
            {editingField === 'name' ? (
              <div className="pf-inline-edit">
                <input
                  type="text"
                  value={draftProfile.name}
                  onChange={e => setDraftProfile({ ...draftProfile, name: e.target.value })}
                  autoFocus
                />
                <div className="pf-inline-actions">
                  <button type="button" onClick={save} aria-label="저장"><i className="fa-solid fa-check" /></button>
                  <button type="button" onClick={cancel} aria-label="취소"><i className="fa-solid fa-xmark" /></button>
                </div>
              </div>
            ) : (
              <h2 className="pf-resume-name">
                {profile.name}
                {editable && (
                  <button type="button" className="pf-inline-edit-btn" onClick={() => startEdit('name')} aria-label="이름 수정">
                    <i className="fa-solid fa-pen" />
                  </button>
                )}
              </h2>
            )}
            <p className="pf-resume-title-line">
              {profile.dept} · {profile.grade} · {profile.school}
            </p>
          </div>

          <div className="pf-resume-contact-block">
            {editingField === 'contact' ? (
              <div className="pf-inline-edit pf-inline-edit--block">
                <label>
                  <span>이메일</span>
                  <input
                    type="text"
                    value={draftProfile.email}
                    onChange={e => setDraftProfile({ ...draftProfile, email: e.target.value })}
                  />
                </label>
                <label>
                  <span>휴대폰</span>
                  <input
                    type="text"
                    value={draftProfile.phone}
                    onChange={e => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                  />
                </label>
                <div className="pf-inline-actions">
                  <button type="button" onClick={save} aria-label="저장"><i className="fa-solid fa-check" /></button>
                  <button type="button" onClick={cancel} aria-label="취소"><i className="fa-solid fa-xmark" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="pf-resume-contact">
                  <span><i className="fa-solid fa-envelope" /> {profile.email}</span>
                  <span><i className="fa-solid fa-phone" /> {profile.phone}</span>
                  <span><i className="fa-solid fa-id-card" /> 학번 {profile.studentId}</span>
                  <span><i className="fa-solid fa-chart-line" /> GPA {profile.gpa}</span>
                </div>
                {editable && (
                  <button type="button" className="pf-inline-edit-btn pf-inline-edit-btn--block" onClick={() => startEdit('contact')}>
                    <i className="fa-solid fa-pen" /> 수정
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* ── 자기소개 ──────────────────────────────────────────── */}
        <ResumeBlock title="자기소개" onEdit={editable ? () => startEdit('intro') : undefined} editing={editingField === 'intro'}>
          {editingField === 'intro' ? (
            <div className="pf-inline-edit pf-inline-edit--block">
              <textarea
                rows={4}
                value={draftProfile.intro}
                onChange={e => setDraftProfile({ ...draftProfile, intro: e.target.value })}
                autoFocus
              />
              <div className="pf-inline-actions">
                <button type="button" onClick={save} aria-label="저장"><i className="fa-solid fa-check" /> 저장</button>
                <button type="button" onClick={cancel} aria-label="취소"><i className="fa-solid fa-xmark" /> 취소</button>
              </div>
            </div>
          ) : (
            <p className="pf-resume-text">{profile.intro}</p>
          )}
        </ResumeBlock>

        {/* ── 학력 ──────────────────────────────────────────────── */}
        <ResumeBlock title="학력">
          <div className="pf-resume-edu">
            <div className="pf-resume-edu-line">
              <strong>{profile.school}</strong>
              <span>{profile.dept} ({profile.major})</span>
            </div>
            <div className="pf-resume-edu-meta">
              <span>{profile.grade} 재학</span>
              <span>학점 <strong>{profile.gpa}</strong></span>
              <span>학번 {profile.studentId}</span>
            </div>
          </div>
        </ResumeBlock>

        {/* ── 보유 스킬 ─────────────────────────────────────────── */}
        <ResumeBlock title="보유 스킬" onJump={onJumpTab && (() => onJumpTab('skills'))}>
          <table className="pf-resume-skill-table">
            <tbody>
              {SKILL_ORDER.filter(cat => skillsByCat[cat]?.length).map(cat => (
                <tr key={cat}>
                  <th>{cat}</th>
                  <td>
                    {skillsByCat[cat].map(s => (
                      <span key={s.id} className="pf-resume-skill">
                        {s.name}
                        <small>({s.level}/5)</small>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResumeBlock>

        {/* ── 자격증 & 어학 ─────────────────────────────────────── */}
        <ResumeBlock title="자격증 · 어학" onJump={onJumpTab && (() => onJumpTab('skills'))}>
          <div className="pf-resume-2col">
            <div>
              <h5>자격증</h5>
              <ul>
                {certs.map(c => (
                  <li key={c.id}>
                    <strong>{c.name}</strong>
                    <span>{c.issuer} · {c.acquiredAt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5>어학</h5>
              <ul>
                {langs.map(l => (
                  <li key={l.id}>
                    <strong>{l.name} <em>{l.score}</em></strong>
                    <span>{l.test} · {l.acquiredAt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ResumeBlock>

        {/* ── 수상 ──────────────────────────────────────────────── */}
        <ResumeBlock title="수상 · 공모전" onJump={onJumpTab && (() => onJumpTab('experience'))}>
          <ul className="pf-resume-award-list">
            {awards.map(a => (
              <li key={a.id}>
                <div className="pf-resume-award-head">
                  <strong>{a.title}</strong>
                  <span className="pf-resume-award-rank">{a.rank}</span>
                  <span className="pf-resume-award-date">{a.date}</span>
                </div>
                <span className="pf-resume-award-host">{a.host}</span>
                <p>{a.description}</p>
              </li>
            ))}
          </ul>
        </ResumeBlock>

        {/* ── 프로젝트 ──────────────────────────────────────────── */}
        <ResumeBlock title="프로젝트" onJump={onJumpTab && (() => onJumpTab('experience'))}>
          <ul className="pf-resume-proj-list">
            {projects.map(p => (
              <li key={p.id}>
                <div className="pf-resume-proj-head">
                  <strong>{p.title}</strong>
                  <span>{p.period}</span>
                </div>
                <span className="pf-resume-proj-role">{p.role}</span>
                <p>{p.description}</p>
                <div className="pf-resume-proj-stack">
                  {p.stack.map(s => <span key={s}>{s}</span>)}
                </div>
                {p.link && (
                  <a className="pf-resume-proj-link" href={p.link} target="_blank" rel="noopener noreferrer">
                    <i className="fa-brands fa-github" /> {p.link.replace('https://', '')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </ResumeBlock>

        {/* ── 첨부 자소서 (선택 1개) ────────────────────────────── */}
        {resumes.length > 0 && (
          <ResumeBlock title="첨부 자소서" onJump={onJumpTab && (() => onJumpTab('documents'))}>
            <div className="pf-resume-attach-pick">
              <label>
                <span>첨부할 자소서</span>
                <select
                  value={pickedResumeId}
                  onChange={e => setPickedResumeId(e.target.value)}
                >
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title}{r.isAi ? ' (AI 작성)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {pickedResume && (
              <div className="pf-resume-attach-body">
                <div className="pf-resume-attach-meta">
                  <strong>{pickedResume.title}</strong>
                  <span>{pickedResume.company} · {pickedResume.position}</span>
                </div>
                <p>{pickedResume.content}</p>
              </div>
            )}
          </ResumeBlock>
        )}

        <footer className="pf-resume-footer">
          <span>국립창원대학교 드림캐치 · 자동 생성된 이력서</span>
          <span>{new Date().toLocaleDateString('ko-KR')}</span>
        </footer>
      </div>
    </section>
  )
}

function ResumeBlock({
  title,
  children,
  onEdit,
  onJump,
  editing,
}: {
  title: string
  children: ReactNode
  onEdit?: () => void
  onJump?: () => void
  editing?: boolean
}) {
  return (
    <section className="pf-resume-block">
      <header className="pf-resume-block-head">
        <h3>{title}</h3>
        <div className="pf-resume-block-actions">
          {onJump && !editing && (
            <button type="button" className="pf-resume-block-jump" onClick={onJump}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> 탭에서 편집
            </button>
          )}
          {onEdit && !editing && (
            <button type="button" className="pf-inline-edit-btn" onClick={onEdit} aria-label="섹션 수정">
              <i className="fa-solid fa-pen" />
            </button>
          )}
        </div>
      </header>
      <div className="pf-resume-block-body">{children}</div>
    </section>
  )
}
