import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES, CATEGORY_LABEL, createJournalEntry, loadJournalEntries,
         updateJournalEntry, type Category } from '../../data/growthJournal'
import { getActiveStudentId } from '../../data/students'
import { useGrowth } from '../../../shared/useRoadmapStore'
import './GrowthJournal.css'
import { usePageHead } from '../../components/PageCrumb'

const EMPTY_ENTRY = {
  category: 'TEAM_PROJECT' as Category,
  title: '',
  date: new Date().toISOString().slice(0, 10),
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
  const revision = useGrowth(studentId)
  const entries = useMemo(() => loadJournalEntries(studentId), [studentId, revision])
  const entry = useMemo(() => entries.find(item => item.id === entryId), [entries, entryId])
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
  } : EMPTY_ENTRY)

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
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
      ? updateJournalEntry(studentId, { ...body, id: entry.id, version: entry.version })
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
                  <input
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
                  <textarea rows={4} value={form.situation} onChange={event => update('situation', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>나의 역할</span>
                  <textarea rows={5} value={form.role} onChange={event => update('role', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>행동</span>
                  <textarea rows={5} value={form.action} onChange={event => update('action', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>결과</span>
                  <textarea rows={5} value={form.result} onChange={event => update('result', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>배운 점</span>
                  <textarea rows={5} value={form.learning} onChange={event => update('learning', event.target.value)} />
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
                <textarea rows={5} value={form.resumeMemo} onChange={event => update('resumeMemo', event.target.value)} />
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
              <button type="button" className="gj-cancel-btn" onClick={() => navigate('/growth/journal')}>
                취소
              </button>
              <button type="submit" className="gj-save-btn">
                {isEdit ? '수정 내용 저장' : '일지 저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
