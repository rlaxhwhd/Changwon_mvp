// ─────────────────────────────────────────────────────────────────────────
// STAR 트랙 · C-PASS — 단일 소스
//
// 전교생 대상이 아니다. 선발된 학생(2·3학년 40명)만 참여하는 **별도 트랙**이라
// seed 에 없는 학생은 "미참여"가 정상 상태다 — 빈 값으로 그리지 않는다.
//
// 진단·상담·비교과는 기존 단일소스와 **연동**한다(students.ts · careerProcess.ts).
// 여기에는 STAR 전용 상태(트랙·마일리지·교과·인증)만 둔다 — 같은 사실을 두 곳에 두지 않는다.
//
// 집계(마일리지 합계·이수율·인증 단계·장학금 구간)는 전부 이 파일에서 끝낸다.
// 화면은 계산하지 않는다 → DB 전환 시 이 함수들이 집계 SQL 이 된다(CLAUDE.md §10).
//
// ⚠️ 배점·인증단계 기준은 운영계획(안)에서 옮긴 것이고 **최종 확정 전**이다. → DB.md §9
// ─────────────────────────────────────────────────────────────────────────
import seed from './starTrack.seed.json'
import { getStudentCounselRequests, type StudentData } from './students'
import { STUDENT_TYPE_MAP, type StudentTypeMeta, type DiagnosisTestId } from './careerProcess'

/** 학년별 트랙. 4학년 `STAR-Match` 는 운영계획에 명칭만 있고 내용이 없어 넣지 않는다. */
export type StarTrackId = 'STAR_PRE' | 'STAR_CORE'

export const STAR_TRACK_LABEL: Record<StarTrackId, string> = {
  STAR_PRE: 'STAR-Pre',
  STAR_CORE: 'STAR-Core',
}

export const STAR_TRACK_META: Record<StarTrackId, { grade: number; kind: string; goal: string }> = {
  STAR_PRE: { grade: 2, kind: '탐색 트랙', goal: '진로 방향 설정 · 조기 역량 진단' },
  STAR_CORE: { grade: 3, kind: '집중 트랙', goal: '기업체 수요 기반 직무 역량 강화' },
}

/**
 * 트랙별 필수 진단 — 운영계획 §3-2. **STAR 트랙에 지원한 학생만** 이 검사를 진행한다.
 * 전교생 학년 기반 배정이 아니다(그건 `PROCESS.md`에서 폐기됐다).
 * ⚠️ 이미 전교생 파이프라인에서 `CCORE`를 본 학생이 선발되면 재응시인지 결과 연계인지
 *    **미정**이다 → `DB.md` §9 #29. 그래서 응시분을 판정하지 않고 시드에서 받는다.
 */
export const STAR_REQUIRED_TESTS: Record<StarTrackId, DiagnosisTestId[]> = {
  STAR_PRE: ['CCORE', 'C2'],
  STAR_CORE: ['CCORE', 'C2', 'C3'],
}

export type StarStepStatus = 'done' | 'ongoing' | 'todo'

export const STAR_STATUS_LABEL: Record<StarStepStatus, string> = {
  done: '완료',
  ongoing: '진행중',
  todo: '대기',
}

export interface StarStep {
  id: string
  label: string
  status: StarStepStatus
  /** 완료 시 적립되는 마일리지. 배점이 없는 단계(연계·참여 확인)는 생략한다. */
  points?: number
  /** 이수 필수 항목 — 마일리지와 무관하게 못 채우면 인증이 안 나온다(3학년 어학). */
  required?: boolean
  note?: string
}

export interface StarAxis { id: string; title: string; steps: StarStep[] }

export interface StarCourse { label: string; status: StarStepStatus }
export interface StarCert { label: string; status: '취득' | '준비중'; points: number }
export interface StarLanguage {
  label: string
  score?: number; pass?: number; target?: number
  grade?: string; passGrade?: string; targetGrade?: string
}

export interface StarTrackRecord {
  studentId: string
  track: StarTrackId
  cohort: string
  selectedAt: string
  counselGoal: number
  /** 응시(또는 연계) 완료된 필수 진단. 판정하지 않고 그대로 받는다 — `DB.md` §9 #29. */
  diagnosisDone: DiagnosisTestId[]
  axes: StarAxis[]
  courses: StarCourse[]
  certs: StarCert[]
  languages: StarLanguage[]
  aiComment: { text: string; basedOn: string }
}

// ── 인증 단계 · 장학금 구간 ───────────────────────────────────────────────

/**
 * C-PASS 인증 4단계.
 * ⚠️ 운영계획 본문은 학년 진급형(`Pre Pass`→`Core Pass`→`Match Pass`)으로,
 * 인포그래픽은 `Bronze~Platinum`(예시 표기)으로 쓴다. 여기 4단계는 **화면 시안**
 * (`public_t/star.png`)을 따른 것이라 셋 중 무엇이 정본인지 확정되면 이 표만 고친다.
 */
export const CPASS_STAGES = [
  { id: 'BASIC', label: 'Basic', desc: '트랙 참여 확정' },
  { id: 'PRE', label: 'Pre', desc: '필수 항목 착수' },
  { id: 'PASS', label: 'Pass', desc: '이수 기준 충족' },
  { id: 'ELITE', label: 'Elite', desc: '최고 구간 달성' },
] as const

/** 마일리지 장학금 구간 — 운영계획 §3-2. 인증 단계 문턱도 이 값에서 파생시킨다. */
export const MILEAGE_TIERS: Record<StarTrackId, { min: number; award: number }[]> = {
  STAR_PRE: [{ min: 100, award: 20 }, { min: 150, award: 30 }],
  STAR_CORE: [
    { min: 100, award: 20 }, { min: 170, award: 30 },
    { min: 250, award: 40 }, { min: 270, award: 50 },
  ],
}

