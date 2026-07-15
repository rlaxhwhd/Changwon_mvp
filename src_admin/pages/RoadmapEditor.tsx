import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import { STUDENTS } from '../../src_v2/data/students'
import type { TermDetail, TermItem, TermLabel } from '../../src_v2/data/students'
import {
  getMergedRoadmap,
  saveRoadmapOverride,
  resetRoadmapOverride,
  TERM_ORDER,
} from '../data/roadmapOverrides'
import EmptyState from '../components/EmptyState'

const PRIORITIES: TermItem['priority'][] = ['P0', 'P1', 'P2']
const IMPORTANCES: TermItem['importance'][] = ['필수', '중요', '권장']

/** 새 항목 기본값 */
function blankItem(): TermItem {
  return { title: '', priority: 'P1', importance: '중요', why: '' }
}

/** 새 term 상세 기본값 (base 에 해당 term 이 없을 때 추가용) */
function blankTerm(label: TermLabel): TermDetail {
  const period = label === '단기' ? '1학기' : label === '중기' ? '1년' : '졸업 전'
  return { period, headline: '', rationale: '', items: [] }
}

type Draft = Partial<Record<TermLabel, TermDetail>>

/** 편집 대상 term 상세를 깊은 복사해 draft 로 만든다 */
function cloneTerms(src: Partial<Record<TermLabel, TermDetail>>): Draft {
  const out: Draft = {}
  for (const label of TERM_ORDER) {
    const d = src[label]
    if (d) {
      out[label] = {
        ...d,
        items: d.items.map(it => ({ ...it })),
      }
    }
  }
  return out
}

/** draft 를 base 원본과 비교해 변경된 term 만 override 로 추출 */
function diffOverride(
  draft: Draft,
  base: Partial<Record<TermLabel, TermDetail>>,
): Draft {
  const out: Draft = {}
  for (const label of TERM_ORDER) {
    const d = draft[label]
    if (!d) continue
    if (JSON.stringify(d) !== JSON.stringify(base[label])) {
      out[label] = d
    }
  }
  return out
}

