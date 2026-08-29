// ─────────────────────────────────────────────────────────────────────────
// 상담사 홈 대시보드 집계 로더 (시안 test_admin.html 기준)
//
// CLAUDE.md 규칙 10 — 집계는 데이터 층에서 한다. 화면은 전체 배열을 받아
// 계산하지 않는다. DB 전환 시 이 파일의 각 함수가 집계 SQL 한 개가 된다.
//
// 단일 소스
//   · 상담 신청·슬롯 = counselRequests.ts
//   · 담당 학생      = studentRoster.ts
//   · 유형·계층      = src_v2/data/careerProcess.ts (6유형 단일소스)
//   · 비교과         = programs.ts
//   · 로드맵 변경요청 = roadmapRequests.ts
//   · 상담 기록      = counselRecords.ts
// ─────────────────────────────────────────────────────────────────────────
import {
  getRequestsByAssignee,
  pickReferenceDate,
  getCounselStudentProfile,
} from './counselRequests'
import type { CounselRequest } from './schema/counselRequest'
import {
  getFullRoster, getRosterSummary, isCoreCare, isHighRisk, RISK_RULE,
  TYPE_TINT, typeColorVar, typeSwatchClass,
} from './studentRoster'
import type { FocusFilter } from './studentRoster'
import { getPrograms } from './programs'
import { getRoadmapRequests } from './roadmapRequests'
import { getCounselRecords } from './counselRecords'
import { getAttemptsByStudent } from './diagnosisAttempts'
import { STUDENT_TYPES, type StudentType } from '../../src_v2/data/careerProcess'

/** 유형별 도넛·범례 색 — DESIGN.md 7색 solid 유틸 클래스명. 새 색을 만들지 않는다. */
// 유형 색은 studentRoster(TYPE_HUE)가 단일 소스다 — 여기서 다시 정의하지 않는다.

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10
}

function dateOf(request: CounselRequest): string {
  return request.slot?.date ?? request.requestedAt.slice(0, 10)
}

// ── 인사 · 담당 요약 ──────────────────────────────────────────────────────

export interface HelloSummary {
  /** 기준일 (YYYY-MM-DD) — 시드 데이터가 오늘이 아닐 수 있어 최다 신청일로 보정 */
  refDate: string
  /** 기준일 확정·완료 상담 건수 */
  todayCount: number
  /** 기준일 중 완료된 건수 */
  todayDone: number
  studentCount: number
  recordCount: number
}

export function getHelloSummary(counselorId: string, departments: string[]): HelloSummary {
  const requests = getRequestsByAssignee(counselorId)
  const refDate = pickReferenceDate(requests.map(dateOf))
  const today = requests.filter(r => r.slot?.date === refDate && (r.status === '확정' || r.status === '완료'))
  return {
    refDate,
    todayCount: today.length,
    todayDone: today.filter(r => r.status === '완료').length,
    studentCount: getRosterSummary(departments).total,
    recordCount: getCounselRecords().length,
  }
}

// ── 집중관리 현황 ────────────────────────────────────────────────────────

export interface RiskRow {
  label: string
  /** 유형 코드 배지 (있으면 표시) */
  code?: StudentType
  /** 전체 학생 목록에서 이 분류만 거르는 필터 값 — 링크(?focus=)에 그대로 쓴다. */
  focus: FocusFilter
  count: number
  ratio: number
  /** solid 유틸 클래스 (막대용) */
  solid: string
  /** 잉크 유틸 클래스 (퍼센트 텍스트용) */
  ink: string
}

export interface RiskSummary {
  total: number
  rows: RiskRow[]
}

// 분류 기준·판정 함수는 studentRoster.ts 가 단일 소스다 — 목록 필터가 같은 것을 본다.
// 여기서 다시 정의하면 카드 인원과 목록 인원이 갈린다.

