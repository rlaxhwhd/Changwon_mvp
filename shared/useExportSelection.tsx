import { useState } from 'react'

/** Selection survives pagination, but never survives a changed search scope. */
export function useExportSelection<T>(scope: string, rows: T[], key: (row: T) => string, disabled = false) {
  const [state, setState] = useState<{ scope: string; rows: Map<string, T> }>(() => ({ scope, rows: new Map() }))
  const selected = state.scope === scope ? state.rows : new Map<string, T>()
  if (state.scope !== scope) setState({ scope, rows: new Map() })
  const update = (items: T[], checked: boolean) => setState(previous => {
    const next = new Map(previous.scope === scope ? previous.rows : [])
    items.forEach(row => { if (checked) next.set(key(row), row); else next.delete(key(row)) })
    return { scope, rows: next }
  })
  const all = rows.length > 0 && rows.every(row => selected.has(key(row)))
  return {
    ids: [...selected.keys()], rows: [...selected.values()], count: selected.size,
    header: <SelectionCheckbox label="현재 페이지 전체 선택" checked={all}
      mixed={!all && rows.some(row => selected.has(key(row)))} disabled={disabled || !rows.length}
      onChange={checked => update(rows, checked)} />,
    checkbox: (row: T, label: string) => <SelectionCheckbox label={`${label} 선택`}
      checked={selected.has(key(row))} disabled={disabled} onChange={checked => update([row], checked)} />,
  }
}

function SelectionCheckbox({ label, checked, mixed = false, disabled = false, onChange }: {
  label: string; checked: boolean; mixed?: boolean; disabled?: boolean; onChange: (checked: boolean) => void
}) {
  return <input type="checkbox" aria-label={label} checked={checked} disabled={disabled}
    ref={element => { if (element) element.indeterminate = mixed }}
    onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
    onChange={event => onChange(event.target.checked)} />
}
