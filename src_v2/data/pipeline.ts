// 진단 완료 여부는 PostgreSQL 응시 이력으로 판정한다.
// 채점 엔진 없이 유형·점수를 만들지 않는다. 개발 검증 기록은 별도 API를 사용한다.
import {
  DIAGNOSIS_MODULES, STUDENT_TYPE_MAP, getRequiredTests,
  type DiagnosisModule, type PipelineState, type TestStatus,
} from './careerProcess'
import { isCare7 } from './counselTrack'
import { getDiagnosisResult } from './diagnosisResults'
import { getStudentCounselRequests, getStudentType } from './students'
import { diagnosisAttempts, loadStudentDiagnoses } from '../../shared/diagnosisStore'
import { api } from '../../shared/api'
import { loadProfiles } from '../../shared/profileStore'
import type { StudentData, StudentTypeEvent } from './students'
// 진단 응시 레코드는 상담사 포털이 이미 정의해 둔 것을 그대로 쓴다 — 같은 이벤트다.
// (타입만 빌려오므로 런타임 의존은 없다. cross-SPA 비계는 DB 전환 시 함께 걷힌다.)
import type { DiagnosisAttempt } from '../../src_admin/data/schema/diagnosisAttempt'
// 로드맵 존재 판정은 교직원 포털의 생성 스토어가 정본이다 — 상담사가 만든 것을
// 학생 화면이 그대로 봐야 하므로 여기서 다시 판단하지 않는다(같은 비계, DB 전환 시 제거).
import { hasConfirmedRoadmap } from '../../src_admin/data/roadmapGenerated'

// 유형 조회·이벤트 타입은 students.ts 가 갖는다 — 두 포털이 같은 답을 봐야 하기 때문이다.
// 여기서 다시 정의하지 않고 그대로 다시 내보낸다.
export { getStudentType }
export type { StudentTypeEvent }

// ── 읽기 ────────────────────────────────────────────────────────────────

/** 이 학생의 진단 응시 이력(런타임 적재분). seed 응시분은 상담사 로더가 따로 병합한다. */
export function getAttempts(studentId: string): DiagnosisAttempt[] {
  return diagnosisAttempts.filter(a => a.studentId === studentId)
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
    isTestDone(student.id, m.testId)

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

  // Completion is determined by persisted attempts, never by the existence of a type.

  const followUp = studentType ? STUDENT_TYPE_MAP[studentType].followUpTest : null
  const followUpModule = followUp ? DIAGNOSIS_MODULES.find(m => m.id === followUp) : undefined

  return {
    coreDone: isTestDone(student.id, 'ccore'),
    studentType,
    followUpDone: (followUpModule ? isTestDone(student.id, followUpModule.testId) : false),
    // ★ 시드가 아니라 **병합 스토어**를 읽는다. 상담 신청도, 상담사의 확정·완료
    //   전이도 전부 dc_counsel_owners 오버레이에 쌓이고 학생 JSON 은 불변이다.
    //   시드만 보면 상담사가 일지를 쓰고 완료해도 학생 화면은 영영 "상담을 신청하세요"에
    //   머문다(신입생은 시드가 빈 배열이라 특히 그렇다).
    //
    // ★ 로드맵을 여는 상담은 「진로취업 × CARE 7+ 연계」 하나뿐이다.
    //   · 일반 진로취업 상담은 파이프라인 밖이라 몇 번을 받아도 열지 않는다.
    //   · 심리·교수 상담도 마찬가지다(전에는 종류를 안 가려서 심리 상담 1건이
    //     로드맵을 열고 있었다 — 유형 확정도 로드맵 생성도 없는 상담이다).
    counselDone: getStudentCounselRequests(student.id).some(
      r => r.status === '완료' && r.type === '진로취업' && isCare7(r.careTrack),
    ),
    // 시드 로드맵을 받고 들어온 학생과, 상담사가 방금 만들어 준 학생 둘 다 열려야 한다.
    // 시드만 보면 생성 직후에도 로드맵·역량강화·취업지원이 잠긴 채로 남는다.
    //
    // ★ 「있다」가 아니라 「확정됐다」를 본다(04-decisions Q1). 초안은 열지 않는다 —
    //   재생성 중에는 계획이 행으로는 있어도 학생에게 열린 계획이 아니다.
    //   존재로 판정하면 서버(gates.py)는 거절하는데 화면만 열려, 학생이 잠긴 줄
    //   모르고 신청까지 갔다가 마지막에 막힌다. 술어는 서버와 한 벌이어야 한다.
    roadmapConfirmed: hasConfirmedRoadmap(student.id),
  }
}

// ── 쓰기 (이벤트) ────────────────────────────────────────────────────────

/**
 * 진단 응시 완료. 응시 이력을 쌓고, C-CORE 였다면 유형을 함께 주입한다.
 *
 * 응시 시점 스냅샷(학번·이름·학과·학년)을 같이 저장한다 — 현행 EP_PRM_APP 패턴
 * 계승(CLAUDE.md 2조). 학적이 바뀌어도 "응시 당시" 소속으로 집계가 재현돼야 한다.
 */
const pendingDiagnosisKeys = new Map<string,string>()
export async function completeDiagnosis(student: StudentData, testId: string): Promise<void> {
  const key = pendingDiagnosisKeys.get(testId) ?? crypto.randomUUID()
  pendingDiagnosisKeys.set(testId,key)
  await api('/development/diagnosis/'+encodeURIComponent(testId)+'/complete', {
    method:'POST',headers:{'Idempotency-Key':key},
  })
  await Promise.all([loadStudentDiagnoses(student.id),loadProfiles()])
  pendingDiagnosisKeys.delete(testId)
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
