// ─────────────────────────────────────────────────────────────────────────
// 로드맵 읽기 모델 (단일 소스) — PROCESS.md §6
//
// 화면이 보는 로드맵 1개를 여기서 조립한다. 세 조각이 합쳐진다.
//   ① base   학생 JSON 의 roadmapAxes (3축 × 5칸)
//   ② override 상담사 수정분 (dc_roadmap_overrides, 축 단위 교체)
//   ③ 프로그램 편입분  비교과 개설 시 roadmapEntry 로 IAP 축에 붙는 칸
//
// 이행률도 여기서 계산한다 — 화면이 칸 배열을 받아 세지 않는다(CLAUDE.md 규칙 10).
// DB 전환 시 이 함수 하나가 조인 쿼리 하나가 된다.
// ─────────────────────────────────────────────────────────────────────────
import { STUDENTS } from '../../src_v2/data/students'
import type { StudentData } from '../../src_v2/data/students'
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { StudentType } from '../../src_v2/data/careerProcess'
import {
  ROADMAP_ENTRY_LABEL,
  axisProgress,
  isCellAlive,
  planProgress,
} from '../../src_v2/data/schema/roadmap'
import type {
  RoadmapAxis,
  RoadmapAxisPlan,
  RoadmapCell,
  RoadmapProgress,
} from '../../src_v2/data/schema/roadmap'
import { getMergedRoadmap } from './roadmapOverrides'
import type { AxisOrigin } from './schema/roadmapEdit'
import { getPrograms } from './programs'
import type { Program } from './schema/program'

/** 화면이 구독하는 로드맵 1개 */
export interface StudentRoadmap {
  studentId: string
  /** base ⊕ override ⊕ 프로그램 편입분. 항상 ROADMAP_AXES 순서. */
  axes: RoadmapAxisPlan[]
  origin: Record<RoadmapAxis, AxisOrigin>
  /** 전체 이행률 */
  progress: RoadmapProgress
  /** 축별 이행률 */
  byAxis: Record<RoadmapAxis, RoadmapProgress>
  meta: ReturnType<typeof getMergedRoadmap> extends null ? never : NonNullable<ReturnType<typeof getMergedRoadmap>>['meta']
}

/** 이 학생이 그 프로그램을 수료했는가 — 칸 완료의 유일한 기준 (PROCESS.md §6-4) */
function completed(program: Program, studentId: string): boolean {
  return program.applicants.some(a => a.studentId === studentId && a.outcomeStatus === '수료')
}

/**
 * 프로그램 개설로 IAP 축에 붙는 칸들.
 * 조건 = 로드맵 편입값이 NONE 이 아니고, CARE 7+ 분류에 이 학생의 유형이 들어 있을 것.
 */
function programCells(studentId: string, type: StudentType): RoadmapCell[] {
  return getPrograms()
    .filter(p => p.roadmapEntry && p.roadmapEntry !== 'NONE' && (p.careTypes ?? []).includes(type))
    .map(p => ({
      id: `prog-${p.id}`,
      title: p.title,
      priority: p.roadmapEntry === 'REQUIRED' ? 'P0' : 'P1',
      importance: p.roadmapEntry === 'REQUIRED' ? '필수' : '권장',
      why: `${ROADMAP_ENTRY_LABEL[p.roadmapEntry!]} 비교과 — ${typeLabel(type)} 로드맵에 편입된 프로그램입니다.`,
      status: completed(p, studentId) ? 'DONE' : 'TODO',
      programId: p.id,
      entry: p.roadmapEntry,
      // '추천' 칸의 유효기간 = 신청 마감일. 마감 하루가 끝날 때까지 살아 있게 23:59 로 본다.
      expiresAt: `${p.endDate}T23:59:59`,
    }))
}

/** 학생 1명의 로드맵. 로드맵이 아직 생성되지 않았으면 null. */
export function getStudentRoadmap(studentId: string): StudentRoadmap | null {
  const student = STUDENTS.find(s => s.id === studentId)
  const merged = getMergedRoadmap(studentId)
  if (!student || !merged) return null

  const extra = programCells(studentId, student.studentType)
  const now = new Date()
  // 증발한 '추천' 칸은 여기서 걸러낸다 — 화면이 살아 있는지 다시 판단하지 않는다.
  const axes = merged.axes.map(a => {
    const cells = (a.axis === 'IAP' ? [...a.cells, ...extra] : a.cells).filter(c => isCellAlive(c, now))
    return { ...a, cells }
  })

  const byAxis = {} as Record<RoadmapAxis, RoadmapProgress>
  for (const a of axes) byAxis[a.axis] = axisProgress(a)

  return {
    studentId,
    axes,
    origin: merged.origin,
    progress: planProgress(axes),
    byAxis,
    meta: merged.meta,
  }
}

/** 로드맵 이행률(%) — 목록·KPI·브리핑이 전부 이 한 곳을 쓴다. 로드맵이 없으면 0. */
export function getRoadmapProgress(studentId: string): number {
  return getStudentRoadmap(studentId)?.progress.pct ?? 0
}

/** StudentData 로 바로 받는 편의 오버로드 (로스터 병합용) */
export function getRoadmapProgressOf(student: StudentData): number {
  return getRoadmapProgress(student.id)
}
