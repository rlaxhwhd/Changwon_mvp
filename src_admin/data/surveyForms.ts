// ─────────────────────────────────────────────────────────────────────────
// 설문지 관리 — 정본은 서버다.
//
// 문항·영역은 코드관리(SURVEY_AREA·SURVEY_ITEM)에 쌓인 **부품**이고, 설문지는 그 부품을
// 조립한 **결과물**이다. 초안을 떠서 영역·문항을 고르고 게시하면 그 구성이 잠긴다.
// 프로그램은 개설 시점의 게시본을 붙잡으므로, 새 버전이 나와도 운영 중 조사는 바뀌지 않는다.
// 문장 수정은 버전을 올리지 않는다 — 사전에서 고치면 모든 버전에 반영된다.
//
// 부품은 /metadata 가 아니라 코드관리 엔드포인트에서 읽는다. 낙관적 잠금에 쓸 version 이
// 거기에만 있고, 이력도 code_item_event 한 곳에 쌓여야 한다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'
import { loadMetadata } from '../../shared/metadataStore'

export type SurveyFormKind = 'COMPETENCY' | 'SATISFACTION'
export type SurveyItemKind = 'SCALE' | 'TEXT'

export interface SurveyFormItem { code: string; label: string; kind: SurveyItemKind }
export interface SurveyFormArea { key: string; label: string; group: string; items: SurveyFormItem[] }
export interface SurveyForm {
  id: number
  kind: SurveyFormKind
  /** 설문지 버전(v1, v2…). 낙관적 잠금과 무관하다. */
  version: number
  status: 'DRAFT' | 'PUBLISHED'
  memo: string
  createdAt: string
  publishedAt: string | null
  lockVersion: number
  /** 이 갈래의 현재 게시본 — 새로 개설하는 프로그램이 붙잡는다. */
  isCurrent: boolean
  programCount: number
  responseCount: number
  /** 응답이 한 건이라도 들어온 게시본. 구성을 바꿀 수 없다. */
  locked: boolean
  areas: SurveyFormArea[]
}
/** 저장할 구성 — 영역 순서와 영역별 문항 순서가 곧 설문지의 순서다. */
export interface SurveyFormPlan { areaCode: string; items: string[] }

