// ─────────────────────────────────────────────────────────────────────────
// 블랙리스트 벌점 로더 (localStorage 'dc_penalty') — Counsel_README §5-E · §7
//
// 형태: dc_penalty = { [studentId]: StudentPenalty }.  학생 화면(마이페이지·
// 성장)이 누적 벌점·사유를 읽는다(§7). 출석 '노쇼' → 자동 부여, 소명 → 해제.
// students.ts 패턴 미러: 맵 읽기/쓰기 + 파생 셀렉터 + 변동 헬퍼.
// ─────────────────────────────────────────────────────────────────────────
import type { ProgramApplicant, Program } from './schema/program'
import type { StudentPenalty, PenaltyEntry } from './schema/penalty'
import { NOSHOW_PENALTY_POINTS } from './schema/penalty'
import { getActiveCounselorId } from './counselors'

const STORAGE_KEY = 'dc_penalty'

/** localStorage 의 벌점 맵 전체 읽기. 실패 시 빈 맵. */
function readMap(): Record<string, StudentPenalty> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, StudentPenalty>
    }
  } catch {
    /* 폴백: 벌점 없음 */
  }
  return {}
}

function writeMap(map: Record<string, StudentPenalty>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** total 을 entries 합산으로 재계산 (0 이상 보정) */
function recalc(record: StudentPenalty): StudentPenalty {
  const total = Math.max(0, record.entries.reduce((sum, e) => sum + e.points, 0))
  return { ...record, total }
}

// ── 조회 셀렉터 ────────────────────────────────────────────────────────────

/** 벌점이 부여된 학생 레코드 전체 (블랙리스트 목록). total 내림차순. */
export function getPenaltyList(): StudentPenalty[] {
  return Object.values(readMap())
    .filter(r => r.entries.length > 0)
    .sort((a, b) => b.total - a.total)
}

/** 특정 학생의 벌점 레코드 (없으면 null) */
export function getStudentPenalty(studentId: string): StudentPenalty | null {
  return readMap()[studentId] ?? null
}

/** 특정 학생의 누적 벌점 총점 (없으면 0) */
export function getPenaltyTotal(studentId: string): number {
  return readMap()[studentId]?.total ?? 0
}

// ── 변동 헬퍼 ──────────────────────────────────────────────────────────────

function ensureRecord(
  map: Record<string, StudentPenalty>,
  applicant: Pick<ProgramApplicant, 'studentId' | 'studentName' | 'studentMajor'>,
): StudentPenalty {
  const existing = map[applicant.studentId]
  if (existing) return existing
  return {
    studentId: applicant.studentId,
    studentName: applicant.studentName,
    studentMajor: applicant.studentMajor,
    total: 0,
    entries: [],
  }
}

function pushEntry(
  applicant: Pick<ProgramApplicant, 'studentId' | 'studentName' | 'studentMajor'>,
  entry: Omit<PenaltyEntry, 'id' | 'at' | 'by'>,
): void {
  const map = readMap()
  const record = ensureRecord(map, applicant)
  const full: PenaltyEntry = {
    ...entry,
    id: `pen_${Date.now()}`,
    at: new Date().toISOString(),
    by: getActiveCounselorId(),
  }
  map[applicant.studentId] = recalc({ ...record, entries: [...record.entries, full] })
  writeMap(map)
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
 * '노쇼' 해제 → 해당 프로그램 노쇼 벌점을 상쇄(음수 이력 추가).
 * 이력은 남기고 total 만 되돌린다(감사 추적).
 */
export function revertNoShowPenalty(studentId: string, programId: string): void {
  const map = readMap()
  const record = map[studentId]
  if (!record) return
  // 아직 상쇄되지 않은 해당 프로그램 노쇼 벌점 합계
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
  map[studentId] = recalc({ ...record, entries: [...record.entries, entry] })
  writeMap(map)
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
  const map = readMap()
  const record = map[studentId]
  if (!record) return
  const entry: PenaltyEntry = {
    id: `pen_${Date.now()}`,
    kind: 'waive',
    points: -Math.abs(points),
    reason,
    at: new Date().toISOString(),
    by: getActiveCounselorId(),
  }
  map[studentId] = recalc({ ...record, entries: [...record.entries, entry] })
  writeMap(map)
}

/** 학생 벌점 전체 초기화(해제) — 이력까지 제거 */
export function clearPenalty(studentId: string): void {
  const map = readMap()
  if (map[studentId]) {
    delete map[studentId]
    writeMap(map)
  }
}

export type { StudentPenalty, PenaltyEntry }
