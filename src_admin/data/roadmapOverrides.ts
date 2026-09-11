// ─────────────────────────────────────────────────────────────────────────
// 계획 편집 — 정본은 서버다.
//
// 예전에는 상담사 수정분을 dc_roadmap_overrides(축 단위 통째 교체)에 쌓고 base 와
// 병합해 렌더했다. 그 방식에는 세 가지 문제가 있었다.
//   · 축을 통째로 바꾸므로 두 상담사가 같은 축을 고치면 뒤에 저장한 쪽이 조용히 이긴다.
//   · reset 이 수정 이력까지 지웠다.
//   · 프로그램 칸을 UI 로만 잠갔고 서버 제약이 없었다.
// 지금은 칸 단위 op + 낙관적 잠금이고, 되돌리기도 이력을 지우지 않는 새 사건이다.
//
// 이름은 유지하되 로컬 병합은 없다 — 화면은 서버의 현재 계획만 본다.
// ─────────────────────────────────────────────────────────────────────────
import { editPlan, roadmapEnvelope, transitionPlan } from '../../shared/roadmapStore'
import type { EditOperation } from '../../shared/roadmapStore'
import { ROADMAP_AXES } from '../../src_v2/data/schema/roadmap'
import type { RoadmapAxis, RoadmapAxisPlan } from '../../src_v2/data/schema/roadmap'
import type { AxisOrigin, MergedRoadmap } from './schema/roadmapEdit'
import { getStudentRoadmap } from './roadmap'

/** 서버의 현재 계획 3축. 없으면 null. */
export function getBaseRoadmapAxes(studentId: string): RoadmapAxisPlan[] | null {
  return roadmapEnvelope(studentId)?.roadmap?.axes ?? null
}

/**
 * 편집기·미리보기·학생 화면이 같은 결과를 본다. 로컬 오버레이 병합은 없다 —
 * 서버의 현재 계획과 상담사 메모(editorNote)를 그대로 표시한다.
 */
export function getMergedRoadmap(studentId: string): MergedRoadmap | null {
  const plan = getStudentRoadmap(studentId)
  if (!plan) return null
  const axes: RoadmapAxisPlan[] = []
  const origin = {} as Record<RoadmapAxis, AxisOrigin>
  // 표시 순서는 항상 ROADMAP_AXES — 응답 순서에 의존하지 않는다.
  for (const meta of ROADMAP_AXES) {
    const found = plan.axes.find(axis => axis.axis === meta.code)
    if (found) axes.push(found)
    origin[meta.code] = plan.origin[meta.code] ?? 'base'
  }
  return { axes, origin, meta: plan.meta }
}

/**
 * 편집된 축을 서버에 반영한다. 축을 통째로 보내지 않고 **바뀐 것만** op 로 보낸다 —
 * 그래야 다른 상담사가 만진 칸을 조용히 되돌리지 않는다.
 */
export async function saveRoadmapOverride(studentId: string,
                                          axes: Partial<Record<RoadmapAxis, RoadmapAxisPlan>>,
                                          _updatedBy: string, note: string): Promise<void> {
  const current = getStudentRoadmap(studentId)
  if (!current) throw new Error('로드맵을 먼저 불러와야 합니다.')
  const operations: EditOperation[] = []
  for (const meta of ROADMAP_AXES) {
    const next = axes[meta.code]
    if (!next) continue
    const before = current.axes.find(axis => axis.axis === meta.code)
    if (!before) throw new Error('축을 새로 만들 수 없습니다. 재생성을 사용하세요.')
    if (before.headline !== next.headline || (before.editorNote ?? '') !== (next.editorNote ?? '')) {
      operations.push({ op: 'setAxis', axis: meta.code, headline: next.headline,
                        editorNote: next.editorNote ?? '' })
    }
    for (const cell of next.cells) {
      const previous = before.cells.find(item => item.id === cell.id)
      // 새 칸 추가·삭제는 재생성에서만 일어난다. 프로그램 칸은 비교과가 정본이다.
      if (!previous || previous.origin === 'AUTO_PROGRAM') continue
      if (previous.title === cell.title && previous.priority === cell.priority
          && previous.importance === cell.importance
          && (previous.editorNote ?? '') === (cell.editorNote ?? '')) continue
      operations.push({ op: 'editItem', itemId: cell.id, expectedItemVersion: previous.version ?? 1,
                        title: cell.title, priority: cell.priority, importance: cell.importance,
                        editorNote: cell.editorNote ?? '' })
    }
    const order = next.cells.filter(cell => cell.origin !== 'AUTO_PROGRAM').map(cell => cell.id)
    const baseOrder = before.cells.filter(cell => cell.origin !== 'AUTO_PROGRAM').map(cell => cell.id)
    if (order.length === baseOrder.length && order.some((id, index) => id !== baseOrder[index])) {
      operations.push({ op: 'reorderItems', axis: meta.code, itemIds: order })
    }
  }
  await editPlan(studentId, operations, note)
}

/** 확정 — 학생 화면은 이때 열린다(04-decisions Q1). */
export function confirmRoadmap(studentId: string, reason = ''): Promise<void> {
  return transitionPlan(studentId, 'confirm', reason)
}

/** 검토중으로 올린다. */
export function reviewRoadmap(studentId: string, reason = ''): Promise<void> {
  return transitionPlan(studentId, 'review', reason)
}

/**
 * 확정을 풀어 다시 초안으로 돌린다. 예전 resetRoadmapOverride 처럼 수정 이력을 지우지
 * 않는다 — 상태 전이도 사건으로 남는다. 되돌리는 동안 학생의 비교과·취업지원은 잠긴다.
 */
export function resetRoadmapOverride(studentId: string, reason = ''): Promise<void> {
  return transitionPlan(studentId, 'reopen', reason)
}

export type { MergedRoadmap }
