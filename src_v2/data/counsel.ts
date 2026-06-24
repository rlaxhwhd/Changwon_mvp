// ─────────────────────────────────────────────────────────────────────────
// 상담 데이터 단일 소스 (프로토타입용)
// 메인 · 상담현황(마이페이지) · AI 커리어 라운지가 모두 이 데이터를 참조해
// 화면 간 상담 건수/최근일/내역이 일관되게 표시되도록 한다.
// (백엔드 연동 시 이 모듈만 API 응답으로 교체)
// ─────────────────────────────────────────────────────────────────────────

export type CounselTone = 'done' | 'scheduled'
export type CounselColor = 'blue' | 'pink' | 'orange' | 'green'

export interface CounselRecord {
  type: '진로상담' | '심리상담' | '교수상담' | '취업상담'
  typeColor: string
  counselor: string
  date: string // YYYY-MM-DD
  time: string
  status: string
  statusTone: CounselTone
  color: CounselColor
  description: string
  tags: string[]
  question: string
  aiAdvice: string
}

// 최신순 정렬
export const COUNSEL_RECORDS: CounselRecord[] = [
  {
    type: '진로상담',
    typeColor: '#F59E0B',
    counselor: '김진로 상담사',
    date: '2026-04-10',
    time: '14:00',
    status: '예약확정',
    statusTone: 'scheduled',
    color: 'blue',
    description: '목표 직무 변화 점검 및 향후 6개월 로드맵 설정 예정.',
    tags: ['진로 설정', '목표 직무', '6개월 로드맵'],
    question: '"목표 직무를 좁혔는데 앞으로 6개월을 어떤 순서로 준비해야 할지 점검받고 싶어요."',
    aiAdvice: '강점 영역에 부합하는 방향이라 큰 수정은 필요 없습니다. ① 직무 연계 프로젝트 1건 ② 핵심 자격/어학 ③ 직무 자소서 초안 순서로 6개월 로드맵을 잡는 것을 권장드려요.',
  },
  {
    type: '심리상담',
    typeColor: '#8B5CF6',
    counselor: '박심리 상담사',
    date: '2026-04-03',
    time: '10:00',
    status: '완료',
    statusTone: 'done',
    color: 'pink',
    description: '학업 스트레스 관리 및 시간 관리 전략 수립.',
    tags: ['스트레스 관리', '시간 관리', '번아웃 예방'],
    question: '"할 일은 많은데 집중이 안 되고 자주 번아웃이 와요."',
    aiAdvice: '완벽주의 성향이 번아웃을 키울 수 있어요. 하루 10분 마음챙김과 주 3회 가벼운 운동, 그리고 우선순위 3개만 정하는 루틴으로 부담을 줄여보시길 권합니다.',
  },
  {
    type: '교수상담',
    typeColor: '#10B981',
    counselor: '이교수 (지도교수)',
    date: '2026-03-25',
    time: '15:00',
    status: '완료',
    statusTone: 'done',
    color: 'orange',
    description: '전공 심화 로드맵 및 진로 방향 논의.',
    tags: ['전공 심화', '리더십', '진로 방향'],
    question: '"전공 심화와 취업 준비 중 무엇에 더 비중을 둬야 할지 고민입니다."',
    aiAdvice: '전공 이해도와 리더십 잠재력이 높게 평가됩니다. 팀 프로젝트에서 리더 역할을 한 번 맡아 성과를 만들면 전공 심화와 취업 준비를 동시에 챙길 수 있습니다.',
  },
  {
    type: '취업상담',
    typeColor: '#F59E0B',
    counselor: '최취업 상담사',
    date: '2026-03-15',
    time: '11:00',
    status: '완료',
    statusTone: 'done',
    color: 'green',
    description: '목표 기업 분석 및 자소서 첨삭.',
    tags: ['기업 분석', '자소서 첨삭', '모의면접'],
    question: '"목표 기업 자소서를 어떻게 차별화해야 할지 막막해요."',
    aiAdvice: '기업별 인재상 키워드를 먼저 정리한 뒤, 본인 경험을 그 키워드에 매핑하면 차별화가 쉬워집니다. 수치화된 성과 한 줄을 각 문항 앞에 배치해 보세요.',
  },
  {
    type: '심리상담',
    typeColor: '#8B5CF6',
    counselor: '박심리 상담사',
    date: '2026-03-05',
    time: '10:00',
    status: '완료',
    statusTone: 'done',
    color: 'pink',
    description: '대인관계 및 팀 프로젝트 갈등 상황 상담.',
    tags: ['대인관계', '팀 협업', '리더십'],
    question: '"팀 프로젝트에서 의견 충돌이 생기면 위축되는 편이에요."',
    aiAdvice: '대인관계 감수성이 장점으로 나타납니다. 충돌 상황에서 \'먼저 요약하고 질문하기\' 기법을 쓰면 위축 없이 주도성을 발휘하는 연습이 됩니다.',
  },
]

export const COUNSEL_TOTAL = COUNSEL_RECORDS.length
export const COUNSEL_DONE = COUNSEL_RECORDS.filter(r => r.statusTone === 'done').length
export const COUNSEL_SCHEDULED = COUNSEL_TOTAL - COUNSEL_DONE
// "최근 상담일" = 가장 최근에 받은(완료된) 상담 일자
export const COUNSEL_RECENT_DATE = COUNSEL_RECORDS.find(r => r.statusTone === 'done')?.date ?? COUNSEL_RECORDS[0].date

// 완료된 상담만(라운지 "최근 상담 내역"용)
export const COUNSEL_DONE_RECORDS = COUNSEL_RECORDS.filter(r => r.statusTone === 'done')

// 상담 유형별 분포
export const COUNSEL_TYPE_STATS: { label: string; count: string; color: CounselColor }[] = [
  { label: '진로상담', color: 'blue', count: `${COUNSEL_RECORDS.filter(r => r.type === '진로상담').length}건` },
  { label: '심리상담', color: 'pink', count: `${COUNSEL_RECORDS.filter(r => r.type === '심리상담').length}건` },
  { label: '교수상담', color: 'orange', count: `${COUNSEL_RECORDS.filter(r => r.type === '교수상담').length}건` },
  { label: '취업상담', color: 'green', count: `${COUNSEL_RECORDS.filter(r => r.type === '취업상담').length}건` },
]

// "YYYY.MM.DD · 상담사명" 포맷 (라운지 표기용)
export function counselDateLabel(r: CounselRecord): string {
  return `${r.date.replace(/-/g, '.')} · ${r.counselor}`
}
