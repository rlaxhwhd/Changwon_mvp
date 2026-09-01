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
import { paginate, mockLatency } from './query'
import type { ListParams, Paginated } from './query'

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

/** 신청을 받을 수 있는가 — 상태와 마감일 둘 다 본다(상태만 믿으면 지난 공고가 열려 있다). */
export function isProgramClosed(program: Program): boolean {
  if (program.status !== '모집중') return true
  return programDdayLabel(program) === '마감'
}

/**
 * 학생에게 보이는 공고 상태 — 저장된 status 와 마감일이 어긋나면 마감일이 이긴다.
 * 담당자가 '모집중'인 채로 둔 지난 공고를 학생에게 열린 것처럼 보이면 안 된다.
 * 관리 화면(ProgramManage)은 저장값을 그대로 쓴다 — 거기서는 담당자가 설정한 값이 사실이다.
 */
export function noticeStatusLabel(program: Program): ProgramStatus {
  if (program.status === '모집중' && isProgramClosed(program)) return '모집마감'
  return program.status
}

/**
 * 신청 마감까지 남은 날 — 'D-3' · 'D-day' · '마감'.
 * 마감일은 날짜만 있는 값이다. 'YYYY-MM-DD'를 그대로 Date 에 넣으면 UTC 자정으로
 * 읽혀 KST 에선 오늘 마감이 D-1 로 나온다 — 로컬 자정으로 고정해서 읽는다.
 * (채용공고의 jobDdayLabel 과 같은 규약 — 두 공고가 같은 날짜를 다르게 세면 안 된다)
 */
export function programDdayLabel(program: Program): string {
  if (program.status === '종료') return '종료'
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
 * [DB-ready 레퍼런스] 프로그램 목록 조회 — 실제 API 계약(async + 페이징 봉투)을 모사한다.
 * 화면은 getPrograms()(전체 sync 배열) 대신 이 시그니처를 따르면 6천건이 와도 안전하다.
 *
 * DB 전환 시: 함수 본문을 아래로만 교체(컴포넌트 무수정).
 *   const res = await api.get('/programs', { params })   // page/pageSize/q/filters
 *   return res.data   // { items, totalCount, page, pageSize }
 */
export async function queryPrograms(params: ListParams = {}): Promise<Paginated<Program>> {
  await mockLatency()
  const q = (params.q ?? '').trim().toLowerCase()
  const category = params.filters?.category
  const status = params.filters?.status
  const filtered = sortByPriority(getPrograms()).filter(p => {
    if (category && p.category !== category) return false
    if (status && p.status !== status) return false
    if (q && !`${p.title} ${p.desc} ${p.location}`.toLowerCase().includes(q)) return false
    return true
  })
  return paginate(filtered, params)
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

/** 신청자의 선발 상태 — 미지정이면 '대기'. 화면마다 다시 판단하지 않는다. */
export function selectionOf(applicant: ProgramApplicant): SelectionStatus {
  return applicant.selectionStatus ?? '대기'
}

/** '신청자 관리' 목록 — 선발된 학생은 선발자 관리로 넘어가므로 여기서 빠진다. */
export function pendingApplicants(program: Program): ProgramApplicant[] {
  return program.applicants.filter(a => selectionOf(a) !== '선발')
}

/** '선발자 관리' 목록 */
export function selectedApplicants(program: Program): ProgramApplicant[] {
  return program.applicants.filter(a => selectionOf(a) === '선발')
}

/** 신청자 다중 선발 상태변경 — '신청자 관리' 체크박스 다중선택의 일괄 상태변경. */
export function setApplicantsStatus(
  programId: string,
  studentIds: string[],
  selectionStatus: SelectionStatus,
): void {
  const ids = new Set(studentIds)
  // 선발 시점을 함께 남긴다 — 학생 쪽 '선발됨' 알림이 "언제"를 이 값으로 읽는다.
  const selectedAt = selectionStatus === '선발' ? new Date().toISOString() : undefined
  const next = getPrograms().map(p =>
    p.id !== programId
      ? p
      : {
          ...p,
          applicants: p.applicants.map(a =>
            ids.has(a.studentId) ? { ...a, selectionStatus, selectedAt } : a,
          ),
        },
  )
  persist(next)
}

/**
 * 선발자 결과 일괄 변경 — '선발자 관리' 상태변경 select.
 * 삭제=행 제거, 불참(벌점N점)=벌점 부여, 대기=선발 취소, 그 외=결과 라벨 설정(+기존 불참 벌점 회수).
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

  // 벌점 연동: 불참 tier → 부과, 그 외(참석/수료/미수료/선발/대기) → 이 프로그램 불참 벌점 회수
  studentIds.forEach(sid => {
    const applicant = program.applicants.find(a => a.studentId === sid)
    if (!applicant) return
    const points = ABSENCE_PENALTY[action]
    if (points) applyAbsencePenalty(applicant, program, points)
    else revertNoShowPenalty(sid, programId)
  })

  // '대기'는 선발 취소 — 선발 상태를 되돌리고 결과도 함께 지운다(신청자 관리로 복귀).
  // '선발'은 결과만 해제하고 선발 상태는 유지한다.
  const patch: Partial<ProgramApplicant> =
    action === '대기'
      ? { selectionStatus: '대기', selectedAt: undefined, outcomeStatus: undefined }
      : { outcomeStatus: action === '선발' ? undefined : (action as OutcomeStatus) }
  const ids = new Set(studentIds)
  const next = getPrograms().map(p =>
    p.id !== programId
      ? p
      : {
          ...p,
          applicants: p.applicants.map(a => (ids.has(a.studentId) ? { ...a, ...patch } : a)),
        },
  )
  persist(next)
}

/**
 * 신청자 1명 추가 — 상담사가 신청자 관리에서 학생을 직접 넣는 경로.
 * 신청 시점 학적 스냅샷(이름·학과)을 함께 저장한다(CLAUDE.md 규칙 2).
 * 이미 신청한 학생은 거부한다 — 중복 방지는 로더가 전담한다(규칙 5).
 */
export function addApplicant(
  programId: string,
  student: { id: string; name: string; major: string },
): void {
  const program = getPrograms().find(p => p.id === programId)
  if (!program || program.applicants.some(a => a.studentId === student.id)) return

  const applicant: ProgramApplicant = {
    studentId: student.id,
    studentName: student.name,
    studentMajor: student.major,
    appliedAt: new Date().toISOString(),
    attendance: '미확인',
    selectionStatus: '대기',
  }
  const next = getPrograms().map(p =>
    p.id !== programId ? p : { ...p, applicants: [...p.applicants, applicant] },
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