/** 집중관리 현황 2분류. 모집단은 1학년을 뺀 담당 학생이다. */
export function getRiskSummary(departments: string[]): RiskSummary {
  const target = getFullRoster(departments).filter(s => s.grade !== RISK_RULE.excludeGrade)
  const total = target.length
  const high = target.filter(isHighRisk).length
  const core = target.filter(isCoreCare).length
  return {
    total,
    rows: [
      { label: '고위험군', focus: 'high', count: high, ratio: pct(high, total), solid: 'b-red', ink: 'f-red' },
      { label: '핵심관리대상', focus: 'core', count: core, ratio: pct(core, total), solid: 'b-green', ink: 'f-green' },
    ],
  }
}

// ── KPI 4종 ─────────────────────────────────────────────────────────────

export interface KpiCard {
  key: string
  name: string
  value: number
  unit: string
  /** 진행 막대 % */
  ratio: number
  /** "3 / 8 작성" 형태 */
  detail: string
  tint: string
  solid: string
}

export function getKpis(counselorId: string): KpiCard[] {
  const requests = getRequestsByAssignee(counselorId)
  const refDate = pickReferenceDate(requests.map(dateOf))

  const today = requests.filter(r => r.slot?.date === refDate && (r.status === '확정' || r.status === '완료'))
  const todayDone = today.filter(r => r.status === '완료').length

  const pending = requests.filter(r => r.status === '대기').length
  const confirmed = requests.filter(r => r.status === '확정').length

  const roadmap = getRoadmapRequests()
  const roadmapOpen = roadmap.filter(r => r.status === '대기').length

  const done = requests.filter(r => r.status === '완료')
  const recorded = new Set(getCounselRecords().map(r => r.requestId))
  const missing = done.filter(r => !recorded.has(r.id)).length

  return [
    {
      key: 'today', name: '오늘 상담', value: today.length, unit: '건',
      ratio: pct(todayDone, today.length), detail: `${todayDone} / ${today.length} 완료`,
      tint: 's-green', solid: 'b-green',
    },
    {
      key: 'intake', name: '접수 대기', value: pending, unit: '건',
      ratio: pct(confirmed, pending + confirmed), detail: `${confirmed} / ${pending + confirmed} 확정`,
      tint: 's-orange', solid: 'b-orange',
    },
    {
      key: 'roadmap', name: '로드맵 변경요청', value: roadmapOpen, unit: '건',
      ratio: pct(roadmap.length - roadmapOpen, roadmap.length), detail: `${roadmap.length - roadmapOpen} / ${roadmap.length} 처리`,
      tint: 's-red', solid: 'b-red',
    },
    {
      key: 'record', name: '상담일지 미작성', value: missing, unit: '건',
      ratio: pct(done.length - missing, done.length), detail: `${done.length - missing} / ${done.length} 작성`,
      tint: 's-purple', solid: 'b-purple',
    },
  ]
}

// ── 유형 분포 (도넛 + 범례) ───────────────────────────────────────────────

export interface TypeSlice {
  code: StudentType
  label: string
  count: number
  ratio: number
  swatch: string
  /** 도넛 conic-gradient 누적 시작 % */
  from: number
  to: number
}

export interface TypeDistribution {
  total: number
  slices: TypeSlice[]
  /** conic-gradient(...) 문자열 — CSS 변수로 주입한다 */
  gradient: string
}

export function getTypeDistribution(departments: string[]): TypeDistribution {
  const roster = getFullRoster(departments)
  const total = roster.length
  let cursor = 0
  const slices = STUDENT_TYPES.map(meta => {
    const count = roster.filter(s => s.studentType === meta.code).length
    const ratio = pct(count, total)
    const from = cursor
    cursor += ratio
    return { code: meta.code, label: meta.label, count, ratio, swatch: typeSwatchClass(meta.code), from, to: cursor }
  })
  // 유틸 클래스는 CSS라 gradient에는 값이 필요하다 — 같은 단일 소스에서 var()로 뽑는다
  const stops = slices.map(s => `${typeColorVar(s.code)} ${s.from}% ${s.to}%`).join(', ')
  return { total, slices, gradient: `conic-gradient(${stops})` }
}

// ── 오늘의 상담 (타임라인) ────────────────────────────────────────────────

export interface TimelineItem {
  requestId: string
  studentId: string
  time: string
  name: string
  meta: string
  typeCode?: StudentType
  typeLabel?: string
  typeTint?: string
  topic: string
  status: CounselRequest['status']
}

