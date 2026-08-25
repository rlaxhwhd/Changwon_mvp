// ─────────────────────────────────────────────────────────────────────────
// 드림캐치 진단·상담·로드맵 프로세스 — 단일 소스(Single Source of Truth)
//
// 정본 문서: PROCESS.md (프로세스 전체) · SPEC.md §7-10 (코드 체계)
//
// 흐름(불변):  진단 → 상담 → 로드맵 생성 → 역량강화 → 취업지원
//   · 진단  = CCORE(필수) → 6유형 산출 → 유형별 후속진단 Cn 1종
//   · 상담  = 유형별 4주제(A01~A24)로 상담하며 유형 최종 확정
//   · 로드맵 = 상담과 동시에 1개 생성. 3축(진단·상담 / 수강·학과 / 외부스펙)
//
// ⚠️ 검사 문항·판정식은 미확정이다(PROCESS.md §9).
//    유형은 "주입받는 값"으로 다루고 이 파일에 판정 로직을 만들지 않는다.
// ⚠️ 폐기됨 — IAP 유형 R1~R6 · 학년기반 진단배정(DIAGNOSIS_BY_GRADE/getGradeTests)
//    · 운영 트랙(표준/집중관리/가속). 되살리지 말 것.
// ─────────────────────────────────────────────────────────────────────────

/** 진단 6유형. 화면·JSON에는 이 코드만 쓰고 한글은 label로 표시한다. */
export type StudentType = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'

/** 3계층 — 비교과 신청 범위를 가른다. studentType에서 파생되며 별도 저장하지 않는다. */
export type Tier = 'LOW' | 'MID' | 'HIGH'

/** 진단 코드 — CCORE(필수) + 유형별 후속진단 C1~C6 */
export type DiagnosisTestId = 'CCORE' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'

/** 비교과 신청 범위 (PROCESS.md §7) */
export type ProgramScope = 'ALL' | 'CAREER_ONLY' | 'PENDING'

export type TestStatus = 'done' | 'available' | 'locked'

export type DiagnosisCategory = '핵심진단' | '진로·적성' | '역량·직무' | '취업·실전' | '집중관리'

export const TIER_LABEL: Record<Tier, string> = {
  LOW: '하위',
  MID: '중간',
  HIGH: '상위',
}

export const PROGRAM_SCOPE_LABEL: Record<ProgramScope, string> = {
  ALL: '전체 비교과',
  CAREER_ONLY: '진로탐색·진로설정 한정',
  PENDING: '범위 확정 전',
}

// ── 6유형 ────────────────────────────────────────────────────────────────

export interface StudentTypeMeta {
  code: StudentType
  /** 표시명 — '역량성장형' */
  label: string
  tier: Tier
  /** 계층 표시명 — '상위' */
  tierLabel: string
  /** 이 유형이 상담 전에 봐야 하는 후속진단 1종 */
  followUpTest: DiagnosisTestId
  /** 이 유형의 상담 4주제 코드 */
  topicCodes: string[]
  /** 신청 가능한 비교과 범위 */
  programScope: ProgramScope
  goal: string
  focus: string
}

export const STUDENT_TYPE_MAP: Record<StudentType, StudentTypeMeta> = {
  T1: {
    code: 'T1', label: '진로탐색형', tier: 'MID', tierLabel: TIER_LABEL.MID,
    followUpTest: 'C1', topicCodes: ['A01', 'A02', 'A03', 'A04'], programScope: 'CAREER_ONLY',
    goal: '진로 인식 및 탐색 확대',
    focus: '결정보다 탐색 중심, 단기·경험형 활동',
  },
  T2: {
    code: 'T2', label: '진로설정형', tier: 'MID', tierLabel: TIER_LABEL.MID,
    followUpTest: 'C2', topicCodes: ['A05', 'A06', 'A07', 'A08'], programScope: 'CAREER_ONLY',
    goal: '목표 직무 구체화, 경력 경로 설계',
    focus: '직무 선택 + 준비 방향 설정',
  },
  T3: {
    code: 'T3', label: '역량성장형', tier: 'HIGH', tierLabel: TIER_LABEL.HIGH,
    followUpTest: 'C3', topicCodes: ['A09', 'A10', 'A11', 'A12'], programScope: 'ALL',
    goal: '직무 역량 실질 강화, 현장 대응력',
    focus: '프로젝트·성과 중심',
  },
  T4: {
    code: 'T4', label: '취업준비형', tier: 'HIGH', tierLabel: TIER_LABEL.HIGH,
    followUpTest: 'C4', topicCodes: ['A13', 'A14', 'A15', 'A16'], programScope: 'ALL',
    goal: '취업 성공, 채용 경쟁력 확보',
    focus: '채용 일정·전략 중심',
  },
  T5: {
    code: 'T5', label: '취약관리형', tier: 'LOW', tierLabel: TIER_LABEL.LOW,
    followUpTest: 'C5', topicCodes: ['A17', 'A18', 'A19', 'A20'], programScope: 'PENDING',
    goal: '참여 회복, 이탈 방지',
    focus: '관리·회복 중심, 단계 축소 운영',
  },
  T6: {
    code: 'T6', label: '우수인재형', tier: 'HIGH', tierLabel: TIER_LABEL.HIGH,
    followUpTest: 'C6', topicCodes: ['A21', 'A22', 'A23', 'A24'], programScope: 'ALL',
    goal: '성과 극대화, 대학 대표 인재 육성',
    focus: '고급·차별화 지원, 기업연계·멘토 조기진입',
  },
}

