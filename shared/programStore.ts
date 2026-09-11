// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 스토어 — counselStore 와 같은 규약이다.
//
// 부팅 때 한 번 적재하고 화면은 동기 셀렉터로 읽는다(SPEC.md §5: 로더 시그니처는
// 동기를 유지한다). 쓰기는 서버가 정본이므로 async 이고, 저장 뒤 그 프로그램만
// 다시 읽어 스토어를 교체한다 — 응답을 신뢰하지 않고 서버 상태를 다시 확인한다.
//
// ⚠ 목록을 통째로 들고 있는 구조라 프로그램이 수천 건이 되면 이 방식은 못 버틴다.
//   그때는 화면이 queryPrograms(페이징)만 쓰도록 옮겨야 한다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from './api'
import type { Program } from '../src_admin/data/schema/program'

let programs: Program[] = []

export const PROGRAM_EVENT = 'dc_programs_changed'

/** 지금 적재된 프로그램 전체. 화면·셀렉터의 유일한 읽기 경로. */
export function programList(): Program[] {
  return programs
}

function publish(next: Program[]): void {
  programs = next
  window.dispatchEvent(new Event(PROGRAM_EVENT))
}

interface Page { items: Program[]; totalCount: number }

export async function loadPrograms(): Promise<void> {
  const result: Program[] = []
  let page = 1
  while (true) {
    const response = await api<Page>(`/programs?page=${page}&pageSize=100`)
    result.push(...response.items)
    if (result.length >= response.totalCount || response.items.length === 0) break
    page += 1
  }
  publish(result)
}

/** 한 건만 서버에서 다시 읽어 교체한다(없으면 목록에서 뺀다). */
export async function refreshProgram(id: string): Promise<void> {
  const fresh = await api<Program>(`/programs/${encodeURIComponent(id)}`)
  publish(programs.some(p => p.id === fresh.id)
    ? programs.map(p => (p.id === fresh.id ? fresh : p))
    : [fresh, ...programs])
}

export function dropProgram(id: string): void {
  publish(programs.filter(p => p.id !== id))
}
