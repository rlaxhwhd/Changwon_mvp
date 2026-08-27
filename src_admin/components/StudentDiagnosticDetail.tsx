import { LuBot, LuChartColumn, LuCheck, LuGraduationCap, LuInfo, LuLightbulb, LuPlus, LuRotateCcw, LuRoute, LuTrash2, LuWorkflow } from 'react-icons/lu'
import { useState } from 'react'
import { getActiveCounselor } from '../data/counselors'
import { getMergedRoadmap, saveRoadmapOverride, resetRoadmapOverride } from '../data/roadmapOverrides'
import { ROADMAP_AXES } from '../../src_v2/data/schema/roadmap'
import type { CellImportance, CellPriority, RoadmapAxis, RoadmapAxisPlan, RoadmapCell } from '../../src_v2/data/schema/roadmap'
import type { StudentData } from '../../src_v2/data/students'

const PRIORITIES: CellPriority[] = ['P0', 'P1', 'P2']
const IMPORTANCES: CellImportance[] = ['필수', '중요', '권장']

let cellSeq = 0

/** 막대 그래프 (진단·직무 공용) */
function Bar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div className="counsel-bar">
      <div className="counsel-bar-head"><span>{label}</span><strong>{value}{max === 100 ? '' : `/${max}`}</strong></div>
      <div className="counsel-bar-track"><span style={{ width: `${pct}%`, background: color ?? 'var(--color-primary)' }} /></div>
    </div>
  )
}

/** 로드맵 3축 (편집 가능 — roadmapOverrides 재사용, 학생 원본 JSON 불변) */
function RoadmapEditable({ studentId }: { studentId: string }) {
  const counselor = getActiveCounselor()
  const merged = getMergedRoadmap(studentId)
  const [draft, setDraft] = useState<Partial<Record<RoadmapAxis, RoadmapAxisPlan>>>(() => {
    const out: Partial<Record<RoadmapAxis, RoadmapAxisPlan>> = {}
    for (const a of merged?.axes ?? []) out[a.axis] = { ...a, cells: a.cells.map(c => ({ ...c })) }
    return out
  })
  const [saved, setSaved] = useState(false)
  if (!merged) return <p className="admin-detail-note">이 학생은 편집 가능한 상세 로드맵이 없습니다.</p>

  const update = (a: RoadmapAxis, patch: Partial<RoadmapAxisPlan>) => setDraft(p => p[a] ? { ...p, [a]: { ...p[a]!, ...patch } } : p)
  const updateCell = (a: RoadmapAxis, i: number, patch: Partial<RoadmapCell>) => setDraft(p => p[a] ? { ...p, [a]: { ...p[a]!, cells: p[a]!.cells.map((c, x) => x === i ? { ...c, ...patch } : c) } } : p)
  const addCell = (a: RoadmapAxis) => setDraft(p => p[a] ? { ...p, [a]: { ...p[a]!, cells: [...p[a]!.cells, { id: `${a.toLowerCase()}-new-${(cellSeq += 1)}`, title: '', priority: 'P1', importance: '중요', why: '', status: 'TODO' }] } } : p)
  const removeCell = (a: RoadmapAxis, i: number) => setDraft(p => p[a] ? { ...p, [a]: { ...p[a]!, cells: p[a]!.cells.filter((_, x) => x !== i) } } : p)

  const save = () => { saveRoadmapOverride(studentId, draft, counselor.id, '상담 진행 화면 로드맵 수정'); setSaved(true); window.setTimeout(() => window.location.reload(), 500) }
  const reset = () => { if (window.confirm('상담사 수정분을 지우고 학생 원본 로드맵으로 되돌립니다. 계속할까요?')) { resetRoadmapOverride(studentId); window.location.reload() } }

  return (
    <>
      <p className="admin-editor-hint"><LuInfo /> 학생 원본 JSON은 불변입니다. 확정하면 수정분만 override로 저장되어 학생 화면에 병합됩니다. 프로그램에서 편입된 IAP 칸은 여기서 편집하지 않습니다.</p>
      <div className="counsel-roadmap-cols">
        {ROADMAP_AXES.map(meta => {
          const d = draft[meta.code]
          if (!d) return null
          return (
            <section key={meta.code} className="counsel-roadmap-term">
              <div className="counsel-roadmap-term-head"><span className={`admin-axis-badge axis-${meta.code}`}>{meta.label}</span><span className="counsel-roadmap-period">{d.cells.length}칸</span></div>
              <input className="counsel-roadmap-headline" value={d.headline} onChange={e => update(meta.code, { headline: e.target.value })} placeholder="이 축의 핵심 목표 한 줄" />
              {d.cells.map((cell, i) => (
                <div key={cell.id} className="counsel-roadmap-item">
                  <div className="counsel-roadmap-item-top">
                    <input value={cell.title} onChange={e => updateCell(meta.code, i, { title: e.target.value })} placeholder="칸 제목" />
                    <button type="button" className="admin-icon-btn danger" title="삭제" onClick={() => removeCell(meta.code, i)}><LuTrash2 /></button>
                  </div>
                  <div className="counsel-roadmap-item-selects">
                    <select value={cell.priority} onChange={e => updateCell(meta.code, i, { priority: e.target.value as CellPriority })}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
                    <select value={cell.importance} onChange={e => updateCell(meta.code, i, { importance: e.target.value as CellImportance })}>{IMPORTANCES.map(im => <option key={im} value={im}>{im}</option>)}</select>
                    <select value={cell.status} onChange={e => updateCell(meta.code, i, { status: e.target.value as RoadmapCell['status'] })}><option value="TODO">미수행</option><option value="DONE">수행</option></select>
                  </div>
                  <textarea rows={2} value={cell.why} onChange={e => updateCell(meta.code, i, { why: e.target.value })} placeholder="이 칸이 필요한 이유" />
                </div>
              ))}
              <button type="button" className="counsel-outline-btn sm" onClick={() => addCell(meta.code)}><LuPlus /> 칸 추가</button>
            </section>
          )
        })}
      </div>
      <div className="counsel-roadmap-actions">
        {merged.meta && <button type="button" className="counsel-outline-btn is-danger" onClick={reset}><LuRotateCcw /> 원본으로 초기화</button>}
        <button type="button" className="counsel-primary-btn" disabled={saved} onClick={save}><LuCheck /> {saved ? '저장됨' : '로드맵 수정 저장'}</button>
      </div>
    </>
  )
}

