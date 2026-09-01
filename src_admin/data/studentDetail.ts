// ─────────────────────────────────────────────────────────────────────────
// 학생 상세 화면(StudentDetailView) 집계 로더 — 7개 탭이 구독하는 단일 소스.
//
// CLAUDE.md 10조: 집계는 데이터 층에서 한다. 화면 컴포넌트가 전체 배열을 받아
// 계산하지 않는다 — 아래 함수 하나가 DB 전환 시 집계 SQL 한 개가 되어야 한다.
// CLAUDE.md 12조: 재생성 금지. 역량 점수는 src_v2/lib/scoring(학생 화면 3곳이 이미
// 쓰는 계산식)을, 검사 목록은 careerProcess(DIAGNOSIS_MODULES)를 그대로 구독한다.
//
// ⚠ 여기서 새 판정식·새 유형·새 축을 만들지 않는다(14조). 원천이 주는 값만 옮긴다.
// ─────────────────────────────────────────────────────────────────────────
import type { StudentData } from '../../src_v2/data/students'
import type { RoadmapAxis, RoadmapAxisPlan } from '../../src_v2/data/schema/roadmap'
import type { StudentStat } from '../../src_v2/components/StudentStatCards'
import { getCompetencyAxes, getCompetencyOverall } from '../../src_v2/data/competency'
import type { CompetencyAxisView } from '../../src_v2/data/competency'
import { DIAGNOSIS_MODULES, getRequiredTests, type DiagnosisModule, type StudentType } from '../../src_v2/data/careerProcess'
import { getAttemptsByStudent } from './diagnosisAttempts'
import type { DiagnosisAttempt } from './schema/diagnosisAttempt'
import { getRecordsByStudent } from './counselRecords'
import { getCounselRequests } from './counselRequests'
import { getCounselorById } from './counselors'
import { getProfCounselRecords } from './profCounselRecords'
import { PROF_COUNSEL_CATEGORIES, type ProfCounselCategoryCode } from './schema/profCounselRecord'
import { getPrograms } from './programs'
import type { ProgramApplicant } from './schema/program'
import { getStudentRoadmap, getRoadmapProgress } from './roadmap'
import { getRoadmapRequests } from './roadmapRequests'

// ── ① 역량 레이더 (5대 핵심역량 카드) ──────────────────────────────────────
// 축·점수는 학생 포털과 같은 곳에서 온다(src_v2/data/competency).
// 같은 학생에게 두 포털이 다른 점수를 보이면 안 되므로 여기서 다시 계산하지 않는다.

export type CompetencyAxis = CompetencyAxisView

export interface CompetencyRadar {
  axes: CompetencyAxis[]
  /** 종합 점수 — 5개 축 평균 */
  overall: number
  /** 종합 목표선 */
  overallTarget: number
  /** 갭이 가장 큰 축 (보강 1순위) */
  weakest: CompetencyAxis
}

export function getCompetencyRadar(student: StudentData): CompetencyRadar {
  const axes = getCompetencyAxes(student)
  const weakest = axes.reduce((lo, a) => (a.gap < lo.gap ? a : lo), axes[0])
  return {
    axes,
    overall: getCompetencyOverall(student),
    overallTarget: axes[0]?.target ?? 75,
    weakest,
  }
}

// ── ② 진단 결과 카드 (시안 diagnosis-result-grid) ──────────────────────────

export type DiagnosisCardState = '완료' | '진행중' | '미실시'

/** 진단 카드 1장 — 검사 정의(careerProcess) × 응시 이력(dc_diag_attempts) */
export interface DiagnosisCard {
  module: DiagnosisModule
  state: DiagnosisCardState
  /** 완료 건의 결과 요약 한 줄 (검사가 결정한 값) */
  resultSummary?: string
  completedAt?: string
  /** 회차 — 2 이상이면 재검사 */
  attemptNo?: number
  /** 결과 요약을 '·' 로 쪼갠 태그 (시안 diagnosis-result-tags) */
  tags: string[]
  /** 시안 --result-color 에 대응하는 틴트 유틸 클래스 */
  tint: string
}

/** 검사별 색 — DESIGN.md 7색 안에서만 고른다. 새 색을 만들지 않는다. */
const TEST_TINT: Record<string, string> = {
  CCORE: 'purple', C1: 'green', C2: 'blue', C3: 'teal', C4: 'yellow', C5: 'orange', C6: 'red',
}

/**
 * 학생이 봐야 할 검사 목록 × 응시 이력 병합.
 * 대상 검사는 getRequiredTests(유형) — CCORE + 그 유형의 후속진단만. 전체 7종을 늘어놓지 않는다.
 */
