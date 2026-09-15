import { codeItems, type CodeItem } from '../../shared/metadataStore'

export const catalogOptions = (group: string): CodeItem[] => codeItems
  .filter(item => item.group_code === group && item.is_active)
  .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))

export const catalogText = (item: CodeItem, key: string): string =>
  typeof item.payload[key] === 'string' ? item.payload[key] as string : ''
