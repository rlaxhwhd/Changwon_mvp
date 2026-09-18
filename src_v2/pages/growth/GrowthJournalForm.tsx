import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES, CATEGORY_LABEL, createJournalEntry, loadJournalEntries,
         updateJournalEntry, type Category } from '../../data/growthJournal'
import { getActiveStudentId } from '../../data/students'
import GrowthLoadNotice from '../../../shared/GrowthLoadNotice'
import { growthState } from '../../../shared/growthStore'
import type { Entry } from '../../data/growthJournal'
import { deleteJournalEntry } from '../../data/growthJournal'
import { useGrowth } from '../../../shared/useRoadmapStore'
import './GrowthJournal.css'
import { usePageHead } from '../../components/PageCrumb'

const EMPTY_ENTRY = {
  category: 'TEAM_PROJECT' as Category,
  title: '',
  date: '',
  situation: '',
  role: '',
  action: '',
  result: '',
  learning: '',
  resumeMemo: '',
  tagsText: '',
  resumeUsed: false,
}

export default function GrowthJournalForm() {
  const navigate = useNavigate()
  const { entryId } = useParams()
  const isEdit = Boolean(entryId)
  usePageHead(isEdit ? '일지 상세/수정' : '새 일지 작성', '아르바이트·팀프로젝트에서 겪은 일을 기록해 두면 자기소개서 작성에 쓸 수 있어요.')
  const studentId = getActiveStudentId()
  useGrowth(studentId)
  const entries = loadJournalEntries(studentId)
  const entry = entries.find(item => item.id === entryId)
  if (!growthState(studentId)) return <div className="gj-wrapper"><GrowthLoadNotice studentId={studentId} /></div>
  if (isEdit && !entry) return <div className="gj-wrapper"><p role="alert">일지를 찾을 수 없습니다. 삭제되었거나 접근할 수 없는 기록입니다.</p><button onClick={() => navigate('/growth/journal')}>목록으로</button></div>
  return <JournalEditor key={`${studentId}:${entryId ?? 'new'}`} studentId={studentId} entry={entry} />
}

