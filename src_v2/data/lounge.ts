import { programList } from '../../shared/programStore'
import { roadmapEnvelope } from '../../shared/roadmapStore'
import type { StudentStat } from '../components/StudentStatCards'
import { getStageAccess } from './careerProcess'
import { getDiagnosisCardViews, getPipelineState } from './pipeline'
import { getStudentCounselRequests, type StudentData } from './students'
import { counselBucketChannels } from './counselTrack'
import { ROADMAP_AXIS_MAP } from './schema/roadmap'

/** All records come from authenticated PostgreSQL API stores. */
export function getLoungeData(student: StudentData) {
  const diagnosis = getDiagnosisCardViews(student)
  const done = diagnosis.filter(c => c.status === 'done').length
  const requests = getStudentCounselRequests(student.id)
  const active = requests.filter(r => r.status !== '취소')
  const access = getStageAccess(getPipelineState(student))
  const plan = roadmapEnvelope(student.id)?.roadmap
  const roadmap = plan?.confirmed ? plan : null
  const applications = programList().flatMap(p => p.applicants.filter(a => a.studentId === student.id))
  const completed = applications.filter(a => a.outcomeStatus === 'COMPLETED').length
  const stats: StudentStat[] = [
    { kind:'diagnosis', kicker:'CARE 7+', label:'진단 완료', value:String(done), unit:`/${diagnosis.length}`, pct:diagnosis.length ? Math.round(done/diagnosis.length*100) : 0, foot:done === diagnosis.length ? '대상 진단 모두 완료' : '대상 진단 진행 중' },
    { kind:'counsel', kicker:'CARE 7+', label:'상담 현황', total:String(active.length), unit:'건', foot:'전체 누적 · 취소 제외', channels:counselBucketChannels(active) },
    { kind:'roadmap', kicker:'CARE 7+', label:'로드맵 이행률', value:String(roadmap?.progress.pct ?? 0), unit:'%', pct:roadmap?.progress.pct ?? 0, foot:roadmap ? `완료 ${roadmap.progress.done} / 전체 ${roadmap.progress.total}칸` : '', lockedReason:roadmap ? undefined : '상담 후 로드맵이 확정되면 확인할 수 있습니다.' },
    { kind:'program', label:'비교과 이수', value:String(completed), unit:`/${applications.length}`, pct:applications.length ? Math.round(completed/applications.length*100) : 0, foot:'전체 신청 대비 이수', lockedReason:access.growth !== 'open' && applications.length === 0 ? '로드맵 확정 후 비교과 이수를 확인할 수 있습니다.' : undefined },
    { kind:'level', label:'성장 레벨', levelUnit:'', level:'', tierLabel:'', tier:'', xp:'', xpFoot:'', pct:0, lockedReason:'성장 레벨·XP 연계 준비 중입니다.' },
  ]
  return {stats, diagnosis, requests, roadmap, access}
}

/** 라운지 「이번 주 할 일」 한 줄 — 날짜가 있는 내 일정만 모은다. */
export interface WeeklyTodo {
  id: string
  title: string
  sub: string
  /** YYYY-MM-DD */
  date: string
  /** 오늘 기준 남은 날 (0 = 오늘) */
  dday: number
  to: string
}

function dayDiff(date: string, today: Date): number {
  const due = new Date(`${date.slice(0, 10)}T00:00:00`)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - base.getTime()) / 86400000)
}

/**
 * 이번 주 할 일 — 확정된 상담 · 선발된 비교과의 운영 시작 · 로드맵 추천 칸의 신청 마감.
 * 전부 날짜가 실제로 있는 기록에서만 나온다. 지난 것은 빼고 가까운 순으로 준다.
 * 화면은 이 목록을 그리기만 한다 — 어떤 기록이 「할 일」인지는 여기서만 정한다.
 */
export function getWeeklyTodos(student: StudentData, today: Date = new Date()): WeeklyTodo[] {
  const items: Omit<WeeklyTodo, 'dday'>[] = []
  for (const r of getStudentCounselRequests(student.id)) {
    if (r.status === '확정' && r.slot) items.push({ id: `counsel:${r.id}`, title: `상담 예약 — ${r.topic}`, sub: `${r.type} · ${r.slot.start}~${r.slot.end} · ${r.method}`, date: r.slot.date, to: '/counsel/record' })
  }
  for (const p of programList()) {
    const mine = p.applicants.find(a => a.studentId === student.id && a.selectionStatus === 'SELECTED' && !a.outcomeStatus)
    if (mine && p.runStartDate) items.push({ id: `program:${p.id}`, title: `${p.title} 참여`, sub: `${p.runStartDate.replace(/-/g, '.')} 시작 · ${p.sessions}회차`, date: p.runStartDate, to: `/growth/program/${p.id}` })
  }
  const plan = roadmapEnvelope(student.id)?.roadmap
  if (plan?.confirmed) for (const axis of plan.axes) for (const c of axis.cells) {
    if (c.status !== 'DONE' && c.expiresAt) items.push({ id: `cell:${c.id}`, title: c.title, sub: `${ROADMAP_AXIS_MAP[axis.axis].label} · 신청 마감 ${c.expiresAt.slice(0, 10).replace(/-/g, '.')}`, date: c.expiresAt.slice(0, 10), to: '/roadmap/skill-tree' })
  }
  return items.map(i => ({ ...i, dday: dayDiff(i.date, today) })).filter(i => i.dday >= 0).sort((a, b) => a.dday - b.dday)
}
