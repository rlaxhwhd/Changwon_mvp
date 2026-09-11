// ─────────────────────────────────────────────────────────────────────────
// 로드맵 스토어 — programStore·jobStore 와 같은 규약이다.
//
// 화면은 동기 셀렉터로 읽고(SPEC.md §5), 쓰기는 서버가 정본이라 async 다.
// 저장 뒤에는 응답을 믿지 않고 그 학생의 계획을 서버에서 다시 읽어 교체한다.
//
// localStorage 는 더 이상 로드맵의 정본이 아니다 — dc_roadmap · dc_roadmap_snapshots ·
// dc_roadmap_overrides · dc_roadmap_requests 는 전부 서버로 옮겼다.
//
// ⚠ 계획은 학생당 1벌이고 화면은 한 번에 한 학생만 본다. 그래서 전 학생을 미리 담지 않고
//   식별자별로 캐시한다 — 목록·통계는 서버 페이징/집계 API(queryRoadmaps)를 쓴다.
// ─────────────────────────────────────────────────────────────────────────
import { api, queryString } from './api'
import type { RoadmapAxis, RoadmapAxisPlan, RoadmapProgress } from '../src_v2/data/schema/roadmap'

export const ROADMAP_EVENT = 'dc_roadmap_changed'

/** 계획 상태 — PROCESS.md §6-7. 학생에게는 CONFIRMED 만 보인다. */
export type RoadmapStatusCode = 'DRAFT' | 'REVIEW' | 'CONFIRMED'

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatusCode, string> = {
  DRAFT: '초안', REVIEW: '검토중', CONFIRMED: '확정',
}

export interface RoadmapCapabilities {
  canEdit: boolean
  canConfirm: boolean
  canGenerate: boolean
  canRegenerate: boolean
  canRequestChange: boolean
  providerSource: string | null
}

export interface GateReason { code: string; message: string; nextRoute: string }

export interface RoadmapPlanDTO {
  studentUid: string
  /** 세대 번호. 재생성마다 오른다. */
  roadmapVersion: number
  /** 편집 잠금 토큰. 칸 하나를 고쳐도 오른다. 세대와 다른 수다. */
  version: number
  status: RoadmapStatusCode
  confirmed: boolean
  targetRole: string
  targetCompany: unknown
  counselRequestId: string | null
  basisKind: 'COUNSEL' | 'LEGACY_IMPORT'
  aiRunId: string | null
  axes: RoadmapAxisPlan[]
  progress: RoadmapProgress
  byAxis: Record<RoadmapAxis, RoadmapProgress>
  updatedAt: string | null
  confirmedAt: string | null
  capabilities: RoadmapCapabilities
  asOf: string
}

export interface RoadmapEventRow {
  id: string
  roadmapVersion: number
  action: string
  causeKind: string | null
  causeId: string | null
  reason: string
  occurredAt: string
  actorName: string | null
}

export interface RoadmapEnvelope {
  roadmap: RoadmapPlanDTO | null
  capabilities: RoadmapCapabilities
  gate: { eligible: boolean; reasons: GateReason[] }
  /** 계획은 있으나 아직 확정되지 않아 학생에게 보이지 않는 상태 */
  pending: boolean
  events: RoadmapEventRow[]
}

const plans = new Map<string, RoadmapEnvelope>()
const pending = new Map<string, Promise<void>>()

function publish(): void {
  window.dispatchEvent(new Event(ROADMAP_EVENT))
}

/** 지금 적재된 계획. 화면·셀렉터의 유일한 읽기 경로. 아직 안 읽었으면 undefined. */
export function roadmapEnvelope(studentId: string): RoadmapEnvelope | undefined {
  return plans.get(studentId)
}

export async function loadRoadmap(studentId: string): Promise<void> {
  const base = `/students/${encodeURIComponent(studentId)}/roadmap`
  const envelope = await api<Omit<RoadmapEnvelope, 'events'>>(base)
  let events: RoadmapEventRow[] = []
  if (envelope.roadmap) {
    events = (await api<{ items: RoadmapEventRow[] }>(`${base}/events?pageSize=20`)).items
  }
  plans.set(studentId, { ...envelope, events })
  publish()
}

/** 화면 진입·식별자 변경마다 한 번만 읽는다. 같은 학생을 동시에 여러 번 부르지 않는다. */
export function ensureRoadmap(studentId: string): void {
  if (!studentId || plans.has(studentId) || pending.has(studentId)) return
  const task = loadRoadmap(studentId)
    .catch(() => { /* 실패는 화면의 로드 상태가 표시한다 — 가짜 데이터로 대체하지 않는다 */ })
    .finally(() => { pending.delete(studentId) })
  pending.set(studentId, task)
}

