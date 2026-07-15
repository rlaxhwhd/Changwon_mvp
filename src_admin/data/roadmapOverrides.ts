// ─────────────────────────────────────────────────────────────────────────
// 로드맵 override 로더 (localStorage 공유 스토어) — students.ts 패턴 미러
//
// Counsel_README §7: 학생 base 로드맵(students phases 3단계 termDetails)은 불변.
// 상담사 수정분을 dc_roadmap_overrides[studentId] 에 저장하고, base ⊕ override
// 를 병합해 편집기/미리보기/학생 화면이 동일한 결과를 본다.
//
// ★ 원본 students JSON 은 절대 수정하지 않는다. override 레이어만 갱신.
// ─────────────────────────────────────────────────────────────────────────
import { STUDENTS } from '../../src_v2/data/students'
import type { RoadmapPhase, TermDetail, TermLabel } from '../../src_v2/data/students'
import type {
  RoadmapOverride,
  MergedRoadmap,
  TermOrigin,
  RoadmapHistoryEntry,
} from './schema/roadmapEdit'

const STORAGE_KEY = 'dc_roadmap_overrides'

/** 3단계(경력개발 로드맵) — 편집 대상 phase.num */
export const ROADMAP_PHASE_NUM = 3
export const TERM_ORDER: TermLabel[] = ['단기', '중기', '장기']

// ── override 맵 읽기/쓰기 ───────────────────────────────────────────────────

/** localStorage 의 override 맵 전체 읽기. 실패 시 빈 맵. */
function readOverrideMap(): Record<string, RoadmapOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, RoadmapOverride>
    }
  } catch {
    /* 폴백: override 없음 */
  }
  return {}
}

function writeOverrideMap(map: Record<string, RoadmapOverride>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** 특정 학생의 override 1건 (없으면 null) */
export function getRoadmapOverride(studentId: string): RoadmapOverride | null {
  return readOverrideMap()[studentId] ?? null
}

// ── base 로드맵 조회 ────────────────────────────────────────────────────────

/** 학생 base 로드맵의 3단계 phase (원본, override 미반영). 없으면 null. */
export function getBaseRoadmapPhase(studentId: string): RoadmapPhase | null {
  const student = STUDENTS.find(s => s.id === studentId)
  if (!student) return null
  return student.phases.find(p => p.num === ROADMAP_PHASE_NUM) ?? null
}

// ── 병합 (base ⊕ override) ─────────────────────────────────────────────────

/**
 * base phase 의 termDetails 에 override.termDetails 를 term 단위로 얹어 병합.
 * override 에 존재하는 term 은 통째로 교체, 없는 term 은 base 유지.
 * 학생 화면·편집기·미리보기가 모두 이 함수를 통해 동일 결과를 본다.
 */
export function getMergedRoadmap(studentId: string): MergedRoadmap | null {
  const basePhase = getBaseRoadmapPhase(studentId)
  if (!basePhase) return null

  const override = getRoadmapOverride(studentId)
  const baseTerms = basePhase.termDetails ?? {}
  const overrideTerms = override?.termDetails ?? {}

  const mergedTerms: Partial<Record<TermLabel, TermDetail>> = {}
  const origin = {} as Record<TermLabel, TermOrigin>

  for (const label of TERM_ORDER) {
    if (overrideTerms[label]) {
      mergedTerms[label] = overrideTerms[label]
      origin[label] = 'override'
    } else if (baseTerms[label]) {
      mergedTerms[label] = baseTerms[label]
      origin[label] = 'base'
    } else {
      origin[label] = 'base'
    }
  }

  const phase: RoadmapPhase = { ...basePhase, termDetails: mergedTerms }
  const meta = override
    ? {
        version: override.version,
        updatedAt: override.updatedAt,
        updatedBy: override.updatedBy,
        confirmed: override.confirmed,
        history: override.history,
      }
    : null

  return { phase, origin, meta }
}

// ── 저장 (확정) ────────────────────────────────────────────────────────────

/**
 * 편집된 termDetails 를 override 로 저장·확정한다. 원본 students JSON 불변.
 * 버전을 1 올리고 이력 1건을 쌓는다. 확정(confirmed=true) 시 학생 화면에 반영.
 */
export function saveRoadmapOverride(
  studentId: string,
  termDetails: Partial<Record<TermLabel, TermDetail>>,
  updatedBy: string,
  note: string,
): RoadmapOverride {
  const map = readOverrideMap()
  const prev = map[studentId]
  const nextVersion = (prev?.version ?? 0) + 1
  const at = new Date().toISOString()

  const historyEntry: RoadmapHistoryEntry = { version: nextVersion, at, by: updatedBy, note }
  const history: RoadmapHistoryEntry[] = [...(prev?.history ?? []), historyEntry]

  const next: RoadmapOverride = {
    studentId,
    termDetails,
    version: nextVersion,
    updatedAt: at,
    updatedBy,
    confirmed: true,
    history,
  }
  map[studentId] = next
  writeOverrideMap(map)
  return next
}

/**
 * override 를 base 로 되돌린다(초기화). 해당 학생 override 를 제거해 학생 화면이
 * 원본 로드맵을 다시 보게 한다.
 */
export function resetRoadmapOverride(studentId: string): void {
  const map = readOverrideMap()
  if (map[studentId]) {
    delete map[studentId]
    writeOverrideMap(map)
  }
}

export type { RoadmapOverride, MergedRoadmap }
