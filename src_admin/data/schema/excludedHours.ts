/**
 * ---------------------------------------------------------------------------
 * 단일소스: 반복 제한 상담시간 스키마 → TB_CARR_CNSL_EXCL_HR.
 * DB 전환 시 스키마 매핑만 교체한다. 가용시간 모델로 바꾸지 말 것.
 * ---------------------------------------------------------------------------
 */
import type { AvailabilitySlot } from './availability'

export interface ExcludedConfig {
  /** BASICSETTING 연계 owner 식별자. */
  ownerId: string
  /** 제한된 요일 반복 시간; 빈 배열은 모든 시간이 가능함을 뜻한다.
   * 이관 시 운영 그리드에서 제한 시간을 전개해 뺀 결과를 BASICSETTING 가능 슬롯으로 변환한다.
   * 제한 시간과 가능 슬롯은 1:1 매핑이 아니다. */
  slots: AvailabilitySlot[]
}