export function getTodayTimeline(counselorId: string, departments: string[]): TimelineItem[] {
  const requests = getRequestsByAssignee(counselorId)
  const refDate = pickReferenceDate(requests.map(dateOf))
  const typeOf = new Map(getFullRoster(departments).map(s => [s.id, s.studentType]))

  return requests
    .filter(r => r.slot?.date === refDate && (r.status === '확정' || r.status === '완료'))
    .sort((a, b) => (a.slot!.start ?? '').localeCompare(b.slot!.start ?? ''))
    .map(r => {
      const code = typeOf.get(r.studentId)
      const meta = code ? STUDENT_TYPES.find(t => t.code === code) : undefined
      return {
        requestId: r.id,
        studentId: r.studentId,
        time: r.slot?.start ?? '',
        name: r.studentName,
        meta: `${r.studentMajor} · ${r.method}`,
        typeCode: code,
        typeLabel: meta?.label,
        typeTint: code ? TYPE_TINT[code] : undefined,
        topic: r.topic,
        status: r.status,
      }
    })
}

// ── 상담 전 브리핑 (다음 상담 1건) ────────────────────────────────────────

export interface BriefingRow {
  label: string
  /** 한 줄 값 또는 목록 */
  value?: string
  items?: string[]
  tint: string
}

/** 브리핑 상단 3지표 — 시안 .scores */
export interface BriefingScore {
  label: string
  value: string
  /** 값 뒤 첨자 ("%", "회", "/2") */
  unit: string
  ink: string
}

export interface Briefing {
  studentId: string
  name: string
  meta: string
  typeCode?: StudentType
  typeLabel?: string
  typeTint?: string
  time: string
  /** 상담 방식 (개인상담·화상상담 등) */
  mode: string
  scores: BriefingScore[]
  rows: BriefingRow[]
  /** 주의 문구 (없으면 표시 안 함) */
  alert?: string
}

/** 학생 1명의 상담 전 브리핑. 타임라인 항목을 펼칠 때 조회한다. */
export function getBriefing(
  studentId: string,
  counselorId: string,
  departments: string[],
): Briefing | null {
  const next = getTodayTimeline(counselorId, departments).find(t => t.studentId === studentId)
  if (!next) return null

  const profile = getCounselStudentProfile(next.studentId)
  if (!profile) return null

  const rows: BriefingRow[] = [
    { label: '상담 주제', value: next.topic, tint: 's-blue' },
    { label: '목표', value: profile.targetCompanySummary, tint: 's-teal' },
    { label: '로드맵', value: profile.roadmapSummary, tint: 's-purple' },
  ]
  if (profile.counselorQuestions.length > 0) {
    rows.push({ label: 'AI 추천 질문', items: profile.counselorQuestions.slice(0, 3), tint: 's-green' })
  }

  // 시안 .scores 3지표 — 전부 기존 단일소스에서 파생한다(하드코딩 금지)
  const progress = getFullRoster(departments).find(s => s.id === studentId)?.progress ?? 0
  const myDone = getRequestsByAssignee(counselorId)
    .filter(r => r.studentId === studentId && r.status === '완료').length
  const attempts = getAttemptsByStudent(studentId)
  const attemptsDone = attempts.filter(a => a.completedAt).length

  const tier = profile.typeMeta.tier
  return {
    studentId: next.studentId,
    name: profile.name,
    meta: `${profile.major} ${profile.grade}학년 · ${profile.gpa} · ${profile.language}`,
    typeCode: next.typeCode,
    typeLabel: next.typeLabel,
    typeTint: next.typeTint,
    time: next.time,
    mode: next.meta.split(' · ').at(-1) ?? '개인상담',
    scores: [
      { label: '로드맵 이행률', value: String(progress), unit: '%', ink: 'f-green' },
      { label: '상담 횟수', value: String(myDone), unit: '회', ink: 'f-orange' },
      { label: '진단 완료', value: String(attemptsDone), unit: `/${attempts.length}`, ink: 'f-blue' },
    ],
    rows,
    alert: tier === 'LOW'
      ? '취약관리형 학생입니다. 참여 동기 회복과 이탈 방지를 먼저 확인하세요.'
      : undefined,
  }
}

