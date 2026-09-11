// ─────────────────────────────────────────────────────────────────────────────
// 채용공고 등록·수정 — 정본은 서버(dc.job_posting)다.
//
// 바뀐 것 넷:
//   ① 선택지(기업구분·근무형태·직종·경력·성별·지역)를 여기 배열로 두지 않는다.
//      운영 코드는 DB 가 정본이고 화면은 metadataStore 에서 읽는다 — 관리자가
//      항목을 추가하면 배포 없이 나타난다(DB.md §8-5).
//   ② 기업은 사전(dc.company)에서 **고른다.** 이름만 같은 두 회사를 자동으로 합치지
//      않기 위해서다. 사전에 없으면 새로 등록하겠다고 명시한다.
//   ③ 로고·첨부는 data URL 이 아니라 서버 볼륨의 파일이다. 저장 이름은 서버가
//      부여하고 다운로드는 권한을 확인하는 API 경로로만 나간다(DB.md #41).
//   ④ 「채용시 마감」은 **등록할 때 한 번만** 계산된다. 예전에는 저장할 때마다
//      다시 계산해 제목만 고쳐도 마감이 한 달씩 밀렸다.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react'
import { LuFrown } from 'react-icons/lu'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addJob, getJobById, queryCompanies, removeJob, updateJob, uploadJobFile,
} from '../data/jobsSource'
import { blankJob, JOB_CODE_GROUPS, jobLabelsOf, jobOptions } from '../data/schema/job'
import type { JobCompany, JobFile, JobPostingInput, RecruitType } from '../data/schema/job'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import RichEditor from '../components/RichEditor'
import { useMetadata } from '../../shared/useMetadata'
import './JobForm.css'

type ArrayKey = 'employmentTypes' | 'jobCategories' | 'careerTypes' | 'genders' | 'regions'

