/**
 * 드림캐치 5대 역량 점수 계산 모듈
 *
 * 18개 raw 데이터를 0~100으로 정규화 → 5대 역량(창의적사고/실용적융복합/의사소통/글로벌/지역형리더)으로 그룹화 →
 * "글로벌 가중평균"으로 종합 점수 산출.
 *
 * 모든 화면(Main, AiLounge, AiRoadmap)이 이 모듈을 import해서 같은 결과를 받게 함으로써
 * 화면 간 점수 불일치를 제거. raw 입력은 학생 JSON(scoreInputs)에서 온다.
 */

// ── Types ──────────────────────────────────────────────────────────

export type Competency = '창의적사고' | '실용적융복합' | '의사소통' | '글로벌' | '지역형리더'

export interface StudentInputs {
  /** 학년 1~4 (졸업유예 = 4) */
  grade: number
  /** 보유 자격증 개수 */
  certifications: number
  /** TOEIC 점수 (300~990) */
  toeic: number
  /** 비교과 프로그램 참여 횟수 */
  programs: number
  /** 전체 상담 횟수 (창의적사고/심리/교수 합산) — 화면 표시용 */
  counsel: number
  /** KVCT 직무역량검사 종합 점수 (0~100) */
  kvct: number
  /** 프로젝트 경험 횟수 (캡스톤·사이드 포함) — 화면 표시용 */
  projects: number
  /** 공모전 참가 횟수 — 화면 표시용 */
  contests: number
  /** XP 레벨 (Lv.40 = 4학년 + 모든 퀘스트 완료, 만점) */
  xpLevel: number
  /** M2 점수 — M1 결과 + 상담 도출로 산출되는 진로이해 점수 (0~100) */
  m2Score: number
  /** M1 유형분류 검사 점수 — 39문항 (0~100) */
  m1Score: number
  /** 전공 학점 (0~4.5) */
  majorGpa: number
  /** 전체 학점 (0~4.5) */
  totalGpa: number
  /** 캡스톤 점수 (0~100). 1-3학년은 0. */
  capstoneScore: number
  /** 누적 출석일 (0~90) */
  attendanceDays: number
  /** 강의 출석률 (0~100%, 결석 시 차감) */
  lectureAttendanceRate: number
  /** 성장경험일지 개수 */
  journalCount: number
  /** AI 자소서/면접 사용 횟수 */
  aiResumeInterviewCount: number
  /** SPRINT2 설문 점수 (0~100) */
  sprint2Score: number
  /** 심리 상담 횟수 */
  psychCounselCount: number
}

export type InputKey = keyof StudentInputs

// ── 정규화 규칙 (raw → 0~100) ───────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export const NORMALIZERS: Record<InputKey, (v: number) => number> = {
  grade: (g) => clamp(30 + (g - 1) * 23.33, 0, 100),
  certifications: (n) => Math.min(n * 33.33, 100),
  toeic: (s) => clamp((s - 400) / 5, 0, 100),
  programs: (n) => Math.min(n * 20, 100),
  counsel: (n) => Math.min(n * 25, 100),
  kvct: (s) => clamp(s, 0, 100),
  projects: (n) => Math.min(n * 25, 100),
  contests: (n) => Math.min(n * 33.33, 100),
  xpLevel: (lv) => Math.min(lv * 2.5, 100),
  m2Score: (s) => clamp(s, 0, 100),
  m1Score: (s) => clamp(s, 0, 100),
  // 전공 학점: 4.5 만점 → 100점
  majorGpa: (g) => clamp((g / 4.5) * 100, 0, 100),
  totalGpa: (g) => clamp((g / 4.5) * 100, 0, 100),
  capstoneScore: (s) => clamp(s, 0, 100),
  // 누적 출석일: 90일 학기 만점
  attendanceDays: (d) => clamp((d / 90) * 100, 0, 100),
  lectureAttendanceRate: (r) => clamp(r, 0, 100),
  // 성장일지: 10건 만점
  journalCount: (n) => Math.min(n * 10, 100),
  // AI 자소서/면접: 5회 만점
  aiResumeInterviewCount: (n) => Math.min(n * 20, 100),
  sprint2Score: (s) => clamp(s, 0, 100),
  // 심리 상담: 3회 만점
  psychCounselCount: (n) => Math.min(n * 33.33, 100),
}