/** 기본으로 펼쳐 둘 상담 — 가장 이른 미완료 건. 없으면 null. */
export function getDefaultOpenStudentId(counselorId: string, departments: string[]): string | null {
  return getTodayTimeline(counselorId, departments).find(t => t.status !== '완료')?.studentId ?? null
}

// ── 상담접수함 ───────────────────────────────────────────────────────────

export interface IntakeItem {
  requestId: string
  studentId: string
  initial: string
  name: string
  meta: string
  sub: string
  status: CounselRequest['status']
  tint: string
}

export function getIntake(counselorId: string, departments: string[], limit = 3): IntakeItem[] {
  const typeOf = new Map(getFullRoster(departments).map(s => [s.id, s.studentType]))
  const AVA = ['s-teal', 's-blue', 's-purple', 's-green', 's-orange']
  return getRequestsByAssignee(counselorId)
    .filter(r => r.status === '대기')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .slice(0, limit)
    .map((r, i) => {
      const code = typeOf.get(r.studentId)
      const label = code ? STUDENT_TYPES.find(t => t.code === code)?.label : undefined
      return {
        requestId: r.id,
        studentId: r.studentId,
        initial: r.studentName.slice(0, 1),
        name: r.studentName,
        meta: r.studentMajor,
        sub: [r.type, label ? `${code} ${label}` : null, r.requestedAt.slice(0, 10).replace(/-/g, '.')]
          .filter(Boolean).join(' · '),
        status: r.status,
        tint: AVA[i % AVA.length],
      }
    })
}

// ── 내가 등록한 비교과 ───────────────────────────────────────────────────

export interface ProgramRow {
  id: string
  code: string
  title: string
  applied: number
  capacity: number
  ratio: number
  solid: string
  tint: string
  category: string
  /** 기준일 신청 인원 — 시안 "오늘 N명 신청" */
  todayCount: number
}

export function getMyPrograms(managerName: string, refDate: string, limit = 3): ProgramRow[] {
  const SOLID = ['b-teal', 'b-blue', 'b-purple']
  const TINT = ['s-teal', 's-blue', 's-purple']
  const mine = getPrograms().filter(p => p.manager === managerName)
  const list = mine.length > 0 ? mine : getPrograms()
  return list.slice(0, limit).map((p, i) => ({
    id: p.id,
    code: p.id.toUpperCase(),
    title: p.title,
    applied: p.applicants.length,
    capacity: p.capacity,
    ratio: pct(p.applicants.length, p.capacity),
    solid: SOLID[i % SOLID.length],
    tint: TINT[i % TINT.length],
    category: p.category,
    todayCount: p.applicants.filter(a => a.appliedAt.slice(0, 10) === refDate).length,
  }))
}

// ── 나의 성과 지표 ───────────────────────────────────────────────────────

export interface PerfRow {
  key: string
  name: string
  goal: number
  value: number
  tint: string
  solid: string
  ink: string
}

export function getPerformance(counselorId: string): PerfRow[] {
  const requests = getRequestsByAssignee(counselorId)
  const done = requests.filter(r => r.status === '완료')
  const closed = requests.filter(r => r.status !== '대기')
  const recorded = new Set(getCounselRecords().map(r => r.requestId))
  const written = done.filter(r => recorded.has(r.id)).length

  const roadmap = getRoadmapRequests()
  const handled = roadmap.filter(r => r.status !== '대기').length

  return [
    { key: 'progress', name: '상담 진행률', goal: 90, value: pct(done.length, closed.length), tint: 's-green', solid: 'b-green', ink: 'f-green' },
    { key: 'record', name: '상담일지 완성률', goal: 95, value: pct(written, done.length), tint: 's-teal', solid: 'b-teal', ink: 'f-teal' },
    { key: 'confirm', name: '신청 확정률', goal: 90, value: pct(closed.length, requests.length), tint: 's-orange', solid: 'b-orange', ink: 'f-orange' },
    { key: 'roadmap', name: '로드맵 요청 반영률', goal: 85, value: pct(handled, roadmap.length), tint: 's-red', solid: 'b-red', ink: 'f-red' },
  ]
}