const NEW_COMPANY = '__new__'

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
  useMetadata()

  const existing = useMemo(() => (id ? getJobById(id) : undefined), [id])
  const isEdit = Boolean(id)
  const notFound = isEdit && !existing
  // 외부 수집 공고는 원본이 외부에 있어 수정할 수 없다(서버도 거절한다).
  const readOnly = existing?.source === 'external'

  const [draft, setDraft] = useState<JobPostingInput>(() => (existing
    ? {
      companyId: existing.companyId,
      role: existing.role, tags: existing.tags, salary: existing.salary, location: existing.location,
      jobType: existing.jobType, companyType: existing.companyType, recruitType: existing.recruitType,
      status: existing.status, deadlineMode: existing.deadlineMode, deadline: existing.deadline,
      applyUrl: existing.applyUrl, urlTitleLink: existing.urlTitleLink, email: existing.email,
      emailApply: existing.emailApply, salaryNegotiable: existing.salaryNegotiable,
      content: existing.content, contentFormat: existing.contentFormat,
      logoFileId: existing.logoFileId, attachmentFileIds: existing.attachments.map(f => f.id),
      employmentTypes: existing.employmentTypes, jobCategories: existing.jobCategories,
      careerTypes: existing.careerTypes, genders: existing.genders, regions: existing.regions,
    }
    : blankJob()))
  const [companies, setCompanies] = useState<JobCompany[]>([])
  const [companyChoice, setCompanyChoice] = useState<string>(existing?.companyId ?? NEW_COMPANY)
  const [companyName, setCompanyName] = useState(existing?.companyId ? '' : existing?.company ?? '')
  const [logo, setLogo] = useState<JobFile | null>(
    existing?.logoFileId && existing.logo
      ? { id: existing.logoFileId, name: '기업 로고', size: 0, contentType: '', downloadUrl: existing.logo }
      : null)
  const [attachments, setAttachments] = useState<JobFile[]>(existing?.attachments ?? [])
  const [regionScope, setRegionScope] = useState('대한민국 전지역')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; title: string; text: string } | null>(null)

  useEffect(() => {
    void queryCompanies().then(setCompanies).catch(() => { /* 사전 조회 실패는 새 기업 등록으로 진행 */ })
  }, [])

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

  const set = <K extends keyof JobPostingInput>(key: K, value: JobPostingInput[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const arr = (key: ArrayKey): string[] => draft[key]
  const has = (key: ArrayKey, value: string) => arr(key).includes(value)
  const toggle = (key: ArrayKey, value: string) =>
    setDraft(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }))
  const pickOne = (key: ArrayKey, value: string) => set(key, [value])

  const upload = async (slot: 'LOGO' | 'ATTACHMENT', file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const stored = await uploadJobFile(slot, file)
      if (slot === 'LOGO') {
        setLogo(stored)
        set('logoFileId', stored.id)
      } else {
        setAttachments(prev => [...prev, stored])
        setDraft(prev => ({ ...prev, attachmentFileIds: [...prev.attachmentFileIds, stored.id] }))
      }
    } catch (cause) {
      setNotice({ ok: false, title: '파일을 올리지 못했습니다',
        text: cause instanceof Error ? cause.message : '다시 시도해 주세요.' })
    } finally {
      setBusy(false)
    }
  }

  const displayName = companyChoice === NEW_COMPANY
    ? companyName.trim()
    : companies.find(c => c.id === companyChoice)?.displayName ?? ''
  const regions = arr('regions')
  const canSave = displayName !== '' && draft.role.trim() !== '' && !saved && !busy

  const handleSave = async (goList: boolean) => {
    if (!canSave) return
    const careers = arr('careerTypes')
    const payload: JobPostingInput = {
      ...draft,
      companyId: companyChoice === NEW_COMPANY ? null : companyChoice,
      createCompany: companyChoice === NEW_COMPANY
        ? { displayName, companyTypeCode: draft.companyType }
        : undefined,
      // 지역은 코드로 저장하고 표시 문구는 라벨에서 만든다.
      location: jobLabelsOf(JOB_CODE_GROUPS.region, regions).join(', ') || draft.location,
      jobType: careers[0] ?? draft.jobType,
      // 마감일은 서버가 정한다 — ON_HIRE 는 등록 시점에 한 번만 계산되고 이후 유지된다.
      deadline: draft.deadlineMode === 'DATE' ? draft.deadline : null,
      tags: [
        ...jobLabelsOf(JOB_CODE_GROUPS.employmentType, arr('employmentTypes')),
        ...jobLabelsOf(JOB_CODE_GROUPS.careerType, careers),
        ...jobLabelsOf(JOB_CODE_GROUPS.category, arr('jobCategories')),
      ].slice(0, 6),
      // 로고는 추천채용에서만 보이는 값이다 — 일반공고로 바꿔 저장하면 담지 않는다.
      logoFileId: draft.recruitType === 'RECOMMENDATION' ? draft.logoFileId : null,
    }
    setBusy(true)
    try {
      if (isEdit && existing) await updateJob(existing.id, payload, existing.version)
      else await addJob(payload)
      setSaved(true)
      if (goList) {
        setNotice({
          ok: true,
          title: isEdit ? '수정되었습니다' : '등록되었습니다',
          text: isEdit
            ? `'${displayName} · ${payload.role}' 공고를 수정했습니다.`
            : `'${displayName} · ${payload.role}' 공고를 등록했습니다. 교내 채용공고 목록과 학생 화면에 함께 노출됩니다.`,
        })
      } else window.setTimeout(() => setSaved(false), 1200)
    } catch (cause) {
      // 사유는 서버가 준다 — 화면이 지어내지 않고, 입력한 내용은 그대로 남긴다.
      setNotice({ ok: false, title: '저장하지 못했습니다',
        text: (cause instanceof Error ? cause.message : '다시 시도해 주세요.')
          + ' (입력한 내용은 그대로 있습니다)' })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!window.confirm(`'${existing.company} · ${existing.role}' 공고를 삭제할까요? 지원 이력은 보존됩니다.`)) return
    try {
      await removeJob(existing.id, existing.version)
      navigate('/jobs')
    } catch (cause) {
      setNotice({ ok: false, title: '삭제하지 못했습니다',
        text: cause instanceof Error ? cause.message : '다시 시도해 주세요.' })
    }
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
              {(['GENERAL', 'RECOMMENDATION'] as RecruitType[]).map(t => (
                <label key={t} className="jf-radio">
                  <input type="radio" name="recruitType" checked={draft.recruitType === t} onChange={() => set('recruitType', t)} />
                  {' '}{t === 'GENERAL' ? '일반공고' : '추천채용'}
                </label>
              ))}
            </div>
          </Row>

          {/* 기업은 사전에서 고른다 — 이름이 같다고 두 회사를 자동으로 합치지 않는다. */}
          <Row label="회사명" required>
            <div className="jf-inline">
              <select
                className="jf-select jf-multi"
                value={companyChoice}
                onChange={e => setCompanyChoice(e.target.value)}
              >
                <option value={NEW_COMPANY}>새 기업으로 등록</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
              {companyChoice === NEW_COMPANY && (
                <input
                  className="jf-input"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="회사명을 입력해주세요."
                />
              )}
            </div>
          </Row>

          {/* 로고는 추천채용 카드에만 나온다 — 유형이 추천채용일 때만 묻는다. */}
          {draft.recruitType === 'RECOMMENDATION' && (
            <Row label="기업 로고" top>
              <div className="jf-logo">
                <span className={`jf-logo-preview${logo ? ' has-img' : ''}`}>
                  {logo
                    ? <img src={logo.downloadUrl} alt="등록한 기업 로고 미리보기" />
                    : <em>{displayName.slice(0, 2) || '로고'}</em>}
                </span>
                <div className="jf-logo-side">
                  <div className="jf-logo-btns">
                    <label className="jf-btn jf-btn-outline jf-logo-pick">
                      {logo ? '이미지 변경' : '이미지 선택'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => { void upload('LOGO', e.target.files?.[0]); e.target.value = '' }}
                      />
                    </label>
                    {logo && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-outline"
                        onClick={() => { setLogo(null); set('logoFileId', null) }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <span className="jf-hint">
                    추천채용 카드와 공고 상세에 표시됩니다. 정사각형 이미지를 권장합니다.
                  </span>
                </div>
              </div>
            </Row>
          )}

          <Row label="기업구분" required>
            <div className="jf-opts">
              {jobOptions(JOB_CODE_GROUPS.companyType).map(c => (
                <label key={c.code} className="jf-radio">
                  <input type="radio" name="companyType" checked={draft.companyType === c.code} onChange={() => set('companyType', c.code)} /> {c.label}
                </label>
              ))}
            </div>
          </Row>

          <Row label="URL 등록">
            <input className="jf-input" value={draft.applyUrl} onChange={e => set('applyUrl', e.target.value)} placeholder="https://www.example.com" />
          </Row>

          <Row label="Email" required>
            <input className="jf-input" type="email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="example@company.com" />
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
              {jobOptions(JOB_CODE_GROUPS.employmentType).map(t => (
                <label key={t.code} className="jf-check">
                  <input type="checkbox" checked={has('employmentTypes', t.code)} onChange={() => toggle('employmentTypes', t.code)} /> {t.label}
                </label>
              ))}
            </div>
          </Row>

          <Row label="직종" required top>
            <div className="jf-grid5">
              {jobOptions(JOB_CODE_GROUPS.category).map(c => (
                <label key={c.code} className="jf-check">
                  <input type="checkbox" checked={has('jobCategories', c.code)} onChange={() => toggle('jobCategories', c.code)} /> {c.label}
                </label>
              ))}
            </div>
          </Row>

          <Row label="경력" required>
            <div className="jf-opts">
              {jobOptions(JOB_CODE_GROUPS.careerType).map(c => (
                <label key={c.code} className="jf-radio">
                  <input type="radio" name="careerType" checked={arr('careerTypes')[0] === c.code} onChange={() => pickOne('careerTypes', c.code)} /> {c.label}
                </label>
              ))}
            </div>
          </Row>

          <Row label="성별">
            <div className="jf-opts">
              {jobOptions(JOB_CODE_GROUPS.gender).map(g => (
                <label key={g.code} className="jf-radio">
                  <input type="radio" name="gender" checked={arr('genders')[0] === g.code} onChange={() => pickOne('genders', g.code)} /> {g.label}
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
                <option value="">
                  {regions.length
                    ? `${jobLabelsOf(JOB_CODE_GROUPS.region, regions).join(', ')} 등`
                    : '지역을 선택하세요'}
                </option>
                {jobOptions(JOB_CODE_GROUPS.region).map(r => (
                  <option key={r.code} value={r.code}>{regions.includes(r.code) ? `✓ ${r.label}` : r.label}</option>
                ))}
              </select>
            </div>
          </Row>

          <Row label="지원마감일" required>
            <div className="jf-inline">
              <input
                className="jf-input jf-w-narrow"
                type="date"
                value={draft.deadlineMode === 'DATE' ? draft.deadline ?? '' : ''}
                disabled={draft.deadlineMode !== 'DATE'}
                onChange={e => set('deadline', e.target.value || null)}
              />
              <label className="jf-check">
                <input
                  type="checkbox"
                  checked={draft.deadlineMode === 'ON_HIRE'}
                  onChange={e => set('deadlineMode', e.target.checked ? 'ON_HIRE' : 'DATE')}
                /> 채용시
              </label>
              <span className="jf-hint">
                {isEdit && existing?.deadlineMode === 'ON_HIRE'
                  ? `등록 시점에 정해진 마감일(${existing.deadline})이 유지됩니다`
                  : '체크시 등록일 +1개월로 한 번만 정해집니다'}
              </span>
            </div>
          </Row>

          <Row label="연봉">
            <div className="jf-inline">
              <input
                className="jf-input jf-w-mid"
                value={draft.salary}
                disabled={draft.salaryNegotiable}
                onChange={e => set('salary', e.target.value)}
                placeholder="예: 3,600"
              />
              <span className="jf-unit">만원</span>
              <label className="jf-check">
                <input type="checkbox" checked={draft.salaryNegotiable} onChange={e => set('salaryNegotiable', e.target.checked)} /> 회사내규 및 협의
              </label>
            </div>
          </Row>

          <Row label="첨부파일" top>
            <div className="jf-logo-side">
              <div className="jf-logo-btns">
                <label className="jf-btn jf-btn-outline jf-logo-pick">
                  파일 추가
                  <input
                    type="file"
                    onChange={e => { void upload('ATTACHMENT', e.target.files?.[0]); e.target.value = '' }}
                  />
                </label>
              </div>
              {attachments.map(file => (
                <span key={file.id} className="jf-inline">
                  <a href={file.downloadUrl} target="_blank" rel="noreferrer">{file.name}</a>
                  <button
                    type="button"
                    className="jf-btn jf-btn-outline"
                    onClick={() => {
                      setAttachments(prev => prev.filter(f => f.id !== file.id))
                      setDraft(prev => ({
                        ...prev,
                        attachmentFileIds: prev.attachmentFileIds.filter(x => x !== file.id),
                      }))
                    }}
                  >
                    삭제
                  </button>
                </span>
              ))}
              <span className="jf-hint">
                첨부는 서버에 보관되며 공고를 볼 수 있는 사람만 내려받을 수 있습니다.
              </span>
            </div>
          </Row>

          <Row label="모집요강" required top>
            <RichEditor value={draft.content} onChange={html => set('content', html)} height={320} placeholder="모집요강 내용을 입력해주세요." />
          </Row>
        </section>

        <div className="jf-actions">
          {isEdit && (
            <button type="button" className="jf-btn jf-btn-outline" onClick={() => void handleDelete()}>삭제</button>
          )}
          <button type="button" className="jf-btn jf-btn-outline" onClick={() => void handleSave(false)}>임시저장</button>
          <button type="button" className="jf-btn jf-btn-primary" disabled={!canSave} onClick={() => void handleSave(true)}>
            {busy ? '저장 중…' : saved ? '저장됨' : isEdit ? '수정 저장' : '등록'}
          </button>
          <button type="button" className="jf-btn jf-btn-outline" onClick={() => navigate('/jobs')}>목록</button>
        </div>
      </div>

      {notice && (
        <AdminModal
          title={notice.title}
          size="md"
          onClose={() => {
            setNotice(null)
            // 성공했을 때만 목록으로. 실패는 제자리에 남아 다시 손볼 수 있어야 한다.
            if (notice.ok) navigate('/jobs')
            else setSaved(false)
          }}
        >
          <p className="jf-notice">{notice.text}</p>
          <div className="jf-actions">
            <button
              type="button"
              className="jf-btn jf-btn-primary"
              onClick={() => {
                setNotice(null)
                if (notice.ok) navigate('/jobs')
                else setSaved(false)
              }}
            >
              확인
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