export function getDiagnosisCards(studentId: string, type: StudentType): DiagnosisCard[] {
  const attempts = getAttemptsByStudent(studentId)
  const latest = new Map<string, DiagnosisAttempt>()
  for (const a of attempts) {
    const prev = latest.get(a.testId)
    if (!prev || a.attemptNo > prev.attemptNo) latest.set(a.testId, a)
  }

  const required = getRequiredTests(type)
  const modules = required.length > 0 ? required : DIAGNOSIS_MODULES.filter(m => m.id === 'CCORE')

  return modules.map(module => {
    const a = latest.get(module.testId)
    const state: DiagnosisCardState = !a ? '미실시' : a.status === '완료' ? '완료' : '진행중'
    return {
      module,
      state,
      resultSummary: a?.resultSummary,
      completedAt: a?.completedAt,
      attemptNo: a?.attemptNo,
      tags: a?.resultSummary ? a.resultSummary.split('·').map(s => s.trim()).filter(Boolean) : [],
      tint: TEST_TINT[module.id] ?? 'blue',
    }
  })
}

// ── ③ 상담 현황 (시안 counseling-detail-grid) ──────────────────────────────

/** 상담 3종 — 진로취업·심리는 CounselRequest, 지도교수는 별도 소스(ProfCounselRecord) */
export type CounselChannel = '진로취업' | '심리' | '지도교수'

export interface CounselChannelRow {
  title: string
  /** 담당자 이름 스냅샷 */
  by: string
  /** YYYY-MM-DD */
  date: string
  status: string
}

export interface CounselChannelSummary {
  channel: CounselChannel
  desc: string
  tint: string
  total: number
  done: number
  upcoming: number
  /** 최근순 기록 (최대 3건) */
  rows: CounselChannelRow[]
}

/** 채널 색은 index.css 의 --counsel-1/2/3 이 정본이다. 여기 값은 그 매핑을 따른다.
 *  ⚠ 심리를 red 로 두지 않는다 — red 는 위험·오류 색이라 상담 유형에 쓰면 뜻이 어긋난다. */
const CHANNEL_META: Record<CounselChannel, { desc: string; tint: string }> = {
  진로취업: { desc: '직무·취업 준비 상담', tint: 'green' },
  심리: { desc: '검사 해석·정서 상담', tint: 'purple' },
  지도교수: { desc: '학업·진로 방향 상담', tint: 'blue' },
}

const byDateDesc = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date)

/** 교수상담 구분 코드 → 라벨 (SY_CODE GRP 0131 미러). 한글 리터럴을 값으로 쓰지 않는다. */
function profCategoryLabel(code: ProfCounselCategoryCode): string {
  return PROF_COUNSEL_CATEGORIES.find(c => c.code === code)?.label ?? '기타'
}

/** 학생 1명의 상담 3채널 집계. DB 전환 시 채널별 COUNT + 최근 3건 쿼리. */
export function getCounselOverview(studentId: string): CounselChannelSummary[] {
  const requests = getCounselRequests().filter(r => r.studentId === studentId)
  const records = getRecordsByStudent(studentId)
  const profRecords = getProfCounselRecords().filter(r => r.studentId === studentId)

  const fromRequests = (channel: Exclude<CounselChannel, '지도교수'>): CounselChannelSummary => {
    const mine = requests.filter(r => r.type === channel)
    const rows: CounselChannelRow[] = mine.map(r => {
      const rec = records.find(x => x.requestId === r.id)
      return {
        title: rec?.topic ?? r.topic,
        // 완료 건은 기록지 스냅샷을, 미완료 건은 현재 배정 상담사를 쓴다.
        by: rec?.counselorName ?? getCounselorById(r.assignedCounselorId)?.name ?? '미배정',
        date: r.slot?.date ?? r.requestedAt.slice(0, 10),
        status: r.status,
      }
    })
    return {
      channel,
      ...CHANNEL_META[channel],
      total: mine.length,
      done: mine.filter(r => r.status === '완료').length,
      upcoming: mine.filter(r => r.status === '확정').length,
      rows: rows.sort(byDateDesc).slice(0, 3),
    }
  }

  const prof: CounselChannelSummary = {
    channel: '지도교수',
    ...CHANNEL_META['지도교수'],
    total: profRecords.length,
    done: profRecords.length, // 교수상담은 기록이 곧 완료 건이다
    upcoming: 0,
    rows: profRecords
      .map(r => ({ title: profCategoryLabel(r.categoryCode), by: r.professorName, date: r.date, status: '완료' }))
      .sort(byDateDesc)
      .slice(0, 3),
  }

  return [fromRequests('진로취업'), fromRequests('심리'), prof]
}

