import { useState } from 'react'
import type { CodeItem } from '../../shared/metadataStore'
import { codeLabel } from '../../shared/metadataStore'
import { catalogText } from '../data/growthInputCatalog'

/** Suggestions stay inside the dialog; selecting one never submits a record. */
export default function GrowthCatalogPicker({ label, options, onPick }: {
  label: string; options: CodeItem[]; onPick: (item: CodeItem) => void
}) {
  const [query, setQuery] = useState('')
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/\s/g, '')
  const groupOf = (item: CodeItem) => catalogText(item, 'category') || catalogText(item, 'language') ||
    codeLabel('GROWTH_SKILL_CATEGORY', catalogText(item, 'categoryCode'), '')
  const matches = options.filter(item => normalize(`${item.label} ${groupOf(item)}`).includes(normalize(query)))
  return <div className="gh-catalog-picker">
    <label><span>{label} 검색</span><input type="search" value={query} maxLength={100}
      placeholder="이름 또는 분야로 검색" onChange={event => setQuery(event.target.value)} /></label>
    <label><span>추천 항목 선택 <small>{matches.length}개</small></span>
      <select value="" onChange={event => { const item = options.find(x => x.code === event.target.value); if (item) onPick(item) }}>
        <option value="">선택하면 아래 입력란에 반영됩니다</option>
        {matches.map(item => <option key={item.code} value={item.code}>{item.label}{groupOf(item) ? ` · ${groupOf(item)}` : ''}</option>)}
      </select>
    </label>
    <small>{matches.length ? '목록에 없는 항목은 아래에서 직접 입력해 주세요.' : '일치하는 후보가 없습니다. 아래에서 직접 입력할 수 있습니다.'}</small>
  </div>
}
