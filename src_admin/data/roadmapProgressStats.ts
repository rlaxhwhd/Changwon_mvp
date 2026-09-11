// ─────────────────────────────────────────────────────────────────────────
// 로드맵 이행률 집계 (단일 소스) — CLAUDE.md 규칙 10
//
// 화면은 학생 배열을 받아 세지 않는다. 여기서 전부 계산해 표시용 형태로 넘긴다.
//
// 모수는 서버 /roadmaps 의 **로드맵 보유 학생**(hasRoadmap=true)이다. 각 학생의 progress
// 는 서버 SQL(dc.roadmap_progress) 값이며, 로드맵이 DB 에 없는 학생은 여기 오지 않는다.
// 예전에는 studentsRoster.json 의 더미 progress 를 세어 로드맵 없는 학생도 이행률을 가졌다.
// 범위는 서버의 staff_student_scope 가 정한다 — 여기서 임시 필터를 만들지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { STUDENT_TYPE_MAP, typeLabel } from '../../src_v2/data/careerProcess'
import type { StudentType } from '../../src_v2/data/careerProcess'
import { typeSwatchClass } from './studentRoster'
import { collegeOf, collegeOfDept } from './departments'
import { queryRoadmapSummary, queryRoadmaps } from '../../shared/roadmapStore'
import type { RoadmapListRow, RoadmapQuery, RoadmapSummary } from '../../shared/roadmapStore'

/** 집계에 필요한 만큼만 — 서버 목록 행에서 파생한다. */
interface ProgressRow {
  id: string
  name: string
  major: string
  grade: number
  studentType: StudentType | null
  progress: number
  college: string
}

function toProgressRow(row: RoadmapListRow): ProgressRow {
  return {
    id: row.studentId,
    name: row.studentName,
    major: row.studentMajor,
    grade: row.grade ?? 0,
    studentType: (row.studentType as StudentType | null) ?? null,
    progress: row.progress.pct,
    // 학과 코드가 정식 경로다(CLAUDE.md 7조). 코드가 비면 이름 폴백.
    college: row.deptCode ? collegeOfDept(row.deptCode) : collegeOf(row.studentMajor),
  }
}

/**
 * 이행률 구간 — 색이 곧 의미다(정체 red → 완주 green).
 * 구간 경계를 바꾸려면 여기만 고친다. 화면은 이 배열을 그대로 그린다.
 */
export const PROGRESS_BANDS = [
  { key: 'b0', label: '0–19%', min: 0, max: 20, hue: 'red', desc: '착수 전·정체' },
  { key: 'b20', label: '20–39%', min: 20, max: 40, hue: 'orange', desc: '초기' },
  { key: 'b40', label: '40–59%', min: 40, max: 60, hue: 'yellow', desc: '중반' },
  { key: 'b60', label: '60–79%', min: 60, max: 80, hue: 'teal', desc: '순항' },
  { key: 'b80', label: '80–100%', min: 80, max: 101, hue: 'green', desc: '완주 임박' },
] as const

/** 관리 경계 — 집중관리(RISK_RULE)와 같은 규약으로 여기 한 곳에 둔다. */
export const PROGRESS_RULE = {
  /** 이 아래면 '정체'로 본다 */
  stalled: 30,
  /** 이 위면 '순항'으로 본다 */
  onTrack: 70,
  /** 조치 목록에 올릴 인원 */
  laggardLimit: 8,
} as const

export interface BandStat {
  key: string
  label: string
  desc: string
  /** 막대 색 클래스 (.b-*) */
  solid: string
  /** 틴트 클래스 (.s-*) */
  tint: string
  count: number
  /** 모수 대비 비율 0~100 */
  ratio: number
}

export interface GroupStat {
  key: string
  label: string
  /** 막대 색 클래스 (.b-*) — 유형은 TYPE_HUE, 그 외는 순환 배정 */
  solid: string
  count: number
  /** 평균 이행률 0~100 */
  avg: number
}

/** 단과대학 한 칸 — 펼쳤을 때 보여 줄 소속 학과 집계를 함께 들고 있다. */
export interface CollegeStat extends GroupStat {
  depts: GroupStat[]
}

export interface LaggardRow {
  id: string
  name: string
  major: string
  grade: number
  /** 진단 전 학생은 유형이 없다(null) — typeLabel()이 「유형 미정」으로 표시한다. */
  studentType: StudentType | null
  typeLabel: string
  progress: number
}

export interface RoadmapProgressStats {
  /** 모수 */
  count: number
  avg: number
  median: number
  /** 이행률 >= onTrack */
  onTrack: number
  /** 이행률 < stalled */
  stalled: number
  bands: BandStat[]
  byType: GroupStat[]
  byGrade: GroupStat[]
  byCollege: CollegeStat[]
  /** 이행률이 낮은 순 — 조치가 필요한 학생 */
  laggards: LaggardRow[]
}

const round = (value: number) => Math.round(value)

function average(rows: ProgressRow[]): number {
  if (rows.length === 0) return 0
  return round(rows.reduce((sum, s) => sum + s.progress, 0) / rows.length)
}

