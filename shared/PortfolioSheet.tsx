import { useState, type ReactNode } from 'react'
import { downloadApiFile } from './api'
import ProtectedImage from './ProtectedImage'
import { LEVEL_NAMES, SECTION_DEFS, personalOf, type FieldDef, type SectionDef } from './portfolioSections'
import type { ListSection, PortfolioDocument, PortfolioFile, PortfolioFiles, PortfolioItem } from './portfolioStore'
import { studentDisplayName } from './studentDisplayName'
import '../src_v2/components/ResumeSheet.css'
import './PortfolioSheet.css'

// ─────────────────────────────────────────────────────────────────────────
// 포트폴리오 시트 — 학생 미리보기·학생 제출본·교직원 제출본이 같이 쓴다.
// 상담사가 보는 제출본이 학생이 보는 것과 다르면 안 되므로 한 벌만 둔다(CLAUDE.md 12조).
// 값은 문자로만 넣는다 — 문서 값을 HTML 로 해석하지 않는다.
// 두 SPA 가 쓰므로 CSS 는 var(--x, 폴백) 이다(admin :root 에 없는 토큰이 있다).
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  document: PortfolioDocument
  files: PortfolioFiles
  /** 사진 로드가 끝나면 부른다. 인쇄 버튼을 그때 연다. */
  onPhotoSettled?: () => void
}

const SINGLE_DATE = ['acquiredOn', 'awardedOn']

/** 행만 추가하고 비워 둔 항목은 표시하지 않는다. */
const hasContent = (item: PortfolioItem) => !!item.title || Object.values(item.fields).some(value => value !== '')

function period(def: SectionDef, item: PortfolioItem): string {
  if (def.period) {
    const [start, end] = def.period.map(key => String(item.fields[key] ?? ''))
    return start || end ? `${start} ~ ${end}` : ''
  }
  const single = SINGLE_DATE.find(key => item.fields[key])
  return single ? String(item.fields[single]) : ''
}

function shortValue(field: FieldDef, value: string | number): string {
  if (field.kind === 'level') return `${value}/5 ${LEVEL_NAMES[Number(value)] ?? ''}`.trim()
  return String(value)
}

function FileLine({ file }: { file: PortfolioFile }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="pfs-file">
      <i className="fa-solid fa-paperclip" aria-hidden="true" /> {file.name}
      <button
        type="button"
        className="pfs-file-btn pfs-no-print"
        onClick={() => void downloadApiFile(file.downloadUrl.replace(/^\/api\/v1/, ''), file.name).catch(() => setFailed(true))}
      >
        받기
      </button>
      {failed && <small role="alert"> 파일을 받지 못했습니다.</small>}
    </span>
  )
}

function ItemBlock({ def, item, files }: { def: SectionDef; item: PortfolioItem; files: PortfolioFiles }) {
  const hidden = new Set([...(def.period ?? []), ...SINGLE_DATE, def.titleField ?? ''])
  const filled = def.fields.filter(field => !hidden.has(field.key) && item.fields[field.key] !== '' && item.fields[field.key] !== undefined)
  const short = filled.filter(field => field.kind !== 'long' && field.kind !== 'file')
  const long = filled.filter(field => field.kind === 'long')
  const file = files[String(item.fields.fileId ?? '')]
  const when = period(def, item)
  // 항목 이름은 200자까지라 대표 칸이 있으면 그 원문을 쓴다.
  const heading = String((def.titleField && item.fields[def.titleField]) || item.title)
  if (!hasContent(item)) return null
  return (
    <div className="pfs-item">
      <div className="pfs-item-head">
        {heading && <strong>{heading}</strong>}
        {item.verified && <span className="pfs-verified"><i className="fa-solid fa-circle-check" aria-hidden="true" /> 인증</span>}
        {when && <span className="pfs-when">{when}</span>}
      </div>
      {short.length > 0 && (
        <dl className="pfs-meta">
          {short.map(field => (
            <div key={field.key}><dt>{field.label}</dt><dd>{shortValue(field, item.fields[field.key])}</dd></div>
          ))}
        </dl>
      )}
      {long.map(field => (
        <p key={field.key} className="pf-resume-text pfs-long">{String(item.fields[field.key])}</p>
      ))}
      {file && <FileLine file={file} />}
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pf-resume-block">
      <header className="pf-resume-block-head"><h3>{title}</h3></header>
      <div className="pf-resume-block-body">{children}</div>
    </section>
  )
}

export default function PortfolioSheet({ document, files, onPhotoSettled }: Props) {
  const person = personalOf(document)
  const photo = files[person.photoFileId]
  const name = studentDisplayName(person.name, person.studentNo)
  const contact = [
    { icon: 'fa-envelope', value: person.email }, { icon: 'fa-phone', value: person.phone },
    { icon: 'fa-id-card', value: person.studentNo && `학번 ${person.studentNo}` },
    { icon: 'fa-cake-candles', value: person.birthDate }, { icon: 'fa-location-dot', value: person.address },
  ].filter(row => row.value)
  const shown = SECTION_DEFS.flatMap(def => {
    const section = document.sections.find(part => part.key === def.key)
    return section && section.enabled && 'items' in section && section.items.some(hasContent)
      ? [{ def, section: section as ListSection }] : []
  })
  return (
    <div className="pf-resume-paper pfs-paper">
      <header className="pf-resume-header pfs-header">
        <div className="pfs-identity">
          {photo && (
            <div className="pfs-photo">
              <ProtectedImage src={photo.downloadUrl} alt={`${name} 사진`} onSettled={onPhotoSettled} />
            </div>
          )}
          <div className="pf-resume-name-block">
            <h2 className="pf-resume-name">{name}</h2>
            {person.nameEn && <p className="pf-resume-title-line">{person.nameEn}</p>}
            <p className="pf-resume-title-line">
              {[person.dept, person.grade ? `${person.grade}학년` : '', person.school].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="pf-resume-contact-block">
          <div className="pf-resume-contact pfs-contact">
            {contact.map(row => <span key={row.icon}><i className={`fa-solid ${row.icon}`} aria-hidden="true" /> {row.value}</span>)}
          </div>
        </div>
      </header>

      {person.intro && <Block title="자기소개"><p className="pf-resume-text pfs-long">{person.intro}</p></Block>}
      {shown.map(({ def, section }) => (
        <Block key={def.key} title={def.label}>
          <div className="pfs-items">
            {section.items.map(item => <ItemBlock key={item.id} def={def} item={item} files={files} />)}
          </div>
        </Block>
      ))}
    </div>
  )
}
