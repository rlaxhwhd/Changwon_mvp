// ─────────────────────────────────────────────────────────────────────────────
// 심리검사 결과 스키마 (SPEC C7 · 현행 `CoMc010TrialConWrite` / `CoSimriResultWrite` 대응)
//
// ★ 전제: 이 시스템에는 심리검사의 문항·채점 로직이 없다.
//   현행도 **외부 검사도구(MMPI·TCI 등)의 결과를 상담사가 입력**하는 구조이고
//   심리검사는 **심리상담 신청 절차 안에서만** 이루어진다(단독 응시 화면 없음).
//   → 학생이 단독 응시하는 진단 4종(C-2~C-CORE, schema/diagnosisAttempt.ts)과 **다른 도메인**이다.
//   근거: docs/_analysis/05_answers.md Q9 (2)
//
// 척도(scales)를 고정 컬럼으로 두지 않고 배열로 받는다 — 검사도구마다 척도 구성이 다르고
// 우리가 채점하지 않으므로 스키마가 특정 도구에 종속되면 안 된다.
// ─────────────────────────────────────────────────────────────────────────────

/** 심리검사 종류 — 현행 `BASICSETTING.TRIALTYPE` 대응 (SPEC §7-0 코드 규약: code·label·legacy·active) */
export interface PsychTestTypeCode {
  code: string
  label: string
  /** 현행 값. ⚠ `TRIALTYPE`의 실제 코드값은 **미확인** — 확인 후 채울 것 */
  legacy: string | null
  active: boolean
}

export const PSYCH_TEST_TYPES: PsychTestTypeCode[] = [
  { code: 'MMPI2', label: 'MMPI-2 다면적 인성검사', legacy: null, active: true },
  { code: 'TCI', label: 'TCI 기질 및 성격검사', legacy: null, active: true },
  { code: 'SCT', label: 'SCT 문장완성검사', legacy: null, active: true },
  { code: 'MBTI', label: 'MBTI 성격유형검사', legacy: null, active: true },
  { code: 'HOLLAND', label: '홀랜드 직업흥미검사', legacy: null, active: true },
  { code: 'ETC', label: '기타 (직접 입력)', legacy: null, active: true },
]

export function psychTestLabel(code: string): string {
  return PSYCH_TEST_TYPES.find(item => item.code === code)?.label ?? code
}

/** 척도 1개 — 라벨·점수·해석 메모. 도구마다 개수와 이름이 다르므로 자유 배열. */
export interface PsychTestScale {
  label: string
  score: number
  note?: string
}

export type PsychTestStatus = '작성중' | '완료'

export interface PsychTestResult {
  /** 결과 id (pst_ prefix) */
  id: string
  /** 연결된 심리상담 신청 id — 심리검사는 상담 건에 종속된다 */
  requestId: string
  studentId: string
  // ── 작성 시점 스냅샷 ──
  studentNo: string
  studentName: string
  studentMajor: string
  studentGrade: number
  /** PSYCH_TEST_TYPES.code */
  testCode: string
  /** testCode === 'ETC'일 때 직접 입력한 검사명 */
  testNameEtc?: string
  /** 검사 실시일 YYYY-MM-DD */
  testedAt: string
  scales: PsychTestScale[]
  /** 결과 해석 (검사도구 기준) */
  interpretation: string
  /** 상담사 소견 (상담 맥락) */
  opinion: string
  /** 학생 공개 여부 — 현행 `COUNSEL_MASTER.STUD_OTP_YN` 계승 */
  openToStudent: boolean
  status: PsychTestStatus
  /** 작성 상담사 id */
  by: string
  byName: string
  createdAt: string
  updatedAt: string
}