export const INPUT_LABELS: Record<InputKey, string> = {
  grade: '학년',
  certifications: '자격증',
  toeic: '어학(TOEIC)',
  programs: '비교과 참여',
  counsel: '전체 상담 횟수',
  kvct: 'KVCT 직무역량검사',
  projects: '프로젝트 경험',
  contests: '공모전',
  xpLevel: '퀘스트 XP',
  m2Score: 'M2 점수 (M1 + 상담 도출)',
  m1Score: 'M1 유형분류 검사',
  majorGpa: '전공 학점',
  totalGpa: '전체 학점',
  capstoneScore: '캡스톤 점수',
  attendanceDays: '누적 출석일',
  lectureAttendanceRate: '강의 출석률',
  journalCount: '성장경험일지',
  aiResumeInterviewCount: 'AI 자소서/면접',
  sprint2Score: 'SPRINT2 설문',
  psychCounselCount: '심리 상담',
}

export const INPUT_RAW_FORMATTERS: Record<InputKey, (v: number) => string> = {
  grade: (v) => `${v}학년`,
  certifications: (v) => `${v}개`,
  toeic: (v) => `${v}점`,
  programs: (v) => `${v}건`,
  counsel: (v) => `${v}회`,
  kvct: (v) => `${v}점`,
  projects: (v) => `${v}건`,
  contests: (v) => `${v}건`,
  xpLevel: (v) => `Lv.${v}`,
  m2Score: (v) => `${v}점`,
  m1Score: (v) => `${v}점`,
  majorGpa: (v) => `${v} / 4.5`,
  totalGpa: (v) => `${v} / 4.5`,
  capstoneScore: (v) => `${v}점`,
  attendanceDays: (v) => `${v}일 / 90`,
  lectureAttendanceRate: (v) => `${v}%`,
  journalCount: (v) => `${v}건`,
  aiResumeInterviewCount: (v) => `${v}회`,
  sprint2Score: (v) => `${v}점`,
  psychCounselCount: (v) => `${v}회`,
}

// ── 5대 역량 × 입력 sparse matrix (각 역량 가중치 합 = 1.0) ─────
// 사용자 정의:
//   창의적사고 = M2 + M1
//   실용적융복합 = 전공학점 + KVCT + 캡스톤 (캡스톤은 1-3학년 0 → 가중치 낮게)
//   의사소통 = 심리상담 + 출석일 + 강의출석률
//   글로벌 = 자격증 + 성장일지 + 어학 + 학점 + AI자소서/면접 + SPRINT2
//   지역형리더 = 퀘스트XP + 비교과
// 그룹 내 가중치: 자동 (순서 기반, 앞일수록 무겁게)

export const CONTRIBUTION_MATRIX: Record<Competency, Partial<Record<InputKey, number>>> = {
  창의적사고: {
    m2Score: 0.55,
    m1Score: 0.45,
  },
  실용적융복합: {
    majorGpa:      0.50,
    kvct:          0.35,
    capstoneScore: 0.15,  // 1-3학년 0 → 낮은 가중치로 영향 최소화
  },
  의사소통: {
    lectureAttendanceRate: 0.40,
    attendanceDays:        0.35,
    psychCounselCount:     0.25,
  },
  글로벌: {
    certifications:         0.22,
    journalCount:           0.20,
    toeic:                  0.18,
    totalGpa:               0.15,
    aiResumeInterviewCount: 0.13,
    sprint2Score:           0.12,
  },
  지역형리더: {
    programs: 0.50,
    xpLevel:  0.50,
  },
}

// ── 종합 점수 가중치 (5개 합 = 1.0, 사용자 확정) ─────────────────
//   글로벌 0.30 + 실용적융복합 0.25 + 창의적사고 0.20 + 의사소통 0.15 + 지역형리더 0.10

export const OVERALL_WEIGHTS: Record<Competency, number> = {
  글로벌: 0.30,
  실용적융복합: 0.25,
  창의적사고: 0.20,
  의사소통: 0.15,
  지역형리더: 0.10,
}

/**
 * 표시명 — 국립창원대 5대 핵심역량. 화면 순서도 이 순서다.
 * 키는 띄어쓰기 없이 두고(객체 키·정렬에 쓰인다) 라벨만 표기법을 따른다.
 */
export const COMPETENCY_LABELS: Record<Competency, string> = {
  지역형리더: '지역형리더',
  창의적사고: '창의적 사고',
  실용적융복합: '실용적 융복합',
  의사소통: '의사소통',
  글로벌: '글로벌',
}