function JournalEditor({ studentId, entry }: { studentId: string; entry?: Entry }) {
  const navigate = useNavigate()
  const isEdit = Boolean(entry)
  // 입력을 시작한 버전을 유지한다. 다른 탭의 수정 내용을 덮어쓰지 않는다.
  const [original] = useState(entry)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(() => entry ? {
    category: entry.category,
    title: entry.title,
    date: entry.date,
    situation: entry.situation,
    role: entry.role,
    action: entry.action,
    result: entry.result,
    learning: entry.learning,
    resumeMemo: entry.resumeMemo,
    tagsText: entry.tags.join(', '),
    resumeUsed: entry.resumeUsed,
  } : { ...EMPTY_ENTRY, date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) })

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const remove = async () => {
    if (!entry || saving || !window.confirm('이 경험일지를 삭제할까요?')) return
    setSaving(true)
    try { await deleteJournalEntry(studentId, entry.id); navigate('/growth/journal') }
    catch (cause) { setError(cause instanceof Error ? cause.message : '삭제하지 못했습니다.') }
    finally { setSaving(false) }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    // ID 는 서버가 발급한다. max(id)+1 은 학생마다 1,2,3… 이 겹치던 원인이었다.
    const body = {
      category: form.category,
      title: form.title || '제목 없는 성장경험일지',
      desc: form.situation,
      situation: form.situation,
      role: form.role,
      action: form.action,
      result: form.result,
      learning: form.learning,
      resumeMemo: form.resumeMemo,
      tags: form.tagsText.split(',').map(tag => tag.trim()).filter(Boolean),
      date: form.date,
      bookmarked: entry?.bookmarked ?? false,
      resumeUsed: form.resumeUsed,
    }
    setSaving(true)
    const task = entry
      ? updateJournalEntry(studentId, { ...body, id: entry.id, version: original!.version })
      : createJournalEntry(studentId, body)
    task.then(() => navigate('/growth/journal'))
      .catch(cause => setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.'))
      .finally(() => setSaving(false))
  }

  return (
    <div className="gj-wrapper">
      <div className="gj-content">
        <div className="gj-edit-shell">
          <div className="gj-edit-header">
            <button className="gj-back-btn" onClick={() => navigate('/growth/journal')}>
              <i className="fa-solid fa-arrow-left" /> 목록으로
            </button>
            <div>
              <h1 className="gj-edit-title">{isEdit ? '성장경험일지 상세/수정' : '새 성장경험일지 작성'}</h1>
              <p className="gj-edit-desc">
                경험의 상황, 나의 역할, 행동과 결과를 정리하면 자소서와 면접 답변에 바로 활용할 수 있어요.
              </p>
            </div>
          </div>

          {error && <p className="gj-empty" role="alert">{error}</p>}

          <form className="gj-edit-card" onSubmit={handleSubmit}>
            <fieldset disabled={saving} className="gj-editor-fields">
            <section className="gj-form-section">
              <div className="gj-section-head">
                <span className="gj-section-num">01</span>
                <div>
                  <h2>기본 정보</h2>
                  <p>경험을 빠르게 구분할 수 있는 정보를 입력하세요.</p>
                </div>
              </div>
              <div className="gj-form-grid">
                <label className="gj-field gj-field-wide">
                  <span>제목</span>
                  <input required maxLength={200}
                    value={form.title}
                    onChange={event => update('title', event.target.value)}
                    placeholder="예: 카페 매장 아르바이트 - 고객 응대 개선 경험"
                  />
                </label>
                <label className="gj-field">
                  <span>카테고리</span>
                  <select value={form.category} onChange={event => update('category', event.target.value)}>
                    {CATEGORIES.map(code => (
                      <option key={code} value={code}>{CATEGORY_LABEL[code]}</option>
                    ))}
                  </select>
                </label>
                <label className="gj-field">
                  <span>작성일</span>
                  <input type="date" value={form.date} onChange={event => update('date', event.target.value)} />
                </label>
                <label className="gj-field gj-field-wide">
                  <span>키워드</span>
                  <input
                    value={form.tagsText}
                    onChange={event => update('tagsText', event.target.value)}
                    placeholder="쉼표로 구분해 입력하세요. 예: 협업, 문제해결, 커뮤니케이션"
                  />
                </label>
              </div>
            </section>

            <section className="gj-form-section">
              <div className="gj-section-head">
                <span className="gj-section-num">02</span>
                <div>
                  <h2>경험 상세</h2>
                  <p>STAR 구조에 맞춰 경험을 구체적으로 정리하세요.</p>
                </div>
              </div>
              <div className="gj-form-grid">
                <label className="gj-field gj-field-wide">
                  <span>상황</span>
                  <textarea maxLength={10000} rows={4} value={form.situation} onChange={event => update('situation', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>나의 역할</span>
                  <textarea maxLength={10000} rows={5} value={form.role} onChange={event => update('role', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>행동</span>
                  <textarea maxLength={10000} rows={5} value={form.action} onChange={event => update('action', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>결과</span>
                  <textarea maxLength={10000} rows={5} value={form.result} onChange={event => update('result', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>배운 점</span>
                  <textarea maxLength={10000} rows={5} value={form.learning} onChange={event => update('learning', event.target.value)} />
                </label>
              </div>
            </section>

            <section className="gj-form-section">
              <div className="gj-section-head">
                <span className="gj-section-num">03</span>
                <div>
                  <h2>자소서 활용 메모</h2>
                  <p>어떤 문항이나 직무에 활용할 수 있을지 남겨두세요.</p>
                </div>
              </div>
              <label className="gj-field">
                <span>활용 메모</span>
                <textarea maxLength={10000} rows={5} value={form.resumeMemo} onChange={event => update('resumeMemo', event.target.value)} />
              </label>
              <label className="gj-check-field">
                <input
                  type="checkbox"
                  checked={form.resumeUsed}
                  onChange={event => update('resumeUsed', event.target.checked)}
                />
                <span>자소서에 활용한 경험으로 표시</span>
              </label>
            </section>

            <div className="gj-edit-actions">
              {isEdit && <button type="button" className="gj-cancel-btn" onClick={() => void remove()}>일지 삭제</button>}
              <button type="button" className="gj-cancel-btn" onClick={() => navigate('/growth/journal')}>
                취소
              </button>
              <button type="submit" className="gj-save-btn">
                {saving ? '저장 중…' : isEdit ? '수정 내용 저장' : '일지 저장'}
              </button>
            </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  )
}
