import { api } from './api'

export interface CodeItem {
  group_code: string; code: string; label: string; sort_order: number
  is_active: boolean; payload: Record<string, unknown>
}
export const codeItems: CodeItem[] = []
export interface MenuItem { menu_code: string; label: string; route: string; sort_order: number; is_active: boolean }
export const menuItems: MenuItem[] = []
export interface FactorDefinition {test_code: string;factor_code: string;label: string;secondary_label: string | null;sort_order: number}
export const factorDefinitions: FactorDefinition[] = []
export const METADATA_EVENT = 'dc_metadata_changed'
let revision = -1
export async function loadMetadata() {
  const result = await api<{revision: number; items: CodeItem[]; menus: MenuItem[]; factors: FactorDefinition[]}>('/metadata')
  if (result.revision === revision) return
  revision = result.revision
  codeItems.splice(0, codeItems.length, ...result.items)
  menuItems.splice(0, menuItems.length, ...result.menus)
  factorDefinitions.splice(0,factorDefinitions.length,...result.factors)
  window.dispatchEvent(new Event(METADATA_EVENT))
}
export function codeLabel(group: string, code: string, fallback = code): string {
  return codeItems.find(x => x.group_code === group && x.code === code)?.label ?? fallback
}
