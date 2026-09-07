// ─────────────────────────────────────────────────────────────────────────
// 순차 게이팅 런타임 (CLAUDE.md 13조 · PROCESS.md §2)
//
// "이 학생이 지금 어디까지 왔는가"를 판정하는 자리는 여기 하나뿐이다.
// 판정 규칙 자체는 careerProcess(getStageAccess·getNextAction)가 갖고,
// 이 모듈은 **그 규칙에 먹일 상태를 seed ⊕ localStorage 로 조립**한다.
//
// 단일 소스
//   · 학생 seed        = data/students/*.json
//   · 진단 응시 이벤트 = localStorage 'dc_diag_attempts'  (상담사 포털과 같은 키·같은 레코드)
//   · 유형 확정 이벤트 = localStorage 'dc_student_type'   (append-only)
//
// ⚠ 유형을 계산하지 않는다. 검사 판정식이 미확정이라(PROCESS.md §9 · CLAUDE.md 14조)
//   "C-CORE 를 마치면 무슨 유형이 나오는가"는 학생 seed 의 diagnosisOutcome 에
//   미리 적혀 있고, 응시 완료 시 그 값을 그대로 주입할 뿐이다.
//   판정식이 확정되면 이 주입 지점만 검사 결과로 갈아끼우면 된다.
// ─────────────────────────────────────────────────────────────────────────
import {
  DIAGNOSIS_MODULES, STUDENT_TYPE_MAP, getModuleByTestId, getRequiredTests,
  type DiagnosisModule, type PipelineState, type TestStatus,
} from './careerProcess'
import { getDiagnosisResult } from './diagnosisResults'
import { getStudentType, STUDENT_TYPE_EVENT_KEY } from './students'
import type { StudentData, StudentTypeEvent } from './students'
// 진단 응시 레코드는 상담사 포털이 이미 정의해 둔 것을 그대로 쓴다 — 같은 이벤트다.
// (타입만 빌려오므로 런타임 의존은 없다. cross-SPA 비계는 DB 전환 시 함께 걷힌다.)
import type { DiagnosisAttempt } from '../../src_admin/data/schema/diagnosisAttempt'

const ATTEMPT_KEY = 'dc_diag_attempts'
const TYPE_KEY = STUDENT_TYPE_EVENT_KEY

// 유형 조회·이벤트 타입은 students.ts 가 갖는다 — 두 포털이 같은 답을 봐야 하기 때문이다.
// 여기서 다시 정의하지 않고 그대로 다시 내보낸다.
export { getStudentType }
export type { StudentTypeEvent }

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return [] // 데모 범위 — 파싱 실패는 "기록 없음"으로 다룬다
  }
}

function persist<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── 읽기 ────────────────────────────────────────────────────────────────

/** 이 학생의 진단 응시 이력(런타임 적재분). seed 응시분은 상담사 로더가 따로 병합한다. */
export function getAttempts(studentId: string): DiagnosisAttempt[] {
  return readList<DiagnosisAttempt>(ATTEMPT_KEY).filter(a => a.studentId === studentId)
}

/** 해당 검사를 완료했는가. */
export function isTestDone(studentId: string, testId: string): boolean {
  return getAttempts(studentId).some(a => a.testId === testId && a.status === '완료')
}

/**
 * 이 학생 기준 진단 모듈 상태.
 *
 * careerProcess.getModuleStatus 는 모듈 시드의 recentAt 만 보므로 **모든 학생에게 같은 답**을 준다.
 * 학생마다 달라야 하는 판정은 여기서 한다 — 응시 이력이 우선이고, 시드에 이미 유형이
 * 박힌 기존 데모 학생은 진단을 마치고 들어온 것으로 다룬다(그 학생들의 화면을 바꾸지 않는다).
 */
export function getModuleStatusFor(student: StudentData, module: DiagnosisModule): TestStatus {
  const isDone = (m: DiagnosisModule) =>
    isTestDone(student.id, m.testId) || (student.studentType !== null && Boolean(m.recentAt))

  if (isDone(module)) return 'done'
  const ready = module.requires.every(id => {
    const req = DIAGNOSIS_MODULES.find(x => x.id === id)
    return req ? isDone(req) : false
  })
  return ready ? 'available' : 'locked'
}

