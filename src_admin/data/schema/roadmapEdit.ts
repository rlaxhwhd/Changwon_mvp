// ─────────────────────────────────────────────────────────────────────────
// 로드맵 수정·확정·버전 스키마 (단일 소스)
//
// 원칙(Counsel_README §7): 학생 base 로드맵 JSON은 그대로 두고,
// 상담사 수정분(override)을 얹어 병합해 렌더한다. 그래야 원본을 안 건드리면서도
// "상담사가 고치면 학생 화면에 반영"이 성립한다.
//
// 편집 대상: 학생 phases 중 3단계(경력개발 로드맵)의 termDetails(단·중·장기).
// override.termDetails 가 있으면 그 term을 통째로 교체(부분 교체), 없으면 base 유지.
// ─────────────────────────────────────────────────────────────────────────

import type { RoadmapPhase, TermDetail, TermLabel } from '../../../src_v2/data/students'

/** 병합 결과에 붙는 term 단위 출처 표시 (미리보기에서 base/override 구분용) */
export type TermOrigin = 'base' | 'override'

/**
 * 상담사가 학생 로드맵 3단계(단·중·장기)에 얹는 수정분(override).
 * 학생 base JSON과 병합해 표시. term 단위 부분 교체.
 */
export interface RoadmapOverride {
  /** 대상 학생 id (StudentData.id) */
  studentId: string
  /** 교체된 term 상세(단·중·장기). 있는 term만 base를 덮어쓴다. 없는 term은 base 유지. */
  termDetails?: Partial<Record<TermLabel, TermDetail>>
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
  /** 변경 요약 메모 (예: "단기 2건 · 중기 1건 편집") */
  note: string
}

/** 병합된 3단계 phase + term별 출처. 편집기/미리보기가 구독한다. */
export interface MergedRoadmap {
  /** 3단계(경력개발 로드맵) phase — termDetails 는 base ⊕ override 병합분 */
  phase: RoadmapPhase
  /** term별 출처(base/override) — 미리보기 배지 표시용 */
  origin: Record<TermLabel, TermOrigin>
  /** override 메타 (없으면 아직 편집 이력 없음) */
  meta: Pick<RoadmapOverride, 'version' | 'updatedAt' | 'updatedBy' | 'confirmed' | 'history'> | null
}
