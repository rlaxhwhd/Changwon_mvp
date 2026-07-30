// ─────────────────────────────────────────────────────────────────────────
// 교직원(백오피스) 포털 공통 신원 스키마 — 상담사·교수·조교 공용 단일 소스
// SPEC §1(로그인 유형) · §5-8(역할은 SY_AUTH 계승) 기준.
// 상담사(career/psych)는 여기의 하위 역할이며 Counselor가 StaffUser를 확장한다.
// ─────────────────────────────────────────────────────────────────────────

/** 포털 전체 역할 — 상담사(진로/심리) + 교수 + 조교.
 *  CounselorRole('career'|'psych')은 이 집합의 부분집합이다. */
export type StaffRole = 'career' | 'psych' | 'professor' | 'assistant'

/** 포털 사용자 공통 신원 — 상담사·교수·조교가 모두 만족하는 최소 형태.
 *  레이아웃(GNB·SectionSidebar)은 이 형태만 알면 되고 역할별 도메인 필드는 각자 확장한다. */
export interface StaffUser {
  /** = INTG_UID (교직원=사번). 세션·조인키 */
  id: string
  /** 사번 — 정문 로그인 아이디(비번 '!'). 데모에서 id(slug)와 분리해 둔다. */
  empNo?: string
  name: string
  role: StaffRole
  /** 역할 한글 라벨 (예: 진로취업상담사 / 교수 / 조교) */
  roleLabel: string
  /** 소속 부서/센터/학과 (헤더 표시용) */
  dept: string
}

/** 역할 → 한글 라벨 (전 역할 공통) */
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  career: '진로취업상담사',
  psych: '심리상담사',
  professor: '교수',
  assistant: '조교',
}

/** 로그인·전환 UI 그룹핑 — 상담사 2종은 한 그룹으로 묶는다 */
export type PortalGroup = 'counselor' | 'professor' | 'assistant'
export function portalGroup(role: StaffRole): PortalGroup {
  if (role === 'professor') return 'professor'
  if (role === 'assistant') return 'assistant'
  return 'counselor'
}