// ── ④ 비교과 프로그램 (신규 탭) ────────────────────────────────────────────

export interface StudentProgramRow {
  programId: string
  title: string
  category: string
  /** 운영 기간 표시용 */
  period: string
  appliedAt: string
  attendance: ProgramApplicant['attendance']
  selectionStatus: string
  outcomeStatus: string
}

export interface StudentProgramSummary {
  rows: StudentProgramRow[]
  applied: number
  /** 수료 처리된 건 */
  completed: number
  /** 출석 처리된 건 */
  attended: number
}

/** 학생이 신청한 비교과 목록 + 이수 집계. DB 전환 시 applicants JOIN programs. */
export function getStudentPrograms(studentId: string): StudentProgramSummary {
  const rows: StudentProgramRow[] = []
  for (const p of getPrograms()) {
    const a = p.applicants.find(x => x.studentId === studentId)
    if (!a) continue
    rows.push({
      programId: p.id,
      title: p.title,
      category: p.category,
      period: p.runStartDate ? `${p.runStartDate} ~ ${p.runEndDate ?? ''}` : `${p.startDate} ~ ${p.endDate}`,
      appliedAt: a.appliedAt.slice(0, 10),
      attendance: a.attendance,
      selectionStatus: a.selectionStatus ?? '대기',
      outcomeStatus: a.outcomeStatus ?? '-',
    })
  }
  rows.sort((x, y) => y.appliedAt.localeCompare(x.appliedAt))
  return {
    rows,
    applied: rows.length,
    completed: rows.filter(r => r.outcomeStatus === '수료').length,
    attended: rows.filter(r => r.attendance === '출석').length,
  }
}

// ── ⑤ 목표 달성 계획 = 로드맵 3축 ──────────────────────────────────────────
// 시안의 3열(IAP실행 / 핵심역량수행 / 내성장활동)이 곧 확정 프로세스의 3축이다.
// 축·칸·이행률은 data/roadmap.ts 가 조립한다 — 여기서 다시 세지 않는다.

export interface GoalPlan {
  /** 목표 직무 */
  role: string
  company: string
  /** 전체 이행률 % — 수행 완료 칸 ÷ 살아 있는 전체 칸 (PROCESS.md §6-5) */
  progress: number
  done: number
  total: number
  axes: RoadmapAxisPlan[]
  origin: Record<RoadmapAxis, 'base' | 'override'>
  /** 상담사 확정 로드맵 버전 (없으면 null) */
  version: number | null
  confirmed: boolean
}

/** 로드맵 이행률 % — 단일 소스는 data/roadmap.ts. 재구현하지 않는다. */
export { getRoadmapProgress }

export function getGoalPlan(student: StudentData): GoalPlan | null {
  const roadmap = getStudentRoadmap(student.id)
  if (!roadmap) return null

  return {
    role: student.targetCompany.role,
    company: student.targetCompany.name,
    progress: roadmap.progress.pct,
    done: roadmap.progress.done,
    total: roadmap.progress.total,
    axes: roadmap.axes,
    origin: roadmap.origin,
    version: roadmap.meta?.version ?? null,
    confirmed: roadmap.meta?.confirmed ?? false,
  }
}

// ── ⑥ 헤더 요약 지표 (시안 stats 행) ───────────────────────────────────────

/**
 * 상세 헤더 요약 지표 5장 — 진단·상담·이행률·비교과·성장레벨.
 * 화면(StudentStatCards)은 그리기만 하므로 문구까지 여기서 완성해 넘긴다.
 * 카드 순서·종류는 학생 라운지(/v2/lounge)와 같다 — 같은 공용 컴포넌트를 쓴다.
 */
