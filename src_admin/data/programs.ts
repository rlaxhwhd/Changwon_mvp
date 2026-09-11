// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 로더 — 정본은 서버(dc.program · dc.program_apply)다.
//
// 읽기는 부팅 때 적재한 스토어에서 동기로 꺼낸다(SPEC.md §5). 쓰기는 async 이고
// 서버가 판정한다 — 정원·중복·마감·선발 없는 이수 결과는 여기서 막지 않고
// 서버가 거절한다(CLAUDE.md 규칙 5: 정합성은 한 곳에서만 판정한다).
//
// 노쇼·불참 벌점과 로드맵 칸 완료도 서버가 같은 트랜잭션에서 처리한다.
// 예전에는 이 파일이 penalties.ts 를 직접 불러 벌점을 매겼는데, 그러면
// 두 브라우저가 같은 학생을 동시에 처리할 때 벌점이 어긋난다.
// ─────────────────────────────────────────────────────────────────────────
import type {
  Program,
  ProgramStatus,
  ProgramApplicant,
  AttendanceStatus,
  SelectionStatus,
  OutcomeStatus,
  SelectedAction,
} from './schema/program'
import { api, queryString } from '../../shared/api'
import { dropProgram, loadPrograms, programList, refreshProgram } from '../../shared/programStore'
import type { ListParams, Paginated } from './query'

export { PROGRAM_EVENT } from '../../shared/programStore'

/** 전체 프로그램(적재된 스토어). */
export function getPrograms(): Program[] {
  return programList()
}

/** id 로 1건 조회 */
export function getProgramById(id: string): Program | undefined {
  return getPrograms().find(p => p.id === id)
}

/** 신청을 받을 수 있는가 — 상태와 마감일 둘 다 본다(상태만 믿으면 지난 공고가 열려 있다). */
export function isProgramClosed(program: Program): boolean {
  if (program.status !== 'RECRUITING') return true
  return programDdayLabel(program) === '마감'
}

/**
 * 학생에게 보이는 공고 상태 — 저장된 status 와 마감일이 어긋나면 마감일이 이긴다.
 * 담당자가 모집중인 채로 둔 지난 공고를 학생에게 열린 것처럼 보이면 안 된다.
 * 관리 화면(ProgramManage)은 저장값을 그대로 쓴다 — 거기서는 담당자가 설정한 값이 사실이다.
 */
export function noticeStatusLabel(program: Program): ProgramStatus {
  if (program.status === 'RECRUITING' && isProgramClosed(program)) return 'CLOSED'
  return program.status
}

/**
 * 신청 마감까지 남은 날 — 'D-3' · 'D-day' · '마감'.
 * 마감일은 날짜만 있는 값이다. 'YYYY-MM-DD'를 그대로 Date 에 넣으면 UTC 자정으로
 * 읽혀 KST 에선 오늘 마감이 D-1 로 나온다 — 로컬 자정으로 고정해서 읽는다.
 * (채용공고의 jobDdayLabel 과 같은 규약 — 두 공고가 같은 날짜를 다르게 세면 안 된다)
 */
export function programDdayLabel(program: Program): string {
  if (program.status === 'ENDED') return '종료'
  if (!program.endDate) return '상시'
  const end = new Date(`${program.endDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(end.getTime())) return program.endDate
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000)
  if (diff < 0) return '마감'
  if (diff === 0) return 'D-day'
  return `D-${diff}`
}

/**
 * 프로그램 목록 조회(서버 페이징). 수천 건이 되면 화면은 스토어가 아니라 이쪽을 써야 한다.
 * 서버가 페이지를 잘라 주므로 필터·검색도 서버에서 끝난다.
 */
export async function queryPrograms(params: ListParams = {}): Promise<Paginated<Program>> {
  const query = queryString({
    page: params.page ?? 1, pageSize: params.pageSize ?? 20, q: params.q,
    category: params.filters?.category, status: params.filters?.status,
  })
  return api<Paginated<Program>>(`/programs?${query}`)
}

/** 상단고정(pinned) 우선 → 최신순 정렬. 목록 노출 시 이 순서를 사용한다. */
export function sortByPriority(list: Program[]): Program[] {
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** 상태별 카운트 (필터 배지용) */
export function countPrograms(): Record<ProgramStatus, number> & { total: number } {
  const list = getPrograms()
  return {
    total: list.length,
    RECRUITING: list.filter(p => p.status === 'RECRUITING').length,
    CLOSED: list.filter(p => p.status === 'CLOSED').length,
    ENDED: list.filter(p => p.status === 'ENDED').length,
  }
}

type ProgramInput = Omit<Program, 'id' | 'applicants' | 'createdAt' | 'version'>

/** 새 프로그램 등록 — id·createdAt 은 서버가 부여한다. */
export async function addProgram(input: ProgramInput): Promise<Program> {
  const program = await api<Program>('/programs', { method: 'POST', body: JSON.stringify(input) })
  await refreshProgram(program.id)
  return program
}

/** 프로그램 수정. 다른 담당자가 먼저 고쳤으면 서버가 409로 거절한다. */
export async function updateProgram(id: string, patch: Partial<ProgramInput>): Promise<void> {
  const current = getProgramById(id)
  if (!current) throw new Error('프로그램을 찾을 수 없습니다.')
  const { applicants: _applicants, createdAt: _createdAt, id: _id, version, ...rest } = { ...current, ...patch }
  await api(`/programs/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ ...rest, expectedVersion: version }),
  })
  await refreshProgram(id)
}

