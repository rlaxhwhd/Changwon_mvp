import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getActiveCounselor, getCounselorById, getReassignableCounselors } from '../data/counselors'
import {
  getRequestById,
  getCounselStudentProfile,
  confirmRequest,
  rescheduleRequest,
  rejectRequest,
  completeRequest,
  reassignRequest,
} from '../data/counselRequests'
import type { CounselRequest, CounselRequestStatus } from '../data/schema/counselRequest'
import { getMergedRoadmap, saveRoadmapOverride, resetRoadmapOverride, TERM_ORDER } from '../data/roadmapOverrides'
import type { TermDetail, TermItem, TermLabel } from '../../src_v2/data/students'
import { enrollStatusClass } from '../data/studentRoster'
import EmptyState from '../components/EmptyState'

const STATUS_CLASS: Record<CounselRequestStatus, string> = {
  대기: 'is-waiting', 확정: 'is-confirmed', 완료: 'is-complete', 취소: 'is-cancelled',
}
const PRIORITIES: TermItem['priority'][] = ['P0', 'P1', 'P2']
const IMPORTANCES: TermItem['importance'][] = ['필수', '중요', '권장']

function requestTypeLabel(r: CounselRequest) { return r.type === '심리' ? '심리상담' : '진로취업 상담' }

// ── 상담 액션 존 (확정/일정변경/취소/완료 + 재배정) ─────────────────────────
function ActionZone({ request }: { request: CounselRequest }) {
  const counselor = getActiveCounselor()
  const [date, setDate] = useState(request.slot?.date ?? request.requestedAt.slice(0, 10))
  const [start, setStart] = useState(request.slot?.start ?? '')
  const [end, setEnd] = useState(request.slot?.end ?? '')
  const [place, setPlace] = useState(request.slot?.place ?? '')
  const [assignee, setAssignee] = useState(request.assignedCounselorId ?? counselor.id)
  const reassignable = getReassignableCounselors(counselor.id)
  const done = request.status === '완료' || request.status === '취소'
  const valid = Boolean(date && start && end && start < end)
  const reload = () => window.location.reload()

  if (done) {
    return <p className="admin-detail-note">이 상담은 <strong>{request.status}</strong> 상태입니다. 추가 조치가 없습니다.</p>
  }
  return (
    <div className="counsel-action-zone">
      <div className="counsel-detail-form-grid">
        <label><span>날짜</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label><span>시작</span><input type="time" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label><span>종료</span><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className="is-wide"><span>장소 / 링크</span><input value={place} onChange={e => setPlace(e.target.value)} placeholder="상담실 또는 화상 링크" /></label>
      </div>
      <div className="counsel-action-buttons">
        {request.status === '대기' && (
          <button type="button" className="counsel-outline-btn is-danger" onClick={() => { rejectRequest(request.id); reload() }}>신청 취소</button>
        )}
        {request.status === '확정' && (
          <button type="button" className="counsel-outline-btn" onClick={() => { completeRequest(request.id); reload() }}>상담 완료 처리</button>
        )}
        <button
          type="button" className="counsel-primary-btn" disabled={!valid}
          onClick={() => { const slot = { date, start, end, place: place.trim() || undefined }; request.status === '확정' ? rescheduleRequest(request.id, slot) : confirmRequest(request.id, slot); reload() }}
        >{request.status === '확정' ? '일정 변경' : '상담 확정'}</button>
      </div>
      {reassignable.length > 0 && (
        <div className="counsel-reassign-row">
          <label><span>담당 재배정</span>
            <select value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value={counselor.id}>{counselor.name} (현재)</option>
              {reassignable.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button type="button" className="counsel-outline-btn" disabled={assignee === request.assignedCounselorId} onClick={() => { reassignRequest(request.id, assignee); reload() }}>재배정</button>
        </div>
      )}
    </div>
  )
}

// ── AI 진로 로드맵 (편집 가능 — roadmapOverrides 재사용) ─────────────────────
function RoadmapEditable({ studentId }: { studentId: string }) {
  const counselor = getActiveCounselor()
  const merged = getMergedRoadmap(studentId)
  const [draft, setDraft] = useState<Partial<Record<TermLabel, TermDetail>>>(() => {
    const out: Partial<Record<TermLabel, TermDetail>> = {}
    for (const l of TERM_ORDER) { const d = merged?.phase.termDetails?.[l]; if (d) out[l] = { ...d, items: d.items.map(i => ({ ...i })) } }
    return out
  })
  const [saved, setSaved] = useState(false)
  if (!merged) return <p className="admin-detail-note">이 학생은 편집 가능한 상세 로드맵이 없습니다.</p>

  const update = (l: TermLabel, patch: Partial<TermDetail>) => setDraft(p => p[l] ? { ...p, [l]: { ...p[l]!, ...patch } } : p)
  const updateItem = (l: TermLabel, i: number, patch: Partial<TermItem>) => setDraft(p => p[l] ? { ...p, [l]: { ...p[l]!, items: p[l]!.items.map((it, x) => x === i ? { ...it, ...patch } : it) } } : p)
  const addItem = (l: TermLabel) => setDraft(p => p[l] ? { ...p, [l]: { ...p[l]!, items: [...p[l]!.items, { title: '', priority: 'P1', importance: '중요', why: '' }] } } : p)
  const removeItem = (l: TermLabel, i: number) => setDraft(p => p[l] ? { ...p, [l]: { ...p[l]!, items: p[l]!.items.filter((_, x) => x !== i) } } : p)

  const save = () => {
    saveRoadmapOverride(studentId, draft, counselor.id, '학생 상세 화면 로드맵 수정')
    setSaved(true); window.setTimeout(() => window.location.reload(), 500)
  }
  const reset = () => { if (window.confirm('상담사 수정분을 지우고 학생 원본 로드맵으로 되돌립니다. 계속할까요?')) { resetRoadmapOverride(studentId); window.location.reload() } }

  return (
    <>
      <p className="admin-editor-hint"><i className="fa-solid fa-circle-info" /> 학생 원본 JSON은 불변입니다. 확정하면 수정분만 override로 저장되어 학생 화면에 병합됩니다.</p>
      <div className="counsel-roadmap-cols">
        {TERM_ORDER.map(label => {
          const d = draft[label]
          if (!d) return null
          return (
            <section key={label} className="counsel-roadmap-term">
              <div className="counsel-roadmap-term-head">
                <span className={`admin-term-badge term-${label}`}>{label}</span>
                <span className="counsel-roadmap-period">{d.period}</span>
              </div>
              <input className="counsel-roadmap-headline" value={d.headline} onChange={e => update(label, { headline: e.target.value })} placeholder="이 구간의 핵심 목표 한 줄" />
              {d.items.map((it, i) => (
                <div key={i} className="counsel-roadmap-item">
                  <div className="counsel-roadmap-item-top">
                    <input value={it.title} onChange={e => updateItem(label, i, { title: e.target.value })} placeholder="항목 제목" />
                    <button type="button" className="admin-icon-btn danger" title="삭제" onClick={() => removeItem(label, i)}><i className="fa-solid fa-trash" /></button>
                  </div>
                  <div className="counsel-roadmap-item-selects">
                    <select value={it.priority} onChange={e => updateItem(label, i, { priority: e.target.value as TermItem['priority'] })}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
                    <select value={it.importance} onChange={e => updateItem(label, i, { importance: e.target.value as TermItem['importance'] })}>{IMPORTANCES.map(im => <option key={im} value={im}>{im}</option>)}</select>
                  </div>
                  <textarea rows={2} value={it.why} onChange={e => updateItem(label, i, { why: e.target.value })} placeholder="이 항목이 필요한 이유" />
                </div>
              ))}
              <button type="button" className="counsel-outline-btn sm" onClick={() => addItem(label)}><i className="fa-solid fa-plus" /> 항목 추가</button>
            </section>
          )
        })}
      </div>
      <div className="counsel-roadmap-actions">
        {merged.meta && <button type="button" className="counsel-outline-btn is-danger" onClick={reset}><i className="fa-solid fa-rotate-left" /> 원본으로 초기화</button>}
        <button type="button" className="counsel-primary-btn" disabled={saved} onClick={save}><i className="fa-solid fa-check" /> {saved ? '저장됨' : '로드맵 수정 저장'}</button>
      </div>
    </>
  )
}

// ── 막대 그래프 (진단·직무 공용) ──────────────────────────────────────────
function Bar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div className="counsel-bar">
      <div className="counsel-bar-head"><span>{label}</span><strong>{value}{max === 100 ? '' : `/${max}`}</strong></div>
      <div className="counsel-bar-track"><span style={{ width: `${pct}%`, background: color ?? 'var(--color-primary)' }} /></div>
    </div>
  )
}

