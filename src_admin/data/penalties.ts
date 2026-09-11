// ─────────────────────────────────────────────────────────────────────────
// 블랙리스트 벌점 로더 — 정본은 서버(dc.penalty_entry)다.
//
// 총점을 저장하지 않는다. 부여·회수를 각각 행으로 쌓고 합으로 읽는다
// (CLAUDE.md 규칙 11 append-only). 그래서 '해제'도 삭제가 아니라 음수 행이며,
// 누가 언제 왜 되돌렸는지가 남는다 — CURRENT.md #2 「변경 이력이 없다」의 교정.
//
// 노쇼·불참 벌점은 여기서 부르지 않는다. 출석·이수 결과를 저장하는 같은
// 트랜잭션에서 서버가 매긴다(programs.ts 주석 참고).
// ─────────────────────────────────────────────────────────────────────────
import type { StudentPenalty, PenaltyEntry } from './schema/penalty'
import { api, queryString } from '../../shared/api'
import type { ListParams, Paginated } from './query'

/** 블랙리스트 조회 파라미터 — 단대 선택은 학과 목록으로 펼쳐 보낸다. */
export type PenaltyParams = ListParams & { majors?: string[] }

/** 블랙리스트 표 행 — 학번·대학까지 서버가 조인해 준다. */
export interface BlacklistRow {
  studentId: string
  studentName: string
  studentMajor: string
  studentNo: string
  college: string | null
  total: number
  entryCount: number
  lastAt: string
}

function params(list: PenaltyParams) {
  const f = list.filters ?? {}
  return queryString({
    page: list.page ?? 1, pageSize: list.pageSize ?? 20, q: list.q,
    // 단대는 서버가 모른다(학생 대부분이 조직 코드를 갖고 있지 않다).
    // 화면이 학사 조직 트리로 단대를 학과 목록으로 펼쳐 보낸다.
    major: list.majors, minPoints: f.ptsMin, searchScope: f.scope,
  })
}

/** 블랙리스트 목록(서버 페이징·검색). */
export async function queryPenaltyList(list: PenaltyParams = {}): Promise<Paginated<BlacklistRow>> {
  return api<Paginated<BlacklistRow>>(`/penalties?${params(list)}`)
}

/**
 * CSV 내보내기용 — 현재 필터의 전체 행.
 * 페이지를 넘겨 가며 모은다. 서버가 페이지 상한을 강제하므로 한 번에 못 받는다.
 */
export async function getPenaltyRowsForExport(list: PenaltyParams = {}): Promise<BlacklistRow[]> {
  const rows: BlacklistRow[] = []
  let page = 1
  while (true) {
    const response = await queryPenaltyList({ ...list, page, pageSize: 100 })
    rows.push(...response.items)
    if (rows.length >= response.totalCount || response.items.length === 0) break
    page += 1
  }
  return rows
}

/** 헤더 집계와 학과 목록 — 집계는 서버가 한다. 단대는 화면이 조직 트리로 만든다. */
export async function getPenaltySummary(): Promise<{
  total: number; totalPoints: number; majors: string[]
}> {
  return api('/penalties/summary')
}

/** 특정 학생의 벌점 레코드(이력 포함). */
export async function getStudentPenalty(studentId: string): Promise<StudentPenalty> {
  return api<StudentPenalty>(`/penalties/${encodeURIComponent(studentId)}`)
}

/** 수동 벌점 부여 (블랙리스트 화면) */
export async function addManualPenalty(studentId: string, points: number, reason: string): Promise<void> {
  await api(`/penalties/${encodeURIComponent(studentId)}/entries`, {
    method: 'POST', body: JSON.stringify({ kind: 'MANUAL', points: Math.abs(points), reason }),
  })
}

/** 벌점 차감/해제 — 음수 이력을 쌓는다. 남은 점수보다 많이 차감하면 서버가 거절한다. */
export async function waivePenalty(studentId: string, points: number, reason: string): Promise<void> {
  await api(`/penalties/${encodeURIComponent(studentId)}/entries`, {
    method: 'POST', body: JSON.stringify({ kind: 'WAIVE', points: Math.abs(points), reason }),
  })
}

/** 학생 벌점 전체 해제 — 남은 총점만큼 회수 이력을 남긴다(이력은 지우지 않는다). */
export async function clearPenalty(studentId: string, reason = '벌점 전체 해제'): Promise<void> {
  const record = await getStudentPenalty(studentId)
  if (record.total <= 0) return
  await waivePenalty(studentId, record.total, reason)
}

export type { StudentPenalty, PenaltyEntry }