/** 화면에 그리는 순서 — 5대 핵심역량 공식 순서. */
export const COMPETENCY_ORDER: Competency[] = [
  '지역형리더', '창의적사고', '실용적융복합', '의사소통', '글로벌',
]

// ── 결과 타입 ────────────────────────────────────────────────────

export interface Contribution {
  source: InputKey
  sourceLabel: string
  rawValue: number
  rawDisplay: string
  normalizedValue: number
  weight: number
  weightedScore: number
}

export interface CompetencyBreakdown {
  key: Competency
  label: string
  score: number
  scoreRounded: number
  contributions: Contribution[]
  weightSum: number
}

export interface ScoreResult {
  competencies: CompetencyBreakdown[]
  overall: number
  overallRaw: number
  inputs: StudentInputs
  normalized: Record<InputKey, number>
}

// ── 계산 함수 ────────────────────────────────────────────────────

export function normalizeInputs(inputs: StudentInputs): Record<InputKey, number> {
  return Object.fromEntries(
    (Object.keys(inputs) as InputKey[]).map((k) => [k, NORMALIZERS[k](inputs[k])]),
  ) as Record<InputKey, number>
}

export function computeCompetency(
  competency: Competency,
  normalized: Record<InputKey, number>,
  inputs: StudentInputs,
): CompetencyBreakdown {
  const weights = CONTRIBUTION_MATRIX[competency]
  const contribs: Contribution[] = []
  let numerator = 0
  let denom = 0

  for (const key of Object.keys(weights) as InputKey[]) {
    const weight = weights[key]!
    if (weight === 0) continue
    const normVal = normalized[key]
    numerator += normVal * weight
    denom += weight
    contribs.push({
      source: key,
      sourceLabel: INPUT_LABELS[key],
      rawValue: inputs[key],
      rawDisplay: INPUT_RAW_FORMATTERS[key](inputs[key]),
      normalizedValue: normVal,
      weight,
      weightedScore: normVal * weight,
    })
  }

  const score = denom > 0 ? numerator / denom : 0
  contribs.sort((a, b) => b.weightedScore - a.weightedScore)

  return {
    key: competency,
    label: COMPETENCY_LABELS[competency],
    score,
    scoreRounded: Math.round(score),
    contributions: contribs,
    weightSum: denom,
  }
}

export function computeAll(inputs: StudentInputs): ScoreResult {
  const normalized = normalizeInputs(inputs)
  const competencies: CompetencyBreakdown[] = COMPETENCY_ORDER
    .map((c) => computeCompetency(c, normalized, inputs))

  const overallRaw = competencies.reduce(
    (sum, c) => sum + c.score * OVERALL_WEIGHTS[c.key],
    0,
  )

  return {
    competencies,
    overall: Math.round(overallRaw),
    overallRaw,
    inputs,
    normalized,
  }
}

export const OVERALL_FORMULA_TEXT =
  '종합 = 글로벌×0.30 + 실용적융복합×0.25 + 창의적사고×0.20 + 의사소통×0.15 + 지역형리더×0.10'

// ── AI 코멘트 생성 — 점수 데이터 기반 강점/약점 자동 도출 ────────

/** 각 역량의 "의미" — 코멘트 본문에서 인용 */
const COMPETENCY_MEANING: Record<Competency, string> = {
  지역형리더: '비교과 참여와 활동 지속성',
  창의적사고: '진로 탐색 진단이 보여 주는 자기이해',
  실용적융복합: '전공 학점·캡스톤 등 실무 적용',
  의사소통: '출결·정서 안정과 상담 참여',
  글로벌: '어학·자격 등 대외 경쟁력',
}

/** 각 역량별 권장 행동 — 약점일 때 제안 */
const COMPETENCY_ACTION: Record<Competency, string> = {
  지역형리더: '주간 퀘스트 + 비교과 1건 추가',
  창의적사고: '1단계 유형진단 재응시 + 진로 상담 1회 추가',
  실용적융복합: '캡스톤 등록 · 전공학점 관리 · KVCT 재응시',
  의사소통: '강의 출석 관리 · 필요 시 심리 상담 신청',
  글로벌: 'TOEIC 700+ 응시 · 자격증 1개 추가 · AI 자소서 첨삭',
}

/** 카드용 강점 한 줄 — 점수 70 이상일 때 노출 */
const COMPETENCY_STRENGTH_BULLET: Record<Competency, string> = {
  지역형리더: '교내 활동 참여가 꾸준해요',
  창의적사고: '진로 방향이 명확해요',
  실용적융복합: '전공·실무 역량이 탄탄해요',
  의사소통: '출결·정서 관리가 우수해요',
  글로벌: '어학·자격 경쟁력이 높아요',
}

