// ─────────────────────────────────────────────────────────────────────────
// 블랙리스트 벌점 로더 — 단일 소스 = A 로스터(studentsRoster.json)의 벌점 key.
//
// 정체(이름·학과·학번)는 언제나 json 에서 온다. localStorage('dc_penalty_v2')는
// 런타임 노쇼/차감의 "수치 override" 만 담는다(base ⊕ override). 그래서 화면엔
// 항상 json 값이 뜨고, 옛 localStorage 로 이름이 어긋나는 일이 없다.
// students.ts 패턴 미러: base(json) + override(localStorage) 병합 셀렉터 + 변동 헬퍼.
// ─────────────────────────────────────────────────────────────────────────
import type { ProgramApplicant, Program } from './schema/program'
import type { StudentPenalty, PenaltyEntry } from './schema/penalty'
import { NOSHOW_PENALTY_POINTS } from './schema/penalty'
import { getActiveCounselorId } from './counselors'
import { STUDENT_ROSTER, studentNoOf } from './studentRoster'
import { collegeOf } from './colleges'
import { paginate, mockLatency } from './query'
import type { ListParams, Paginated } from './query'

// v2: 정체는 json, localStorage 는 override 만. 구 'dc_penalty'(정체까지 저장하던 방식)는 폐기.
const STORAGE_KEY = 'dc_penalty_v2'

/**
 * 벌점 base = A 로스터(studentsRoster.json)의 penaltyTotal/penaltyEntries key.
 * 학생 레코드에 박힌 벌점을 블랙리스트 맵으로 환원한다. (정체 단일 소스)
 */
function seedFromRoster(): Record<string, StudentPenalty> {
  const map: Record<string, StudentPenalty> = {}
  for (const s of STUDENT_ROSTER) {
    if (s.penaltyEntries && s.penaltyEntries.length > 0) {
      map[s.id] = {
        studentId: s.id,
        studentName: s.name,
        studentMajor: s.major,
        total: s.penaltyTotal ?? 0,
        entries: s.penaltyEntries,
      }
    }
  }
  return map
}

/** localStorage 의 override 맵(런타임 노쇼/차감). 없으면 빈 맵. */
function readOverrides(): Record<string, StudentPenalty> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, StudentPenalty>
    }
  } catch {
    /* 무시 — override 없음 */
  }
  return {}
}

