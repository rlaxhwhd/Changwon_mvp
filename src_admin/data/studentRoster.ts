// ─────────────────────────────────────────────────────────────────────────
// 학생 로스터(관리자 전용) 로더 — 단일 소스는 A(src_v2/data/studentsRoster.json).
// 학생 데이터는 A(원본)에서만 관리하고 admin 은 여기서 구독한다.
// 경량 목록 필드 + 벌점 key(penaltyTotal/penaltyEntries)를 학생 레코드에 직접 보유.
// 백엔드 연동 시 이 로더만 API 호출로 교체하면 화면은 그대로 나간다.
// ⚠ 화면 컴포넌트에 로스터 리터럴을 박지 않는다 — 반드시 이 로더에서 구독.
// ─────────────────────────────────────────────────────────────────────────
import roster from '../../src_v2/data/studentsRoster.json'
import type { EnrollmentStatus, StudentData } from '../../src_v2/data/students'
import { STUDENTS, getStudentType, getStudentTypeMeta } from '../../src_v2/data/students'
import { typeLabel, type StudentType } from '../../src_v2/data/careerProcess'
import type { PenaltyEntry } from './schema/penalty'
import { getRoadmapProgress } from './roadmap'
// STAR 트랙 선발 결과는 학생 SPA 의 시드가 단일 원천 — 여기서 명단을 다시 두지 않는다.
import { getStarTrack } from '../../src_v2/data/starTrack'
import { paginate, mockLatency } from './query'
import type { ListParams, Paginated } from './query'

/** 학적 상태 — 학생 JSON(students.ts) 단일 원천의 alias. 로스터 JSON은 3값만 쓰는 부분집합. */
export type EnrollStatus = EnrollmentStatus
/** 3계층 — studentType에서 파생된다(careerProcess.TIER_LABEL). 별도 저장하지 않는다. */
export type RosterTier = '하위' | '중간' | '상위'

/** 로스터 학생 1명 (경량) — 상세 데이터는 STUDENTS(src_v2) 상세 학생만 보유 */
export interface RosterStudent {
  id: string
  /** 학번 (입학년도 4자리 + 일련 4자리) */
  studentNo: string
  /** 한국 이름 */
  name: string
  /** 소속 학과 */
  major: string
  /** 학년 1~4 */
  grade: number
  /** 6유형 진단 코드 T1~T6 — 진단 전이면 null (표시명은 typeLabel()로 파생) */
  studentType: StudentType | null
  /** 계층 표시명 — 비교과 신청 범위를 가른다. 유형이 없으면 계층도 없다. */
  tier: RosterTier | null
  /** 로드맵 진행률 0~100 */
  progress: number
  status: EnrollStatus
  /** 학점 (4.5 만점, 소수 2자리 문자열) — 학사 유래. 우리가 수정하지 않는다. */
  gpa?: string
  /** 비교과 이수 건수 — 목록·집계용 경량 집계(상세는 programs 신청자 목록) */
  programCount?: number
  /** 상담 누적 횟수 — 목록·집계용 경량 집계(상세는 counselRequests) */
  counselCount?: number
  /** 누적 벌점 총점 (벌점 있는 학생만) — 블랙리스트 단일 소스 */
  penaltyTotal?: number
  /** 벌점 변동 이력 (벌점 있는 학생만) */
  penaltyEntries?: PenaltyEntry[]
  // ── 기본 프로필 (A counselSeed 수준) — 블랙리스트 30명만 보유 ──
  phone?: string
  language?: string
  competencyScore?: number
  typeScores?: { 진로명확도: string; 역량준비도: string; 취업준비도: string }
  targetRole?: string
  targetCompanySummary?: string
  roadmapSummary?: string
}

/** 로스터 전체 (seed). 추후 API 교체 지점. */
export const STUDENT_ROSTER: RosterStudent[] = roster as RosterStudent[]

/** 학생 id → 학번 조회 맵 (상세 STUDENTS + 로스터 단일 소스). */
const STUDENT_NO_BY_ID: Record<string, string> = {
  ...Object.fromEntries(STUDENT_ROSTER.map(s => [s.id, s.studentNo])),
  ...Object.fromEntries(STUDENTS.map(s => [s.id, s.studentNo])),
}

/** 학생 id → 학번. 미등록 id 는 id 그대로 반환(폴백). */
export function studentNoOf(id: string): string {
  return STUDENT_NO_BY_ID[id] ?? id
}