/** 게이팅 판정에 먹일 상태를 조립한다. 화면은 이 함수만 부른다. */
export function getPipelineState(student: StudentData): PipelineState {
  const studentType = getStudentType(student)

  /**
   * ★ 시드에 유형이 박힌 학생은 **진단을 마치고 들어온 것**이다.
   *   유형은 C-CORE 가 낳는 값이므로, 유형이 있다는 건 진단 2종을 끝냈다는 뜻이다.
   *   이 줄이 없으면 기존 데모 학생(김채원·김창원)이 응시 이력이 없다는 이유로
   *   상담·로드맵·취업지원에서 통째로 잠긴다 — 게이팅 도입 전과 같아야 한다.
   */
  const seededDone = student.studentType !== null

  const followUp = studentType ? STUDENT_TYPE_MAP[studentType].followUpTest : null
  const followUpModule = followUp ? DIAGNOSIS_MODULES.find(m => m.id === followUp) : undefined

  return {
    coreDone: seededDone || isTestDone(student.id, 'ccore'),
    studentType,
    followUpDone: seededDone || (followUpModule ? isTestDone(student.id, followUpModule.testId) : false),
    // 상담·로드맵은 아직 학생 seed 가 사실상의 원천이다. 신입생은 둘 다 비어 있다.
    counselDone: (student.counselRequests ?? []).some(r => r.status === '완료'),
    roadmapConfirmed: Boolean(student.roadmapAxes),
  }
}

// ── 쓰기 (이벤트) ────────────────────────────────────────────────────────

/**
 * 진단 응시 완료. 응시 이력을 쌓고, C-CORE 였다면 유형을 함께 주입한다.
 *
 * 응시 시점 스냅샷(학번·이름·학과·학년)을 같이 저장한다 — 현행 EP_PRM_APP 패턴
 * 계승(CLAUDE.md 2조). 학적이 바뀌어도 "응시 당시" 소속으로 집계가 재현돼야 한다.
 */
export function completeDiagnosis(student: StudentData, testId: string): void {
  const module = getModuleByTestId(testId)
  if (!module) return

  const attempts = readList<DiagnosisAttempt>(ATTEMPT_KEY)
  const prior = attempts.filter(a => a.studentId === student.id && a.testId === testId)
  const now = today()

  attempts.push({
    id: `dga_${student.id}_${testId}_${prior.length + 1}`,
    studentId: student.id,
    studentNo: student.studentNo,
    studentName: student.name,
    studentMajor: student.major,
    studentGrade: student.grade,
    testId,
    status: '완료',
    attemptNo: prior.length + 1,
    startedAt: now,
    completedAt: now,
    resultSummary: module.decides,
  })
  persist(ATTEMPT_KEY, attempts)

  // C-CORE 가 유형을 정한다. 판정식이 없으니 seed 에 적힌 결과를 주입한다.
  if (module.id === 'CCORE') {
    const outcome = student.diagnosisOutcome?.studentType
    if (outcome && !getStudentType(student)) {
      const events = readList<StudentTypeEvent>(TYPE_KEY)
      events.push({
        id: `dst_${student.id}_${events.length + 1}`,
        studentId: student.id,
        studentType: outcome,
        source: 'diagnosis',
        decidedAt: new Date().toISOString(),
      })
      persist(TYPE_KEY, events)
    }
  }
}

// ── 진단 결과 카드 (라운지) ──────────────────────────────────────────────

/** 라운지 「진단 결과」 카드 1장. 대상 검사 × 응시 상태 × 결과를 합친 뷰. */
export interface DiagnosisCardView {
  module: DiagnosisModule
  status: TestStatus
  /** 완료 건의 대표 결과 — C-CORE 는 유형명, 후속진단은 강점요인 */
  headline?: string
  /** 요인 태그 (완료 건만) */
  tags: string[]
}

/**
 * 이 학생이 봐야 할 진단 목록 + 결과.
 * 대상은 getRequiredTests(유형) — C-CORE + 그 유형의 후속진단 1종뿐이다.
 * 전 7종을 늘어놓지 않는다(다른 유형의 검사는 이 학생 것이 아니다).
 */
export function getDiagnosisCardViews(student: StudentData): DiagnosisCardView[] {
  const modules = getRequiredTests(getStudentType(student))
  return modules.map(module => {
    const status = getModuleStatusFor(student, module)
    const result = status === 'done' ? getDiagnosisResult(student.id, module.testId) : undefined
    return {
      module,
      status,
      headline: result?.headline,
      // 요인은 결과가 있으면 요인명을, 없으면 그 검사가 재는 영역을 보여준다.
      tags: result ? result.factors.map(f => f.name) : [],
    }
  })
}

/** 데모 되돌리기 — 이 학생의 진행분만 지운다(제로베이스로 복귀). */
export function resetPipeline(studentId: string): void {
  persist(ATTEMPT_KEY, readList<DiagnosisAttempt>(ATTEMPT_KEY).filter(a => a.studentId !== studentId))
  persist(TYPE_KEY, readList<StudentTypeEvent>(TYPE_KEY).filter(e => e.studentId !== studentId))
}
