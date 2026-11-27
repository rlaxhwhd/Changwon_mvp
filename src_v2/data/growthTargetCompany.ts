// ─────────────────────────────────────────────────────────────────────────
// 「내 성장」 목표 기업 — 어느 값을 보일지 한 곳에서만 정한다(0027).
//
// ROADMAP: 확정 로드맵의 target_company 가 객체이고 name 이 공백 아닌 문자열일 때만이다.
//   상담사가 희망 기업을 비우면 생성 모델의 요약 문자열(「미정」 등)이 jsonb 문자열로 저장되는데,
//   그건 「정한 기업」이 아니다 — 학생 입력 경로를 연다(U1). students.py 가 문자열 모양을 그대로
//   내려보내므로 타입(TargetCompany)과 달리 런타임 모양을 직접 검사한다.
// SELF: 그 외에 학생이 직접 적은 값(growth_profile.target_company)이 있으면.
// 둘 다 있으면 로드맵이 이긴다. 학생 값은 지우지 않고 화면에서만 숨긴다.
// ─────────────────────────────────────────────────────────────────────────
import type { GrowthProfile } from '../../shared/growthStore'
import { targetCompanyField } from './students'

export interface GrowthTargetCompany {
  name: string
  source: 'ROADMAP' | 'SELF'
}

export function growthTargetCompany(student: { targetCompany?: unknown },
                                    profile: Pick<GrowthProfile, 'targetCompany'> | null | undefined): GrowthTargetCompany | null {
  const roadmap = targetCompanyField(student.targetCompany, 'name')
  if (roadmap) return { name: roadmap, source: 'ROADMAP' }
  const self = profile?.targetCompany
  return self ? { name: self, source: 'SELF' } : null
}
