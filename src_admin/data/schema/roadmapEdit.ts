// ─────────────────────────────────────────────────────────────────────────
// 로드맵 수정·확정·버전 스키마 (단일 소스)
//
// 정본은 서버다(dc.roadmap · roadmap_axis · roadmap_item). 예전의 localStorage
// override 레이어는 사라졌다 — 축을 통째로 교체하던 방식은 두 상담사가 같은 축을
// 고칠 때 뒤에 저장한 쪽이 조용히 이겼다.
//
// 수는 둘이다. **generation**(세대)은 재생성마다 오르고, **version**(편집 잠금 토큰)은
// 칸 하나를 고쳐도 오른다. 한 필드에 번갈아 매핑하지 않는다.
//
// 축 정의·칸·이행률은 src_v2/data/schema/roadmap.ts 가 단일 소스다 → PROCESS.md §6
// ─────────────────────────────────────────────────────────────────────────

import type { RoadmapAxis, RoadmapAxisPlan } from '../../../src_v2/data/schema/roadmap'

/** 병합 결과에 붙는 축 단위 출처 표시 (미리보기에서 원안/수정본 구분용) */
export type AxisOrigin = 'base' | 'override'

/** 확정·수정마다 쌓이는 변경 이력 한 건 (서버 roadmap_event 의 표시 projection) */
export interface RoadmapHistoryEntry {
  version: number
  at: string
  by: string
  /** 변경 사유 메모 */
  note: string
}

/** 계획 편집 메타 — 낙관적 잠금 토큰과 이력. */
export interface RoadmapEditMeta {
  /** 편집 잠금 토큰 (세대 번호가 아니다) */
  version: number
  updatedAt: string | null
  updatedBy: string | null
  confirmed: boolean
  history: RoadmapHistoryEntry[]
}

/** 현재 계획 3축 + 축별 출처. 편집기/미리보기/학생 화면이 구독한다. */
export interface MergedRoadmap {
  /** 서버의 현재 세대 3축 (항상 ROADMAP_AXES 순서) */
  axes: RoadmapAxisPlan[]
  /** 축별 출처(원안/상담사 수정) — 미리보기 배지 표시용 */
  origin: Record<RoadmapAxis, AxisOrigin>
  meta: RoadmapEditMeta | null
}
