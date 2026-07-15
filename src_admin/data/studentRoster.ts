// ─────────────────────────────────────────────────────────────────────────
// 학생 로스터(관리자 전용) 로더 — 경량 100명 더미
// students.ts 패턴 미러: JSON import → 배열 노출 → 파생 헬퍼.
// 관리 목록/대시보드 카운트용 경량 필드만 담는다(상세 데이터 아님).
// 백엔드 연동 시 이 로더만 API 호출로 교체하면 화면은 그대로 나간다.
// ⚠ 화면 컴포넌트에 로스터 리터럴을 박지 않는다 — 반드시 이 로더에서 구독.
// ─────────────────────────────────────────────────────────────────────────
import roster from './students-roster.json'
import type { EnrollmentStatus } from '../../src_v2/data/students'

/** 학적 상태 — 학생 JSON(students.ts) 단일 원천의 alias. 로스터 JSON은 3값만 쓰는 부분집합. */
export type EnrollStatus = EnrollmentStatus
/** 운영 트랙 — src_v2 careerProcess와 동일 3분류 */
export type RosterTrack = '집중관리' | '가속' | '표준'

/** 로스터 학생 1명 (경량) — 상세 데이터는 STUDENTS(src_v2) 상세 학생만 보유 */
export interface RosterStudent {
  id: string
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
}

/** 로스터 전체 (seed). 추후 API 교체 지점. */
export const STUDENT_ROSTER: RosterStudent[] = roster as RosterStudent[]

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