function median(rows: ProgressRow[]): number {
  if (rows.length === 0) return 0
  const sorted = rows.map(s => s.progress).sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

/** 학년·학과처럼 고정 색이 없는 축에 돌려 쓰는 색. 단색 나열을 피한다. */
const CYCLE_HUES = ['blue', 'purple', 'teal', 'orange', 'green', 'yellow']

function bandsOf(rows: ProgressRow[]): BandStat[] {
  return PROGRESS_BANDS.map(band => {
    const count = rows.filter(s => s.progress >= band.min && s.progress < band.max).length
    return {
      key: band.key,
      label: band.label,
      desc: band.desc,
      solid: `b-${band.hue}`,
      tint: `s-${band.hue}`,
      count,
      ratio: rows.length === 0 ? 0 : round((count / rows.length) * 100),
    }
  })
}

/** 6유형별 평균 — 색은 studentRoster.TYPE_HUE 에서 온다(유형 색 단일 소스). */
function byTypeOf(rows: ProgressRow[]): GroupStat[] {
  return (Object.keys(STUDENT_TYPE_MAP) as StudentType[]).map(code => {
    const group = rows.filter(s => s.studentType === code)
    return {
      key: code,
      label: `${code} ${typeLabel(code)}`,
      solid: typeSwatchClass(code),
      count: group.length,
      avg: average(group),
    }
  })
}

function byGradeOf(rows: ProgressRow[]): GroupStat[] {
  const grades = [...new Set(rows.map(s => s.grade))].sort((a, b) => a - b)
  return grades.map((grade, index) => {
    const group = rows.filter(s => s.grade === grade)
    return {
      key: String(grade),
      label: `${grade}학년`,
      solid: `b-${CYCLE_HUES[index % CYCLE_HUES.length]}`,
      count: group.length,
      avg: average(group),
    }
  })
}

/**
 * 한 단과대학 안의 학과별 평균 — 평균이 낮은 순.
 * 단대를 펼쳤을 때만 쓰므로 인원 컷을 두지 않는다. 이미 한 단대로 좁힌 뒤라
 * 3명 미만을 잘라내면 펼쳤는데 빈 카드가 나오는 일이 생긴다. 대신 인원을 함께 보여 준다.
 */
function deptsOf(rows: ProgressRow[]): GroupStat[] {
  const majors = [...new Set(rows.map(s => s.major))]
  return majors
    .map(major => ({ major, group: rows.filter(s => s.major === major) }))
    .map(({ major, group }, index) => ({
      key: major,
      label: major,
      solid: `b-${CYCLE_HUES[index % CYCLE_HUES.length]}`,
      count: group.length,
      avg: average(group),
    }))
    .sort((a, b) => a.avg - b.avg)
}

/**
 * 단과대학별 평균 — 평균이 낮은 순.
 * 소속 판정은 학과 트리 단일소스(departments.collegeOf)가 한다. 여기서 학과명을 묶지 않는다.
 * 학과 단위보다 모수가 커서 3명 미만 컷은 두지 않는다 — 단대가 통째로 사라지면 안 된다.
 * 소속 학과 집계(depts)를 미리 붙여 둔다 — 화면이 펼칠 때 학생 배열을 다시 세지 않게 한다.
 */
function byCollegeOf(rows: ProgressRow[]): CollegeStat[] {
  const colleges = [...new Set(rows.map(s => s.college))]
  return colleges
    .map(college => ({ college, group: rows.filter(s => s.college === college) }))
    .map(({ college, group }, index) => ({
      key: college,
      label: college,
      solid: `b-${CYCLE_HUES[index % CYCLE_HUES.length]}`,
      count: group.length,
      avg: average(group),
      depts: deptsOf(group),
    }))
    .sort((a, b) => a.avg - b.avg)
}

function laggardsOf(rows: ProgressRow[]): LaggardRow[] {
  return [...rows]
    .sort((a, b) => a.progress - b.progress || a.name.localeCompare(b.name))
    .slice(0, PROGRESS_RULE.laggardLimit)
    .map(s => ({
      id: s.id,
      name: s.name,
      major: s.major,
      grade: s.grade,
      studentType: s.studentType,
      typeLabel: typeLabel(s.studentType),
      progress: s.progress,
    }))
}

/**
 * 인가된 범위의 이행률 통계 한 벌 — 서버 /roadmaps 의 로드맵 보유 학생 전량을 받아
 * 유형·학년·단대로 분해한다. 각 학생의 progress 는 서버 SQL 값이고, 여기서 칸을 세지 않는다.
 * 범위를 좁히려면 (단대코드, 학과코드) 쌍을 준다(CLAUDE.md 7조).
 */
export async function loadRoadmapProgressStats(
  scope: Pick<RoadmapQuery, 'collegeCode' | 'deptCode' | 'studentType'> = {},
): Promise<RoadmapProgressStats> {
  const rows: ProgressRow[] = []
  let page = 1
  while (true) {
    const result = await queryRoadmaps({ ...scope, hasRoadmap: true, page, pageSize: 100 })
    rows.push(...result.items.map(toProgressRow))
    if (rows.length >= result.totalCount || result.items.length === 0) break
    page += 1
  }
  return {
    count: rows.length,
    avg: average(rows),
    median: median(rows),
    onTrack: rows.filter(s => s.progress >= PROGRESS_RULE.onTrack).length,
    stalled: rows.filter(s => s.progress < PROGRESS_RULE.stalled).length,
    bands: bandsOf(rows),
    byType: byTypeOf(rows),
    byGrade: byGradeOf(rows),
    byCollege: byCollegeOf(rows),
    laggards: laggardsOf(rows),
  }
}

/**
 * 서버 SQL 집계. 모수·평균·이행률 구간은 이쪽이 정본이다 — 전 학생을 받아 세지 않는다
 * (CLAUDE.md 10조). 학과 범위는 (단대코드, 학과코드) 쌍으로만 좁힌다(7조).
 */
export function queryRoadmapProgressStats(scope: Pick<RoadmapQuery, 'collegeCode' | 'deptCode' | 'studentType'> = {}): Promise<RoadmapSummary> {
  return queryRoadmapSummary(scope)
}