/** 식별자가 바뀌면 이전 학생의 본문을 재사용하지 않는다. */
export function clearRoadmapCache(): void {
  plans.clear()
  pending.clear()
  publish()
}

async function refresh(studentId: string): Promise<void> {
  plans.delete(studentId)
  await loadRoadmap(studentId)
}

function key(): Record<string, string> {
  return { 'Idempotency-Key': crypto.randomUUID() }
}

function send<T>(path: string, method: string, body: unknown): Promise<T> {
  return api<T>(path, { method, headers: key(), body: JSON.stringify(body) })
}

// ── 쓰기 ────────────────────────────────────────────────────────────────

export interface EditOperation {
  op: 'setAxis' | 'editItem' | 'reorderItems'
  axis?: RoadmapAxis
  headline?: string
  itemId?: string
  itemIds?: string[]
  expectedItemVersion?: number
  title?: string
  priority?: string
  importance?: string
  editorNote?: string
}

export interface RequestRef { id: string; expectedVersion: number; note?: string }

function versions(studentId: string): { expectedRoadmapVersion: number; expectedVersion: number } {
  const plan = plans.get(studentId)?.roadmap
  if (!plan) throw new Error('로드맵을 먼저 불러와야 합니다.')
  return { expectedRoadmapVersion: plan.roadmapVersion, expectedVersion: plan.version }
}

export async function generatePlan(studentId: string, counselRequestId: string,
                                   targetRole?: string): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap/generate`, 'POST',
    { counselRequestId, targetRole, expectedRoadmapVersion: 0, expectedVersion: 0 })
  await refresh(studentId)
}

export async function regeneratePlan(studentId: string, counselRequestId: string, reason: string,
                                     targetRole?: string, requests: RequestRef[] = []): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap/regenerate`, 'POST',
    { counselRequestId, targetRole, reason, requests, ...versions(studentId) })
  await refresh(studentId)
}

export async function editPlan(studentId: string, operations: EditOperation[], note: string,
                               requests: RequestRef[] = []): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap`, 'PATCH',
    { operations, note, requests, ...versions(studentId) })
  await refresh(studentId)
}

export async function transitionPlan(studentId: string, action: 'review' | 'confirm' | 'reopen',
                                     reason = ''): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap/${action}`, 'POST',
    { reason, ...versions(studentId) })
  await refresh(studentId)
}

export async function setItemCompletion(studentId: string, itemId: string, done: boolean,
                                        reason: string, expectedItemVersion: number): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap/items/${encodeURIComponent(itemId)}/completion`,
    'POST', { done, reason, expectedItemVersion, ...versions(studentId) })
  await refresh(studentId)
}

/** 되돌리기도 새 사건이다 — 원래 이력을 지우지 않는다. */
export async function restorePlanEdit(studentId: string, eventId: string, reason = ''): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap/edits/restore`, 'POST',
    { eventId, reason, ...versions(studentId) })
  await refresh(studentId)
}

// ── 목록·통계 (서버 페이징/집계) ────────────────────────────────────────

export interface RoadmapListRow {
  studentId: string
  studentName: string
  studentNo: string
  studentMajor: string
  grade: number | null
  collegeCode: string | null
  deptCode: string | null
  studentType: string | null
  status: RoadmapStatusCode | null
  confirmed: boolean | null
  roadmapVersion: number | null
  version: number | null
  targetRole: string | null
  updatedAt: string | null
  hasRoadmap: boolean
  canGenerate: boolean
  progress: RoadmapProgress
}

export interface RoadmapQuery {
  page?: number
  pageSize?: number
  status?: RoadmapStatusCode
  hasRoadmap?: boolean
  /** 학과는 이름이 아니라 (단대코드, 학과코드) 쌍이다 — 동명 학과가 과정별로 존재한다. */
  collegeCode?: string
  deptCode?: string
  studentType?: string
  q?: string
}

export interface Page<T> { items: T[]; totalCount: number; page: number; pageSize: number }

export function queryRoadmaps(query: RoadmapQuery = {}): Promise<Page<RoadmapListRow>> {
  return api<Page<RoadmapListRow>>('/roadmaps?' + queryString(query))
}

export interface RoadmapSummary {
  summary: {
    total: number
    withRoadmap: number
    draft: number
    review: number
    confirmed: number
    generatable: number
    averageProgress: number
  }
  bands: { from: number; to: number; count: number }[]
  asOf: string
}

export function queryRoadmapSummary(query: RoadmapQuery = {}): Promise<RoadmapSummary> {
  return api<RoadmapSummary>('/roadmaps/summary?' + queryString(query))
}

