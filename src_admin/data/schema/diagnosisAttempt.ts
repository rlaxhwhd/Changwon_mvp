// ─────────────────────────────────────────────────────────────────────────────
// 진단 응시 이력 / 결과 코멘트 / 검사 권유 스키마 (단일 소스)
// SPEC §3-1-④ "검사 현황" — 상담사가 담당 학생의 진단 응시 현황·결과를 상담 준비용으로 본다.
//
// 검사 목록 자체는 src_v2/data/careerProcess.ts(DIAGNOSIS_MODULES)가 단일 소스다.
// 여기는 "누가 언제 응시했고 결과가 무엇인가"(이벤트)만 담는다.
//
// ⚠ 현행 CHECK_* 8종은 PK가 COUNSELIDX+USERID+IN_GUBUN 이라 검사가 상담 건에 종속돼 있다.
//   우리는 학생 단독 응시 구조이므로 requestId 를 두지 않는다 (SPEC §3-1-④ 참고).
// ⚠ 응시 시점 스냅샷(학번·이름·학과·학년)을 함께 저장한다 — 현행 EP_PRM_APP 패턴 계승.
//   학적 변동 후에도 "응시 당시" 소속으로 집계가 재현되어야 한다.
// ─────────────────────────────────────────────────────────────────────────────

/** 응시 상태. '미응시'는 레코드로 저장하지 않고 로더가 파생한다(로스터 × 학년별 대상검사). */
export type AttemptStatus = '미응시' | '진행중' | '완료'

export interface DiagnosisAttempt {
  /** 응시 id (dga_ prefix) */
  id: string
  /** 학생 id (studentRoster / src_v2 students 와 연결) */
  studentId: string
  // ── 응시 시점 스냅샷 ──
  studentNo: string
  studentName: string
  studentMajor: string
  studentGrade: number
  /** 검사 키 — DIAGNOSIS_MODULES.testId ('c2' | 'c3' | 'c4' | 'ccore') */
  testId: string
  status: Exclude<AttemptStatus, '미응시'>
  /** 회차. 1 = 최초, 2 이상 = 재검사 */
  attemptNo: number
  /** 응시 시작일 YYYY-MM-DD */
  startedAt: string
  /** 응시 완료일 YYYY-MM-DD (완료 건만) */
  completedAt?: string
  /** 결과 요약 한 줄 (완료 건만). 검사가 결정하는 값을 그대로 옮긴다 */
  resultSummary?: string
}

/** 상담사 결과 코멘트 — append-only. 수정·삭제하지 않고 최신 건을 노출한다. */
export interface DiagnosisComment {
  /** 코멘트 id (dgc_ prefix) */
  id: string
  /** 대상 응시 id */
  attemptId: string
  studentId: string
  body: string
  /** 작성 상담사 id */
  by: string
  /** 작성자 이름 스냅샷 */
  byName: string
  /** 작성 일시 ISO */
  createdAt: string
}

/** 검사 권유 발송 이벤트 — append-only (조교 독려 AdvisorNudge 패턴 미러) */
export interface DiagnosisNudge {
  /** 권유 id (dgn_ prefix) */
  id: string
  studentId: string
  testId: string
  /** 발송 상담사 id */
  by: string
  /** 발송 일시 ISO */
  sentAt: string
}