export function getStudentStatCards(student: StudentData, type: StudentType): StudentStat[] {
  const cards = getDiagnosisCards(student.id, type)
  const diagDone = cards.filter(c => c.state === '완료').length
  const counsel = getCounselOverview(student.id)
  const counselTotal = counsel.reduce((n, c) => n + c.total, 0)
  const counselDone = counsel.reduce((n, c) => n + c.done, 0)
  // 요약 카드의 갈래는 「누가 상담했나」(진로취업·심리·지도교수)가 아니라
  // 「어떤 경로로 들어왔나」다. 진로취업을 일반 신청과 로드맵 변경 요청으로 가르고,
  // 나머지(심리·지도교수)는 기타로 묶는다.
  // ★ 라벨만 바꾸면 숫자가 거짓말이 된다 — 세는 대상을 함께 바꾼다.
  const careerCount = counsel.find(c => c.channel === '진로취업')?.total ?? 0
  const roadmapReqCount = getRoadmapRequests().filter(r => r.studentId === student.id).length
  const etcCount = counsel
    .filter(c => c.channel !== '진로취업')
    .reduce((n, c) => n + c.total, 0)
  const roadmap = getStudentRoadmap(student.id)
  const progress = roadmap?.progress.pct ?? 0
  const programs = getStudentPrograms(student.id)
  const growth = student.growth

  const allDiagDone = cards.length > 0 && diagDone === cards.length
  // 이 네 장은 CARE 7+ 체계의 지표다 — 카드마다 같은 문자열을 다시 적지 않는다.
  const CARE = 'CARE 7+'

  /**
   * ⚠️ 시연용 고정값 — 진단 완료는 「2/2」로 못박는다(요청).
   *
   * 원래는 getDiagnosisCards 가 준 대상 진단 수에서 계산한다. 진단 문항·판정식이
   * 아직 확정 전이라(PROCESS.md §9 · CLAUDE.md 14조) 학생 시드에 따라 값이 흔들리는데,
   * 시연에서는 이 카드가 항상 같은 수를 보여야 한다.
   *
   * ★ 진단 스펙이 확정되면 이 블록을 통째로 지우고 아래 계산식을 되살린다:
   *     value: String(diagDone)
   *     unit: `/${cards.length}`
   *     pct:  cards.length > 0 ? Math.round((diagDone / cards.length) * 100) : 0
   *     foot: allDiagDone ? '대상 진단 모두 완료' : `미실시 ${cards.length - diagDone}건`
   *     badge: allDiagDone ? '완료' : '진행 중'
   *   (diagDone·allDiagDone 은 그때 다시 쓰인다 — 지우지 말 것)
   */
  const DEMO_DIAGNOSIS = { done: 2, total: 2 }
  void diagDone
  void allDiagDone

  const stats: StudentStat[] = [
    {
      kind: 'diagnosis',
      kicker: CARE,
      label: '진단 완료',
      value: String(DEMO_DIAGNOSIS.done),
      unit: `/${DEMO_DIAGNOSIS.total}`,
      pct: Math.round((DEMO_DIAGNOSIS.done / DEMO_DIAGNOSIS.total) * 100),
      foot: '대상 진단 모두 완료',
      badge: '완료',
    },
    {
      kind: 'counsel',
      kicker: CARE,
      label: '상담 현황',
      // 총계는 상담 건수 그대로 둔다 — 로드맵 요청은 상담이 아니라 요청이라 합계에 섞지 않는다.
      total: String(counselTotal),
      unit: '건',
      foot: counselTotal > 0 ? `완료 ${counselDone} · 예정 ${counselTotal - counselDone}` : '이력 없음',
      // 순서가 색을 정한다 — 아래 순서를 바꾸면 카드의 점 색이 함께 바뀐다.
      channels: [
        { label: '진로취업-일반', count: `${careerCount}건` },
        { label: '진로취업 - 로드맵요청', count: `${roadmapReqCount}건` },
        { label: '기타', count: `${etcCount}건` },
      ],
    },
    {
      kind: 'roadmap',
      kicker: CARE,
      label: '로드맵 이행률',
      value: String(progress),
      unit: '%',
      pct: progress,
      foot: roadmap ? `수행 ${roadmap.progress.done} / 전체 ${roadmap.progress.total}칸` : '로드맵 미생성',
      badge: roadmap ? `${roadmap.progress.done}칸 완료` : '없음',
    },
    {
      kind: 'program',
      kicker: CARE,
      label: '비교과 이수',
      value: String(programs.completed),
      unit: `/${programs.applied}`,
      pct: programs.applied > 0 ? Math.round((programs.completed / programs.applied) * 100) : 0,
      foot: programs.applied === 0 ? '신청 이력 없음' : `이번 학기 ${programs.attended}건`,
      badge: programs.applied === 0 ? '없음' : `${programs.applied - programs.completed}건 남음`,
    },
  ]

  // 성장 레벨은 시드에 growth 블록이 있는 학생만 (승급 산식 미확정 — PROCESS.md §9)
  if (growth) {
    stats.push({
      kind: 'level',
      label: '성장 레벨',
      levelUnit: 'LV',
      level: String(growth.level),
      tierLabel: '현재 성장 단계',
      tier: growth.tier,
      xp: `${growth.xp.toLocaleString('ko-KR')} XP`,
      xpFoot: `다음 레벨까지 ${(growth.xpNext - growth.xp).toLocaleString('ko-KR')} XP`,
      pct: growth.xpNext > 0 ? Math.round((growth.xp / growth.xpNext) * 100) : 0,
    })
  }

  return stats
}
