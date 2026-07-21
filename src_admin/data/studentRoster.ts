// ─────────────────────────────────────────────────────────────────────────
// 학생 로스터(관리자 전용) 로더 — 단일 소스는 A(src_v2/data/studentsRoster.json).
// 학생 데이터는 A(원본)에서만 관리하고 admin 은 여기서 구독한다.
// 경량 목록 필드 + 벌점 key(penaltyTotal/penaltyEntries)를 학생 레코드에 직접 보유.
// 백엔드 연동 시 이 로더만 API 호출로 교체하면 화면은 그대로 나간다.
// ⚠ 화면 컴포넌트에 로스터 리터럴을 박지 않는다 — 반드시 이 로더에서 구독.
// ─────────────────────────────────────────────────────────────────────────
import roster from '../../src_v2/data/studentsRoster.json'
import type { EnrollmentStatus } from '../../src_v2/data/students'
import { STUDENTS } from '../../src_v2/data/students'
import type { PenaltyEntry } from './schema/penalty'

/** 학적 상태 — 학생 JSON(students.ts) 단일 원천의 alias. 로스터 JSON은 3값만 쓰는 부분집합. */
export type EnrollStatus = EnrollmentStatus
/** 운영 트랙 — src_v2 careerProcess와 동일 3분류 */
export type RosterTrack = '집중관리' | '가속' | '표준'

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
  /** 6유형 진단 분류 */
  studentType: string
  /** IAP 유형 R1~R6 */
  iap: string
  track: RosterTrack
  /** 로드맵 진행률 0~100 */
  progress: number
  status: EnrollStatus
  /** 누적 벌점 총점 (벌점 있는 학생만) — 블랙리스트 단일 소스 */
  penaltyTotal?: number
  /** 벌점 변동 이력 (벌점 있는 학생만) */
  penaltyEntries?: PenaltyEntry[]
  // ── 기본 프로필 (A counselSeed 수준) — 블랙리스트 30명만 보유 ──
  phone?: string
  gpa?: string
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

/** 신청자 리스트 표시용 경량 프로필 — 학번·이름·학과·학년·학적구분(학생 단일소스). */
export interface StudentLite {
  studentNo: string
  name: string
  major: string
  grade: number
  status: EnrollStatus
}

/** 학생 id → 경량 프로필 맵 (상세 STUDENTS 우선, 없으면 로스터). */
const STUDENT_LITE_BY_ID: Record<string, StudentLite> = {
  ...Object.fromEntries(
    STUDENT_ROSTER.map(s => [s.id, { studentNo: s.studentNo, name: s.name, major: s.major, grade: s.grade, status: s.status }]),
  ),
  ...Object.fromEntries(
    STUDENTS.map(s => [s.id, { studentNo: s.studentNo, name: s.name, major: s.major, grade: s.grade, status: s.enrollmentStatus }]),
  ),
}

/** 학생 id → 경량 프로필. 미등록이면 undefined(호출부에서 신청 스냅샷으로 폴백). */
export function studentLiteOf(id: string): StudentLite | undefined {
  return STUDENT_LITE_BY_ID[id]
}

/** 학과 → 단과대학 파생 맵. 학생 단일소스에 대학 필드가 없어 학과에서 유도한다. */
const COLLEGE_BY_MAJOR: Record<string, string> = {
  컴퓨터공학과: '공과대학',
  경영학과: '경영대학',
}

/** 학과명으로 단과대학을 파생한다. 미매핑 학과는 '—'. */
export function collegeOf(major: string): string {
  return COLLEGE_BY_MAJOR[major] ?? '—'
}

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

/** 트랙 배지 CSS 클래스 (index.css 토큰) — StudentList와 동일 규약 */
export function rosterTrackClass(track: RosterTrack): string {
  switch (track) {
    case '집중관리':
      return 'admin-track-focus'
    case '가속':
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