/** 프로그램 삭제. 이수 결과가 남아 있으면 서버가 거절한다. */
export async function removeProgram(id: string): Promise<void> {
  await api(`/programs/${encodeURIComponent(id)}`, { method: 'DELETE' })
  dropProgram(id)
}

/** 신청자의 선발 상태 — 미지정이면 대기. 화면마다 다시 판단하지 않는다. */
export function selectionOf(applicant: ProgramApplicant): SelectionStatus {
  return applicant.selectionStatus ?? 'PENDING'
}

/** '신청자 관리' 목록 — 선발된 학생은 선발자 관리로 넘어가므로 여기서 빠진다. */
export function pendingApplicants(program: Program): ProgramApplicant[] {
  return program.applicants.filter(a => selectionOf(a) !== 'SELECTED')
}

/** '선발자 관리' 목록 */
export function selectedApplicants(program: Program): ProgramApplicant[] {
  return program.applicants.filter(a => selectionOf(a) === 'SELECTED')
}

/** 신청자 다중 선발 상태변경 — '신청자 관리' 체크박스 다중선택의 일괄 상태변경. */
export async function setApplicantsStatus(
  programId: string,
  studentIds: string[],
  selectionStatus: SelectionStatus,
): Promise<void> {
  await api(`/programs/${encodeURIComponent(programId)}/applications/selection`, {
    method: 'POST', body: JSON.stringify({ studentIds, selection: selectionStatus }),
  })
  await refreshProgram(programId)
}

/**
 * 선발자 결과 일괄 변경 — '선발자 관리' 상태변경 select.
 * 삭제=행 제거, 불참=벌점 부여, 대기=선발 취소, 그 외=결과 설정.
 * 벌점 부여·회수는 서버가 같은 트랜잭션에서 한다.
 */
export async function setApplicantsOutcome(
  programId: string,
  studentIds: string[],
  action: SelectedAction,
): Promise<void> {
  const base = `/programs/${encodeURIComponent(programId)}/applications`
  if (action.remove) {
    await api(`${base}/remove`, { method: 'POST', body: JSON.stringify({ studentIds }) })
  } else if (action.selection) {
    await api(`${base}/selection`, {
      method: 'POST', body: JSON.stringify({ studentIds, selection: action.selection }),
    })
  } else {
    await api(`${base}/outcome`, {
      method: 'POST',
      body: JSON.stringify({ studentIds, outcome: action.outcome, absencePoints: action.points }),
    })
  }
  await refreshProgram(programId)
}

/**
 * 신청자 1명 추가 — 상담사가 신청자 관리에서 학생을 직접 넣는 경로.
 * 신청 시점 학적 스냅샷은 서버가 남긴다(CLAUDE.md 규칙 2).
 * 중복 신청은 서버가 409로 거절한다(규칙 5).
 */
export async function addApplicant(
  programId: string,
  student: { id: string; name: string; major: string },
): Promise<void> {
  await api(`/programs/${encodeURIComponent(programId)}/applications`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `add:${programId}:${student.id}` },
    body: JSON.stringify({ studentId: student.id }),
  })
  await refreshProgram(programId)
}

/** 신청자 1명 삭제 (신청 취소). 노쇼 벌점이 있었다면 서버가 함께 회수한다. */
export async function removeApplicant(programId: string, studentId: string): Promise<void> {
  await api(`/programs/${encodeURIComponent(programId)}/applications/remove`, {
    method: 'POST', body: JSON.stringify({ studentIds: [studentId] }),
  })
  await refreshProgram(programId)
}

/** 학생 본인의 프로그램 신청 — 동의·지원동기를 함께 남긴다. */
export async function applyToProgram(
  programId: string,
  body: { path: string; motive: string; consents: Record<string, string> },
): Promise<void> {
  await api(`/programs/${encodeURIComponent(programId)}/applications`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `apply:${programId}:${Date.now()}` },
    body: JSON.stringify(body),
  })
  await refreshProgram(programId)
}

/**
 * 신청자 출석 상태 변경. 노쇼로 바뀌면 벌점을 부여하고 해제하면 되돌린다 —
 * 판정과 기록은 서버가 한 트랜잭션에서 처리한다.
 */
export async function setAttendance(
  programId: string,
  studentId: string,
  attendance: AttendanceStatus,
): Promise<void> {
  await api(`/programs/${encodeURIComponent(programId)}/applications/${encodeURIComponent(studentId)}/attendance`, {
    method: 'PUT', body: JSON.stringify({ attendance }),
  })
  await refreshProgram(programId)
}

/** 프로그램 신청 통계 — 집계는 서버(SQL)가 한다(CLAUDE.md 규칙 10). */
export interface ProgramStat {
  id: string; title: string; category_code: string; status_code: string; capacity: number
  applied: number; selected: number; attended: number; completed: number; absent: number
}

export async function getProgramStatistics(): Promise<{
  summary: { programs: number; recruiting: number; capacity: number; applied: number; completed: number }
  programs: ProgramStat[]
}> {
  return api('/programs/statistics')
}

export { loadPrograms }
export type { Program, ProgramStatus, ProgramApplicant, AttendanceStatus, OutcomeStatus }
