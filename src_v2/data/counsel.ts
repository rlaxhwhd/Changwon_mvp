// ─────────────────────────────────────────────────────────────────────────
// 상담 유형 축 — 상담 현황 화면의 분포 카드·라벨·색.
// 상담 내역 자체는 여기 없다: 로그인한 학생의 dc.counsel_request 를 부팅 로더가
// shared/counselStore 에 채우고 화면은 getStudentCounselRequests 로 읽는다.
// (예전의 데모 기록 COUNSEL_RECORDS 는 2026-09-11 제거 — 더미를 다시 만들지 않는다)
// ─────────────────────────────────────────────────────────────────────────

// 유형 축은 학생 신청 스키마(students.ts)가 단일 원천 — 여기서 새 열거형을 만들지 않는다.
import type { CounselRequestType } from './students'

/** 상담 유형 키 — 진로취업 · 심리 · 교수 3종. 상담센터 하위 화면과 같은 축이다. */
export type CounselTypeKey = CounselRequestType

// ── 상담 유형별 분포 ──────────────────────────────────────────────────────
// 카드 표시 순서·색은 상담 신청 화면(CareerCounsel · PsychCounsel · ProfessorCounsel)과 맞춘다.
export const COUNSEL_TYPE_ORDER: CounselTypeKey[] = ['진로취업', '심리', '교수']
export const COUNSEL_TYPE_LABEL: Record<CounselTypeKey, string> = {
  진로취업: '진로취업상담',
  심리: '심리상담',
  교수: '교수상담',
}
export const COUNSEL_TYPE_HUE: Record<CounselTypeKey, string> = {
  진로취업: 'blue',
  심리: 'violet',
  교수: 'mint',
}

export interface CounselTypeStat {
  key: CounselTypeKey
  label: string
  hue: string
  count: number
}

/** 유형별 분포 — 화면이 실제로 그리는 그 목록에서 센다(요약과 분포 합계가 어긋나지 않게). */
export function counselTypeDistribution(keys: CounselTypeKey[]): CounselTypeStat[] {
  return COUNSEL_TYPE_ORDER.map(key => ({
    key,
    label: COUNSEL_TYPE_LABEL[key],
    hue: COUNSEL_TYPE_HUE[key],
    count: keys.filter(k => k === key).length,
  }))
}
