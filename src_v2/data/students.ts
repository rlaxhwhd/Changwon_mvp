import { studentProfiles, counselOwnerProfiles, studentChoices } from '../../shared/profileStore'
import { counselRequests } from '../../shared/counselStore'
// ─────────────────────────────────────────────────────────────────────────
// 학생별 데이터(JSON) 로더 + 전역 활성 학생 스토어
// 학생 전환은 localStorage에 저장 후 페이지를 리로드해 모든 화면에 반영한다.
// (프로토타입용 — 백엔드 대신 학생 JSON을 단일 소스로 사용)
// ─────────────────────────────────────────────────────────────────────────
import { STUDENT_TYPE_MAP, type StudentType, type StudentTypeMeta } from './careerProcess'
import type { CounselIntakeAnswer } from './counselIntake'
import type { CareTrack } from './counselTrack'
import type { RoadmapPlan } from './schema/roadmap'
import type { StudentInputs } from '../lib/scoring'

export interface PhaseTask { text: string; done: boolean }
/** 파이프라인 6단계 — 로드맵(3축)과 다른 것이다. 이건 진단→상담→…→사후관리 진행 표시다. */
export interface RoadmapPhase {
  num: number
  title: string
  icon: string
  status: 'done' | 'active' | 'upcoming'
  period: string
  tasks: PhaseTask[]
  recommendation: string
  nextPath: string
}
export interface TargetReq { label: string; current: number; target: number; unit?: string }
export interface TargetCompany {
  name: string
  industry: string
  role: string
  matchScore: number
  requirements: TargetReq[]
}
export interface SWItem { label: string; value: number; type: 'strength' | 'weakness' }
/** 성장 레벨 카드 값. 승급 산식이 확정되면 이 구조를 데이터 층에서 계산해 채운다. */
export interface GrowthLevel {
  level: number
  /** 현재 성장 단계 이름 */
  tier: string
  /** 현재 누적 XP */
  xp: number
  /** 다음 레벨 도달 XP */
  xpNext: number
}
export interface GapBadge { label: string; type: 'required' | 'preferred' | 'weight' }
export interface GapItem {
  title: string
  badges: GapBadge[]
  desc: string
  pct: number
  current: string
  target: string
  severity: 'critical' | 'warn' | 'info'
}
export interface RecoItem { title: string; reason: string; tag: string }
export interface Recommendations { programs: RecoItem[]; activities: RecoItem[]; certs: RecoItem[] }
export interface JobSkill { label: string; score: number; max: number; color: string }
export interface FRInsight { tag: string; title: string; desc: string }
export interface FRScenario { id: string; badge: string; title: string; fit: number; pros: string[]; cons: string[]; targets: string[] }
export interface FRAction {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  title: string
  why: string
  effort: string
  due: string
  impactLabel: string
  linkLabel: string
  linkPath: string
}
export interface FRQuarter { q: string; period: string; semester: string; focus: string; milestones: string[]; expectedMatch: number }
export interface FRMatrixCell { label: string; items: { title: string; meta: string }[] }
export interface FinalRoadmap {
  semester: string
  graduation: string
  matchNow: number
  matchGoal: number
  topFitJob: { name: string; fit: number }
  studentGoal: { company: string; role: string }
  insights: FRInsight[]
  scenarios: FRScenario[]
  thisWeek: FRAction[]
  quarters: FRQuarter[]
  matrix: FRMatrixCell[]
  coach: string
}
export interface Job {
  id: number
  company: string
  initial: string
  color: string
  role: string
  tags: string[]
  match: number
  salary: string
  location: string
  deadline: string
  jobType: '신입' | '경력'
  applyUrl: string
}

// ── 상담신청 스키마 (단일소스) ────────────────────────────────────────────
// 학생 레코드에 내장되는 상담신청. 상담사 포털은 이 데이터를 투영해 읽는다.
// (src_admin/data/schema/counselRequest 의 투영 타입과 구조 정합 — '교수'는 접수함 밖)
export type CounselRequestType = '진로취업' | '심리' | '교수'
export type CounselRequestStatus = '대기' | '확정' | '완료' | '취소'
export type CounselMethod = '대면' | '비대면'
export interface CounselSlot { date: string; start: string; end: string; place?: string }

