// ─────────────────────────────────────────────────────────────────────────
// 로드맵 수정·확정·버전 스키마 (단일 소스)
//
// 원칙(Counsel_README §7): 학생 base 로드맵 JSON은 그대로 두고,
// 상담사 수정분(override)을 얹어 병합해 렌더한다. 그래야 원본을 안 건드리면서도
// "상담사가 고치면 학생 화면에 반영"이 성립한다.
//
// 편집 대상: 학생 로드맵의 3축(IAP 실행 · 핵심역량 수행 · 내 성장 활동).
// override.axes 에 있는 축은 통째로 교체(축 단위 부분 교체), 없는 축은 base 유지.
// 축 정의·칸·이행률은 src_v2/data/schema/roadmap.ts 가 단일 소스다 → PROCESS.md §6
// ─────────────────────────────────────────────────────────────────────────

import type { RoadmapAxis, RoadmapAxisPlan } from '../../../src_v2/data/schema/roadmap'

/** 병합 결과에 붙는 축 단위 출처 표시 (미리보기에서 base/override 구분용) */
export type AxisOrigin = 'base' | 'override'

/**
 * 상담사가 학생 로드맵 3축에 얹는 수정분(override).
 * 학생 base JSON과 병합해 표시. 축 단위 부분 교체.
 */
export interface RoadmapOverride {
  /** 대상 학생 id (StudentData.id) */
  studentId: string
  /** 교체된 축. 있는 축만 base를 덮어쓴다. 없는 축은 base 유지. */
  axes?: Partial<Record<RoadmapAxis, RoadmapAxisPlan>>
  /** 버전 번호 (확정할 때마다 증가) */
  version: number
  /** 마지막 수정 일시 (ISO 8601) */
  updatedAt: string
  /** 수정한 상담사 id */
  updatedBy: string
  /** 확정 여부 — 확정 시 학생 화면에 반영 */
  confirmed: boolean
  /** 변경 이력 (버전별 스냅샷 메타) */
  history: RoadmapHistoryEntry[]
}

/** 확정 시마다 쌓이는 변경 이력 한 건 */
export interface RoadmapHistoryEntry {
  version: number
  at: string
  by: string
  /** 변경 요약 메모 (예: "IAP 실행 2칸 · 내 성장 활동 1칸 편집") */
  note: string
}

/** 병합된 로드맵 3축 + 축별 출처. 편집기/미리보기/학생 화면이 구독한다. */
export interface MergedRoadmap {
  /** base ⊕ override 병합된 3축 (항상 ROADMAP_AXES 순서) */
  axes: RoadmapAxisPlan[]
  /** 축별 출처(base/override) — 미리보기 배지 표시용 */
  origin: Record<RoadmapAxis, AxisOrigin>
  /** override 메타 (없으면 아직 편집 이력 없음) */
  meta: Pick<RoadmapOverride, 'version' | 'updatedAt' | 'updatedBy' | 'confirmed' | 'history'> | null
}
