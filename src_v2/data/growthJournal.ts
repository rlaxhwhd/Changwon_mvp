// ─────────────────────────────────────────────────────────────────────────
// 성장경험일지 — 정본은 서버다(dc.growth_entry, kind=JOURNAL).
//
// 예전에는 seed JSON + `cwnu-growth-journal-{studentId}` localStorage 오버레이였다.
// 그래서 학생이 쓴 일지가 상담사에게 보이지 않았고, 숫자 ID 가 학생 간에 겹쳤다.
// 시드의 두 학생(김채원·김창원) 일지는 026 이 소유자를 확인해 옮겼다.
//
// 로더 시그니처는 동기를 유지한다(SPEC.md §5) — 적재는 useGrowth 훅이 한다.
// ─────────────────────────────────────────────────────────────────────────
import { createGrowthEntry, deleteGrowthEntry, growthEntries, updateGrowthEntry } from '../../shared/growthStore'
import type { GrowthEntry } from '../../shared/growthStore'

/** 일지 분류 — DB 코드다. 한글은 표시용 라벨이며 값 자체가 아니다(CLAUDE.md 4조). */
export type Category = 'PARTTIME' | 'TEAM_PROJECT' | 'ETC'

export const CATEGORY_LABEL: Record<Category, string> = {
  PARTTIME: '아르바이트', TEAM_PROJECT: '팀프로젝트', ETC: '기타 활동',
}

export const CATEGORIES: Category[] = ['PARTTIME', 'TEAM_PROJECT', 'ETC']

export interface Entry {
  /** 서버가 발급한 ID. 학생마다 1,2,3… 이던 숫자 ID 는 학생 간 충돌이 있었다. */
  id: string
  category: Category
  title: string
  desc: string
  situation: string
  role: string
  action: string
  result: string
  learning: string
  resumeMemo: string
  tags: string[]
  date: string
  bookmarked: boolean
  resumeUsed: boolean
  /** 낙관적 잠금 토큰 */
  version: number
}

function text(content: Record<string, unknown>, field: string): string {
  const value = content[field]
  return typeof value === 'string' ? value : ''
}

function toEntry(row: GrowthEntry): Entry {
  return {
    id: row.id,
    category: (row.categoryCode as Category) ?? 'ETC',
    title: row.title,
    desc: text(row.content, 'desc'),
    situation: text(row.content, 'situation'),
    role: text(row.content, 'role'),
    action: text(row.content, 'action'),
    result: text(row.content, 'result'),
    learning: text(row.content, 'learning'),
    resumeMemo: text(row.content, 'resumeMemo'),
    tags: row.tags,
    date: row.occurredOn ?? row.dateText ?? '',
    bookmarked: row.bookmarked,
    resumeUsed: row.resumeUsed,
    version: row.version,
  }
}

function toInput(entry: Omit<Entry, 'id' | 'version'>) {
  return {
    kind: 'JOURNAL' as const,
    title: entry.title,
    categoryCode: entry.category,
    occurredOn: entry.date || null,
    datePrecision: (entry.date ? 'DAY' : 'UNKNOWN') as 'DAY' | 'UNKNOWN',
    tags: entry.tags,
    bookmarked: entry.bookmarked,
    resumeUsed: entry.resumeUsed,
    content: {
      desc: entry.desc, situation: entry.situation, role: entry.role, action: entry.action,
      result: entry.result, learning: entry.learning, resumeMemo: entry.resumeMemo,
    },
  }
}

/** 이 학생의 일지 — 적재된 서버 자료. 아직 안 읽었으면 빈 배열. */
export function loadJournalEntries(studentId: string): Entry[] {
  return growthEntries(studentId, 'JOURNAL').map(toEntry)
}

export function createJournalEntry(studentId: string, entry: Omit<Entry, 'id' | 'version'>): Promise<void> {
  return createGrowthEntry(studentId, toInput(entry))
}

export function updateJournalEntry(studentId: string, entry: Entry): Promise<void> {
  const row = growthEntries(studentId, 'JOURNAL').find(item => item.id === entry.id)
  if (!row) throw new Error('수정할 일지를 찾을 수 없습니다.')
  return updateGrowthEntry(studentId, row, toInput(entry))
}

/** 논리삭제다 — 제출·AI 입력에 쓰인 과거 본문은 서버 이력에 남는다. */
export function deleteJournalEntry(studentId: string, entryId: string): Promise<void> {
  const row = growthEntries(studentId, 'JOURNAL').find(item => item.id === entryId)
  if (!row) throw new Error('삭제할 일지를 찾을 수 없습니다.')
  return deleteGrowthEntry(studentId, row)
}

export function setJournalBookmark(studentId: string, entryId: string, bookmarked: boolean): Promise<void> {
  const row = growthEntries(studentId, 'JOURNAL').find(item => item.id === entryId)
  if (!row) throw new Error('일지를 찾을 수 없습니다.')
  return updateGrowthEntry(studentId, row, { ...toInput(toEntry(row)), bookmarked })
}
