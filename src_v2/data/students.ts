// ─────────────────────────────────────────────────────────────────────────
// 학생별 데이터(JSON) 로더 + 전역 활성 학생 스토어
// 학생 전환은 localStorage에 저장 후 페이지를 리로드해 모든 화면에 반영한다.
// (프로토타입용 — 백엔드 대신 학생 JSON을 단일 소스로 사용)
// ─────────────────────────────────────────────────────────────────────────
import { STUDENT_TYPE_MAP, type StudentType, type IapMapping } from './careerProcess'
import type { StudentInputs } from '../lib/scoring'
import chaewon from './students/chaewon.json'
import changwon from './students/changwon.json'

export interface PhaseTask { text: string; done: boolean }
export type TermLabel = '단기' | '중기' | '장기'
export interface TermItem {
  title: string
  priority: 'P0' | 'P1' | 'P2'
  importance: '필수' | '중요' | '권장'
  why: string
}
export interface TermDetail {
  period: string
  headline: string
  rationale: string
  items: TermItem[]
  done?: boolean
}
export interface RoadmapPhase {
  num: number
  title: string
  icon: string
  status: 'done' | 'active' | 'upcoming'
  period: string
  tasks: PhaseTask[]
  termDetails?: Partial<Record<TermLabel, TermDetail>>
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

export interface StudentData {
  id: string
  name: string
  major: string
  grade: number
  gpa: string
  language: string
  studentType: StudentType
  typeScores: { 진로명확도: string; 역량준비도: string; 취업준비도: string }
  targetRole: string
  targetCompany: TargetCompany
  strengthWeakness: SWItem[]
  phases: RoadmapPhase[]
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

// 학생 유형 → IAP 매핑 (careerProcess의 단일 소스 재사용)
export function getStudentIap(student: StudentData): IapMapping {
  return STUDENT_TYPE_MAP[student.studentType]
}
