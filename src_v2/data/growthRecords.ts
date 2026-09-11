// ─────────────────────────────────────────────────────────────────────────
// 성장 활동 기록 — 정본은 서버다(dc.growth_entry, kind=RECORD).
//
// 「내 성장 > 성장 활동 기록」(/v2/growth)이 쓰고 고치고, AI 커리어 라운지(/v2/lounge)가
// 같은 값을 읽는다.
//
// ★ 예전 GROWTH_RECORDS 공통 상수 4건은 옮기지 않았다. 「진단 완료·비교과 수료」라고
//   적혀 있었지만 원천 이벤트가 없는 화면 상수였고, useStoredList 가 mount 직후 학생별
//   키에 그대로 저장해 **모든 학생에게 남의 실적처럼** 보였다. 소유자가 없는 자료는
//   이관하지 않는다(채용에서 SAVED_RESUMES 를 뺀 것과 같은 판정).
// ─────────────────────────────────────────────────────────────────────────
import { createGrowthEntry, deleteGrowthEntry, growthEntries, updateGrowthEntry } from '../../shared/growthStore'
import type { GrowthEntry } from '../../shared/growthStore'

/** 기록 분류 — DB 코드다. 한글은 표시용 라벨이다(CLAUDE.md 4조). */
export type GrowthRecordCategory = 'DIAGNOSIS' | 'PROGRAM' | 'ACHIEVEMENT' | 'ETC'

export const RECORD_CATEGORY_LABEL: Record<GrowthRecordCategory, string> = {
  DIAGNOSIS: '진단', PROGRAM: '비교과', ACHIEVEMENT: '성과', ETC: '기타',
}

/** 표시 색 — 분류가 곧 색이다. 화면이 각자 정하지 않는다. */
export const RECORD_CATEGORY_TONE: Record<GrowthRecordCategory, string> = {
  DIAGNOSIS: 'violet', PROGRAM: 'mint', ACHIEVEMENT: 'amber', ETC: 'blue',
}

export interface GrowthRecord {
  id: string
  date: string
  category: GrowthRecordCategory
  type: string
  title: string
  description: string
  tone: string
  version: number
}

function toRecord(row: GrowthEntry): GrowthRecord {
  const category = (row.categoryCode as GrowthRecordCategory) ?? 'ETC'
  const description = row.content.description
  return {
    id: row.id,
    date: row.occurredOn ?? row.dateText ?? '',
    category,
    type: RECORD_CATEGORY_LABEL[category],
    title: row.title,
    description: typeof description === 'string' ? description : '',
    tone: RECORD_CATEGORY_TONE[category],
    version: row.version,
  }
}

function toInput(record: Pick<GrowthRecord, 'date' | 'category' | 'title' | 'description'>) {
  return {
    kind: 'RECORD' as const,
    title: record.title,
    categoryCode: record.category,
    occurredOn: record.date || null,
    datePrecision: (record.date ? 'DAY' : 'UNKNOWN') as 'DAY' | 'UNKNOWN',
    content: { description: record.description },
  }
}

/** 지금 기록 목록. 아직 안 읽었으면 빈 배열 — 가짜 샘플로 채우지 않는다. */
export function getGrowthRecords(studentId: string): GrowthRecord[] {
  return growthEntries(studentId, 'RECORD').map(toRecord)
}

export function createGrowthRecord(studentId: string,
                                   record: Pick<GrowthRecord, 'date' | 'category' | 'title' | 'description'>): Promise<void> {
  return createGrowthEntry(studentId, toInput(record))
}

export function updateGrowthRecord(studentId: string, id: string,
                                   record: Pick<GrowthRecord, 'date' | 'category' | 'title' | 'description'>): Promise<void> {
  const row = growthEntries(studentId, 'RECORD').find(item => item.id === id)
  if (!row) throw new Error('수정할 기록을 찾을 수 없습니다.')
  return updateGrowthEntry(studentId, row, toInput(record))
}

export function deleteGrowthRecord(studentId: string, id: string): Promise<void> {
  const row = growthEntries(studentId, 'RECORD').find(item => item.id === id)
  if (!row) throw new Error('삭제할 기록을 찾을 수 없습니다.')
  return deleteGrowthEntry(studentId, row)
}