export interface StudentCounselRequest {
  id: string
  type: CounselRequestType
  /**
   * 진로취업 상담의 트랙(일반 / CARE 7+ 연계). 심리·교수 상담에는 적용하지 않는다.
   * 미지정은 care7 로 읽는다 — 판정은 counselTrack.isCare7 한 곳에서만 한다.
   */
  careTrack?: CareTrack
  status: CounselRequestStatus
  method: CounselMethod
  topic: string
  /** 신청 일시 (ISO 8601) */
  requestedAt: string
  /** 미지정이면 투영단계에서 유형별 기본배정 파생(counselors 단일소스). 재배정 시 명시값 저장. */
  assignedCounselorId?: string
  /** 교수 상담 유형의 교수 풀 id이며 상담사 id 공간과 분리한다. */
  professorId?: string
  /** 확정된 상담 슬롯 (확정/완료 시). */
  slot?: CounselSlot
  /** 신청 시 받은 문진표 답변. 템플릿이 없는 유형(심리·교수)은 비어 있다. */
  intake?: CounselIntakeAnswer[]
  counselorComment?: string
  completedAt?: string
}

/** 학적 상태 — 단일 원천 타입. 상담사측 studentRoster.EnrollStatus는 이 타입의 alias로 전환. */
export type EnrollmentStatus = '재학' | '휴학' | '졸업' | '수료'

export interface StudentData {
  id: string
  studentNo: string
  name: string
  major: string
  grade: number
  phone: string                       // "010-0XXX-XXXX" (실번호 충돌 없는 가짜번호 규칙)
  enrollmentStatus: EnrollmentStatus
  gpa: string
  language: string
  /**
   * 6유형 — C-CORE 결과로 정해진다. **아직 진단을 안 본 학생은 null 이다.**
   * 우리가 계산하지 않고 주입받는 값이다(PROCESS.md §9 · CLAUDE.md 14조).
   */
  studentType: StudentType | null
  /**
   * ⚠ 데모 전용 — 「이 학생이 C-CORE 를 마치면 무슨 유형이 나오는가」.
   * 검사 문항·판정식이 미확정이라(PROCESS.md §9) 응시 결과를 계산할 수 없어서,
   * 주입할 값을 시드에 미리 적어 둔다. data/pipeline.completeDiagnosis 가 이걸 읽어
   * dc_student_type 에 쌓는다. **판정식이 확정되면 이 필드는 검사 결과로 대체된다.**
   * 이미 유형이 있는 학생(studentType 보유)에게는 필요 없다.
   */
  diagnosisOutcome?: { studentType: StudentType }
  /** 서버가 센 로드맵 이행률(%). 계획이 없으면 0 이다 — 브라우저가 다시 세지 않는다. */
  progress?: number
  /** 계획 행이 있는가(초안 포함). 「확정됐다」와는 다른 사실이다. */
  hasRoadmap?: boolean
  typeScores: { 진로명확도: string; 역량준비도: string; 취업준비도: string }
  targetRole: string
  targetCompany: TargetCompany
  strengthWeakness: SWItem[]
  phases: RoadmapPhase[]
  /** 로드맵 본체 — 3축 × 5칸에서 시작한다. IAP 축만 이후에 늘어난다. → PROCESS.md §6 */
  roadmapAxes?: RoadmapPlan
  /**
   * ⚠ 데모 전용 — 「이 학생의 로드맵을 생성하면 무엇이 나오는가」.
   * diagnosisOutcome 과 같은 패턴이다. 재료 3종을 읽어 15칸을 뽑는 AI 가 없으므로
   * 주입할 결과를 시드에 미리 적어 두고, 상담사가 생성할 때 그대로 넣는다.
   * **AI 가 붙으면 이 필드는 생성 결과로 대체된다.**
   * 이미 로드맵이 있는 학생(roadmapAxes 보유)에게는 필요 없다.
   */
  roadmapOutcome?: { targetRole: string; targetCompany: string; axes: RoadmapPlan }
  gapItems: GapItem[]
  recommendations: Recommendations
  insight: string
  priority: { high: number; medium: number; low: number }
  jobField: string
  jobSkills: JobSkill[]
  jobs: Job[]
  finalRoadmap: FinalRoadmap
  /** 점수 계산식(lib/scoring.ts)이 사용하는 9개 raw 입력값. JSON에서 직접 주입. */
  scoreInputs: StudentInputs
  /** 성장 레벨(XP) — 요약 지표 5번째 카드. 레벨 산식·단계명 체계가 아직 없어 시드 값을 그대로 읽는다. */
  growth?: GrowthLevel
  /** 상담사 상세 화면 — AI가 학생 정보·고민을 토대로 상담사에게 추천하는 질문. */
  counselorQuestions?: string[]
  /** 역량 점수(0~100) — 상담 접수함 위험 단계 트랙 분류 기준. */
  competencyScore: number
  /**
   * 이 학생이 낸 상담신청 seed.
   * ⚠ 서버는 이 필드를 프로필에 담지 않는다 — 상담은 별도 스코프 엔드포인트가 소유한다
   * (backend/app/students.py 의 `data.pop('counselRequests')`). 읽을 때는 항상
   * getStudentCounselRequests(id) 를 거친다. 직접 읽으면 undefined 다.
   */
  counselRequests?: StudentCounselRequest[]
}