/** 신청자 리스트 표시용 경량 프로필 — 학번·이름·학과·학년·학적구분·진단유형(학생 단일소스). */
export interface StudentLite {
  studentNo: string
  name: string
  major: string
  grade: number
  status: EnrollStatus
  /** 6유형 진단 코드 T1~T6 — 진단 전이면 null. 표시명은 typeLabel()로 파생한다. */
  studentType: StudentType | null
}

/** 학생 id → 경량 프로필 맵 (상세 STUDENTS 우선, 없으면 로스터). */
const STUDENT_LITE_BY_ID: Record<string, StudentLite> = {
  ...Object.fromEntries(
    STUDENT_ROSTER.map(s => [s.id, { studentNo: s.studentNo, name: s.name, major: s.major, grade: s.grade, status: s.status, studentType: s.studentType }]),
  ),
  ...Object.fromEntries(
    STUDENTS.map(s => [s.id, { studentNo: s.studentNo, name: s.name, major: s.major, grade: s.grade, status: s.enrollmentStatus, studentType: getStudentType(s) }]),
  ),
}

/** 학생 id → 경량 프로필. 미등록이면 undefined(호출부에서 신청 스냅샷으로 폴백). */
export function studentLiteOf(id: string): StudentLite | undefined {
  return STUDENT_LITE_BY_ID[id]
}

// 학과 → 단과대학 파생은 학과 트리 단일소스(departments.ts = V_DEP_INF_ALL 미러)가 담당한다.
// 로스터에 대학 필드가 없어 여기서 재노출만 한다 — 매핑을 이 파일에 다시 만들지 말 것.
export { collegeOf } from './departments'

/** 전체 학생 수 — 대시보드 '전체 학생' 카드/목록 카운트 단일 소스 */
export function getRosterTotal(): number {
  return STUDENT_ROSTER.length
}

/** 학적 상태 배지 CSS 클래스 (index.css 토큰) */
export function enrollStatusClass(status: EnrollStatus): string {
  switch (status) {
    case '휴학':
      return 'admin-enroll admin-enroll-leave'
    case '졸업':
      return 'admin-enroll admin-enroll-graduate'
    case '수료':
      return 'admin-enroll admin-enroll-done'
    default:
      return 'admin-enroll admin-enroll-active'
  }
}

/**
 * 6유형 → 틴트 유틸 클래스 (DESIGN.md 7색 중 6색). 새 색을 만들지 않는다.
 * 유형 배지를 그리는 모든 화면의 단일 소스 — 여기 말고 다른 데서 유형 색을 정하지 않는다.
 */
const TYPE_HUE: Record<StudentType, string> = {
  T1: 'green',
  T2: 'teal',
  T3: 'blue',
  T4: 'yellow',
  T5: 'red',
  T6: 'purple',
}

/** 유형 배지 틴트 클래스 (옅은 배경) */
export const TYPE_TINT: Record<StudentType, string> = Object.fromEntries(
  Object.entries(TYPE_HUE).map(([code, hue]) => [code, `s-${hue}`]),
) as Record<StudentType, string>

/** 유형 배지 CSS 클래스 (모양 + 유형별 틴트) — enrollStatusClass와 동일 규약 */
// 유형이 없는 학생(진단 전)은 색을 지어내지 않고 중립 배지로 둔다.
export function studentTypeClass(code: StudentType | null): string {
  return code ? `admin-type-tag ${TYPE_TINT[code]}` : 'admin-type-tag admin-type-pending'
}

/** 유형 점(solid swatch) 클래스 — 홈 '담당 학생 유형 분포' 범례 */
export function typeSwatchClass(code: StudentType): string {
  return `b-${TYPE_HUE[code]}`
}

/**
 * 유형 색을 CSS 값으로 — 그라데이션·차트처럼 클래스를 못 쓰는 자리에 넣는다.
 * 배지·점·차트가 같은 색을 쓰도록 세 표기가 전부 TYPE_HUE 하나에서 파생된다.
 */
export function typeColorVar(code: StudentType | null): string {
  return code ? `var(--${TYPE_HUE[code]})` : 'var(--text-cap)'
}

/** 계층 배지 CSS 클래스 (index.css 토큰) — StudentList와 동일 규약 */
export function rosterTierClass(tier: RosterTier | null): string {
  switch (tier) {
    case '하위':
      return 'admin-track-focus'
    case '상위':
      return 'admin-track-fast'
    default:
      return 'admin-track-std'
  }
}

