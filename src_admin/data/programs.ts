// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 로더 (localStorage 'dc_programs') — Counsel_README §5-E
// roadmapRequests.ts 패턴 미러: localStorage 우선, 없으면 seed 폴백 + CRUD.
//
// 신청자 출석 체크 결과가 '노쇼'가 되면 블랙리스트(penalties.ts)와 연동해
// 자동 벌점을 부여하고, '노쇼' 해제 시 해당 벌점을 되돌린다.
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
import { ABSENCE_PENALTY } from './schema/program'
import seed from './programs.seed.json'
import { applyNoShowPenalty, applyAbsencePenalty, revertNoShowPenalty } from './penalties'

const STORAGE_KEY = 'dc_programs'

const SEED = seed as Program[]

/** 전체 프로그램. localStorage 우선, 없으면 seed 폴백. */
export function getPrograms(): Program[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Program[]
    }
  } catch {
    /* localStorage 접근 실패 시 seed 폴백 */
  }
  return SEED
}

/** id 로 1건 조회 */
export function getProgramById(id: string): Program | undefined {
  return getPrograms().find(p => p.id === id)
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
    모집중: list.filter(p => p.status === '모집중').length,
    모집마감: list.filter(p => p.status === '모집마감').length,
    종료: list.filter(p => p.status === '종료').length,
  }
}

function persist(list: Program[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* localStorage 접근 실패 시 무시 (데모 범위) */
  }
}

/** 새 프로그램 등록 — id·applicants·createdAt 자동 부여 후 맨 앞에 추가. */
export function addProgram(
  input: Omit<Program, 'id' | 'applicants' | 'createdAt'>,
): Program {
  const program: Program = {
    ...input,
    id: `prog_${Date.now()}`,
    applicants: [],
    createdAt: new Date().toISOString(),
  }
  persist([program, ...getPrograms()])
  return program
}

/** 프로그램 수정 (신청자 제외 메타 patch) */
export function updateProgram(
  id: string,
  patch: Partial<Omit<Program, 'id' | 'applicants' | 'createdAt'>>,
): void {
  const next = getPrograms().map(p => (p.id === id ? { ...p, ...patch } : p))
  persist(next)
}

/** 프로그램 삭제 */
export function removeProgram(id: string): void {
  persist(getPrograms().filter(p => p.id !== id))
}

/** 신청자 다중 선발 상태변경 — '신청자 관리' 체크박스 다중선택의 일괄 상태변경. */
export function setApplicantsStatus(
  programId: string,
  studentIds: string[],
  selectionStatus: SelectionStatus,
): void {
  const ids = new Set(studentIds)
  const next = getPrograms().map(p =>
    p.id !== programId
      ? p
      : {
          ...p,
          applicants: p.applicants.map(a =>
            ids.has(a.studentId) ? { ...a, selectionStatus } : a,
          ),
        },
  )
  persist(next)
}

/**
 * 선발자 결과 일괄 변경 — '선발자 관리' 상태변경 select.
 * 삭제=행 제거, 불참(벌점N점)=벌점 부여, 그 외=결과 라벨 설정(+기존 불참 벌점 회수).
 */
export function setApplicantsOutcome(
  programId: string,
  studentIds: string[],
  action: SelectedAction,
): void {
  if (action === '삭제') {
    studentIds.forEach(sid => removeApplicant(programId, sid))
    return
  }
  const program = getPrograms().find(p => p.id === programId)
  if (!program) return

  // 벌점 연동: 불참 tier → 부과, 그 외(참석/수료/미수료/선발) → 이 프로그램 불참 벌점 회수
  studentIds.forEach(sid => {
    const applicant = program.applicants.find(a => a.studentId === sid)
    if (!applicant) return
    const points = ABSENCE_PENALTY[action]
    if (points) applyAbsencePenalty(applicant, program, points)
    else revertNoShowPenalty(sid, programId)
  })

  // 결과 라벨 저장 ('선발'은 결과 해제 → undefined)
  const outcome: OutcomeStatus | undefined = action === '선발' ? undefined : (action as OutcomeStatus)
  const ids = new Set(studentIds)
  const next = getPrograms().map(p =>
    p.id !== programId
      ? p
      : {
          ...p,
          applicants: p.applicants.map(a =>
            ids.has(a.studentId) ? { ...a, outcomeStatus: outcome } : a,
          ),
        },
  )
  persist(next)
}

/** 신청자 1명 삭제 (신청 취소). 노쇼 벌점이 있었다면 함께 회수한다. */
export function removeApplicant(programId: string, studentId: string): void {
  const program = getPrograms().find(p => p.id === programId)
  const applicant = program?.applicants.find(a => a.studentId === studentId)
  if (applicant?.attendance === '노쇼') {
    revertNoShowPenalty(studentId, programId)
  }
  const next = getPrograms().map(p =>
    p.id !== programId
      ? p
      : { ...p, applicants: p.applicants.filter(a => a.studentId !== studentId) },
  )
  persist(next)
}

/**
 * 신청자 출석 상태 변경. '노쇼'로 바뀌면 블랙리스트 벌점을 부여하고,
 * '노쇼'에서 해제되면 해당 벌점을 되돌린다(블랙리스트 연동).
 */
export function setAttendance(
  programId: string,
  studentId: string,
  attendance: AttendanceStatus,
): void {
  const programs = getPrograms()
  const program = programs.find(p => p.id === programId)
  if (!program) return
  const applicant = program.applicants.find(a => a.studentId === studentId)
  if (!applicant) return

  const prev = applicant.attendance
  if (prev === attendance) return

  const next = programs.map(p =>
    p.id !== programId
      ? p
      : {
          ...p,
          applicants: p.applicants.map(a =>
            a.studentId === studentId ? { ...a, attendance } : a,
          ),
        },
  )
  persist(next)

  // 블랙리스트 연동: 노쇼 진입/해제에 따라 벌점 부여/회수
  if (attendance === '노쇼' && prev !== '노쇼') {
    applyNoShowPenalty(applicant, program)
  } else if (prev === '노쇼' && attendance !== '노쇼') {
    revertNoShowPenalty(studentId, program.id)
  }
}

export type { Program, ProgramStatus, ProgramApplicant, AttendanceStatus }
