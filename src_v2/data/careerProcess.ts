// ─────────────────────────────────────────────────────────────────────────
// 드림캐치 진로취업 진단·로드맵 프로세스 — 단일 소스(Single Source of Truth)
// 근거: setup.xlsx, "2. 모듈별 진단도구 모듈.xlsx"
//
// 흐름: 1 유형진단(M1) → 2 상담·IAP → 3 로드맵(M3) → 4 역량강화(M4·M5)
//       → 5 기업연계/취업지원(M6) → 6 사후관리(M7)
// 원리: 검사가 1차 자동 산출 → 상담사·AI가 확정. 검사는 단계별 분할 실시.
// ─────────────────────────────────────────────────────────────────────────

export type StudentType =
  | '진로미탐색형'
  | '진로설정형'
  | '역량성장형'
  | '취업준비형'
  | '취약관리형'
  | '우수인재형'

export type IapType =
  | 'R1-탐색형'
  | 'R2-설계형'
  | 'R3-성장형'
  | 'R4-취업실전형'
  | 'R5-회복형'
  | 'R6-취업완성형'

export type Track = '표준' | '집중관리' | '가속'

export type TestStatus = 'done' | 'available' | 'locked'

export type DiagnosisCategory =
  | '유형진단'
  | '진로·적성'
  | '역량·직무'
  | '취업·실전'
  | '심리·성향'

export interface DiagnosisModule {
  id: string            // 'M1' ~ 'M7'
  testId: string        // 라우트 파라미터 / 결과 상세 키
  name: string          // 확정 진단도구명
  area: string          // 진단영역
  stageLabel: string    // 배치 단계 라벨
  decides: string       // 이 검사가 "결정"하는 것
  desc: string
  time: string
  questions: string
  category: DiagnosisCategory
  art: string           // 카드 배경 아트 스타일 키(기존 자산 재사용)
  image: string
  requires: string[]    // 선행 모듈 id
  recentAt?: string     // 완료 시각(있으면 done 처리)
}

// 진단 4모듈 (C-2·C-3·C-4·C-CORE) — C-CORE만 결과보기(done), 나머지는 검사시작(available)
// 학년별 선택/공통: 1학년 C-2 / 2·3학년 C-2·C-3 / 4학년 C-3·C-4 / 공통 C-CORE (CLAUDE.md 참조)
export const DIAGNOSIS_MODULES: DiagnosisModule[] = [
  {
    id: 'C2',
    testId: 'c2',
    name: 'C-2 진로설정 진단검사',
    area: '진로학습 · 목표 · 의사결정 · 탐색행동 · 설계수준',
    stageLabel: '진단 · 진로설정',
    decides: '진로 목표 구체성 · 설계 수준 파악',
    desc: '진로 목표의 구체성과 명확성을 진단해 진로 설계의 기준을 만듭니다.',
    time: '약 30분',
    questions: '153문항',
    category: '진로·적성',
    art: 'cares',
    image: '/diagnosis_3.png',
    requires: [],
  },
  {
    id: 'C3',
    testId: 'c3',
    name: 'C-3 역량수준 진단검사',
    area: '진로몰입 · 문제해결 · 대인적합성 · 네트워킹',
    stageLabel: '진단 · 역량수준',
    decides: '역량강화 프로그램 추천',
    desc: '핵심역량 보유 수준을 진단해 역량강화 프로그램과 개인 리포트를 설계합니다.',
    time: '약 25분',
    questions: '94문항',
    category: '역량·직무',
    art: '9core',
    image: '/sprint1.webp',
    requires: [],
  },
  {
    id: 'C4',
    testId: 'c4',
    name: 'C-4 구직역량 진단검사',
    area: '개인브랜딩 · 정보탐색 · 면접역량 · 구직전략',
    stageLabel: '진단 · 구직역량',
    decides: '취업지원 프로그램 선발 · 단계 파악',
    desc: '취업 준비 행동 수준을 진단해 취업지원 단계와 프로그램을 결정합니다.',
    time: '약 25분',
    questions: '98문항',
    category: '취업·실전',
    art: 'job',
    image: '/sprint2.webp',
    requires: [],
  },
  {
    id: 'CCORE',
    testId: 'ccore',
    name: 'C-CORE 핵심진단검사',
    area: '진로명확도 · 역량준비도 · 취업준비도 · 진로동기',
    stageLabel: '진단 · 핵심진단(공통)',
    decides: '학생 6유형 분류',
    desc: '4개 영역을 통합 측정해 학생을 6가지 표준 유형으로 분류하는 핵심 진단입니다.',
    time: '약 15분',
    questions: '39문항',
    category: '유형진단',
    art: 'aptitude',
    image: '/diagnosis_5.png',
    requires: [],
    recentAt: '2026. 05. 14 14:20',
  },
]

