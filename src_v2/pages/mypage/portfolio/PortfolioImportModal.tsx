import { useEffect, useMemo, useState } from 'react'
import Modal from '../../../components/Modal'
import { SECTION_DEFS, listSection, personalOf } from '../../../../shared/portfolioSections'
import { loadPortfolioSource } from '../../../../shared/portfolioStore'
import type { PortfolioDocument, PortfolioItem, PortfolioPersonal, PortfolioSectionKey, PortfolioSource } from '../../../../shared/portfolioStore'

interface Props {
  studentId: string
  sectionKey: PortfolioSectionKey
  document: PortfolioDocument
  onClose: () => void
  onApply: (next: PortfolioDocument) => void
}

const PERSONAL_FIELDS: { key: 'email' | 'phone' | 'intro'; label: string }[] = [
  { key: 'email', label: '이메일' }, { key: 'phone', label: '휴대폰' }, { key: 'intro', label: '자기소개' },
]

/** 첨부는 한 기록에 여러 개가 달려 sourceRef 가 겹친다. 파일 id 로 거른다. */
function sameSource(key: PortfolioSectionKey, item: PortfolioItem, other: PortfolioItem): boolean {
  return key === 'document' ? item.fields.fileId === other.fields.fileId : item.sourceRef === other.sourceRef
}

/** 「최신 기록 불러오기」 — 항목별로 동작한다. 이미 있는 항목은 덮어쓰지 않고, 고른 것만 더한다. */
export default function PortfolioImportModal({ studentId, sectionKey, document, onClose, onApply }: Props) {
  const [source, setSource] = useState<PortfolioSource | null>(null)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  useEffect(() => {
    let live = true
    loadPortfolioSource(studentId)
      .then(next => { if (live) setSource(next) })
      .catch(() => { if (live) setError('기록을 불러오지 못했습니다.') })
    return () => { live = false }
  }, [studentId])

  const label = SECTION_DEFS.find(def => def.key === sectionKey)?.label ?? ''
  const current = listSection(document, sectionKey)
  const candidates = useMemo(() => {
    const items = source?.sections.find(part => part.key === sectionKey)?.items ?? []
    return items.filter(item => !current?.items.some(row => sameSource(sectionKey, item, row)))
  }, [source, sectionKey, current])
  const person = personalOf(document)
  const personalChanges = sectionKey === 'personal' && source
    ? PERSONAL_FIELDS.filter(field => source.personal[field.key] && source.personal[field.key] !== person[field.key]) : []

  const togglePick = (id: string) => setPicked(before => {
    const next = new Set(before)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const applyPicked = () => {
    if (!source) return
    const patch: Partial<PortfolioPersonal> = {}
    for (const field of personalChanges) if (picked.has(field.key)) patch[field.key] = source.personal[field.key]
    onApply({
      ...document,
      sections: document.sections.map(part => {
        if ('data' in part) return { ...part, data: { ...part.data, ...patch } }
        if (part.key !== sectionKey) return part
        return { ...part, items: [...part.items, ...candidates.filter(item => picked.has(item.id))] }
      }),
    })
  }

  const empty = source !== null && (sectionKey === 'personal' ? personalChanges.length === 0 : candidates.length === 0)

  return (
    <Modal open onClose={onClose} title={`${label} — 최신 기록 불러오기`} size="md">
      {error && <p className="pfe-alert" role="alert">{error}</p>}
      {!source && !error && <p className="pfe-desc" role="status">불러오는 중…</p>}
      {empty && <p className="pfe-desc">더 불러올 기록이 없습니다.</p>}
      <ul className="pfe-import-list">
        {personalChanges.map(field => (
          <li key={field.key}>
            <label>
              <input type="checkbox" checked={picked.has(field.key)} onChange={() => togglePick(field.key)} />
              <span><strong>{field.label}</strong><small>{source?.personal[field.key]}</small></span>
            </label>
          </li>
        ))}
        {sectionKey !== 'personal' && candidates.map(item => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={picked.has(item.id)} onChange={() => togglePick(item.id)} />
              <span><strong>{item.title || label}</strong></span>
            </label>
          </li>
        ))}
      </ul>
      <div className="gh-form-actions">
        <button type="button" onClick={onClose}>닫기</button>
        <button type="submit" disabled={picked.size === 0} onClick={applyPicked}>선택 항목 넣기</button>
      </div>
    </Modal>
  )
}