function writeOverrides(map: Record<string, StudentPenalty>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/**
 * 표시용 벌점 맵 = json base ⊕ localStorage override.
 * 정체(이름·학과)는 json base 에서, 벌점 수치(total·entries)는 override 가 있으면 우선.
 * json 로스터에 없는 학생(런타임 노쇼)만 override 그대로 포함한다.
 */
function resolved(): Record<string, StudentPenalty> {
  const base = seedFromRoster()
  const ov = readOverrides()
  const out: Record<string, StudentPenalty> = {}
  for (const id of Object.keys(base)) {
    const b = base[id]
    const o = ov[id]
    out[id] = o ? { ...b, total: o.total, entries: o.entries } : b
  }
  for (const id of Object.keys(ov)) {
    if (!out[id]) out[id] = ov[id]
  }
  return out
}

/** total 을 entries 합산으로 재계산 (0 이상 보정) */
function recalc(record: StudentPenalty): StudentPenalty {
  const total = Math.max(0, record.entries.reduce((sum, e) => sum + e.points, 0))
  return { ...record, total }
}

// ── 조회 셀렉터 ────────────────────────────────────────────────────────────

/** 벌점이 부여된 학생 레코드 전체 (블랙리스트 목록). total 내림차순. */
export function getPenaltyList(): StudentPenalty[] {
  return Object.values(resolved())
    .filter(r => r.entries.length > 0)
    .sort((a, b) => b.total - a.total)
}

/** 특정 학생의 벌점 레코드 (없으면 null) */
export function getStudentPenalty(studentId: string): StudentPenalty | null {
  return resolved()[studentId] ?? null
}

/** 특정 학생의 누적 벌점 총점 (없으면 0) */
export function getPenaltyTotal(studentId: string): number {
  return resolved()[studentId]?.total ?? 0
}

// ── 변동 헬퍼 (override 레이어에만 기록) ─────────────────────────────────────

function pushEntry(
  applicant: Pick<ProgramApplicant, 'studentId' | 'studentName' | 'studentMajor'>,
  entry: Omit<PenaltyEntry, 'id' | 'at' | 'by'>,
): void {
  const ov = readOverrides()
  const record: StudentPenalty = resolved()[applicant.studentId] ?? {
    studentId: applicant.studentId,
    studentName: applicant.studentName,
    studentMajor: applicant.studentMajor,
    total: 0,
    entries: [],
  }
  const full: PenaltyEntry = {
    ...entry,
    id: `pen_${Date.now()}`,
    at: new Date().toISOString(),
    by: getActiveCounselorId(),
  }
  ov[applicant.studentId] = recalc({ ...record, entries: [...record.entries, full] })
  writeOverrides(ov)
}

/** 출석 '노쇼' → 자동 벌점 부여 (programs.setAttendance 에서 호출) */
export function applyNoShowPenalty(applicant: ProgramApplicant, program: Program): void {
  pushEntry(applicant, {
    kind: 'noshow',
    points: NOSHOW_PENALTY_POINTS,
    reason: `${program.title} 노쇼 (신청 후 미참여)`,
    programId: program.id,
    programTitle: program.title,
  })
}

/**
 * 선발자 '불참' 결과 → 벌점 부여(1점/3점 tier). tier 재변경 시 중복 방지를 위해
 * 이 프로그램의 기존 불참 벌점을 먼저 회수한 뒤 새 tier로 재부여한다.
 */
export function applyAbsencePenalty(applicant: ProgramApplicant, program: Program, points: number): void {
  revertNoShowPenalty(applicant.studentId, program.id)
  pushEntry(applicant, {
    kind: 'noshow',
    points,
    reason: `${program.title} 불참 (벌점 ${points}점)`,
    programId: program.id,
    programTitle: program.title,
  })
}

/**
 * '노쇼' 해제 → 해당 프로그램 노쇼 벌점을 상쇄(음수 이력 추가).
 * 이력은 남기고 total 만 되돌린다(감사 추적).
 */
export function revertNoShowPenalty(studentId: string, programId: string): void {
  const record = resolved()[studentId]
  if (!record) return
  const noshowPoints = record.entries
    .filter(e => e.kind === 'noshow' && e.programId === programId)
    .reduce((sum, e) => sum + e.points, 0)
  const waivedPoints = record.entries
    .filter(e => e.kind === 'waive' && e.programId === programId)
    .reduce((sum, e) => sum + Math.abs(e.points), 0)
  const outstanding = noshowPoints - waivedPoints
  if (outstanding <= 0) return

  const title = record.entries.find(e => e.programId === programId)?.programTitle
  const entry: PenaltyEntry = {
    id: `pen_${Date.now()}`,
    kind: 'waive',
    points: -outstanding,
    reason: `${title ?? '프로그램'} 출석 정정 — 노쇼 벌점 회수`,
    programId,
    programTitle: title,
    at: new Date().toISOString(),
    by: getActiveCounselorId(),
  }
  const ov = readOverrides()
  ov[studentId] = recalc({ ...record, entries: [...record.entries, entry] })
  writeOverrides(ov)
}

/** 수동 벌점 부여 (블랙리스트 화면) */
export function addManualPenalty(
  applicant: Pick<ProgramApplicant, 'studentId' | 'studentName' | 'studentMajor'>,
  points: number,
  reason: string,
): void {
  pushEntry(applicant, { kind: 'manual', points: Math.abs(points), reason })
}

/** 벌점 차감/해제 (음수 이력 추가). points 는 차감할 양수값. */
export function waivePenalty(studentId: string, points: number, reason: string): void {
  const record = resolved()[studentId]
  if (!record) return
  const entry: PenaltyEntry = {
    id: `pen_${Date.now()}`,
    kind: 'waive',
    points: -Math.abs(points),
    reason,
    at: new Date().toISOString(),
    by: getActiveCounselorId(),
  }
  const ov = readOverrides()
  ov[studentId] = recalc({ ...record, entries: [...record.entries, entry] })
  writeOverrides(ov)
}

/** 학생 벌점 전체 초기화(해제) — override 로 비워 목록에서 제외 (json base 는 보존) */
export function clearPenalty(studentId: string): void {
  const record = resolved()[studentId]
  if (!record) return
  const ov = readOverrides()
  ov[studentId] = { ...record, total: 0, entries: [] }
  writeOverrides(ov)
}

// ─────────────────────────────────────────────────────────────────────────
// [DB-ready] 블랙리스트 목록 조회 — 서버 페이징 계약(DATA_CONTRACT.md).
// 화면(ProgramBlacklist)은 전체가 아니라 현재 페이지만 받는다. 필터/검색은 파라미터로.
// ─────────────────────────────────────────────────────────────────────────

/** 블랙리스트 표 행 뷰모델 (학번·대학 파생 포함) */
export interface BlacklistRow {
  record: StudentPenalty
  studentNo: string
  college: string
}

function blacklistRows(): BlacklistRow[] {
  return getPenaltyList().map(record => ({
    record,
    studentNo: studentNoOf(record.studentId),
    college: collegeOf(record.studentMajor),
  }))
}

function filterBlacklist(params: ListParams): BlacklistRow[] {
  const q = (params.q ?? '').trim().toLowerCase()
  const f = params.filters ?? {}
  const minPts = f.ptsMin ? Number(f.ptsMin) : 0
  const scope = f.scope
  return blacklistRows().filter(r => {
    if (f.college && r.college !== f.college) return false
    if (f.major && r.record.studentMajor !== f.major) return false
    if (r.record.total < minPts) return false
    if (q) {
      const name = r.record.studentName.toLowerCase()
      const no = r.studentNo.toLowerCase()
      const maj = r.record.studentMajor.toLowerCase()
      const hay = scope === '이름' ? name : scope === '학번' ? no : scope === '학과' ? maj : `${name} ${no} ${maj}`
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/** 블랙리스트 목록(페이징). DB 전환 시 본문만 fetch로 교체. */
export async function queryPenaltyList(params: ListParams = {}): Promise<Paginated<BlacklistRow>> {
  await mockLatency()
  return paginate(filterBlacklist(params), params)
}

/** CSV 내보내기용 — 현재 필터 전체 행(페이지 무시). DB에선 export 엔드포인트. */
export function getPenaltyRowsForExport(params: ListParams = {}): BlacklistRow[] {
  return filterBlacklist(params)
}

/** 필터 옵션(대학·학과) — 전체 집합에서. DB에선 집계 엔드포인트. */
export function getPenaltyFilterOptions() {
  const rows = blacklistRows()
  return {
    colleges: [...new Set(rows.map(r => r.college))].sort(),
    majors: [...new Set(rows.map(r => r.record.studentMajor))].sort(),
  }
}

/** 헤더 집계(대상 인원·누적 점수). DB에선 COUNT/SUM. */
export function getPenaltySummary() {
  const rows = blacklistRows()
  return {
    total: rows.length,
    totalPoints: rows.reduce((sum, r) => sum + r.record.total, 0),
  }
}

export type { StudentPenalty, PenaltyEntry }