export default function RoadmapEditor() {
  const { studentId } = useParams<{ studentId: string }>()
  const counselor = getActiveCounselor()

  const student = STUDENTS.find(s => s.id === studentId)
  // base 원본(override 미반영) — diff 비교 기준
  const basePhase = student?.phases.find(p => p.num === 3) ?? null
  const baseTerms = cloneTerms(basePhase?.termDetails ?? {})

  const merged = studentId ? getMergedRoadmap(studentId) : null

  // draft 초기값 = 병합 결과(base ⊕ 기존 override) 깊은 복사
  const [draft, setDraft] = useState<Draft>(() => cloneTerms(merged?.phase.termDetails ?? {}))
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  if (!student || !basePhase || !merged) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">로드맵 편집</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon="fa-regular fa-face-frown"
            message="해당 학생의 로드맵을 찾을 수 없습니다."
            action={{ label: '학생 목록으로', onClick: () => { window.location.href = '/admin/students' } }}
          />
        </section>
      </div>
    )
  }

  const overrideDiff = diffOverride(draft, baseTerms)
  const dirty = Object.keys(overrideDiff).length > 0

  // ── draft 변경 헬퍼 ──────────────────────────────────────────────────────
  const updateTerm = (label: TermLabel, patch: Partial<TermDetail>) =>
    setDraft(prev => {
      const cur = prev[label]
      if (!cur) return prev
      return { ...prev, [label]: { ...cur, ...patch } }
    })

  const addTerm = (label: TermLabel) =>
    setDraft(prev => ({ ...prev, [label]: blankTerm(label) }))

  const updateItem = (label: TermLabel, idx: number, patch: Partial<TermItem>) =>
    setDraft(prev => {
      const cur = prev[label]
      if (!cur) return prev
      const items = cur.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
      return { ...prev, [label]: { ...cur, items } }
    })

  const addItem = (label: TermLabel) =>
    setDraft(prev => {
      const cur = prev[label]
      if (!cur) return prev
      return { ...prev, [label]: { ...cur, items: [...cur.items, blankItem()] } }
    })

  const removeItem = (label: TermLabel, idx: number) =>
    setDraft(prev => {
      const cur = prev[label]
      if (!cur) return prev
      return { ...prev, [label]: { ...cur, items: cur.items.filter((_, i) => i !== idx) } }
    })

  // ── 확정 저장 ────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const changedLabels = Object.keys(overrideDiff) as TermLabel[]
    const autoNote =
      note.trim() ||
      changedLabels
        .map(l => `${l} ${overrideDiff[l]?.items.length ?? 0}건`)
        .join(' · ') ||
      '로드맵 수정'
    saveRoadmapOverride(student.id, overrideDiff, counselor.id, autoNote)
    setSaved(true)
    window.setTimeout(() => window.location.reload(), 600)
  }

  const handleReset = () => {
    if (!window.confirm('상담사 수정분을 모두 삭제하고 학생 원본 로드맵으로 되돌립니다. 계속할까요?')) return
    resetRoadmapOverride(student.id)
    window.location.reload()
  }

  const invalidItems = (Object.values(draft) as TermDetail[]).some(d =>
    d.items.some(it => it.title.trim() === ''),
  )

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <i className="fa-solid fa-pen-ruler" /> 로드맵 편집 — {student.name}
          </h1>
          <p className="admin-page-desc">
            {student.major} · {student.grade}학년 · 목표 {student.targetCompany.name} {student.targetRole}
            {merged.meta && (
              <> · 현재 v{merged.meta.version} {merged.meta.confirmed ? '확정' : ''}</>
            )}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to={`/students/${student.id}`} className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-user" /> 학생 상세
          </Link>
          <Link to="/roadmap/requests" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-inbox" /> 변경 요청함
          </Link>
        </div>
      </header>

      <div className="admin-editor-hint">
        <i className="fa-solid fa-circle-info" />
        학생 원본 로드맵(JSON)은 변경되지 않습니다. 확정하면 수정분만 override 로 저장되어 학생 화면에 병합·반영됩니다.
      </div>

      {/* 편집 영역 — 단·중·장기 컬럼 */}
      <div className="admin-editor-cols">
        {TERM_ORDER.map(label => {
          const detail = draft[label]
          const origin = merged.origin[label]
          return (
            <section key={label} className="admin-editor-col admin-card">
              <div className="admin-editor-col-head">
                <h2>
                  <span className={`admin-term-badge term-${label}`}>{label}</span>
                  {origin === 'override' && !dirty && <span className="admin-tag admin-tag-override">저장된 수정</span>}
                </h2>
              </div>

              {!detail ? (
                <div className="admin-editor-empty">
                  <p>이 구간에는 계획이 없습니다.</p>
                  <button className="admin-btn admin-btn-ghost sm" onClick={() => addTerm(label)}>
                    <i className="fa-solid fa-plus" /> {label} 계획 추가
                  </button>
                </div>
              ) : (
                <>
                  <label className="admin-field">
                    <span>기간</span>
                    <input
                      type="text"
                      value={detail.period}
                      onChange={e => updateTerm(label, { period: e.target.value })}
                      placeholder="예: 1학기 · ~2026.08"
                    />
                  </label>
                  <label className="admin-field">
                    <span>헤드라인</span>
                    <input
                      type="text"
                      value={detail.headline}
                      onChange={e => updateTerm(label, { headline: e.target.value })}
                      placeholder="이 구간의 핵심 목표 한 줄"
                    />
                  </label>
                  <label className="admin-field">
                    <span>근거(rationale)</span>
                    <textarea
                      rows={3}
                      value={detail.rationale}
                      onChange={e => updateTerm(label, { rationale: e.target.value })}
                      placeholder="왜 이 구간에 이 목표들을 배치했는지"
                    />
                  </label>

                  <div className="admin-editor-items">
                    <span className="admin-record-label">항목 ({detail.items.length})</span>
                    {detail.items.length === 0 && (
                      <p className="admin-editor-items-empty">항목이 없습니다. 아래에서 추가하세요.</p>
                    )}
                    {detail.items.map((it, idx) => (
                      <div key={idx} className="admin-item-editor">
                        <div className="admin-item-editor-row">
                          <input
                            type="text"
                            className={`admin-item-title-input${it.title.trim() === '' ? ' invalid' : ''}`}
                            value={it.title}
                            onChange={e => updateItem(label, idx, { title: e.target.value })}
                            placeholder="항목 제목"
                          />
                          <button
                            className="admin-icon-btn danger"
                            title="삭제"
                            onClick={() => removeItem(label, idx)}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                        <div className="admin-item-editor-selects">
                          <label>
                            <span>우선순위</span>
                            <select
                              value={it.priority}
                              onChange={e => updateItem(label, idx, { priority: e.target.value as TermItem['priority'] })}
                            >
                              {PRIORITIES.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>중요도</span>
                            <select
                              value={it.importance}
                              onChange={e => updateItem(label, idx, { importance: e.target.value as TermItem['importance'] })}
                            >
                              {IMPORTANCES.map(im => (
                                <option key={im} value={im}>{im}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <textarea
                          className="admin-item-why-input"
                          rows={2}
                          value={it.why}
                          onChange={e => updateItem(label, idx, { why: e.target.value })}
                          placeholder="이 항목이 필요한 이유 (why)"
                        />
                      </div>
                    ))}
                    <button className="admin-btn admin-btn-ghost sm" onClick={() => addItem(label)}>
                      <i className="fa-solid fa-plus" /> 항목 추가
                    </button>
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>

      {/* 병합 미리보기 + 확정 */}
      <section className="admin-card admin-editor-confirm">
        <div className="admin-card-head">
          <h2><i className="fa-solid fa-eye" /> 병합 미리보기 · 확정</h2>
        </div>
        {!dirty ? (
          <p className="admin-detail-note">변경 사항이 없습니다. 항목을 편집하면 여기에 미리보기가 표시됩니다.</p>
        ) : (
          <div className="admin-preview">
            {(Object.keys(overrideDiff) as TermLabel[]).map(label => {
              const d = overrideDiff[label]!
              return (
                <div key={label} className="admin-preview-term">
                  <div className="admin-preview-term-head">
                    <span className={`admin-term-badge term-${label}`}>{label}</span>
                    <span className="admin-tag admin-tag-override">수정</span>
                    <span className="admin-term-period">{d.period}</span>
                  </div>
                  {d.headline && <p className="admin-term-headline">{d.headline}</p>}
                  <ul className="admin-term-items">
                    {d.items.map((it, i) => (
                      <li key={i}>
                        <span className={`admin-pri admin-pri-${it.priority}`}>{it.priority}</span>
                        <span className={`admin-imp admin-imp-${it.importance}`}>{it.importance}</span>
                        <span className="admin-term-item-title">{it.title || <em>(제목 없음)</em>}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        <label className="admin-field admin-editor-note">
          <span>변경 메모 (선택)</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="예: 학생 요청 반영 — 단기 어학 목표 상향"
          />
        </label>

        {invalidItems && dirty && (
          <p className="admin-form-hint admin-form-hint-warn">
            제목이 비어 있는 항목이 있습니다. 저장 전 모두 입력하세요.
          </p>
        )}

        <div className="admin-form-actions">
          {merged.meta && (
            <button className="admin-btn admin-btn-danger-ghost" onClick={handleReset}>
              <i className="fa-solid fa-rotate-left" /> 원본으로 초기화
            </button>
          )}
          <button
            className="admin-btn admin-btn-primary"
            disabled={!dirty || invalidItems || saved}
            onClick={handleConfirm}
          >
            <i className="fa-solid fa-check" /> {saved ? '확정 저장됨' : `확정 (v${(merged.meta?.version ?? 0) + 1})`}
          </button>
        </div>
      </section>

      {/* 변경 이력 */}
      {merged.meta && merged.meta.history.length > 0 && (
        <section className="admin-card">
          <div className="admin-card-head"><h2><i className="fa-solid fa-clock-rotate-left" /> 변경 이력</h2></div>
          <ul className="admin-rm-history-list">
            {[...merged.meta.history].reverse().map(h => (
              <li key={h.version} className="admin-rm-history-item">
                <span className="admin-rm-history-ver">v{h.version}</span>
                <div className="admin-rm-history-body">
                  <strong>{h.note}</strong>
                  <small>{new Date(h.at).toLocaleString('ko-KR')} · {h.by}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
