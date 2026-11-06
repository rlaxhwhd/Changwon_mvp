// ─────────────────────────────────────────────────────────────────────────
// 프로그램 관리 필터 — 목록 판정과 학생 명단 엑셀 요청을 여기 한 곳에서 한다(CLAUDE.md 규칙 10).
// 명단에 연락처가 들어 있어 엑셀은 서버가 만든다(POST /programs/export).
// 학생상태 판정은 서버 STUDENT_STATES 와 같아야 한다 — 화면 목록과 엑셀이 어긋나면 안 된다.
// ─────────────────────────────────────────────────────────────────────────
import { programRounds } from './programs'
import type { Program, ProgramApplicant } from './schema/program'
import { outcomeLabel, programStatusLabel, selectionLabel } from './schema/program'

/** 운영 상태는 운영기간에서 파생한다. 기간이 없으면 모집 상태의 표시명으로 대신한다. */
export function getOperationStatus(program: Program, today: string): string {
  if (!program.runStartDate || !program.runEndDate) {
    return program.status ? programStatusLabel(program.status) : '상태 미정'
  }
  if (today < program.runStartDate) return '운영전'
  if (today > program.runEndDate) return '운영완료'
  return '운영중'
}

export const OPERATION_STATUSES = ['운영전', '운영중', '운영완료']

export type StudentState =
  | 'APPLIED' | 'PENDING' | 'SELECTED' | 'REJECTED' | 'CANCELLED'
  | 'COMPLETED' | 'NOT_COMPLETED' | 'ATTENDED' | 'ABSENT_3' | 'ABSENT_2' | 'ABSENT_1'

export function studentStateOptions(): { value: StudentState; label: string }[] {
  const absent = (points: 1 | 2 | 3) => ({ value: `ABSENT_${points}` as StudentState, label: `${outcomeLabel('ABSENT')}(벌점${points}점)` })
  return [
    { value: 'APPLIED', label: '신청' },
    { value: 'PENDING', label: selectionLabel('PENDING') },
    { value: 'SELECTED', label: selectionLabel('SELECTED') },
    { value: 'REJECTED', label: selectionLabel('REJECTED') },
    { value: 'CANCELLED', label: selectionLabel('CANCELLED') },
    { value: 'COMPLETED', label: outcomeLabel('COMPLETED') },
    { value: 'NOT_COMPLETED', label: outcomeLabel('NOT_COMPLETED') },
    { value: 'ATTENDED', label: outcomeLabel('ATTENDED') },
    absent(3), absent(2), absent(1),
  ]
}

/** 신청은 취소를 뺀 전체, 선발은 결과가 난 학생까지 선발된 학생 전부다(사용자 확정 2026-11-06). */
function matchesStudentState(applicant: ProgramApplicant, state: StudentState): boolean {
  const live = !applicant.canceledAt && applicant.selectionStatus !== 'CANCELLED'
  if (state === 'CANCELLED') return !live
  if (!live) return false
  const { selectionStatus: selection, outcomeStatus: outcome } = applicant
  if (state === 'APPLIED') return true
  if (state === 'SELECTED' || state === 'PENDING' || state === 'REJECTED') return selection === state
  if (state.startsWith('ABSENT_')) return outcome === 'ABSENT' && applicant.absencePoints === Number(state.slice(-1))
  return outcome === state
}

export interface ProgramManageFilters {
  category: string
  middleCategory: string
  certificate: '' | 'Y' | 'N'
  fiscalYear: string
  runFrom: string
  runTo: string
  operationStatuses: string[]
  searchField: 'title' | 'manager'
  q: string
  studentStates: StudentState[]
}

export const EMPTY_PROGRAM_FILTERS: ProgramManageFilters = {
  category: '', middleCategory: '', certificate: '', fiscalYear: '', runFrom: '', runTo: '',
  operationStatuses: [], searchField: 'title', q: '', studentStates: [],
}

/** 차수 중 하나라도 운영기간이 조회 기간과 겹치면 맞는다. 기간이 미정인 차수는 겹치지 않는다. */
function runsWithin(program: Program, from: string, to: string): boolean {
  return programRounds(program).some(round => {
    const start = round.runStartDate || round.runEndDate
    const end = round.runEndDate || round.runStartDate
    return !!start && !!end && (!to || start <= to) && (!from || end >= from)
  })
}

export function filterPrograms(programs: Program[], filters: ProgramManageFilters, today: string): Program[] {
  const q = filters.q.trim().toLowerCase()
  return programs.filter(program =>
    (!filters.category || program.category === filters.category)
    && (!filters.middleCategory || program.middleCategory === filters.middleCategory)
    && (!filters.certificate || (program.certificateIssued !== false) === (filters.certificate === 'Y'))
    && (!filters.fiscalYear || program.fiscalYear === filters.fiscalYear)
    && (!(filters.runFrom || filters.runTo) || runsWithin(program, filters.runFrom, filters.runTo))
    && (!filters.operationStatuses.length || filters.operationStatuses.includes(getOperationStatus(program, today)))
    && (!q || (filters.searchField === 'title' ? program.title : program.manager).toLowerCase().includes(q))
    && (!filters.studentStates.length || program.applicants.some(a => filters.studentStates.some(s => matchesStudentState(a, s)))))
}

/** 목록에 남은 프로그램의 학생 명단을 받는다. 학생상태를 안 고르면 취소까지 모든 학생이다. */
export async function downloadStudentRoster(programIds: string[], statuses: StudentState[], filename: string): Promise<void> {
  const response = await fetch('/api/v1/programs/export', {
    method: 'POST', body: JSON.stringify({ programIds, statuses }),
    headers: { 'Content-Type': 'application/json', 'X-DC-Portal': 'admin', 'X-DC-Identity': localStorage.getItem('dc_active_staff') ?? '' },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(typeof error?.detail === 'string' ? error.detail : '엑셀 다운로드에 실패했습니다.')
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