/**
 * 상세 학생(src_v2 STUDENTS)을 로스터 뷰에 병합한다.
 * 상세 학생을 앞에 두고 더미 100명을 뒤에 이어 붙여 목록 단일 소스를 만든다.
 * (상세 학생 id가 로스터에도 있으면 상세본으로 대체 — 중복 방지)
 */
export function mergeDetailedIntoRoster(detailed: RosterStudent[]): RosterStudent[] {
  const detailedIds = new Set(detailed.map(d => d.id))
  const dummies = STUDENT_ROSTER.filter(s => !detailedIds.has(s.id))
  return [...detailed, ...dummies]
}

// ─────────────────────────────────────────────────────────────────────────
// [DB-ready] 학생 로스터 조회 — 목록 화면(StudentList)의 6천건 대비 서버 페이징 계약.
// 화면은 전체 배열을 받지 않고 queryStudentRoster(params)로 "현재 페이지"만 받는다.
// DB 전환 시: getFullRoster 슬라이스 대신 서버가 WHERE/LIMIT/OFFSET로 같은 봉투 반환.
// ─────────────────────────────────────────────────────────────────────────

/** 상세 학생 → 로스터 뷰 모델 (목록 단일 소스에 병합) */
function detailToRoster(s: StudentData): RosterStudent {
  const type = getStudentTypeMeta(s)
  return {
    id: s.id,
    studentNo: s.studentNo,
    name: s.name,
    major: s.major,
    grade: s.grade,
    studentType: getStudentType(s),
    // 유형이 없으면 계층도 없다 — 비교과 신청 범위를 함부로 열지 않는다.
    tier: (type?.tierLabel ?? null) as RosterTier | null,
    // 이행률 계산은 data/roadmap.ts 한 곳이다 — 여기서 다시 세지 않는다.
    progress: getRoadmapProgress(s.id),
    status: '재학',
    phone: s.phone,
  }
}

/** 전체 로스터(상세 병합, 담당 학과 필터) — 조회·필터·집계의 단일 소스. DB 전환 시 서버 보유. */
export function getFullRoster(departments: string[] = []): RosterStudent[] {
  const merged = mergeDetailedIntoRoster(STUDENTS.map(detailToRoster))
  return departments.length === 0 ? merged : merged.filter(s => departments.includes(s.major))
}

// ── 집중관리 분류 (고위험군 · 핵심관리대상) ────────────────────────────────
//
// ★ 판정 기준은 여기 한 곳이다(CLAUDE.md 규칙 10 · 13). 홈 대시보드 집계와
//   전체 학생 목록 필터가 같은 함수를 본다 — 화면마다 다시 판정하면 카드에 적힌
//   인원과 목록에 나오는 인원이 어긋난다.
//   DB 전환 시 이 상수들이 그대로 WHERE 절이 된다.

/** 집중관리 분류 기준 */
export const RISK_RULE = {
  /** 저학점 경계 (4.5 만점) */
  lowGpa: 2.5,
  /** '열심히 참여'로 보는 비교과 이수 건수 */
  activePrograms: 3,
  /** 진단-상담-로드맵 이수가 궤도에 올랐다고 보는 로드맵 진행률 */
  onTrackProgress: 60,
  /** 1학년은 판정 대상에서 제외한다 — 아직 이수 이력이 쌓이지 않는다. */
  excludeGrade: 1,
  /**
   * 핵심관리대상에서 제외하는 유형 — 취약관리형(`T5`).
   * 이 분류는 "학점은 낮지만 이행률이 높은" 학생을 골라내는 것인데, T5 는 계층이 하위이고
   * 목표 자체가 '참여 회복·이탈 방지'다(`careerProcess.STUDENT_TYPE_MAP`).
   * 수치가 우연히 문턱을 넘더라도 이 분류에 들어오면 안 된다 — 지원 방향이 반대다.
   * (고위험군에는 그대로 둔다. 거기서는 T5 가 오히려 맞는 대상이다)
   */
  coreExcludeType: 'T5',
} as const

const gpaOf = (s: RosterStudent) => Number(s.gpa ?? NaN)
const progCount = (s: RosterStudent) => s.programCount ?? 0
const counselCount = (s: RosterStudent) => s.counselCount ?? 0

/** 학점이 낮고 비교과·상담 어디에도 참여하지 않는 학생 */
export function isHighRisk(s: RosterStudent): boolean {
  return (
    s.grade !== RISK_RULE.excludeGrade &&
    gpaOf(s) < RISK_RULE.lowGpa &&
    progCount(s) === 0 &&
    counselCount(s) === 0
  )
}

