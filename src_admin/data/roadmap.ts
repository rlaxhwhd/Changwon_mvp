// ─────────────────────────────────────────────────────────────────────────
// 로드맵 읽기 모델 (단일 소스) — PROCESS.md §6
//
// 정본은 서버다. 화면이 보는 로드맵 1개는 `/students/{id}/roadmap` 하나가 만든다.
// 예전에는 여기서 세 조각(학생 JSON base ⊕ localStorage override ⊕ 조회 때 만드는
// 가상 프로그램 칸)을 브라우저가 합쳤다. 그래서
//   · 재생성이 화면의 최종 구성을 스냅샷으로 보존하지 못했고,
//   · 유형이 바뀌면 이미 신청한 프로그램 칸이 조회 즉시 사라졌으며,
//   · 만료 경계가 접속 시간대에 따라 흔들렸다.
// 지금은 그 셋이 전부 서버의 행이고, 이행률도 SQL 이 센다(CLAUDE.md 10조).
//
// 로더 시그니처는 동기를 유지한다(SPEC.md §5) — 화면은 셀렉터만 구독하고,
// 적재는 useRoadmap 훅이 한다.
// ─────────────────────────────────────────────────────────────────────────
import {
  ensureRoadmap,
  generatePlan,
  regeneratePlan,
  roadmapEnvelope,
} from '../../shared/roadmapStore'
import type { RoadmapPlanDTO, RoadmapStatusCode } from '../../shared/roadmapStore'
import { axisProgress } from '../../src_v2/data/schema/roadmap'
import type {
  RoadmapAxis,
  RoadmapAxisPlan,
  RoadmapProgress,
} from '../../src_v2/data/schema/roadmap'
import type { AxisOrigin } from './schema/roadmapEdit'

/** 화면이 구독하는 로드맵 1개 */
export interface StudentRoadmap {
  studentId: string
  /** 서버가 계산한 현재 세대의 축·칸. 만료된 추천 칸은 이미 걸러져 있다. */
  axes: RoadmapAxisPlan[]
  origin: Record<RoadmapAxis, AxisOrigin>
  /** 전체 이행률 (SQL 집계) */
  progress: RoadmapProgress
  /** 축별 이행률 */
  byAxis: Record<RoadmapAxis, RoadmapProgress>
  /** 세대 번호. 재생성마다 오른다. */
  generation: number
  status: RoadmapStatusCode
  confirmed: boolean
  targetRole: string
  meta: {
    /** 편집 잠금 토큰 — 세대와 다른 수다 */
    version: number
    updatedAt: string | null
    updatedBy: string | null
    confirmed: boolean
    history: { version: number; at: string; by: string; note: string }[]
  } | null
}

/** 이 학생의 계획을 서버에서 읽어 둔다. 화면 진입·식별자 변경 때 부른다. */
export function primeRoadmap(studentId: string): void {
  ensureRoadmap(studentId)
}

function toStudentRoadmap(studentId: string, plan: RoadmapPlanDTO,
                          history: StudentRoadmap['meta'] extends null ? never : NonNullable<StudentRoadmap['meta']>['history']): StudentRoadmap {
  const origin = {} as Record<RoadmapAxis, AxisOrigin>
  const byAxis = {} as Record<RoadmapAxis, RoadmapProgress>
  for (const axis of plan.axes) {
    // 사람이 손댄 축만 '수정됨'으로 표시한다 — 서버가 editorNote 로 알려 준다.
    origin[axis.axis] = axis.editorNote || axis.cells.some(c => c.editorNote) ? 'override' : 'base'
    byAxis[axis.axis] = plan.byAxis[axis.axis] ?? axisProgress(axis)
  }
  return {
    studentId,
    axes: plan.axes,
    origin,
    progress: plan.progress,
    byAxis,
    generation: plan.roadmapVersion,
    status: plan.status,
    confirmed: plan.confirmed,
    targetRole: plan.targetRole,
    meta: {
      version: plan.version,
      updatedAt: plan.updatedAt,
      updatedBy: null,
      confirmed: plan.confirmed,
      history,
    },
  }
}

/** 학생 1명의 로드맵. 아직 읽지 않았거나 계획이 없으면 null. */
export function getStudentRoadmap(studentId: string): StudentRoadmap | null {
  const envelope = roadmapEnvelope(studentId)
  if (!envelope?.roadmap) return null
  const history = envelope.events
    .filter(event => ['EDIT', 'CONFIRM', 'REVIEW', 'REOPEN', 'RESTORE_EDIT'].includes(event.action))
    .map(event => ({
      version: event.roadmapVersion,
      at: event.occurredAt,
      by: event.actorName ?? '',
      note: event.reason,
    }))
    .reverse()
  return toStudentRoadmap(studentId, envelope.roadmap, history)
}

/**
 * 로드맵 생성·재생성 (PROCESS.md §6-6·§6-7). **상담사만 부른다 — 학생은 못 한다.**
 *
 * 재생성은 서버가 한 트랜잭션으로 처리한다: 지금 구성을 스냅샷으로 얼리고, 15칸을 새로
 * 만들고, 아무것도 이월하지 않는다. 어느 단계가 실패해도 전부 되돌린다.
 * 15칸의 내용은 승인된 산출물(provider)에서 오고, 없으면 503 이다(CLAUDE.md 14조).
 */
export async function generateRoadmap(studentId: string, counselRequestId: string,
                                      targetRole?: string, reason = ''): Promise<void> {
  const current = roadmapEnvelope(studentId)?.roadmap
  if (current) await regeneratePlan(studentId, counselRequestId, reason, targetRole)
  else await generatePlan(studentId, counselRequestId, targetRole)
}

/** 로드맵 이행률(%) — 목록·KPI·브리핑이 전부 이 한 곳을 쓴다. 로드맵이 없으면 0. */
export function getRoadmapProgress(studentId: string): number {
  return roadmapEnvelope(studentId)?.roadmap?.progress.pct ?? 0
}

/** StudentData 로 바로 받는 편의 오버로드 (로스터 병합용) */
export function getRoadmapProgressOf(student: { id: string; progress?: number }): number {
  const envelope = roadmapEnvelope(student.id)
  // 아직 읽지 않은 학생은 목록 응답이 실어 온 서버 집계를 쓴다 — 브라우저가 다시 세지 않는다.
  return envelope?.roadmap ? envelope.roadmap.progress.pct : (student.progress ?? 0)
}