// 학년별 응시 대상 검사 — 선택(1개 필수) + 공통 C-CORE(1개 필수).
// 근거: CLAUDE.md §진단검사 명칭·학년 매핑(확정). 진단센터 UI는 아직 4종을 모두 노출하지만
// "누가 무엇을 응시해야 하는가"(응시율·미응시 판정)는 이 표가 단일 소스다.
// ⚠ 학부 기준(1~4학년). 대학원(1~3학년) 정책은 미확정 — CLAUDE.md 미결 3.
export const DIAGNOSIS_BY_GRADE: Record<number, string[]> = {
  1: ['c2', 'ccore'],
  2: ['c2', 'c3', 'ccore'],
  3: ['c2', 'c3', 'ccore'],
  4: ['c3', 'c4', 'ccore'],
}

/** 해당 학년이 응시해야 하는 검사 모듈. 미매핑 학년(대학원 등)은 전 검사를 대상으로 둔다. */
export function getGradeTests(grade: number): DiagnosisModule[] {
  const ids = DIAGNOSIS_BY_GRADE[grade]
  if (!ids) return DIAGNOSIS_MODULES
  return DIAGNOSIS_MODULES.filter(m => ids.includes(m.testId))
}

// 학생 6유형 → IAP 유형 매핑 (학년·트랙 포함)
export interface IapMapping {
  iapType: IapType
  label: string   // 표시용 짧은 라벨 (예: '성장형')
  grade: string
  track: Track
  goal: string
  focus: string
}

export const STUDENT_TYPE_MAP: Record<StudentType, IapMapping> = {
  진로미탐색형: { iapType: 'R1-탐색형',     label: '탐색형',     grade: '1·2학년', track: '표준',     goal: '진로 인식 및 탐색 확대',      focus: '결정보다 탐색 중심, 단기·경험형 활동' },
  진로설정형:   { iapType: 'R2-설계형',     label: '설계형',     grade: '2·3학년', track: '표준',     goal: '목표 직무 구체화, 경력 경로 설계', focus: '직무 선택 + 준비 방향 설정' },
  역량성장형:   { iapType: 'R3-성장형',     label: '성장형',     grade: '3학년',   track: '표준',     goal: '직무 역량 실질 강화, 현장 대응력', focus: '프로젝트·성과 중심' },
  취업준비형:   { iapType: 'R4-취업실전형', label: '취업실전형', grade: '4학년',   track: '표준',     goal: '취업 성공, 채용 경쟁력 확보',    focus: '채용 일정·전략 중심' },
  취약관리형:   { iapType: 'R5-회복형',     label: '회복형',     grade: '전학년',  track: '집중관리', goal: '참여 회복, 이탈 방지',          focus: '관리·회복 중심, 단계 축소 운영' },
  우수인재형:   { iapType: 'R6-취업완성형', label: '취업완성형', grade: '3·4학년', track: '가속',     goal: '성과 극대화, 대학 대표 인재 육성', focus: '고급·차별화 지원, 기업연계·멘토 조기진입' },
}