export const STUDENTS: StudentData[] = studentProfiles()
export const DEVELOPMENT_STUDENTS = studentChoices()
const counselSeed = counselOwnerProfiles()

const STORAGE_KEY = 'dc_active_student'

export function getActiveStudentId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY) || (STUDENTS[0]?.id ?? DEVELOPMENT_STUDENTS[0]?.id ?? '')
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return (STUDENTS[0]?.id ?? DEVELOPMENT_STUDENTS[0]?.id ?? '')
  }
}

export function getActiveStudent(): StudentData {
  const id = getActiveStudentId()
  return STUDENTS.find(s => s.id === id) ?? STUDENTS[0]
}

export function setActiveStudent(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
  window.location.reload()
}

/** 유형 확정 이벤트 — append-only. 최신 건이 현재 유형이다(CLAUDE.md 11조). */
export interface StudentTypeEvent {
  /** 이벤트 id (dst_ prefix) */
  id: string
  studentId: string
  studentType: StudentType
  /** 어디서 정해졌는가 — 진단이 산출하고, 상담이 최종 확정한다(PROCESS.md) */
  source: 'diagnosis' | 'counsel'
  /** 확정 일시 ISO */
  decidedAt: string
}

export const STUDENT_TYPE_EVENT_KEY = 'dc_student_type'

/**
 * ★ 지금 이 학생의 유형 — 유형을 묻는 자리는 전부 이 함수를 쓴다.
 *
 * seed 에 유형이 박혀 있으면(기존 데모 학생) 그 값이고, 없으면(신입생) 진단을 마치며
 * 쌓인 확정 이벤트의 최신 건이다. `student.studentType` 을 직접 읽으면 **런타임에
 * 정해진 유형을 놓친다** — 학생 포털은 「진로탐색형」인데 상담사 화면만 「유형 미정」이 된다.
 */
export function getStudentType(student: StudentData): StudentType | null {
  return student.studentType ?? null
}

// 학생 유형 코드 → 유형 메타(라벨·계층·후속진단·상담주제) — careerProcess 단일 소스 재사용
// 진단 전 학생은 유형이 없다(null). 메타를 지어내지 않고 없다고 답한다.
export function getStudentTypeMeta(student: StudentData): StudentTypeMeta | null {
  const type = getStudentType(student)
  return type ? STUDENT_TYPE_MAP[type] : null
}

/**
 * AI 현재역량현황 카드가 짚는 대표 역량.
 * 강점·약점을 가리지 않고 점수가 가장 높은 항목부터 고른다 — 점수가 큰 지표가
 * 그 학생을 가장 잘 설명하기 때문이다. 화면이 항목을 골라내지 않는다(CLAUDE.md 규칙 10).
 */
