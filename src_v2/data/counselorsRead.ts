// ─────────────────────────────────────────────────────────────────────────
// 상담사 단일소스(src_admin) 읽기 투영 — 학생(src_v2) 상담신청 화면용.
// 여기서 새 상담사 데이터를 만들지 않는다(중복 소스 금지). 원천은
// src_admin/data/counselors(= base JSON + localStorage override 병합)이며,
// 상담사가 프로필을 수정하면 같은 origin의 localStorage를 통해 학생 화면에도 반영된다.
// DB 연동 시 이 파일의 import만 API 조회로 교체하면 된다(cross-SPA는 임시 비계).
// ─────────────────────────────────────────────────────────────────────────
import { COUNSELORS, type CounselorRole } from '../../src_admin/data/counselors'

/** 학생 상담신청 화면 카드가 필요로 하는 최소 형태. */
export interface CounselorCard {
  id: string
  name: string
  title: string
  specialty: string
}

/** 역할(진로취업=career / 심리=psych)별 상담사 카드 목록. specialty 미지정 시 scope로 폴백. */
export function getCounselorCards(role: CounselorRole): CounselorCard[] {
  return COUNSELORS.filter(c => c.role === role).map(c => ({
    id: c.id,
    name: c.name,
    title: '상담사',
    specialty: c.specialty ?? c.scope,
  }))
}

/** 상담사 id → 표시명 (예: '김진로 상담사'). 학생 상담현황 등에서 배정 상담사 표기용. */
export function getCounselorLabel(id: string | undefined): string {
  const c = id ? COUNSELORS.find(x => x.id === id) : undefined
  return c ? `${c.name} 상담사` : '상담사 배정 중'
}
