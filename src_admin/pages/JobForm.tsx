import { LuBuilding2, LuFrown, LuList, LuSave, LuTrash2 } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJobById, addJob, updateJob, removeJob } from '../data/jobsSource'
import { blankJob } from '../data/schema/job'
import type { JobPosting, JobStatus, JobEmploymentType } from '../data/schema/job'
import EmptyState from '../components/EmptyState'

const JOB_TYPES: JobEmploymentType[] = ['신입', '경력']
const STATUSES: JobStatus[] = ['게시', '마감']

type Draft = Omit<JobPosting, 'id' | 'postedAt' | 'source'>

/** 기존 공고 → 편집 draft (id·postedAt·source 는 편집 대상이 아니므로 제외) */
function toDraft(job: JobPosting): Draft {
  return {
    company: job.company,
    role: job.role,
    tags: job.tags,
    salary: job.salary,
    location: job.location,
    deadline: job.deadline,
    jobType: job.jobType,
    applyUrl: job.applyUrl,
    match: job.match,
    status: job.status,
  }
}

export default function JobForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existing = useMemo(() => (id ? getJobById(id) : undefined), [id])
  const isEdit = Boolean(id)

  // 편집 모드인데 대상이 없으면 안내
  const notFound = isEdit && !existing

  const [draft, setDraft] = useState<Draft>(() =>
    existing ? toDraft(existing) : blankJob(),
  )
  const [tagText, setTagText] = useState<string>(() =>
    existing ? existing.tags.join(', ') : '',
  )
  const [saved, setSaved] = useState(false)

  if (notFound) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">공고 수정</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon={LuFrown}
            message="해당 채용공고를 찾을 수 없습니다."
            action={{ label: '공고 목록으로', onClick: () => navigate('/jobs') }}
          />
        </section>
      </div>
    )
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const parsedTags = tagText
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const canSave = draft.company.trim() !== '' && draft.role.trim() !== '' && !saved

  const handleSave = () => {
    if (!canSave) return
    const payload = { ...draft, tags: parsedTags }
    if (isEdit && existing) {
      updateJob(existing.id, payload)
    } else {
      addJob({ ...payload, source: 'manual' })
    }
    setSaved(true)
    window.setTimeout(() => navigate('/jobs'), 500)
  }

  const handleDelete = () => {
    if (!existing) return
    if (!window.confirm(`'${existing.company} · ${existing.role}' 공고를 삭제할까요? 되돌릴 수 없습니다.`)) return
    removeJob(existing.id)
    navigate('/jobs')
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuBuilding2 /> {isEdit ? '공고 수정' : '공고 등록'}
          </h1>
          <p className="admin-page-desc">
            {isEdit
              ? '등록된 채용공고를 수정하거나 삭제합니다.'
              : '학생 취업지원 화면과 동일한 형식으로 노출될 공고를 직접 등록합니다.'}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/jobs" className="admin-btn admin-btn-ghost">
            <LuList /> 공고 목록
          </Link>
        </div>
      </header>

      <section className="admin-card">
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>회사명 <em className="admin-req-mark">*</em></span>
            <input
              type="text"
              value={draft.company}
              onChange={e => set('company', e.target.value)}
              placeholder="예: 네이버클라우드"
            />
          </label>

          <label className="admin-field">
            <span>직무 <em className="admin-req-mark">*</em></span>
            <input
              type="text"
              value={draft.role}
              onChange={e => set('role', e.target.value)}
              placeholder="예: 백엔드 엔지니어"
            />
          </label>

          <label className="admin-field admin-field-full">
            <span>태그</span>
            <input
              type="text"
              value={tagText}
              onChange={e => setTagText(e.target.value)}
              placeholder="쉼표로 구분 — 예: Java, Spring, 신입, 성남"
            />
            {parsedTags.length > 0 && (
              <div className="admin-job-tag-preview">
                {parsedTags.map(t => (
                  <span key={t} className="admin-tag admin-tag-soft">{t}</span>
                ))}
              </div>
            )}
          </label>

          <label className="admin-field">
            <span>근무지</span>
            <input
              type="text"
              value={draft.location}
              onChange={e => set('location', e.target.value)}
              placeholder="예: 경기 성남시"
            />
          </label>

          <label className="admin-field">
            <span>급여/처우</span>
            <input
              type="text"
              value={draft.salary}
              onChange={e => set('salary', e.target.value)}
              placeholder="예: 3,600만원~ / 회사내규"
            />
          </label>

          <label className="admin-field">
            <span>고용 형태</span>
            <select
              value={draft.jobType}
              onChange={e => set('jobType', e.target.value as JobEmploymentType)}
            >
              {JOB_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>마감일</span>
            <input
              type="date"
              value={draft.deadline}
              onChange={e => set('deadline', e.target.value)}
            />
            <small className="admin-field-hint">비우면 '상시'로 표시됩니다.</small>
          </label>

          <label className="admin-field admin-field-full">
            <span>지원 링크</span>
            <input
              type="url"
              value={draft.applyUrl}
              onChange={e => set('applyUrl', e.target.value)}
              placeholder="https://recruit.example.com/..."
            />
          </label>

          <label className="admin-field">
            <span>게시 상태</span>
            <select
              value={draft.status}
              onChange={e => set('status', e.target.value as JobStatus)}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>매칭도 (선택)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.match}
              onChange={e => set('match', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            />
            <small className="admin-field-hint">학생 화면 적합도 표시용 (0~100).</small>
          </label>
        </div>

        {!canSave && !saved && (
          <p className="admin-form-hint admin-form-hint-warn">회사명과 직무는 필수입니다.</p>
        )}

        <div className="admin-form-actions">
          {isEdit && (
            <button className="admin-btn admin-btn-danger-ghost" onClick={handleDelete}>
              <LuTrash2 /> 삭제
            </button>
          )}
          <button className="admin-btn admin-btn-primary" disabled={!canSave} onClick={handleSave}>
            <LuSave /> {saved ? '저장됨' : isEdit ? '수정 저장' : '등록'}
          </button>
        </div>
      </section>
    </div>
  )
}
