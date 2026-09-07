// ─────────────────────────────────────────────────────────────────────────
// 성장경험일지 단일소스 로더 — students.ts / jobsSource.ts 패턴 미러.
// 학생별(studentId) seed(growthJournal.seed.json) + localStorage 오버레이 병합.
// 현재 데이터는 김채원(chaewon)·김창원(changwon) 2명만 보유. 나머지는 빈 배열.
// 학생이 기록/수정하면 오버레이(cwnu-growth-journal-{studentId})에 쌓이고,
// 상담사 SPA(StudentDetail)도 이 모듈을 그대로 import 해 같은 데이터를 읽는다.
// ─────────────────────────────────────────────────────────────────────────
import seed from './growthJournal.seed.json'

export type Category = '아르바이트' | '팀프로젝트' | '기타 활동'

export interface Entry {
  id: number
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
}

/** base seed(단일소스 JSON) — 학생 id → 일지 목록 */
const SEED = seed as Record<string, Entry[]>

const KEY_PREFIX = 'cwnu-growth-journal-'

/** 해당 학생의 일지 = seed + localStorage 오버레이. 없으면 seed(또는 빈 배열) 폴백. */
export function loadJournalEntries(studentId: string): Entry[] {
  const seedEntries = SEED[studentId] ?? []
  if (typeof window === 'undefined') return seedEntries
  const stored = window.localStorage.getItem(KEY_PREFIX + studentId)
  if (!stored) return seedEntries

  try {
    const parsed = JSON.parse(stored) as Entry[]
    return Array.isArray(parsed) ? parsed : seedEntries
  } catch {
    return seedEntries
  }
}

/** 학생의 기록/수정 결과를 해당 학생 오버레이에 저장. */
export function saveJournalEntries(studentId: string, entries: Entry[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY_PREFIX + studentId, JSON.stringify(entries))
}