/** 상담 진행 화면 좌측 — 학생 진단결과 상세(진단 그래프·AI코멘트·로드맵·직무·종합코멘트·AI추천질문) */
export default function StudentDiagnosticDetail({ student }: { student: StudentData }) {
  const fr = student.finalRoadmap
  return (
    <>
      <div className="counsel-detail-subhead"><LuChartColumn /> 진단 결과 · AI 코멘트</div>
      <div className="counsel-diag-cols">
        <div>
          <h3 className="counsel-detail-h3">유형 진단</h3>
          {(Object.entries(student.typeScores) as [string, string][]).map(([k, v]) => (
            <Bar key={k} label={k} value={v === '상' ? 90 : v === '중' ? 60 : 30} color="var(--color-primary)" />
          ))}
        </div>
        <div>
          <h3 className="counsel-detail-h3">강점 · 약점</h3>
          {student.strengthWeakness.map(sw => (
            <Bar key={sw.label} label={sw.label} value={sw.value} color={sw.type === 'strength' ? 'var(--color-success)' : 'var(--color-danger)'} />
          ))}
        </div>
      </div>
      <div className="counsel-ai-comment"><LuBot /><p>{student.insight}</p></div>

      <div className="counsel-detail-subhead"><LuRoute /> AI 진로 로드맵 <span className="counsel-detail-tag">편집 가능</span></div>
      <RoadmapEditable studentId={student.id} />

      <div className="counsel-detail-subhead"><LuWorkflow /> 직무 로드맵 — {student.jobField}</div>
      <div className="counsel-diag-cols">
        <div>
          <h3 className="counsel-detail-h3">직무 역량</h3>
          {student.jobSkills.map(s => <Bar key={s.label} label={s.label} value={s.score} max={s.max} color={s.color} />)}
        </div>
        <div>
          <h3 className="counsel-detail-h3">추천 기업 (매칭도)</h3>
          {student.jobs.slice(0, 4).map(j => (
            <div key={j.id} className="counsel-job-row"><strong>{j.company}</strong><span>{j.role}</span><em>{j.match}%</em></div>
          ))}
        </div>
      </div>

      <div className="counsel-detail-subhead"><LuLightbulb /> 종합 AI 코멘트</div>
      <div className="counsel-ai-comment is-coach"><LuGraduationCap /><p>{fr.coach}</p></div>
      <div className="counsel-insight-list">
        {fr.insights.map((ins, i) => (
          <div key={i} className="counsel-insight-item"><span className="counsel-insight-tag">{ins.tag}</span><strong>{ins.title}</strong><p>{ins.desc}</p></div>
        ))}
      </div>
    </>
  )
}
