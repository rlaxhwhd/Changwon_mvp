import type { ReactNode } from 'react'
import { LuFrown } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJobById, addJob, updateJob, removeJob } from '../data/jobsSource'
import {
  blankJob, COMPANY_TYPES, EMPLOYMENT_TYPES, JOB_CATEGORIES, CAREER_TYPES, GENDERS, REGIONS,
} from '../data/schema/job'
import type { JobPosting, RecruitType, JobEmploymentType } from '../data/schema/job'
import EmptyState from '../components/EmptyState'
import RichEditor from '../components/RichEditor'
import './JobForm.css'

type Draft = Omit<JobPosting, 'id' | 'postedAt'>
type ArrayKey = 'employmentTypes' | 'jobCategories' | 'careerTypes' | 'genders' | 'regions'

/** 로고 저장 규격 — 카드가 40px, 상세가 72px 로 쓴다. 2배수까지만 남기고 줄인다. */
const LOGO_MAX_PX = 160
/** 줄인 뒤에도 이만큼 크면 거부한다 — 공고 목록 전체가 localStorage 한도를 못 넘게. */
const LOGO_MAX_BYTES = 200_000

/**
 * 업로드한 이미지를 LOGO_MAX_PX 안으로 줄여 data URL 로 만든다.
 * 로고는 배경이 비어 있는 경우가 많아 PNG 로 다시 쓴다(JPEG 로 바꾸면 검은 배경이 깔린다).
 */
function toLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지 파일만 등록할 수 있습니다.'))
      img.onload = () => {
        const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('이미지를 처리하지 못했습니다.')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

function toDraft(job: JobPosting): Draft {
  const { id, postedAt, ...rest } = job
  void id
  void postedAt
  return rest
}

function Row({ label, required, top, children }: { label: string; required?: boolean; top?: boolean; children: ReactNode }) {
  return (
    <div className={`jf-row${top ? ' jf-row-top' : ''}`}>
      <div className="jf-row-label">{label}{required && <span className="jf-req">*</span>}</div>
      <div className="jf-row-body">{children}</div>
    </div>
  )
}

export default function JobForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const existing = useMemo(() => (id ? getJobById(id) : undefined), [id])
  const isEdit = Boolean(id)
  const notFound = isEdit && !existing
  // 외부 API 수집 공고는 원본이 외부에 있어 교직원이 수정할 수 없다.
  const readOnly = existing?.source === 'external'

  const [draft, setDraft] = useState<Draft>(() => (existing ? toDraft(existing) : blankJob()))
  const [regionScope, setRegionScope] = useState('대한민국 전지역')
  const [saved, setSaved] = useState(false)
  const [logoError, setLogoError] = useState('')

  if (notFound || readOnly) {
    return (
      <div className="jf">
        <div className="jf-inner">
          <EmptyState
            icon={LuFrown}
            message={readOnly
              ? '외부 채용 API로 수집된 공고는 수정할 수 없습니다.'
              : '해당 채용공고를 찾을 수 없습니다.'}
            action={readOnly
              ? { label: '외부 공고 목록으로', onClick: () => navigate('/jobs/external') }
              : { label: '공고 목록으로', onClick: () => navigate('/jobs') }}
          />
        </div>
      </div>
    )
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const arr = (key: ArrayKey): string[] => (draft[key] as string[] | undefined) ?? []
  const has = (key: ArrayKey, value: string) => arr(key).includes(value)
  const toggle = (key: ArrayKey, value: string) =>
    setDraft(prev => {
      const cur = (prev[key] as string[] | undefined) ?? []
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
      return { ...prev, [key]: next }
    })
  const pickOne = (key: ArrayKey, value: string) => set(key, [value] as Draft[ArrayKey])

  const pickLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoError('')
    try {
      const dataUrl = await toLogoDataUrl(file)
      if (dataUrl.length > LOGO_MAX_BYTES) {
        setLogoError('이미지 용량이 너무 큽니다. 더 작은 파일로 등록해주세요.')
        return
      }
      set('logo', dataUrl)
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : '이미지를 불러오지 못했습니다.')
    }
  }

  const regions = arr('regions')
  const canSave = draft.company.trim() !== '' && draft.role.trim() !== '' && !saved

  const handleSave = (goList: boolean) => {
    if (draft.company.trim() === '' || draft.role.trim() === '') return
    const careers = arr('careerTypes')
    // 채용시 체크 → 마감일을 등록일 +1개월로 자동 설정(폼 힌트 "1개월로 선택됩니다").
    // 실제 날짜를 저장해야 학생 카드에서 D-day 카운트다운이 나온다.
    const onHireDeadline = () => {
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      return d.toISOString().slice(0, 10)
    }
    const payload: Draft = {
      ...draft,
      location: regions.filter(r => r !== '전체').join(', ') || draft.location,
      jobType: (careers.length === 1 ? careers[0] : '신입') as JobEmploymentType,
      deadline: draft.deadlineOnHire ? onHireDeadline() : draft.deadline,
      tags: [...arr('employmentTypes'), ...careers, ...arr('jobCategories')].slice(0, 6),
      // 로고는 추천채용에서만 보이는 값이다 — 일반공고로 바꿔 저장하면 담지 않는다.
      // (draft 에는 남겨둔다. 유형을 되돌리면 올렸던 이미지가 그대로 살아난다)
      logo: draft.recruitType === '추천채용' ? draft.logo : undefined,
      source: 'manual',
    }
    if (isEdit && existing) updateJob(existing.id, payload)
    else addJob(payload)
    setSaved(true)
    if (goList) window.setTimeout(() => navigate('/jobs'), 500)
    else window.setTimeout(() => setSaved(false), 1200)
  }

  const handleDelete = () => {
    if (!existing) return
    if (!window.confirm(`'${existing.company} · ${existing.role}' 공고를 삭제할까요? 되돌릴 수 없습니다.`)) return
    removeJob(existing.id)
    navigate('/jobs')
  }

  return (
    <div className="jf">
      <div className="jf-inner">
        <h1 className="jf-page-title">{isEdit ? '채용공고 수정' : '채용공고 등록'}</h1>
        <nav className="jf-crumbs" aria-label="breadcrumb">
          <Link to="/jobs">채용공고 관리</Link>
          <span className="jf-crumb-sep">›</span>
          <span className="is-current">{isEdit ? '채용공고 수정' : '채용공고 등록'}</span>
        </nav>

        {/* ── 기업일반정보 영역 ── */}
        <section className="jf-section">
          <div className="jf-section-head"><h2>기업일반정보 영역</h2></div>

          <Row label="채용유형" required>
            <div className="jf-opts">
              {(['일반공고', '추천채용'] as RecruitType[]).map(t => (
                <label key={t} className="jf-radio">
                  <input type="radio" name="recruitType" checked={draft.recruitType === t} onChange={() => set('recruitType', t)} /> {t}
                </label>
              ))}
            </div>
          </Row>

          <Row label="회사명" required>
            <input className="jf-input" value={draft.company} onChange={e => set('company', e.target.value)} placeholder="회사명을 입력해주세요." />
          </Row>

          {/* 로고는 추천채용 카드에만 나온다 — 유형이 추천채용일 때만 묻는다. */}
          {draft.recruitType === '추천채용' && (
            <Row label="기업 로고" top>
              <div className="jf-logo">
                <span className={`jf-logo-preview${draft.logo ? ' has-img' : ''}`}>
                  {draft.logo
                    ? <img src={draft.logo} alt="등록한 기업 로고 미리보기" />
                    : <em>{draft.company.trim().slice(0, 2) || '로고'}</em>}
                </span>
                <div className="jf-logo-side">
                  <div className="jf-logo-btns">
                    <label className="jf-btn jf-btn-outline jf-logo-pick">
                      {draft.logo ? '이미지 변경' : '이미지 선택'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => { void pickLogo(e.target.files?.[0]); e.target.value = '' }}
                      />
                    </label>
                    {draft.logo && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-outline"
                        onClick={() => { set('logo', undefined); setLogoError('') }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <span className="jf-hint">
                    추천채용 카드와 공고 상세에 표시됩니다. 정사각형 이미지를 권장하며 {LOGO_MAX_PX}px로 줄여 저장합니다.
                  </span>
                  {logoError && <span className="jf-logo-error">{logoError}</span>}
                </div>
              </div>
            </Row>
          )}

          <Row label="기업구분" required>
            <div className="jf-opts">
              {COMPANY_TYPES.map(c => (
                <label key={c} className="jf-radio">
                  <input type="radio" name="companyType" checked={draft.companyType === c} onChange={() => set('companyType', c)} /> {c}
                </label>
              ))}
            </div>
          </Row>

          <Row label="URL 등록">
            <input className="jf-input" value={draft.applyUrl} onChange={e => set('applyUrl', e.target.value)} placeholder="https://www.example.com" />
          </Row>

          <Row label="Email" required>
            <input className="jf-input" type="email" value={draft.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="example@company.com" />
          </Row>
        </section>

        {/* ── 모집내용입력 영역 ── */}
        <section className="jf-section">
          <div className="jf-section-head"><h2>모집내용입력 영역</h2></div>

          <Row label="모집제목" required>
            <input className="jf-input" value={draft.role} onChange={e => set('role', e.target.value)} placeholder="모집제목을 입력해주세요." />
          </Row>

          <Row label="근무형태" required>
            <div className="jf-opts">
              {EMPLOYMENT_TYPES.map(t => (
                <label key={t} className="jf-check">
                  <input type="checkbox" checked={has('employmentTypes', t)} onChange={() => toggle('employmentTypes', t)} /> {t}
                </label>
              ))}
            </div>
          </Row>

          <Row label="직종" required top>
            <div className="jf-grid5">
              {JOB_CATEGORIES.map(c => (
                <label key={c} className="jf-check">
                  <input type="checkbox" checked={has('jobCategories', c)} onChange={() => toggle('jobCategories', c)} /> {c}
                </label>
              ))}
            </div>
          </Row>

          <Row label="경력" required>
            <div className="jf-opts">
              {CAREER_TYPES.map(c => (
                <label key={c} className="jf-radio">
                  <input type="radio" name="careerType" checked={arr('careerTypes')[0] === c} onChange={() => pickOne('careerTypes', c)} /> {c}
                </label>
              ))}
            </div>
          </Row>

          <Row label="성별">
            <div className="jf-opts">
              {GENDERS.map(g => (
                <label key={g} className="jf-radio">
                  <input type="radio" name="gender" checked={arr('genders')[0] === g} onChange={() => pickOne('genders', g)} /> {g}
                </label>
              ))}
            </div>
          </Row>

          <Row label="지역" required>
            <div className="jf-region">
              <select className="jf-select jf-scope" value={regionScope} onChange={e => setRegionScope(e.target.value)}>
                <option>대한민국 전지역</option>
                <option>지역 선택</option>
              </select>
              <select
                className="jf-select jf-multi"
                value=""
                onChange={e => { if (e.target.value) toggle('regions', e.target.value) }}
              >
                <option value="">{regions.length ? `${regions.join(', ')} 등` : '지역을 선택하세요'}</option>
                {REGIONS.filter(r => r !== '전체').map(r => (
                  <option key={r} value={r}>{regions.includes(r) ? `✓ ${r}` : r}</option>
                ))}
              </select>
            </div>
          </Row>

          <Row label="지원마감일" required>
            <div className="jf-inline">
              <input
                className="jf-input jf-w-narrow"
                type="date"
                value={draft.deadlineOnHire ? '' : draft.deadline}
                disabled={!!draft.deadlineOnHire}
                onChange={e => set('deadline', e.target.value)}
              />
              <label className="jf-check">
                <input type="checkbox" checked={!!draft.deadlineOnHire} onChange={e => set('deadlineOnHire', e.target.checked)} /> 채용시
              </label>
              <span className="jf-hint">체크시 1개월로 선택됩니다</span>
            </div>
          </Row>

          <Row label="연봉">
            <div className="jf-inline">
              <input
                className="jf-input jf-w-mid"
                value={draft.salary}
                disabled={!!draft.salaryNegotiable}
                onChange={e => set('salary', e.target.value)}
                placeholder="예: 3,600"
              />
              <span className="jf-unit">만원</span>
              <label className="jf-check">
                <input type="checkbox" checked={!!draft.salaryNegotiable} onChange={e => set('salaryNegotiable', e.target.checked)} /> 회사내규 및 협의
              </label>
            </div>
          </Row>

          <Row label="모집요강" required top>
            <RichEditor value={draft.content ?? ''} onChange={html => set('content', html)} height={320} placeholder="모집요강 내용을 입력해주세요." />
          </Row>
        </section>

        <div className="jf-actions">
          {isEdit && (
            <button type="button" className="jf-btn jf-btn-outline" onClick={handleDelete}>삭제</button>
          )}
          <button type="button" className="jf-btn jf-btn-outline" onClick={() => handleSave(false)}>임시저장</button>
          <button type="button" className="jf-btn jf-btn-primary" disabled={!canSave} onClick={() => handleSave(true)}>
            {saved ? '저장됨' : isEdit ? '수정 저장' : '등록'}
          </button>
          <button type="button" className="jf-btn jf-btn-outline" onClick={() => navigate('/jobs')}>목록</button>
        </div>
      </div>
    </div>
  )
}