// 현재 학생 상태(mock) — 모든 화면이 이 하나를 공유한다.
export interface StudentProfile {
  name: string
  major: string
  grade: number
  gpa: string
  language: string
  studentType: StudentType
  typeScores: { 진로명확도: '상' | '중' | '하'; 역량준비도: '상' | '중' | '하'; 취업준비도: '상' | '중' | '하' }
  targetCompany: string
  targetRole: string
}

export const STUDENT_PROFILE: StudentProfile = {
  name: '김채원',
  major: '컴퓨터공학과',
  grade: 3,
  gpa: '4.3',
  language: 'TOEIC 550',
  studentType: '역량성장형',
  typeScores: { 진로명확도: '상', 역량준비도: '중', 취업준비도: '중' },
  targetCompany: '넥슨코리아',
  targetRole: 'IT Project Manager',
}

// 학생 프로필 기준 IAP 매핑 헬퍼
export function getIapMapping(profile: StudentProfile = STUDENT_PROFILE): IapMapping {
  return STUDENT_TYPE_MAP[profile.studentType]
}

// 모듈 진행 상태 산출: 완료시각이 있으면 done, 선행검사가 모두 done이면 available, 아니면 locked
export function getModuleStatus(
  module: DiagnosisModule,
  modules: DiagnosisModule[] = DIAGNOSIS_MODULES,
): TestStatus {
  if (module.recentAt) return 'done'
  const byId = new Map(modules.map(m => [m.id, m]))
  const ready = module.requires.every(reqId => byId.get(reqId)?.recentAt)
  return ready ? 'available' : 'locked'
}

// ─────────────────────────────────────────────────────────────────────────
// AI 맞춤 추천 — 단일 소스
// 현재 학생(김채원·컴퓨터공학과 3학년·역량성장형·R3·목표 넥슨 IT PM, TOEIC 550, SQLD 보유,
// 프로젝트·인턴 0건) 기준. 진단-프로세스 4단계 역량강화 GAP에 맞춰 비교과·외부활동·자격증을
// 일관되게 추천한다. 라운지·비교과 신청·로드맵이 모두 이 데이터를 공유한다.
// ─────────────────────────────────────────────────────────────────────────
export type RecoTag = '필수' | '우대' | '권장' | '보유' | '직무' | '취업' | '어학' | '인턴' | '대외활동' | '포트폴리오'

export interface RecoItem {
  title: string
  reason: string
  tag: RecoTag
}

export interface Recommendations {
  programs: RecoItem[]    // 비교과 프로그램
  activities: RecoItem[]  // 외부활동 · 인턴
  certs: RecoItem[]       // 자격증 · 어학
}

export const RECOMMENDATIONS: Recommendations = {
  programs: [
    { title: '캡스톤디자인 PM 프로젝트', reason: '프로젝트 경험 0건 → 최우선 보강', tag: '직무' },
    { title: '데이터 직무역량 개발 교육', reason: 'IT PM 데이터·Python 실무 역량 강화', tag: '취업' },
    { title: 'AI 활용 자기소개서 특강', reason: '취업지원 단계 대비 자소서 초안 확보', tag: '취업' },
    { title: '글로벌 PBL · 단기 어학연수', reason: 'TOEIC 550 → 700 어학 보강', tag: '어학' },
  ],
  activities: [
    { title: 'IT 서비스 기획 인턴', reason: '인턴 경험 0회 → 서류 경쟁력 확보', tag: '인턴' },
    { title: 'PM · 기획 해커톤 / 공모전', reason: '프로젝트 결과물 + 수상 이력', tag: '대외활동' },
    { title: '사이드 프로젝트 배포 + 회고', reason: '포트폴리오 완성도 (GitHub)', tag: '포트폴리오' },
  ],
  certs: [
    { title: 'TOEIC 700+', reason: '현재 550 → 목표 700 (필수)', tag: '필수' },
    { title: 'PMP 또는 CAPM', reason: 'IT PM 직무 우대 자격', tag: '우대' },
    { title: '정보처리기사', reason: 'IT 직무 기본 자격', tag: '권장' },
    { title: 'SQLD', reason: '보유 중 — 데이터 직무 기반', tag: '보유' },
  ],
}
