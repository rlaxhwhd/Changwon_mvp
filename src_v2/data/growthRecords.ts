// ─────────────────────────────────────────────────────────────────────────
// 성장 활동 기록 — 단일소스.
//
// 「내 성장 > 성장 활동 기록」(/v2/growth)이 쓰고 고치고, AI 커리어 라운지
// (/v2/lounge)가 같은 값을 읽어 보여 준다. 두 화면이 각자 목록을 들고 있으면
// 한쪽에서 기록을 더해도 다른 쪽이 모른다 — 그래서 seed 와 저장소 키를 여기 둔다.
//
// 저장은 학생별 localStorage 오버레이다(CLAUDE.md 「런타임 반영 방식」).
// ─────────────────────────────────────────────────────────────────────────

export const GROWTH_RECORDS = [
  { date: '2026.05.21', type: '진단', title: 'C3 역량성장 후속진단 완료', description: '직무 역량 강화가 필요한 핵심 영역을 확인했습니다.', tone: 'violet' },
  { date: '2026.04.22', type: '비교과', title: '데이터 분석 기초 참여', description: 'Python과 Pandas를 활용한 데이터 분석 실습을 진행 중입니다.', tone: 'mint' },
  { date: '2026.04.08', type: '비교과', title: 'AI 활용 자소서 특강 수료', description: '총 3시간의 취업역량 프로그램을 이수했습니다.', tone: 'blue' },
  { date: '2026.03.20', type: '성과', title: '취업역량강화 캠프 수료', description: '24시간 집중 과정의 모든 활동을 완료했습니다.', tone: 'amber' },
]

export type GrowthRecord = (typeof GROWTH_RECORDS)[number]

/** 학생별 저장소 키 — /v2/growth 의 포트폴리오 묶음과 같은 접두사를 쓴다. */
export function growthRecordsKey(studentId: string): string {
  return `dc_growth_portfolio_${studentId}_records`
}

/** 지금 기록 목록 (오버레이가 있으면 그것, 없으면 seed). 읽기 전용 화면용. */
export function getGrowthRecords(studentId: string): GrowthRecord[] {
  try {
    const saved = localStorage.getItem(growthRecordsKey(studentId))
    if (saved) return JSON.parse(saved) as GrowthRecord[]
  } catch {
    /* 저장소 비활성 시 seed 로 */
  }
  return GROWTH_RECORDS
}