/** 학점은 낮지만 비교과를 꾸준히 이수하고 진단-상담-로드맵이 궤도에 오른 학생 */
export function isCoreCare(s: RosterStudent): boolean {
  return (
    s.grade !== RISK_RULE.excludeGrade &&
    s.studentType !== RISK_RULE.coreExcludeType &&
    gpaOf(s) < RISK_RULE.lowGpa &&
    progCount(s) >= RISK_RULE.activePrograms &&
    counselCount(s) >= 1 &&
    s.progress >= RISK_RULE.onTrackProgress
  )
}

/**
 * STAR 트랙 참여 학생 — 위 둘과 달리 **판정이 아니라 소속**이다.
 * 선발 결과는 starTrack 시드가 쥐고 있으므로 여기서 기준을 다시 만들지 않는다.
 */
export function isStarTrack(s: RosterStudent): boolean {
  return getStarTrack(s.id) !== undefined
}

/**
 * 목록 필터 값 — 홈 카드 링크(?focus=)와 목록 버튼이 같은 코드를 쓴다.
 * high·core 는 집중관리 판정이고 star 는 트랙 소속이다 — 성격이 달라 화면에서 갈라 보인다.
 */
export type FocusFilter = 'high' | 'core' | 'star'

/** 필터 값 → 판정 함수. 화면은 코드만 넘기고 조건 자체를 알지 못한다. */
const FOCUS_PREDICATE: Record<FocusFilter, (s: RosterStudent) => boolean> = {
  high: isHighRisk,
  core: isCoreCare,
  star: isStarTrack,
}

/** 쿼리스트링·상태값이 유효한 필터인지 — 화면이 문자열을 그대로 넘겨도 안전하게. */
export function isFocusFilter(value: string | null | undefined): value is FocusFilter {
  return value === 'high' || value === 'core' || value === 'star'
}

/** [DB-ready] 로스터 목록 조회 — async + 페이징. 6천건이 와도 화면은 현재 페이지만 받는다. */
export async function queryStudentRoster(
  params: ListParams & { departments?: string[]; studentIds?: string[] } = {},
): Promise<Paginated<RosterStudent>> {
  await mockLatency()
  const q = (params.q ?? '').trim().toLowerCase()
  const f = params.filters ?? {}
  const ids = params.studentIds === undefined ? undefined : new Set(params.studentIds)
  const filtered = getFullRoster(params.departments ?? []).filter(s => {
    if (ids && !ids.has(s.id)) return false
    if (f.major && s.major !== f.major) return false
    if (f.grade && String(s.grade) !== f.grade) return false
    if (f.studentType && s.studentType !== f.studentType) return false
    if (f.tier && s.tier !== f.tier) return false
    if (f.status && s.status !== f.status) return false
    if (isFocusFilter(f.focus) && !FOCUS_PREDICATE[f.focus](s)) return false
    if (q && !`${s.name} ${s.major} ${typeLabel(s.studentType)}`.toLowerCase().includes(q)) return false
    return true
  })
  return paginate(filtered, params)
}

/** 필터 드롭다운 옵션 — 전체 집합에서 파생. DB 전환 시 별도 집계 엔드포인트. */
export function getRosterFilterOptions(departments: string[] = [], studentIds?: string[]) {
  const ids = studentIds === undefined ? undefined : new Set(studentIds)
  const base = getFullRoster(departments).filter(student => !ids || ids.has(student.id))
  return {
    majors: [...new Set(base.map(s => s.major))].sort(),
    grades: [...new Set(base.map(s => s.grade))].sort((a, b) => a - b),
    types: [...new Set(base.map(s => s.studentType))].filter((t): t is StudentType => t !== null),
    tiers: [...new Set(base.map(s => s.tier))],
    statuses: [...new Set(base.map(s => s.status))],
  }
}

/** 헤더 집계(총원·집중관리) — 전체 집합에서. DB 전환 시 COUNT 쿼리. */
export function getRosterSummary(departments: string[] = [], studentIds?: string[]) {
  const ids = studentIds === undefined ? undefined : new Set(studentIds)
  const base = getFullRoster(departments).filter(student => !ids || ids.has(student.id))
  return {
    total: base.length,
    focusCount: base.filter(s => s.tier === '하위').length,
    // 집중관리 2분류 — 홈 카드와 같은 판정 함수를 쓴다(수치가 갈리지 않게).
    highRiskCount: base.filter(isHighRisk).length,
    coreCareCount: base.filter(isCoreCare).length,
    starCount: base.filter(isStarTrack).length,
  }
}
