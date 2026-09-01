// ─────────────────────────────────────────────────────────────────────────
// 상담 기록지 로더 (localStorage 공유 스토어)
// Counsel_README §7: 상담 완료·코멘트는 'dc_counsel_records' 키로 저장되어
// 학생 화면 '상담 현황'(/counsel/record)과 공유된다.
// localStorage가 비어있으면 데모용 seed JSON으로 폴백한다.
// 화면은 이 로더만 통해 읽고 쓴다(컴포넌트 하드코딩 금지).
// ─────────────────────────────────────────────────────────────────────────
import type { CounselRecord, RecordStatus } from './schema/counselRecord'
import type { CounselMethod, CounselRequestType } from './schema/counselRequest'
import seed from './counselRecords.seed.json'

const STORAGE_KEY = 'dc_counsel_records'

const SEED = seed as CounselRecord[]

/** 저장된 기록을 반환. localStorage 우선, 없으면 seed 폴백. */
export function getCounselRecords(): CounselRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as CounselRecord[]
    }
  } catch {
    /* localStorage 접근 실패 시 seed 폴백 */
  }
  return SEED
}

/** 상담 유형(진로취업/심리)으로 필터 — 상담사 역할별 완료 내역에 사용 */
export function getRecordsByType(type: CounselRequestType): CounselRecord[] {
  return getCounselRecords().filter(r => r.type === type)
}

/** 특정 학생의 상담 기록 (상담 진행 화면의 이전 이력 표시에 사용) */
export function getRecordsByStudent(studentId: string): CounselRecord[] {
  return getCounselRecords()
    .filter(r => r.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** 특정 상담 신청(requestId)에 연결된 기록 1건 */
export function getRecordByRequest(requestId: string): CounselRecord | undefined {
  return getCounselRecords().find(r => r.requestId === requestId)
}

function persistRecords(list: CounselRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/**
 * 기록을 upsert 한다. id가 존재하면 갱신, 없으면 추가.
 * updatedAt은 항상 현재 시각으로 갱신된다.
 */
export function upsertRecord(record: CounselRecord): CounselRecord {
  const now = new Date().toISOString()
  const withStamp: CounselRecord = { ...record, updatedAt: now }
  const list = getCounselRecords()
  const idx = list.findIndex(r => r.id === record.id)
  const next =
    idx >= 0
      ? list.map(r => (r.id === record.id ? withStamp : r))
      : [...list, withStamp]
  persistRecords(next)
  return withStamp
}

/** 기록에 통째로 복사되는 스냅샷 — 상담 신청·담당자에서 온다(작성 화면이 만들지 않는다). */
export interface RecordSource {
  requestId: string
  studentId: string
  studentName: string
  studentMajor: string
  type: CounselRequestType
  method: CounselMethod
  topic: string
  /** 상담 진행 일자 YYYY-MM-DD */
  date: string
  counselorId: string
  counselorName: string
}

/**
 * 기록 1건을 조립한다 — 신규는 새 id, 기존 기록이 있으면 id·createdAt 을 잇는다.
 * 상담 진행 화면(CounselSession)과 상담일지 대장(CounselJournals) 둘이 같은
 * `dc_counsel_records` 에 쓰므로 조립도 한 곳이다 — 화면마다 다른 모양을 만들면
 * 같은 상담이 두 벌로 갈린다. (CLAUDE.md 규칙 10·12)
 */
export function buildRecord(
  source: RecordSource,
  fields: { summary: string; comment: string; followUp: string },
  status: RecordStatus,
  existing?: CounselRecord,
): CounselRecord {
  const now = new Date().toISOString()
  return {
    ...source,
    id: existing?.id ?? `rec_${source.requestId}_${Date.now().toString(36)}`,
    summary: fields.summary.trim(),
    comment: fields.comment.trim(),
    followUp: fields.followUp.trim() || undefined,
    status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export type { CounselRecord }