/** 이수 필수 마일리지 — 두 트랙 모두 100점. */
export const MILEAGE_PASS_MARK = 100

// ── 로더 ─────────────────────────────────────────────────────────────────

const RECORDS = (seed as { tracks: StarTrackRecord[] }).tracks

/** 선발된 학생만 돌려준다. 미선발이면 undefined — 이것이 정상 상태다. */
export function getStarTrack(studentId: string): StarTrackRecord | undefined {
  return RECORDS.find(r => r.studentId === studentId)
}

// ── 집계 ─────────────────────────────────────────────────────────────────

export interface StarSummary {
  /** 완료 단계에서 적립된 마일리지 합계 */
  mileage: number
  /** 남은 단계를 모두 채웠을 때의 최대치 */
  mileageMax: number
  /** 이수율 = 완료 단계 / 전체 단계 */
  rate: number
  doneSteps: number
  totalSteps: number
  /** 지금 도달한 장학금 구간(없으면 null) */
  currentTier: { min: number; award: number } | null
  /** 다음 장학금 구간 · 남은 점수(최고 구간이면 null) */
  nextTier: { min: number; award: number; gap: number } | null
  /** 현재 인증 단계 index (0~3) */
  stageIndex: number
  /** 이수 기준 미달 항목 — 마일리지가 넘쳐도 이게 남으면 인증이 안 나온다. */
  blockers: StarStep[]
  passed: boolean
}

const allSteps = (record: StarTrackRecord): StarStep[] => record.axes.flatMap(a => a.steps)

export function getStarSummary(record: StarTrackRecord): StarSummary {
  const steps = allSteps(record)
  const done = steps.filter(s => s.status === 'done')
  const mileage = done.reduce((sum, s) => sum + (s.points ?? 0), 0)
  const mileageMax = steps.reduce((sum, s) => sum + (s.points ?? 0), 0)

  const tiers = MILEAGE_TIERS[record.track]
  const reached = tiers.filter(t => mileage >= t.min)
  const currentTier = reached.length ? reached[reached.length - 1] : null
  const upcoming = tiers.find(t => mileage < t.min)
  const nextTier = upcoming ? { ...upcoming, gap: upcoming.min - mileage } : null

  const blockers = steps.filter(s => s.required && s.status !== 'done')
  const passed = mileage >= MILEAGE_PASS_MARK && blockers.length === 0

  // 1 Basic(참여) → 2 Pre(착수) → 3 Pass(이수 기준) → 4 Elite(최고 구간)
  const top = tiers[tiers.length - 1]
  const stageIndex = mileage >= top.min && passed ? 3
    : passed ? 2
      : done.length > 0 ? 1
        : 0

  return {
    mileage, mileageMax,
    rate: steps.length ? Math.round((done.length / steps.length) * 100) : 0,
    doneSteps: done.length, totalSteps: steps.length,
    currentTier, nextTier, stageIndex, blockers, passed,
  }
}

/** 축별 진행 — 축 머리에 "n/m" 을 찍기 위한 값. */
export function getAxisProgress(axis: StarAxis): { done: number; total: number } {
  return { done: axis.steps.filter(s => s.status === 'done').length, total: axis.steps.length }
}

// ── 기존 단일소스 연동 ────────────────────────────────────────────────────

export interface StarLinkedData {
  /** 진단 — students.ts 의 확정 유형을 그대로 읽는다. STAR 가 유형을 따로 갖지 않는다. */
  /** 유형 메타. STAR 는 선발 트랙이라 보통 유형이 있지만, 진단 전이면 없다. */
  type: StudentTypeMeta | null
  /** 필수 진단 진행 (완료 / 트랙 필수) */
  diagnosisDone: number
  diagnosisTotal: number
  /** 상담 — 완료된 상담 신청 건수 */
  counselDone: number
  counselGoal: number
  /** 상담 유형별 완료 건수. 순서는 시안 고정(진로취업 · 심리 · 교수) — 색이 순서로 정해진다. */
  counselByType: { label: string; count: number }[]
  /** 교과 이수 */
  courseDone: number
  courseTotal: number
  /** 비교과 — 축3(비교과·마일리지) 진행 */
  programDone: number
  programTotal: number
}

/**
 * 연동 값 모으기. STAR 화면이 학생 데이터를 직접 헤집지 않도록 여기서 한 번에 만든다.
 * "명칭만 같고 의미가 다른" 값을 섞지 않는 것이 요점이다 — 진단·상담은 전교생 소스,
 * 교과·비교과 진행은 STAR 트랙 소스다.
 */
/** 상담 카드 내역 — 시안이 정한 순서다. 색이 순서로 정해지므로 바꾸지 말 것. */
const COUNSEL_TYPES = ['진로취업', '심리', '교수'] as const

export function getStarLinkedData(student: StudentData, record: StarTrackRecord): StarLinkedData {
  const done = getStudentCounselRequests(student.id).filter(r => r.status === '완료')
  const programAxis = record.axes[record.axes.length - 1]
  const programProgress = getAxisProgress(programAxis)

  return {
    type: student.studentType ? STUDENT_TYPE_MAP[student.studentType] : null,
    diagnosisDone: record.diagnosisDone.length,
    diagnosisTotal: STAR_REQUIRED_TESTS[record.track].length,
    counselDone: done.length,
    counselGoal: record.counselGoal,
    counselByType: COUNSEL_TYPES.map(t => ({
      label: t === '교수' ? '지도교수' : t,
      count: done.filter(r => r.type === t).length,
    })),
    courseDone: record.courses.filter(c => c.status === 'done').length,
    courseTotal: record.courses.length,
    programDone: programProgress.done,
    programTotal: programProgress.total,
  }
}
