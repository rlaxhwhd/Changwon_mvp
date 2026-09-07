// ─────────────────────────────────────────────────────────────────────────
// 상담사 스키마 (단일 소스)
// 진로취업상담사(career) / 심리상담사(psych) 2종. 역할별 권한 헬퍼 포함.
// ─────────────────────────────────────────────────────────────────────────
import type { CounselRequestType } from './counselRequest'
import type { StaffUser } from './staff'

/** 상담사 역할 — 진로취업상담사 / 심리상담사. StaffRole의 부분집합. */
export type CounselorRole = 'career' | 'psych'

/** 상담사 = 교직원 공통 신원(StaffUser) + 상담 도메인 필드.
 *  id·name·roleLabel·dept는 StaffUser에서 상속하고 role만 career/psych로 좁힌다. */
export interface Counselor extends StaffUser {
  role: CounselorRole
  /** 담당 범위 설명 (예: 전 학과 진로취업, 공과대학 등) */
  scope: string
  /** 담당 학과 목록. 빈 배열이면 전 학과. */
  departments: string[]
  /** 전문 분야 짧은 태그 (학생 상담신청 화면 표시용, 예: 진로설계 · 취업전략). 미지정 시 화면은 scope로 폴백. */
  specialty?: string
  /** 프로필 이미지 경로 (선택) */
  avatar?: string
  /** 이메일 (선택) */
  email?: string
  /** 가능 시간대 요약 (선택, 예: 월·수·금 14:00~17:00) */
  officeHours?: string
}

/** 역할 → 한글 라벨 */
export const ROLE_LABEL: Record<CounselorRole, string> = {
  career: '진로취업상담사',
  psych: '심리상담사',
}

// ── 역할별 권한 헬퍼 ──────────────────────────────────────────────────────
/** 로드맵 조회·수정·확정 권한 (진로상담사 전용) */
export function canEditRoadmap(role: CounselorRole): boolean {
  return role === 'career'
}

/** 채용공고 CRUD 권한 (진로상담사 전용) */
export function canManageJobs(role: CounselorRole): boolean {
  return role === 'career'
}

/** 진단 6유형 확정 권한 (진로상담사 전용) */
export function canConfirmIap(role: CounselorRole): boolean {
  return role === 'career'
}

/** 이 상담사가 처리하는 상담 유형 (요청 접수함 필터에 사용) */
export function handledRequestTypes(role: CounselorRole): CounselRequestType[] {
  return role === 'career' ? ['진로취업'] : ['심리']
}
