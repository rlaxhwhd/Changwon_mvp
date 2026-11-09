import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ApiError } from '../../../../shared/api'
import PortfolioSheet from '../../../../shared/PortfolioSheet'
import ProtectedImage from '../../../../shared/ProtectedImage'
import {
  LEVEL_NAMES, SECTION_DEFS, isCertified, isEnrollment, isLocked, listSection, personalOf,
} from '../../../../shared/portfolioSections'
import type { FieldDef, SectionDef } from '../../../../shared/portfolioSections'
import { PHOTO_ACCEPT, loadPortfolioDetail, savePortfolio, uploadPortfolioFile } from '../../../../shared/portfolioStore'
import type {
  ListSection, PortfolioDetail, PortfolioDocument, PortfolioFile, PortfolioFiles, PortfolioItem, PortfolioNotImported,
  PortfolioPersonal, PortfolioSectionKey,
} from '../../../../shared/portfolioStore'
import { DOCUMENT_ACCEPT } from '../../../../shared/uploadPolicy'
import PortfolioImportModal from './PortfolioImportModal'
import './PortfolioEditor.css'

interface Props {
  studentId: string
  portfolioId: string
  notImported: PortfolioNotImported[]
  onClose: () => void
}

const MISSING_LABEL: Record<string, string> = {
  'personal.name': '이름', 'personal.email': '이메일', 'personal.phone': '휴대폰', education: '학력사항',
}
const PERSONAL_READONLY: [keyof PortfolioPersonal, string][] = [
  ['name', '이름'], ['studentNo', '학번'], ['school', '학교'], ['dept', '학과'], ['grade', '학년'],
]
const PERSONAL_INPUT: [keyof PortfolioPersonal, string, string][] = [
  ['nameEn', '영문명', ''], ['birthDate', '생년월일', 'YYYY.MM.DD'], ['email', '이메일', ''], ['phone', '휴대폰', ''],
  ['address', '주소', ''],
]

function timeOf(iso: string): string {
  const at = new Date(iso)
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

function emptyItem(def: SectionDef): PortfolioItem {
  return { id: crypto.randomUUID().replaceAll('-', '').slice(0, 16), sourceRef: null, verified: false, title: '',
           fields: Object.fromEntries(def.fields.map(field => [field.key, ''])) }
}

/** 라벨 위, 입력 아래. wide 는 전체 폭을 쓴다. */
function Row({ label, htmlFor, wide, children }: { label: string; htmlFor?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`pfe-field${wide ? ' pfe-field--wide' : ''}`}>
      <label className="pfe-label" htmlFor={htmlFor}>{label}</label>
      <div className="pfe-value">{children}</div>
    </div>
  )
}