/** 카드용 보완 한 줄 — 점수 70 미만일 때 노출 */
const COMPETENCY_WEAKNESS_BULLET: Record<Competency, string> = {
  지역형리더: '퀘스트·비교과 활동을 늘려보세요',
  창의적사고: '진로 방향성을 더 구체화해보세요',
  실용적융복합: '전공 학점·KVCT 점수를 보강하세요',
  의사소통: '강의 출석·심리 안정에 신경 쓰세요',
  글로벌: '어학·자격증·실전 경험을 늘리세요',
}

const STRENGTH_THRESHOLD = 70

export interface AiCommentSegment {
  type: 'text' | 'bold'
  value: string
}

export interface AiCommentContent {
  strengths: Competency[]
  weaknesses: Competency[]
  /** JSX 렌더링용 세그먼트 배열 (bold 부분은 <strong>으로 감쌈) */
  segments: AiCommentSegment[]
  /** 종합 리포트 카드용 — 점수 70 이상 역량의 강점 한 줄 (최대 3개, 최소 1개) */
  strengthBullets: string[]
  /** 종합 리포트 카드용 — 점수 70 미만 역량의 보완 한 줄 (최대 3개, 최소 1개) */
  weaknessBullets: string[]
}

export function generateAiComment(result: ScoreResult): AiCommentContent {
  const sortedDesc = [...result.competencies].sort((a, b) => b.score - a.score)
  const sortedAsc = [...sortedDesc].reverse()

  // 본문 문장용 — 항상 상위 2개 / 하위 2개
  const strengths = sortedDesc.slice(0, 2).map((c) => c.key)
  const weaknesses = sortedAsc.slice(0, 2).map((c) => c.key)

  // 카드용 — 점수 70 임계, 최대 3개, 최소 1개 보장
  const strengthCand = sortedDesc.filter((c) => c.score >= STRENGTH_THRESHOLD).slice(0, 3)
  const strengthList = strengthCand.length > 0 ? strengthCand : [sortedDesc[0]]
  const strengthBullets = strengthList.map((c) => COMPETENCY_STRENGTH_BULLET[c.key])

  const weaknessCand = sortedAsc.filter((c) => c.score < STRENGTH_THRESHOLD).slice(0, 3)
  const weaknessList = weaknessCand.length > 0 ? weaknessCand : [sortedAsc[0]]
  const weaknessBullets = weaknessList.map((c) => COMPETENCY_WEAKNESS_BULLET[c.key])

  // 본문 sort 변수명 호환 유지
  const sorted = sortedDesc

  const weakLowest = sorted[sorted.length - 1]
  const weakAvg = (sorted[sorted.length - 1].score + sorted[sorted.length - 2].score) / 2
  const weakLevel =
    weakAvg < 50 ? '50점 미만' :
    weakAvg < 60 ? '60점 미만' :
    weakAvg < 70 ? '60점대' :
    '70점대 초반'

  const action = COMPETENCY_ACTION[weakLowest.key]
  const nextThreshold =
    result.overall < 60 ? '60점대' :
    result.overall < 70 ? '70점대' :
    result.overall < 80 ? '80점대' :
    '90점대'

  const seg: AiCommentSegment[] = [
    { type: 'bold', value: `${COMPETENCY_LABELS[strengths[0]]}` },
    { type: 'text', value: '과 ' },
    { type: 'bold', value: `${COMPETENCY_LABELS[strengths[1]]}` },
    { type: 'text', value: `이(가) 다른 영역 대비 강점으로 분석됩니다. ${COMPETENCY_MEANING[strengths[0]]}이 양호해 향후 성장의 기반이 갖춰져 있습니다. 반면 ` },
    { type: 'bold', value: `${COMPETENCY_LABELS[weaknesses[0]]}` },
    { type: 'text', value: `은(는) ${weakLevel}에 머물러 있어, ` },
    { type: 'bold', value: action },
    { type: 'text', value: `을(를) 8주 단위로 진행하면 단기간 내 평균 5~10점 이상 향상이 기대됩니다. 지금 흐름을 유지하면서 약점 영역만 보강하면 종합 ` },
    { type: 'bold', value: nextThreshold },
    { type: 'text', value: ' 진입이 충분히 가능합니다.' },
  ]

  return { strengths, weaknesses, segments: seg, strengthBullets, weaknessBullets }
}