// ── 변경 요청 ────────────────────────────────────────────────────────────

export type RoadmapRequestStatus = 'REQ' | 'APPLIED' | 'REJECTED'

export const ROADMAP_REQUEST_STATUS_LABEL: Record<RoadmapRequestStatus, string> = {
  REQ: '대기', APPLIED: '반영완료', REJECTED: '반려',
}

export interface RoadmapChangeRequest {
  id: string
  studentId: string | null
  studentName: string | null
  studentNo: string | null
  studentMajor: string | null
  axis: RoadmapAxis | null
  title: string
  reason: string
  status: RoadmapRequestStatus
  requestedAt: string
  handledAt: string | null
  handlingNote: string
  roadmapVersion: number | null
  targetItemId: string | null
  appliedEventId: string | null
  version: number
}

interface RequestPage extends Page<RoadmapChangeRequest> {
  summary: Record<RoadmapRequestStatus, number>
}

export interface RoadmapMenuCapability {
  canManagePlans: boolean
  canManageRequests: boolean
  canViewStats: boolean
  canRequestChange: boolean
}

let menuCapability: RoadmapMenuCapability = {
  canManagePlans: false, canManageRequests: false, canViewStats: false, canRequestChange: false,
}

/** 이 사용자가 로드맵 업무로 무엇을 할 수 있는가. 부팅 로더가 호출 전에 확인한다. */
export function roadmapCapability(): RoadmapMenuCapability {
  return menuCapability
}

export async function loadRoadmapCapability(): Promise<void> {
  menuCapability = await api<RoadmapMenuCapability>('/roadmap/capabilities')
  publish()
}

let requests: RoadmapChangeRequest[] = []
let requestSummary: Record<RoadmapRequestStatus, number> = { REQ: 0, APPLIED: 0, REJECTED: 0 }

/** 지금 적재된 변경 요청. 목록 화면은 queryRoadmapRequests 로 서버 페이지를 읽는다. */
export function roadmapRequestList(): RoadmapChangeRequest[] {
  return requests
}

export function roadmapRequestSummary(): Record<RoadmapRequestStatus, number> {
  return requestSummary
}

export function queryRoadmapRequests(query: {
  page?: number; pageSize?: number; status?: RoadmapRequestStatus; studentId?: string
  collegeCode?: string; deptCode?: string; q?: string
} = {}): Promise<RequestPage> {
  return api<RequestPage>('/roadmap-requests?' + queryString(query))
}

/** 배지·알림이 쓰는 요약. 전체 목록을 받아 세지 않는다(CLAUDE.md 10조). */
export async function loadRoadmapRequests(): Promise<void> {
  const page = await queryRoadmapRequests({ pageSize: 100 })
  requests = page.items
  requestSummary = page.summary
  publish()
}

export async function createRoadmapRequest(studentId: string,
                                           input: { title: string; reason: string; axis?: RoadmapAxis }): Promise<void> {
  await send(`/students/${encodeURIComponent(studentId)}/roadmap-requests`, 'POST',
    { ...input, ...versions(studentId) })
  await loadRoadmapRequests()
}

export async function rejectRoadmapRequests(items: RequestRef[], reason: string): Promise<void> {
  await send('/roadmap-requests/reject', 'POST', { requests: items, reason })
  await loadRoadmapRequests()
}

export interface RoadmapRequestEvent {
  action: string
  statusBefore: string | null
  statusAfter: string
  reason: string
  createdAt: string
  actorName: string | null
}

export function loadRoadmapRequestEvents(id: string): Promise<{ items: RoadmapRequestEvent[] }> {
  return api<{ items: RoadmapRequestEvent[] }>(`/roadmap-requests/${encodeURIComponent(id)}/events`)
}

// ── 스냅샷 ───────────────────────────────────────────────────────────────

export interface RoadmapSnapshotRow {
  version: number
  createdAt: string
  actorName: string | null
  schemaVersion: number
  progress: RoadmapProgress | null
}

export function loadRoadmapSnapshots(studentId: string): Promise<Page<RoadmapSnapshotRow>> {
  return api<Page<RoadmapSnapshotRow>>(`/students/${encodeURIComponent(studentId)}/roadmap/snapshots?pageSize=50`)
}

export function loadRoadmapSnapshot(studentId: string, version: number): Promise<{
  version: number; createdAt: string; schemaVersion: number
  payload: Record<string, unknown>; limitations: string[]
}> {
  return api(`/students/${encodeURIComponent(studentId)}/roadmap/snapshots/${version}`)
}