export default function PortfolioEditor({ studentId, portfolioId, notImported, onClose }: Props) {
  const [detail, setDetail] = useState<PortfolioDetail | null>(null)
  const [document, setDocument] = useState<PortfolioDocument | null>(null)
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState<PortfolioFiles>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const [preview, setPreview] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [importing, setImporting] = useState<PortfolioSectionKey | null>(null)
  const [photoReady, setPhotoReady] = useState(false)
  const uploadTarget = useRef<string | null>(null)

  // 저장 전에 다른 메뉴로 가거나 창을 닫으면 쓰던 내용을 잃는다. 탭 전환은 화면을 유지하므로 묻지 않는다.
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('저장하지 않은 내용이 있습니다. 이 화면을 떠날까요?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const photoInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const apply = (next: PortfolioDetail) => {
    setDetail(next)
    setDocument(next.document)
    setTitle(next.title)
    setFiles(next.files)
    setDirty(false)
    setConflict(false)
    setSavedAt(next.updatedAt)
  }

  const load = () => loadPortfolioDetail(studentId, portfolioId).then(apply)

  useEffect(() => {
    load().catch(() => setError('포트폴리오를 불러오지 못했습니다.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, portfolioId])

  if (!document || !detail) {
    return (
      <section className="pfe-main">
        {error ? <p className="pf-alert" role="alert">{error}</p> : <p className="pfe-desc" role="status">불러오는 중…</p>}
        <div><button type="button" className="pf-action pf-action--sm" onClick={onClose}>목록으로</button></div>
      </section>
    )
  }

  const change = (next: PortfolioDocument) => { setDocument(next); setDirty(true) }
  const changeSection = (key: PortfolioSectionKey, patch: (section: ListSection) => ListSection) =>
    change({ ...document, sections: document.sections.map(part => part.key === key && 'items' in part ? patch(part) : part) })
  const changePersonal = (patch: Partial<PortfolioPersonal>) =>
    change({ ...document, sections: document.sections.map(part => 'data' in part ? { ...part, data: { ...part.data, ...patch } } : part) })
  const changeItem = (key: PortfolioSectionKey, id: string, patch: (item: PortfolioItem) => PortfolioItem) =>
    changeSection(key, part => ({ ...part, items: part.items.map(item => item.id === id ? patch(item) : item) }))

  const setField = (def: SectionDef, id: string, field: string, value: string | number) =>
    changeItem(def.key, id, item => ({
      ...item,
      // 이름 칸이 따로 없는 항목은 대표 칸의 값이 곧 항목 이름이다.
      title: def.titleField === field ? String(value).slice(0, 200) : item.title,
      fields: { ...item.fields, [field]: value },
    }))

  const toggle = (key: PortfolioSectionKey, enabled: boolean) => {
    const def = SECTION_DEFS.find(item => item.key === key)!
    // 빼도 입력값은 지우지 않는다 — 다시 추가하면 그대로 돌아온다.
    changeSection(key, part => ({
      ...part, enabled, items: enabled && part.items.length === 0 ? [emptyItem(def)] : part.items,
    }))
    if (enabled) window.setTimeout(() => window.document.getElementById(`pfe-${key}`)?.scrollIntoView({ block: 'start' }), 0)
  }

  const persist = async (): Promise<boolean> => {
    setSaving(true)
    setError('')
    try {
      apply(await savePortfolio(studentId, portfolioId, { title, document, expectedVersion: detail.version }))
      return true
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'VERSION_CONFLICT') setConflict(true)
      setError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const finish = () => { void persist().then(saved => { if (saved) onClose() }) }

  const leave = () => {
    if (!dirty || window.confirm('저장하지 않은 내용이 있습니다. 목록으로 돌아갈까요?')) onClose()
  }

  const reloadLatest = () => {
    if (!window.confirm('다시 불러오면 이 화면에서 고친 내용은 사라집니다. 계속할까요?')) return
    setError('')
    load().catch(() => setError('최신본을 불러오지 못했습니다.'))
  }

  const addFile = (file: PortfolioFile) => setFiles(current => ({ ...current, [file.id]: file }))

  const pickFile = (slot: 'PORTFOLIO_PHOTO' | 'PORTFOLIO_DOCUMENT', file: File | undefined) => {
    if (!file) return
    setError('')
    Promise.resolve()
      .then(() => uploadPortfolioFile(slot, file))
      .then(stored => {
        addFile(stored)
        if (slot === 'PORTFOLIO_PHOTO') changePersonal({ photoFileId: stored.id })
        else if (uploadTarget.current) {
          const id = uploadTarget.current
          changeItem('document', id, item => ({
            ...item, title: item.title || stored.name, fields: { ...item.fields, fileId: stored.id },
          }))
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '파일을 올리지 못했습니다.'))
  }

  const person = personalOf(document)

  // 도구모음이 고정 상단바 뒤로 숨지 않게 맨 위에서 시작한다.
  const showPreview = (next: boolean) => {
    setPreview(next)
    setPhotoReady(false)
    window.scrollTo(0, 0)
  }

  if (preview) {
    const needsPhoto = !!files[person.photoFileId] && !photoReady
    return (
      <section className="pf-resume-full">
        <div className="pf-resume-toolbar">
          <div className="pf-resume-toolbar-info">
            <i className="fa-solid fa-circle-info" /> 뺀 항목은 표시되지 않습니다. 지원 시 제출되는 내용과 같습니다.
          </div>
          <div className="pf-resume-toolbar-actions">
            <button type="button" className="pf-resume-btn pf-resume-btn--ghost" onClick={() => showPreview(false)}>
              <i className="fa-solid fa-arrow-left" /> 편집으로
            </button>
            <button type="button" className="pf-resume-btn pf-resume-btn--primary" disabled={needsPhoto} onClick={() => window.print()}>
              <i className="fa-solid fa-file-pdf" /> PDF 저장
            </button>
          </div>
        </div>
        <PortfolioSheet document={document} files={files} onPhotoSettled={() => setPhotoReady(true)} />
      </section>
    )
  }

  const renderField = (def: SectionDef, item: PortfolioItem, field: FieldDef) => {
    const id = `pfe-${item.id}-${field.key}`
    const value = item.fields[field.key] ?? ''
    if (field.kind === 'level') {
      return (
        <Row key={field.key} label={field.label} htmlFor={id}>
          <select id={id} value={String(value)} onChange={event => setField(def, item.id, field.key, event.target.value ? Number(event.target.value) : '')}>
            <option value="">선택</option>
            {[1, 2, 3, 4, 5].map(level => <option key={level} value={level}>{level} · {LEVEL_NAMES[level]}</option>)}
          </select>
        </Row>
      )
    }
    if (field.kind === 'file') {
      const file = files[String(value)]
      return (
        <Row key={field.key} label={field.label} wide>
          <div className="pfe-file">
            <span>{file?.name ?? (item.title && value ? item.title : '선택된 파일이 없습니다.')}</span>
            <button
              type="button"
              className="pf-action pf-action--sm"
              onClick={() => { uploadTarget.current = item.id; fileInput.current?.click() }}
            >
              <i className="fa-solid fa-upload" /> 파일 올리기
            </button>
          </div>
        </Row>
      )
    }
    const locked = isLocked(def.key, item, field.key)
    const common = {
      id, value: String(value), readOnly: locked, placeholder: locked ? '' : field.placeholder,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(def, item.id, field.key, event.target.value),
    }
    if (field.options && !locked) {
      // 예전에 직접 적은 값도 선택지에서 사라지면 안 된다.
      const options = value && !field.options.includes(String(value)) ? [String(value), ...field.options] : field.options
      return (
        <Row key={field.key} label={field.label} htmlFor={id}>
          <select id={id} value={String(value)} onChange={event => setField(def, item.id, field.key, event.target.value)}>
            <option value="">{`-${field.label} 선택-`}</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </Row>
      )
    }
    return (
      <Row key={field.key} label={field.label} htmlFor={id} wide={field.kind === 'long'}>
        {field.kind === 'long'
          ? <textarea rows={field.key === 'answer' ? 10 : 4} maxLength={field.key === 'question' ? 2000 : undefined} {...common} />
          : <input type="text" maxLength={field.key === 'link' ? 2000 : 200} {...common} />}
        {locked && <small className="pfe-hint">학사 기록에서 옵니다.</small>}
      </Row>
    )
  }

  const renderItem = (def: SectionDef, item: PortfolioItem, index: number, total: number) => {
    const fixed = isEnrollment(item)
    const certified = def.key === 'certificate' && isCertified(item)
    return (
      <div key={item.id} className="pfe-item">
        <div className="pfe-item-head">
          {total > 1 && <span className="pfe-item-no">{index + 1} / {total}</span>}
          {item.verified && <span className="pf-badge pf-badge--ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> 인증</span>}
          {!fixed && (
            <button
              type="button"
              className="pf-icon-btn"
              onClick={() => changeSection(def.key, part => ({ ...part, items: part.items.filter(row => row.id !== item.id) }))}
              aria-label={`${def.label} ${index + 1}번째 항목 삭제`}
            >
              <i className="fa-regular fa-trash-can" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="pfe-rows">
          {def.titleLabel && (
            <Row label={def.titleLabel} htmlFor={`pfe-${item.id}-title`}>
              <input
                id={`pfe-${item.id}-title`}
                type="text"
                maxLength={200}
                readOnly={certified}
                value={item.title}
                onChange={event => changeItem(def.key, item.id, row => ({ ...row, title: event.target.value }))}
              />
            </Row>
          )}
          {def.fields.map(field => renderField(def, item, field))}
        </div>
      </div>
    )
  }

  const shown = SECTION_DEFS.filter(def => def.key !== 'personal' && listSection(document, def.key)?.enabled)

  return (
    <section className="pfe-layout">
      <div className="pfe-main">
        {error && (
          <div className="pf-alert" role="alert">
            <span>{error}</span>
            {conflict && <button type="button" className="pf-action pf-action--sm" onClick={reloadLatest}>최신본 다시 불러오기</button>}
          </div>
        )}
        {notImported.length > 0 && (
          <div className="pfe-notice" role="status">
            <strong>크기 제한으로 넣지 못한 기록이 있습니다.</strong>
            <span>{notImported.map(row => row.title).join(', ')}</span>
            <span>내용을 줄여 항목에 직접 입력해 주세요.</span>
          </div>
        )}

        <article className="pf-panel">
          <div className="pfe-title-bar">
            <button type="button" className="pf-action" onClick={leave}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> 목록으로
            </button>
            <div className="pfe-rows">
              <Row label="포트폴리오 이름" htmlFor="pfe-title">
                <input id="pfe-title" type="text" maxLength={60} value={title} onChange={event => { setTitle(event.target.value); setDirty(true) }} />
              </Row>
            </div>
          </div>
          {detail.missing.length > 0 && (
            <p className="pfe-missing"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> 제출하려면 {detail.missing.map(key => MISSING_LABEL[key] ?? key).join(', ')}을(를) 채워 저장해 주세요.</p>
          )}
        </article>

        <article className="pf-panel" id="pfe-personal">
          <header className="pf-panel-head">
            <div><h2>인적사항 <span className="pf-badge pf-badge--accent">필수</span></h2></div>
            <div className="pf-panel-actions">
              <button type="button" className="pf-action pf-action--sm" onClick={() => setImporting('personal')}>
                <i className="fa-solid fa-rotate" aria-hidden="true" /> 최신 기록 불러오기
              </button>
            </div>
          </header>
          <div className="pfe-personal">
            <div className="pfe-photo-col">
              <div className="pfe-photo">
                {files[person.photoFileId]
                  ? <ProtectedImage src={files[person.photoFileId].downloadUrl} alt="증명사진" />
                  : <i className="fa-solid fa-user" aria-hidden="true" />}
              </div>
              <button type="button" className="pf-action pf-action--sm" onClick={() => photoInput.current?.click()}>사진 올리기</button>
              {person.photoFileId && (
                <button type="button" className="pf-action pf-action--sm" onClick={() => changePersonal({ photoFileId: '' })}>사진 빼기</button>
              )}
            </div>
            <div className="pfe-rows">
              {PERSONAL_READONLY.map(([key, label]) => (
                <Row key={key} label={label} htmlFor={`pfe-personal-${key}`}>
                  <input id={`pfe-personal-${key}`} type="text" readOnly value={key === 'grade' && person.grade ? `${person.grade}학년` : String(person[key] ?? '')} />
                </Row>
              ))}
              {PERSONAL_INPUT.map(([key, label, placeholder]) => (
                <Row key={key} label={label} htmlFor={`pfe-personal-${key}`}>
                  <input
                    id={`pfe-personal-${key}`}
                    type="text"
                    maxLength={200}
                    placeholder={placeholder}
                    value={String(person[key] ?? '')}
                    onChange={event => changePersonal({ [key]: event.target.value })}
                  />
                </Row>
              ))}
              <Row label="자기소개" htmlFor="pfe-personal-intro" wide>
                <textarea id="pfe-personal-intro" rows={5} maxLength={10000} value={person.intro} onChange={event => changePersonal({ intro: event.target.value })} />
              </Row>
            </div>
          </div>
        </article>

        {shown.map(def => {
          const section = listSection(document, def.key)!
          return (
            <article key={def.key} className="pf-panel" id={`pfe-${def.key}`}>
              <header className="pf-panel-head">
                <div>
                  <h2>{def.label}{def.required && <span className="pf-badge pf-badge--accent">필수</span>}</h2>
                </div>
                <div className="pf-panel-actions">
                  {def.importable && (
                    <button type="button" className="pf-action pf-action--sm" onClick={() => setImporting(def.key)}>
                      <i className="fa-solid fa-rotate" aria-hidden="true" /> 최신 기록 불러오기
                    </button>
                  )}
                  <button
                    type="button"
                    className="pf-action pf-action--sm"
                    onClick={() => changeSection(def.key, part => ({ ...part, items: [...part.items, emptyItem(def)] }))}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" /> 항목 추가
                  </button>
                </div>
              </header>
              {section.items.length === 0
                ? <p className="pfe-desc">입력한 항목이 없습니다. 「항목 추가」를 눌러 입력하세요.</p>
                : <div className="pfe-items">{section.items.map((item, index) => renderItem(def, item, index, section.items.length))}</div>}
            </article>
          )
        })}
      </div>

      <aside className="pfe-panel" aria-label="이력서 항목">
        <div className="pf-panel pfe-panel-card">
          <button
            type="button"
            className="pfe-panel-toggle"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen(open => !open)}
          >
            이력서 항목 <i className={`fa-solid fa-chevron-${panelOpen ? 'up' : 'down'}`} aria-hidden="true" />
          </button>
          <h3 className="pfe-panel-title">이력서 항목</h3>
          <p className="pfe-panel-note">넣은 항목만 제출본에 들어갑니다. 빼도 입력한 내용은 지워지지 않습니다.</p>
          <ul className={`pfe-panel-list${panelOpen ? ' is-open' : ''}`}>
            {SECTION_DEFS.map(def => {
              const enabled = def.key === 'personal' || !!listSection(document, def.key)?.enabled
              return (
                <li key={def.key}>
                  <i className={`pfe-dot${enabled ? ' is-on' : ''}`} aria-hidden="true" />
                  <span className={enabled ? 'is-on' : ''}>{def.label}</span>
                  {def.required
                    ? <span className="pf-badge pf-badge--accent">필수</span>
                    : (
                      <button
                        type="button"
                        className={`pfe-toggle${enabled ? ' is-remove' : ''}`}
                        onClick={() => toggle(def.key, !enabled)}
                        aria-label={`${def.label} ${enabled ? '빼기' : '넣기'}`}
                      >
                        {enabled ? '빼기' : '넣기'}
                      </button>
                    )}
                </li>
              )
            })}
          </ul>
          <div className="pfe-panel-actions">
            <button type="button" className="pf-action" onClick={() => showPreview(true)}>
              <i className="fa-regular fa-eye" aria-hidden="true" /> 미리보기
            </button>
            <button type="button" className="pf-action" disabled={saving} onClick={() => void persist()}>
              {saving ? '저장 중…' : '임시저장'}
            </button>
            <small className={`pfe-saved${dirty ? ' is-dirty' : ''}`}>{dirty ? '저장하지 않은 변경이 있습니다.' : savedAt ? `마지막 저장 ${timeOf(savedAt)}` : ''}</small>
            <button type="button" className="pf-action pf-action--primary" disabled={saving} onClick={finish}>저장하고 닫기</button>
          </div>
        </div>
      </aside>

      <input ref={photoInput} type="file" className="pfe-file-input" accept={PHOTO_ACCEPT} onChange={event => { pickFile('PORTFOLIO_PHOTO', event.target.files?.[0]); event.target.value = '' }} />
      <input ref={fileInput} type="file" className="pfe-file-input" accept={DOCUMENT_ACCEPT} onChange={event => { pickFile('PORTFOLIO_DOCUMENT', event.target.files?.[0]); event.target.value = '' }} />

      {importing && (
        <PortfolioImportModal
          studentId={studentId}
          sectionKey={importing}
          document={document}
          onClose={() => setImporting(null)}
          onApply={next => { change(next); setImporting(null) }}
        />
      )}
    </section>
  )
}
