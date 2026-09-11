// ─────────────────────────────────────────────────────────────────────────
// 계획의 존재·생성 가능 여부 — 서버가 판정한다.
//
// 예전에는 localStorage(dc_roadmap · dc_roadmap_snapshots)가 생성분과 세대 스냅샷을
// 들고 있었다. 그 저장소는 사라졌다: 현재 계획은 dc.roadmap, 지난 세대는
// dc.roadmap_snapshot 이 갖는다.
//
// ★ 「있다(hasRoadmap)」와 「확정됐다(confirmed)」는 다른 사실이다. 예전 코드는 둘을
//   같은 함수로 답해서, 초안만 있는 학생에게도 다음 단계가 열렸다.
// ─────────────────────────────────────────────────────────────────────────
import { roadmapEnvelope } from '../../shared/roadmapStore'
import type { RoadmapSnapshotRow } from '../../shared/roadmapStore'
import { loadRoadmapSnapshot, loadRoadmapSnapshots } from '../../shared/roadmapStore'

/** 이 학생에게 계획 행이 있는가(초안 포함). 목록의 「생성 vs 이행률」 분기가 쓴다. */
export function hasRoadmap(studentId: string): boolean {
  const envelope = roadmapEnvelope(studentId)
  return Boolean(envelope?.roadmap) || Boolean(envelope?.pending)
}

/** 학생에게 열린 계획인가 — 확정된 것만 열린다(04-decisions Q1). */
export function hasConfirmedRoadmap(studentId: string): boolean {
  return Boolean(roadmapEnvelope(studentId)?.roadmap?.confirmed)
}

/**
 * 생성 가능한가 — 승인된 산출물이 서버에 있어야 한다.
 * 없는 학생은 버튼을 눌러도 만들 값이 없다(실제 AI provider 는 DB.md #38 미결).
 */
export function canGenerateRoadmap(studentId: string): boolean {
  return Boolean(roadmapEnvelope(studentId)?.capabilities.canGenerate)
}

/** 목록에서 「아직 계획이 없어 생성해야 하는 학생」인가. */
export function needsRoadmap(studentId: string): boolean {
  const envelope = roadmapEnvelope(studentId)
  return Boolean(envelope) && !envelope!.roadmap && !envelope!.pending
}

/** 이 학생의 지난 세대들 — 최신순. 완료 칸을 이월하지 않으므로 지난 실적은 여기에만 있다. */
export function getRoadmapSnapshots(studentId: string): Promise<RoadmapSnapshotRow[]> {
  return loadRoadmapSnapshots(studentId).then(page => page.items)
}

export { loadRoadmapSnapshot }
export type { RoadmapSnapshotRow }