/** 표시 순서(T1~T6) 배열. 목록·필터는 이걸 쓴다. */
export const STUDENT_TYPES: StudentTypeMeta[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map(
  code => STUDENT_TYPE_MAP[code as StudentType],
)

/** 유형 코드 → 표시명. 화면에서 한글 리터럴을 쓰지 말고 이걸 쓴다. */
export function typeLabel(code: StudentType): string {
  return STUDENT_TYPE_MAP[code]?.label ?? code
}

/** 유형 코드 → 계층 */
export function tierOf(code: StudentType): Tier {
  return STUDENT_TYPE_MAP[code].tier
}

/** 이 유형이 해당 카테고리의 비교과를 신청할 수 있는가.
 *  PENDING(취약관리형)은 범위 미확정이라 잠금으로 다룬다 — PROCESS.md §9 */
export function canApplyProgram(code: StudentType, programScope: 'CAREER' | 'OTHER'): boolean {
  const scope = STUDENT_TYPE_MAP[code].programScope
  if (scope === 'ALL') return true
  if (scope === 'CAREER_ONLY') return programScope === 'CAREER'
  return false
}

// ── 상담 24주제 (A01~A24) ────────────────────────────────────────────────

export interface CounselTopic {
  code: string
  label: string
  goal: string
  type: StudentType
}

export const COUNSEL_TOPICS: CounselTopic[] = [
  { code: 'A01', type: 'T1', label: '자기이해 및 흥미 탐색', goal: '성격·흥미·가치관 이해로 진로 방향 인식' },
  { code: 'A02', type: 'T1', label: '강점 및 역량 탐색', goal: '보유 강점을 언어화해 진로 대안 근거 확보' },
  { code: 'A03', type: 'T1', label: '전공기반 진출분야 분석', goal: '전공과 산업·직무의 연결 구조 이해' },
  { code: 'A04', type: 'T1', label: '진로분야 직업군 탐색', goal: '관심 직업군을 3개 내외로 압축' },
  { code: 'A05', type: 'T2', label: '진로의사결정', goal: '복수 대안 중 목표 진로 확정' },
  { code: 'A06', type: 'T2', label: '목표 직무 구체화', goal: '목표 직무를 채용공고 수준으로 구체화' },
  { code: 'A07', type: 'T2', label: '직무기초역량 진단·설계', goal: '목표 직무 대비 역량 갭 산출' },
  { code: 'A08', type: 'T2', label: '경력개발 로드맵 설계', goal: '단기·중기·장기 실행계획 수립' },
  { code: 'A09', type: 'T3', label: '실무 프로젝트 설계·수행', goal: '직무 역량을 산출물로 증명' },
  { code: 'A10', type: 'T3', label: '직무 실습·현장경험 설계', goal: '현장실습·일경험 참여 설계' },
  { code: 'A11', type: 'T3', label: '전공심화·자격취득 설계', goal: '목표 직무 요구 자격·교육 이수 계획' },
  { code: 'A12', type: 'T3', label: '멘토링 매칭·활용', goal: '현직자 멘토로 직무 현실 검증' },
  { code: 'A13', type: 'T4', label: '입사지원서 클리닉', goal: '이력서·자기소개서 완성도 제고' },
  { code: 'A14', type: 'T4', label: '포트폴리오·직무 증빙 구성', goal: '역량을 증빙 자료로 구조화' },
  { code: 'A15', type: 'T4', label: '모의면접·실전 코칭', goal: '면접 대응력 향상' },
  { code: 'A16', type: 'T4', label: '채용정보 탐색·지원전략', goal: '지원 기업군과 전형 일정 관리' },
  { code: 'A17', type: 'T5', label: '1:1 집중상담(진로 동기 회복)', goal: '참여 동기 회복, 상담 관계 형성' },
  { code: 'A18', type: 'T5', label: '학업·진로 병행 점검', goal: '학사 일정과 진로 준비 병행 조정' },
  { code: 'A19', type: 'T5', label: '소그룹 진로코칭', goal: '또래 집단으로 참여 지속' },
  { code: 'A20', type: 'T5', label: '이탈 방지 사후 점검', goal: '미참여·중도이탈 학생 재연결' },
  { code: 'A21', type: 'T6', label: '핵심기업 연계·매칭', goal: '우수기업 매칭 및 사전 준비 점검' },
  { code: 'A22', type: 'T6', label: '인턴십 설계·수행', goal: '인턴십 참여 및 성과 관리' },
  { code: 'A23', type: 'T6', label: '채용연계 전형 대비', goal: '공채·수시 전형 단계별 대비' },
  { code: 'A24', type: 'T6', label: '리더십·퍼스널 브랜딩', goal: '성과를 브랜딩하고 확산' },
]

const TOPIC_BY_CODE = new Map(COUNSEL_TOPICS.map(t => [t.code, t]))

/** 유형별 상담 4주제 */
export function getTopicsForType(type: StudentType): CounselTopic[] {
  return COUNSEL_TOPICS.filter(t => t.type === type)
}

export function topicLabel(code: string): string {
  return TOPIC_BY_CODE.get(code)?.label ?? code
}

// ── 진단 모듈 (CCORE + C1~C6) ────────────────────────────────────────────

export interface DiagnosisModule {
  /** 진단 코드 */
  id: DiagnosisTestId
  /** 라우트 파라미터 / 결과 상세 키 (소문자) */
  testId: string
  name: string
  /** 진단영역 */
  area: string
  stageLabel: string
  /** 이 검사가 "결정"하는 것 */
  decides: string
  desc: string
  time: string
  questions: string
  category: DiagnosisCategory
  /** 카드 배경 아트 스타일 키 */
  art: string
  image: string
  /** 선행 모듈 id */
  requires: DiagnosisTestId[]
  /** 이 후속진단이 대응하는 유형 (CCORE은 없음) */
  forType?: StudentType
  /** 완료 시각(있으면 done 처리) */
  recentAt?: string
}

// ⚠️ 문항수·소요시간은 검사식 확정 전까지 '미정'으로 둔다. 임의로 채우지 말 것.
export const DIAGNOSIS_MODULES: DiagnosisModule[] = [
  {
    id: 'CCORE',
    testId: 'ccore',
    name: 'C-CORE 핵심진단검사',
    area: '진로명확도 · 역량준비도 · 취업준비도 · 진로동기',
    stageLabel: '진단 · 핵심진단(필수)',
    decides: '학생 6유형 분류 — 이후 모든 단계의 관문',
    desc: '4개 영역을 통합 측정해 학생을 6가지 표준 유형으로 분류하는 필수 진단입니다.',
    time: '약 15분',
    questions: '39문항',
    category: '핵심진단',
    art: 'aptitude',
    image: '/diagnosis_5.png',
    requires: [],
    recentAt: '2026. 05. 14 14:20',
  },
  {
    id: 'C1',
    testId: 'c1',
    name: 'C-1 진로탐색 진단검사',
    area: '자기이해 · 흥미 · 가치관 · 탐색행동',
    stageLabel: '후속진단 · 진로탐색형',
    decides: '탐색 상담 4주제(A01~A04) 준비 자료',
    desc: '흥미·가치관과 탐색 행동 수준을 진단해 진로 방향 인식 상담의 근거를 만듭니다.',
    time: '미정',
    questions: '문항 확정 전',
    category: '진로·적성',
    art: 'cares',
    image: '/diagnosis_1.png',
    requires: ['CCORE'],
    forType: 'T1',
  },
  {
    id: 'C2',
    testId: 'c2',
    name: 'C-2 진로설정 진단검사',
    area: '진로학습 · 목표 · 의사결정 · 탐색행동 · 설계수준',
    stageLabel: '후속진단 · 진로설정형',
    decides: '진로 목표 구체성 · 설계 수준 파악',
    desc: '진로 목표의 구체성과 명확성을 진단해 진로 설계의 기준을 만듭니다.',
    time: '약 30분',
    questions: '153문항',
    category: '진로·적성',
    art: 'cares',
    image: '/diagnosis_3.png',
    requires: ['CCORE'],
    forType: 'T2',
  },
  {
    id: 'C3',
    testId: 'c3',
    name: 'C-3 역량수준 진단검사',
    area: '진로몰입 · 문제해결 · 대인적합성 · 네트워킹',
    stageLabel: '후속진단 · 역량성장형',
    decides: '역량강화 프로그램 추천',
    desc: '핵심역량 보유 수준을 진단해 역량강화 프로그램과 개인 리포트를 설계합니다.',
    time: '약 25분',
    questions: '94문항',
    category: '역량·직무',
    art: '9core',
    image: '/sprint1.webp',
    requires: ['CCORE'],
    forType: 'T3',
  },
  {
    id: 'C4',
    testId: 'c4',
    name: 'C-4 구직역량 진단검사',
    area: '개인브랜딩 · 정보탐색 · 면접역량 · 구직전략',
    stageLabel: '후속진단 · 취업준비형',
    decides: '취업지원 프로그램 선발 · 단계 파악',
    desc: '취업 준비 행동 수준을 진단해 취업지원 단계와 프로그램을 결정합니다.',
    time: '약 25분',
    questions: '98문항',
    category: '취업·실전',
    art: 'job',
    image: '/sprint2.webp',
    requires: ['CCORE'],
    forType: 'T4',
  },
  {
    id: 'C5',
    testId: 'c5',
    name: 'C-5 취약요인 진단검사',
    area: '참여동기 · 학업병행 · 지원요구 · 이탈위험',
    stageLabel: '후속진단 · 취약관리형',
    decides: '집중관리 상담 4주제(A17~A20) 설계',
    desc: '참여 동기와 이탈 위험 요인을 진단해 집중관리 상담의 우선순위를 정합니다.',
    time: '미정',
    questions: '문항 확정 전',
    category: '집중관리',
    art: 'psychology',
    image: '/diagnosis_2.png',
    requires: ['CCORE'],
    forType: 'T5',
  },
  {
    id: 'C6',
    testId: 'c6',
    name: 'C-6 우수인재 진단검사',
    area: '성과관리 · 리더십 · 기업적합도 · 브랜딩',
    stageLabel: '후속진단 · 우수인재형',
    decides: '기업연계·인턴십 매칭 자료',
    desc: '성과 관리와 리더십 수준을 진단해 기업연계·인턴십 매칭 근거를 만듭니다.',
    time: '미정',
    questions: '문항 확정 전',
    category: '취업·실전',
    art: 'job',
    image: '/diagnosis_4.png',
    requires: ['CCORE'],
    forType: 'T6',
  },
]

const MODULE_BY_ID = new Map(DIAGNOSIS_MODULES.map(m => [m.id, m]))
const MODULE_BY_TEST_ID = new Map(DIAGNOSIS_MODULES.map(m => [m.testId, m]))

export function getModule(id: DiagnosisTestId): DiagnosisModule | undefined {
  return MODULE_BY_ID.get(id)
}

export function getModuleByTestId(testId: string): DiagnosisModule | undefined {
  return MODULE_BY_TEST_ID.get(testId)
}

/** 이 학생이 응시해야 하는 검사 = CCORE(필수) + 유형별 후속진단 1종.
 *  유형이 아직 없으면(=CCORE 미응시) CCORE 하나뿐이다.
 *  학년으로 배정하지 않는다 — 진단 대상은 CCORE 결과 유형이 정한다. */
export function getRequiredTests(type?: StudentType | null): DiagnosisModule[] {
  const core = MODULE_BY_ID.get('CCORE')!
  if (!type) return [core]
  const followUp = MODULE_BY_ID.get(STUDENT_TYPE_MAP[type].followUpTest)
  return followUp ? [core, followUp] : [core]
}

/** 모듈 진행 상태: 완료시각이 있으면 done, 선행검사가 모두 done이면 available, 아니면 locked */
export function getModuleStatus(
  module: DiagnosisModule,
  modules: DiagnosisModule[] = DIAGNOSIS_MODULES,
): TestStatus {
  if (module.recentAt) return 'done'
  const byId = new Map(modules.map(m => [m.id, m]))
  const ready = module.requires.every(reqId => byId.get(reqId)?.recentAt)
  return ready ? 'available' : 'locked'
}

// ── 순차 게이팅 (PROCESS.md §2) ──────────────────────────────────────────

export type Stage = 'diagnosis' | 'counsel' | 'roadmap' | 'growth' | 'employment'

export const STAGE_ORDER: Stage[] = ['diagnosis', 'counsel', 'roadmap', 'growth', 'employment']

export const STAGE_LABEL: Record<Stage, string> = {
  diagnosis: '진단',
  counsel: '상담',
  roadmap: '로드맵 생성',
  growth: '역량강화',
  employment: '취업지원',
}

/** 게이트 판정에 필요한 최소 상태. 화면이 아니라 데이터층에서 채운다. */
export interface PipelineState {
  /** CCORE 완료 여부 */
  diagnosisDone: boolean
  /** 상담 완료 여부 */
  counselDone: boolean
  /** 로드맵 확정 여부 */
  roadmapConfirmed: boolean
}

/** 순차 게이팅 단일 판정. 화면마다 조건을 다시 쓰지 않는다. */
export function getStageAccess(state: PipelineState): Record<Stage, 'open' | 'locked'> {
  const { diagnosisDone, counselDone, roadmapConfirmed } = state
  return {
    diagnosis: 'open',
    counsel: diagnosisDone ? 'open' : 'locked',
    roadmap: diagnosisDone && counselDone ? 'open' : 'locked',
    growth: diagnosisDone && counselDone && roadmapConfirmed ? 'open' : 'locked',
    employment: diagnosisDone && counselDone && roadmapConfirmed ? 'open' : 'locked',
  }
}

export interface StageGuide {
  message: string
  ctaLabel: string
  ctaPath: string
}

/** 잠긴 단계에 보여줄 안내 + 다음 행동. 빈 화면을 주지 않기 위한 단일 소스. */
export function getStageGuide(stage: Stage, state: PipelineState): StageGuide | null {
  if (getStageAccess(state)[stage] === 'open') return null
  if (!state.diagnosisDone) {
    return {
      message: '먼저 C-CORE 핵심진단을 완료하세요. 진단 결과 유형이 정해져야 다음 단계가 열립니다.',
      ctaLabel: '진단센터로 이동',
      ctaPath: '/diagnosis/employment',
    }
  }
  if (!state.counselDone) {
    return {
      message: '상담을 완료하면 유형이 최종 확정되고 로드맵을 생성할 수 있습니다.',
      ctaLabel: '상담 신청하기',
      ctaPath: '/counsel/career',
    }
  }
  return {
    message: '상담에서 생성된 로드맵이 확정되면 역량강화·취업지원 단계가 열립니다.',
    ctaLabel: '로드맵 확인',
    ctaPath: '/roadmap/ai',
  }
}

// ── 유형 승급 (PROCESS.md §8) ────────────────────────────────────────────

/** 승급 사다리. 취약관리형(T5)은 이 사다리에서 제외된다. */
export const TYPE_LADDER: StudentType[] = ['T1', 'T2', 'T3', 'T4', 'T6']

/** 승급 가능 여부 — 상승 방향 + 한 번에 최대 2단계.
 *  ⚠️ 강등은 구현하지 않는다(기준 미확정, PROCESS.md §8). */
export function canPromote(from: StudentType, to: StudentType): boolean {
  const a = TYPE_LADDER.indexOf(from)
  const b = TYPE_LADDER.indexOf(to)
  if (a < 0 || b < 0) return false
  const step = b - a
  return step >= 1 && step <= 2
}

/** 승급 후보 유형 목록 (최대 2단계 위까지) */
export function getPromotionTargets(from: StudentType): StudentType[] {
  return TYPE_LADDER.filter(t => canPromote(from, t))
}

// ── 현재 학생 상태(mock) ─────────────────────────────────────────────────

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
  studentType: 'T3',
  typeScores: { 진로명확도: '상', 역량준비도: '중', 취업준비도: '중' },
  targetCompany: '넥슨코리아',
  targetRole: 'IT Project Manager',
}

/** 학생 프로필 → 유형 메타 */
export function getTypeMeta(profile: StudentProfile = STUDENT_PROFILE): StudentTypeMeta {
  return STUDENT_TYPE_MAP[profile.studentType]
}

// ─────────────────────────────────────────────────────────────────────────
// AI 맞춤 추천 — 단일 소스
// 현재 학생(김채원·컴퓨터공학과 3학년·역량성장형(T3)·목표 넥슨 IT PM, TOEIC 550, SQLD 보유,
// 프로젝트·인턴 0건) 기준. 역량강화 단계의 GAP에 맞춰 비교과·외부활동·자격증을
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