export const SURVEY_FORM_KIND_LABEL: Record<SurveyFormKind, string> = {
  COMPETENCY: '역량향상률 설문지', SATISFACTION: '만족도 설문지',
}
export async function loadSurveyForms(kind?: SurveyFormKind): Promise<SurveyForm[]> {
  const result = await api<{ items: SurveyForm[] }>('/system/survey-forms' + (kind ? `?kind=${kind}` : ''))
  return result.items
}
export async function createSurveyForm(kind: SurveyFormKind, memo: string, reason: string): Promise<SurveyForm> {
  return api<SurveyForm>('/system/survey-forms', { method: 'POST', body: JSON.stringify({ kind, memo, reason }) })
}
export async function saveSurveyForm(form: SurveyForm, areas: SurveyFormPlan[], memo: string, reason: string): Promise<SurveyForm> {
  return api<SurveyForm>(`/system/survey-forms/${form.id}`, { method: 'PUT',
    body: JSON.stringify({ expectedLockVersion: form.lockVersion, memo, areas, reason }) })
}
export async function publishSurveyForm(form: SurveyForm, reason: string): Promise<SurveyForm> {
  const published = await api<SurveyForm>(`/system/survey-forms/${form.id}/publish`, { method: 'POST',
    body: JSON.stringify({ expectedLockVersion: form.lockVersion, reason }) })
  await loadMetadata()   // 개설 화면의 영역 선택지가 곧바로 새 게시본을 따라야 한다.
  return published
}
export async function discardSurveyForm(form: SurveyForm, reason: string): Promise<void> {
  await api(`/system/survey-forms/${form.id}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
}

// ── 부품 사전 ────────────────────────────────────────────────────────────

interface CodeRow { code: string; label: string; sort_order: number; is_active: boolean; payload: Record<string, unknown>; version: number }
export interface DictionaryArea { code: string; label: string; group: string; sortOrder: number; version: number }
export interface DictionaryItem { code: string; label: string; areaKey: string; kind: SurveyItemKind; sortOrder: number; version: number }
export interface SurveyDictionary { areas: DictionaryArea[]; items: DictionaryItem[] }

async function codeRows(group: string): Promise<CodeRow[]> {
  const rows: CodeRow[] = []
  for (let page = 1; ; page++) {
    const response = await api<{ items: CodeRow[]; totalCount: number }>(`/system/code-groups/${group}/items?page=${page}&pageSize=100`)
    rows.push(...response.items)
    if (!response.items.length || rows.length >= response.totalCount) break
  }
  return rows.filter(row => row.is_active)
}

export async function loadSurveyDictionary(): Promise<SurveyDictionary> {
  const [areas, items] = await Promise.all([codeRows('SURVEY_AREA'), codeRows('SURVEY_ITEM')])
  return {
    areas: areas.map(row => ({ code: row.code, label: row.label, group: String(row.payload.group ?? ''),
                               sortOrder: row.sort_order, version: row.version })),
    items: items.map(row => ({ code: row.code, label: row.label, areaKey: String(row.payload.areaKey ?? ''),
                               kind: row.payload.kind === 'TEXT' ? 'TEXT' : 'SCALE', sortOrder: row.sort_order,
                               version: row.version })),
  }
}

/** 새 부품의 코드 — 사람이 외우는 값이 아니라 정체성이라 화면에서 직접 입력받지 않는다. */
function nextCode(prefix: string, existing: string[]): string {
  const used = new Set(existing)
  for (let n = 1; n < 1000; n++) {
    const code = `${prefix}_${String(n).padStart(2, '0')}`
    if (!used.has(code)) return code
  }
  throw new Error('코드를 더 만들 수 없습니다.')
}

async function saveCode(group: string, code: string, body: Record<string, unknown>): Promise<void> {
  await api(`/system/code-groups/${group}/items/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) })
}

/** 영역 등록 — 묶음(진로·직무·취업·만족도) 안에 새 영역을 만든다. 코드는 자동 부여한다. */
export async function createArea(dictionary: SurveyDictionary, group: string, label: string, reason: string): Promise<string> {
  const siblings = dictionary.areas.filter(area => area.group === group)
  const code = nextCode(group === 'SATISFACTION' ? 'SAT' : group, dictionary.areas.map(area => area.code))
  const sortOrder = Math.max(0, ...siblings.map(area => area.sortOrder)) + 1
  await saveCode('SURVEY_AREA', code, { expectedVersion: 0, label, sortOrder, isActive: true, payload: { group }, reason })
  return code
}
/** 문항 등록 — 어느 영역에 속하는지와 척도/서술형을 함께 정한다. */
export async function createItem(dictionary: SurveyDictionary, areaCode: string, label: string,
                                 kind: SurveyItemKind, reason: string): Promise<string> {
  const siblings = dictionary.items.filter(item => item.areaKey === areaCode)
  const code = nextCode(areaCode, dictionary.items.map(item => item.code))
  const sortOrder = Math.max(0, ...siblings.map(item => item.sortOrder)) + 1
  await saveCode('SURVEY_ITEM', code, { expectedVersion: 0, label, sortOrder, isActive: true,
                                        payload: { areaKey: areaCode, kind }, reason })
  return code
}
/** 문장 수정 — 버전을 올리지 않는다. 모든 설문지 버전이 같은 문장을 쓴다. */
export async function renameItem(item: DictionaryItem, label: string, reason: string): Promise<void> {
  await saveCode('SURVEY_ITEM', item.code, { expectedVersion: item.version, label, sortOrder: item.sortOrder,
                                             isActive: true, payload: { areaKey: item.areaKey, kind: item.kind }, reason })
}
/** 영역 이름 수정 — 문항과 같은 이유로 버전을 올리지 않는다. */
export async function renameArea(area: DictionaryArea, label: string, reason: string): Promise<void> {
  await saveCode('SURVEY_AREA', area.code, { expectedVersion: area.version, label, sortOrder: area.sortOrder,
                                             isActive: true, payload: { group: area.group }, reason })
}
