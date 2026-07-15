// ─────────────────────────────────────────────────────────────────────────
// 운영 대시보드(홈) 스키마 (단일 소스)
// 학생포털 운영 현황(학생·진단·상담·비교과·채용·공지)을 한눈에 집계한 화면 모델.
// 화면(Home.tsx)은 이 타입으로 seed JSON을 로더에서 구독한다(하드코딩 금지).
// ─────────────────────────────────────────────────────────────────────────

/** 통계 카드 델타 방향 — 증가(초록) / 감소(빨강). 데모는 전부 up. */
export type StatDelta = 'up' | 'down'

/** 델타 단위 표기 — 퍼센트(전월/전일 대비) 또는 절대 증감(개·건) */
export type StatDeltaUnit = 'percent' | 'count'

/** 상단 통계 카드 1개 */
export interface DashboardStat {
  id: string
  /** 카드 라벨 (예: 전체 학생) */
  label: string
  /** 숫자 값 (표시 포맷은 화면에서 천단위 콤마 처리) */
  value: number
  /** 값 접미 단위 (예: 명 / 건 / 개) */
  unit: string
  /** 증감 수치 (percent면 5.2 → "5.2%", count면 4 → "4개") */
  deltaValue: number
  /** 증감 단위 */
  deltaUnit: StatDeltaUnit
  /** 증감 방향 */
  deltaDir: StatDelta
  /** 증감 기준 문구 (예: 전월 대비 / 전일 대비) */
  deltaLabel: string
  /** Font Awesome 아이콘 클래스 (예: fa-solid fa-user-group) */
  icon: string
  /** 아이콘 배경 톤 — 카드별 소프트 배경 구분 */
  tone: 'primary' | 'info' | 'success' | 'accent'
}

/** 학생 상담 현황 라인 차트 — 기간 토글별 단일 시리즈 */
export type TrafficRange = 'daily' | 'weekly' | 'monthly'

export interface TrafficSeries {
  /** X축 라벨 (예: 6/1주 …) */
  labels: string[]
  /** 학생 상담 건수 추이 (단일 실선, royal-blue) */
  counsels: number[]
}

/** 기간 토글 3종 각각의 시리즈 */
export type TrafficByRange = Record<TrafficRange, TrafficSeries>

/** 진단 참여 도넛 세그먼트 1개 */
export interface DiagnosisSegment {
  /** 진단명 (예: 9CORE 진단) */
  label: string
  /** 참여자 수 */
  value: number
}

/** 진단 참여 현황 (도넛) */
export interface DiagnosisSummary {
  /** 도넛 중앙 총계 */
  total: number
  segments: DiagnosisSegment[]
}

/** 공지 태그 종류 — 색칩 구분 */
export type NoticeTag = '전체' | '채용' | '프로그램' | '시스템'

/** 공지 항목 1개 */
export interface NoticeItem {
  id: string
  tag: NoticeTag
  title: string
  /** 게시일 YYYY.MM.DD */
  date: string
}

/** 대시보드 전체 데이터 모델 (seed JSON 루트) */
export interface DashboardData {
  /** 조회 기간 pill 표기 (예: 2024.06.01 ~ 2024.06.30) */
  period: string
  stats: DashboardStat[]
  traffic: TrafficByRange
  diagnosis: DiagnosisSummary
  notices: NoticeItem[]
}