export default function CounselStudentDetail() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const request = requestId ? getRequestById(requestId) : undefined
  const profile = request ? getCounselStudentProfile(request.studentId) : undefined

  if (!request || !profile) {
    return (
      <div className="admin-page">
        <header className="admin-page-head"><div><h1 className="admin-page-title">학생 상세 정보</h1></div></header>
        <section className="admin-card"><EmptyState icon="fa-regular fa-face-frown" message="해당 상담 신청을 찾을 수 없습니다." action={{ label: '신청 접수함으로', onClick: () => navigate('/counsel/requests') }} /></section>
      </div>
    )
  }

  const d = profile.detailed
  const assignee = getCounselorById(request.assignedCounselorId)

  return (
    <div className="admin-page counsel-detail-page">
      <header className="admin-page-head">
        <div>
          <nav className="counsel-breadcrumb"><Link to="/counsel/requests">상담 관리</Link> › <Link to="/counsel/requests">신청 접수함</Link> › <span>학생 상세 정보</span></nav>
          <h1 className="admin-page-title">
            {profile.name} <span className="counsel-detail-no">{profile.studentNo}</span>
            <span className={enrollStatusClass(profile.enrollmentStatus)}>{profile.enrollmentStatus}</span>
          </h1>
          <p className="admin-page-desc">{profile.major} · {profile.grade}학년 · {profile.iap.iapType} {profile.iap.label}</p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => navigate('/counsel/requests')}><i className="fa-solid fa-arrow-left" /> 접수함으로</button>
        </div>
      </header>

      <div className="counsel-detail-layout">
        <div className="counsel-detail-main">
          {/* 학생 기본 + 이번 상담 */}
          <section className="admin-card">
            <div className="admin-card-head"><h2><i className="fa-solid fa-user" /> 학생 기본 · 이번 상담</h2></div>
            <dl className="counsel-profile-grid">
              <div><dt>학과 · 학년</dt><dd>{profile.major} · {profile.grade}학년</dd></div>
              <div><dt>휴대폰</dt><dd>{profile.phone}</dd></div>
              <div><dt>학적</dt><dd>{profile.enrollmentStatus}</dd></div>
              <div><dt>진단 유형</dt><dd>{profile.studentType} · {profile.iap.iapType}</dd></div>
              <div><dt>성적</dt><dd>{profile.gpa}</dd></div>
              <div><dt>어학</dt><dd>{profile.language}</dd></div>
              <div className="is-wide"><dt>목표 기업</dt><dd>{profile.targetCompanySummary}</dd></div>
              <div><dt>상담 유형</dt><dd><span className={`counsel-type-badge ${request.type === '심리' ? 'is-psych' : ''}`}>{requestTypeLabel(request)}</span></dd></div>
              <div><dt>상태</dt><dd><span className={`counsel-status-badge ${STATUS_CLASS[request.status]}`}>{request.status}</span></dd></div>
              <div className="is-wide"><dt>상담 주제</dt><dd>{request.topic}</dd></div>
              <div><dt>일정</dt><dd>{request.slot ? `${request.slot.date} ${request.slot.start}–${request.slot.end}` : '미확정'}</dd></div>
              <div><dt>담당</dt><dd>{assignee?.name ?? '미배정'}</dd></div>
            </dl>
            <div className="counsel-detail-subhead">상담 처리</div>
            <ActionZone request={request} />
          </section>

          {/* 진단 결과 + AI 코멘트 */}
          {d && (
            <section className="admin-card">
              <div className="admin-card-head"><h2><i className="fa-solid fa-chart-simple" /> 진단 결과 · AI 코멘트</h2></div>
              <div className="counsel-diag-cols">
                <div>
                  <h3 className="counsel-detail-h3">유형 진단</h3>
                  {Object.entries(d.typeScores).map(([k, v]) => (
                    <Bar key={k} label={k} value={v === '상' ? 90 : v === '중' ? 60 : 30} color="var(--color-primary)" />
                  ))}
                </div>
                <div>
                  <h3 className="counsel-detail-h3">강점 · 약점</h3>
                  {d.strengthWeakness.map(sw => (
                    <Bar key={sw.label} label={sw.label} value={sw.value} color={sw.type === 'strength' ? 'var(--color-success)' : 'var(--color-danger)'} />
                  ))}
                </div>
              </div>
              <div className="counsel-ai-comment"><i className="fa-solid fa-robot" /><p>{d.insight}</p></div>
            </section>
          )}

          {/* AI 진로 로드맵 (편집) */}
          <section className="admin-card">
            <div className="admin-card-head"><h2><i className="fa-solid fa-route" /> AI 진로 로드맵 <span className="counsel-detail-tag">편집 가능</span></h2></div>
            {d ? <RoadmapEditable studentId={profile.id} /> : <p className="admin-detail-note">{profile.roadmapSummary}</p>}
          </section>

          {/* 직무 로드맵 */}
          {d && (
            <section className="admin-card">
              <div className="admin-card-head"><h2><i className="fa-solid fa-diagram-project" /> 직무 로드맵 — {d.jobField}</h2></div>
              <div className="counsel-diag-cols">
                <div>
                  <h3 className="counsel-detail-h3">직무 역량</h3>
                  {d.jobSkills.map(s => <Bar key={s.label} label={s.label} value={s.score} max={s.max} color={s.color} />)}
                </div>
                <div>
                  <h3 className="counsel-detail-h3">추천 기업 (매칭도)</h3>
                  {d.jobs.slice(0, 4).map(j => (
                    <div key={j.id} className="counsel-job-row"><strong>{j.company}</strong><span>{j.role}</span><em>{j.match}%</em></div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 종합 AI 코멘트 */}
          {d && (
            <section className="admin-card">
              <div className="admin-card-head"><h2><i className="fa-solid fa-lightbulb" /> 종합 AI 코멘트</h2></div>
              <div className="counsel-ai-comment is-coach"><i className="fa-solid fa-user-graduate" /><p>{d.finalRoadmap.coach}</p></div>
              <div className="counsel-insight-list">
                {d.finalRoadmap.insights.map((ins, i) => (
                  <div key={i} className="counsel-insight-item"><span className="counsel-insight-tag">{ins.tag}</span><strong>{ins.title}</strong><p>{ins.desc}</p></div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 우측: AI 추천 질문 (상담 진행 중 참고) */}
        <aside className="counsel-detail-aside">
          <section className="admin-card counsel-questions-card">
            <div className="admin-card-head"><h2><i className="fa-solid fa-comments" /> AI 추천 질문</h2></div>
            <p className="counsel-questions-desc">이 학생의 정보·고민을 토대로 AI가 제안하는 상담 질문입니다. 상담을 진행하며 참고하세요.</p>
            {profile.counselorQuestions.length === 0 ? (
              <p className="admin-detail-note">추천 질문이 없습니다.</p>
            ) : (
              <ol className="counsel-questions-list">
                {profile.counselorQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