export function getHeadlineCompetency(student: StudentData, limit = 2): SWItem[] {
  return [...student.strengthWeakness].sort((a, b) => b.value - a.value).slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────
// 상담신청 스토어 (단일 DB 스왑 seam)
// 상담신청의 소유 주체를 CounselOwner로 통일한다. 상세 학생(STUDENTS, counselRequests 내장)과
// 데모 학생(counselSeedStudents.json)이 한 배열로 평탄화된다.
// seed(원본 JSON)는 불변, 런타임 변경은 override 스토어 'dc_counsel_owners' 한 곳에만 쌓인다.
// 이 스토어(getCounselOwners/add/patch)만 API 호출로 교체하면 DB 연동이 된다.
//  · 학생 이벤트(신청) → addCounselRequest → override 갱신
//  · 상담사 이벤트(전이) → patchCounselRequest → 소유 owner 역참조 후 override 갱신
//  · 상담사 포털은 getCounselOwners를 투영해 읽는다 (cross-SPA 데이터 공유, 로직 import 없음)
// ─────────────────────────────────────────────────────────────────────────

/** 상담신청 소유 주체 — StudentData(상세)와 데모 학생(경량)이 공통으로 만족하는 코어 프로필 구조.
 *  상세학생은 StudentData에서 파생, 데모학생은 counselSeed JSON에서 passthrough. */
export interface CounselOwner {
  id: string
  studentNo: string
  name: string
  major: string
  grade: number
  phone: string
  enrollmentStatus: EnrollmentStatus
  studentType: StudentType | null     // careerProcess 6유형 코드 — 진단 전이면 null. 라벨·계층은 STUDENT_TYPE_MAP에서 파생(단일소스)
  gpa: string
  language: string
  targetCompanySummary: string        // 예: "넥슨코리아 · IT Project Manager"
  roadmapSummary: string              // 한 줄 진행 요약
  counselorQuestions: string[]        // AI 추천 상담 질문 (상세 화면)
  competencyScore: number             // 역량 점수(0~100) — 위험 단계 트랙 분류 기준
  counselRequests: StudentCounselRequest[]
}

/** 역량 점수 4단계 트랙. 저학년일수록 기준이 관대하다(1학년은 점수가 낮은 게 정상). */
export type StudentTrack = '집중관리' | '위험' | '표준' | '우수'

/** 역량점수(0~100)를 학년 보정 기준으로 트랙 분류. 학년이 낮을수록 집중관리·위험 기준이 여유롭다. */
export function getStudentTrack(competencyScore: number, grade: number): StudentTrack {
  const offset = (4 - Math.min(4, Math.max(1, grade))) * 8
  if (competencyScore < 55 - offset) return '집중관리'
  if (competencyScore < 70 - offset) return '위험'
  if (competencyScore < 85 - offset) return '표준'
  return '우수'
}

/** 상세학생 phases에서 로드맵 진행 한 줄 요약을 파생한다(화면 리터럴 금지 — 스토어 층에서 파생). */
function deriveRoadmapSummary(phases: RoadmapPhase[]): string {
  const doneCount = phases.filter(p => p.status === 'done').length
  const active = phases.find(p => p.status === 'active')
  if (active) {
    return `${active.num}단계 ${active.title} 진행 중 · 완료 ${doneCount}/${phases.length}단계`
  }
  const lastDone = [...phases].reverse().find(p => p.status === 'done')
  if (lastDone) {
    return `${lastDone.num}단계 ${lastDone.title} 완료 · 완료 ${doneCount}/${phases.length}단계`
  }
  return `진행 전 · 완료 ${doneCount}/${phases.length}단계`
}

function readOwnerOverrides(): Record<string, StudentCounselRequest[]> {
  const owners = [...STUDENTS, ...(counselSeed as { id: string }[])]
  return Object.fromEntries(owners.map(owner => [owner.id, counselRequests().filter(r => r.studentId === owner.id)]))
}

/** 상담신청 소유자 병합 목록(seed 불변 + override). 투영·읽기·쓰기의 유일 소스. */
export function getCounselOwners(): CounselOwner[] {
  const ov = readOwnerOverrides()
  // 상세학생: 코어 프로필을 StudentData에서 파생(요약 문자열은 스토어 층에서 생성).
  const detailed: CounselOwner[] = STUDENTS.map(s => ({
    id: s.id,
    studentNo: s.studentNo,
    name: s.name,
    major: s.major,
    grade: s.grade,
    phone: s.phone,
    enrollmentStatus: s.enrollmentStatus,
    // 런타임에 정해진 유형까지 반영한다 — 접수함·목록이 「유형 미정」으로 굳지 않게.
    studentType: getStudentType(s),
    gpa: s.gpa,
    language: s.language,
    targetCompanySummary: `${s.targetCompany.name} · ${s.targetCompany.role}`,
    roadmapSummary: deriveRoadmapSummary(s.phases),
    counselorQuestions: s.counselorQuestions ?? [],
    competencyScore: s.competencyScore,
    counselRequests: ov[s.id] ?? s.counselRequests ?? [],
  }))
  // 데모학생: 코어 프로필을 counselSeed JSON에서 passthrough(무거운 로드맵 없음).
  const demo: CounselOwner[] = (counselSeed as Omit<CounselOwner, 'studentNo'>[]).map(o => ({
    id: o.id,
    studentNo: o.id,
    name: o.name,
    major: o.major,
    grade: o.grade,
    phone: o.phone,
    enrollmentStatus: o.enrollmentStatus,
    studentType: o.studentType,
    gpa: o.gpa,
    language: o.language,
    targetCompanySummary: o.targetCompanySummary,
    roadmapSummary: o.roadmapSummary,
    counselorQuestions: o.counselorQuestions ?? [],
    competencyScore: o.competencyScore,
    counselRequests: ov[o.id] ?? o.counselRequests,
  }))
  return [...detailed, ...demo]
}

export function getCounselOwnerById(id: string): CounselOwner | undefined {
  return getCounselOwners().find(o => o.id === id)
}

export function getStudentCounselRequests(id: string): StudentCounselRequest[] {
  return getCounselOwnerById(id)?.counselRequests ?? []
}

/** 상담신청 id로 소속 owner를 역참조한다(상담사 전이 시 소유자 자동 판별). */
export function findOwnerByRequestId(reqId: string): CounselOwner | undefined {
  return getCounselOwners().find(o => o.counselRequests.some(r => r.id === reqId))
}
