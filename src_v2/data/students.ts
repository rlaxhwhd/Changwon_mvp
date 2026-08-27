// ─────────────────────────────────────────────────────────────────────────
// 학생별 데이터(JSON) 로더 + 전역 활성 학생 스토어
// 학생 전환은 localStorage에 저장 후 페이지를 리로드해 모든 화면에 반영한다.
// (프로토타입용 — 백엔드 대신 학생 JSON을 단일 소스로 사용)
// ─────────────────────────────────────────────────────────────────────────
import { STUDENT_TYPE_MAP, type StudentType, type StudentTypeMeta } from './careerProcess'
import type { RoadmapPlan } from './schema/roadmap'
import type { StudentInputs } from '../lib/scoring'
import chaewon from './students/chaewon.json'
import changwon from './students/changwon.json'
import counselSeed from './students/counselSeedStudents.json'

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
  studentType: StudentType
  typeScores: { 진로명확도: string; 역량준비도: string; 취업준비도: string }
  targetRole: string
  targetCompany: TargetCompany
  strengthWeakness: SWItem[]
  phases: RoadmapPhase[]
  /** 로드맵 본체 — 3축 × 5칸에서 시작한다. IAP 축만 이후에 늘어난다. → PROCESS.md §6 */
  roadmapAxes?: RoadmapPlan
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
  /** 상담사 상세 화면 — AI가 학생 정보·고민을 토대로 상담사에게 추천하는 질문. */
  counselorQuestions?: string[]
  /** 역량 점수(0~100) — 상담 접수함 위험 단계 트랙 분류 기준. */
  competencyScore: number
  /** 이 학생이 낸 상담신청. JSON seed 초기값. 런타임 변경은 override 스토어로. */
  counselRequests: StudentCounselRequest[]
}

export const STUDENTS: StudentData[] = [
  chaewon as unknown as StudentData,
  changwon as unknown as StudentData,
]

const STORAGE_KEY = 'dc_active_student'

export function getActiveStudentId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || STUDENTS[0].id
  } catch {
    return STUDENTS[0].id
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

// 학생 유형 코드 → 유형 메타(라벨·계층·후속진단·상담주제) — careerProcess 단일 소스 재사용
export function getStudentTypeMeta(student: StudentData): StudentTypeMeta {
  return STUDENT_TYPE_MAP[student.studentType]
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
  studentType: StudentType            // careerProcess 6유형 코드 — 라벨·계층은 STUDENT_TYPE_MAP에서 파생(단일소스)
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

const COUNSEL_OWNER_OVERRIDE_KEY = 'dc_counsel_owners'

/** owner별 상담신청 override(런타임 변경분)를 읽는다. 파싱 실패·부재 시 {} 폴백. */
function readOwnerOverrides(): Record<string, StudentCounselRequest[]> {
  try {
    const raw = localStorage.getItem(COUNSEL_OWNER_OVERRIDE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, StudentCounselRequest[]>
    }
  } catch {
    /* 폴백: override 없음 */
  }
  return {}
}

/** owner 1명의 상담신청 목록을 override에 저장한다(seed는 불변). */
function saveOwnerRequests(ownerId: string, list: StudentCounselRequest[]): void {
  try {
    const overrides = readOwnerOverrides()
    overrides[ownerId] = list
    localStorage.setItem(COUNSEL_OWNER_OVERRIDE_KEY, JSON.stringify(overrides))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
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
    studentType: s.studentType,
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

/** 학생 이벤트: 신청 append. 배정 로직은 모름 — assignedCounselorId 미지정(투영에서 파생). */
export function addCounselRequest(ownerId: string, req: StudentCounselRequest): void {
  const cur = getStudentCounselRequests(ownerId)
  let id = req.id
  for (let n = 1; cur.some(r => r.id === id); n++) id = `${req.id}-${n}`
  saveOwnerRequests(ownerId, [...cur, id === req.id ? req : { ...req, id }])
}

/** 상담사 이벤트: 신청 1건 patch. 소유 owner를 역참조해 그 override 배열만 갱신한다. */
export function patchCounselRequest(reqId: string, patch: Partial<StudentCounselRequest>): void {
  const owner = findOwnerByRequestId(reqId)
  if (!owner) return
  saveOwnerRequests(owner.id, owner.counselRequests.map(r => (r.id === reqId ? { ...r, ...patch } : r)))
}
