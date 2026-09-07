// ─────────────────────────────────────────────────────────────────────────
// 「오늘 할 일」 파생 (CLAUDE.md 10조 — 집계는 데이터층에서)
//
// 화면이 목록을 적지 않는다. 학생의 실제 상태에서 뽑는다:
//   ① 순차 게이팅의 다음 걸음  ← careerProcess.getNextAction (진단·상담·로드맵)
//   ② 확정된 상담 일정         ← 학생 상담신청의 slot
//
// 신입생처럼 아직 아무것도 없는 학생에게는 ①만 남는다 — 「C-CORE 핵심진단 응시」 한 줄.
//
// ⚠ 여기에 시안 문구를 다시 박지 않는다. 할 일이 늘어야 하면 원천을 하나 더 읽는다.
// ─────────────────────────────────────────────────────────────────────────
import { getNextAction } from './careerProcess'
import { getPipelineState } from './pipeline'
import { getStudentCounselRequests } from './students'
import type { StudentData } from './students'

export interface TodayTask {
  id: string
  /** 할 일 한 줄 */
  title: string
  /** 부가 설명 — 어디서 온 일인지 */
  note: string
  /** 우측 표시 — 'D-2' · '14:00' · '완료' */
  when: string
  /** 눌렀을 때 갈 곳 */
  to: string
  done: boolean
}

/** 날짜 문자열(YYYY-MM-DD) → 오늘 기준 D-n 라벨. 지난 건은 '지남'. */
function dday(date: string, today: Date): string {
  const target = new Date(`${date}T00:00:00`)
  const days = Math.round((target.getTime() - new Date(today.toDateString()).getTime()) / 86400000)
  if (days === 0) return '오늘'
  if (days < 0) return '지남'
  return `D-${days}`
}

/**
 * 이 학생이 오늘 해야 할 일.
 * 순서는 「지금 막힌 것」 → 「예정된 것」이다 — 다음 단계가 늘 맨 위에 온다.
 */
export function getTodayTasks(student: StudentData, today: Date = new Date()): TodayTask[] {
  const tasks: TodayTask[] = []

  // ① 파이프라인이 막아 둔 다음 걸음. 다 끝낸 학생에게는 없다.
  const next = getNextAction(getPipelineState(student))
  if (next) {
    tasks.push({
      id: 'next-stage',
      title: next.ctaLabel,
      note: next.title,
      when: `${next.step}/${next.total}단계`,
      to: next.ctaPath,
      done: false,
    })
  }

  // ② 잡혀 있는 상담 — 확정 건만. 신청만 하고 일정이 안 나온 건은 할 일이 아니다.
  //    지난 일정은 뺀다 — 「오늘 할 일」에 어제 일이 남아 있으면 목록을 안 믿게 된다.
  const todayKey = new Date(today.toDateString()).getTime()
  const upcoming = getStudentCounselRequests(student.id)
    .filter(r => r.status === '확정' && r.slot && new Date(`${r.slot.date}T00:00:00`).getTime() >= todayKey)
    .sort((a, b) => a.slot!.date.localeCompare(b.slot!.date))

  for (const r of upcoming) {
    tasks.push({
      id: `counsel-${r.id}`,
      title: `${r.slot!.date} ${r.slot!.start} ${r.type}상담`,
      note: r.topic,
      when: dday(r.slot!.date, today),
      to: '/counsel/record',
      done: false,
    })
  }

  // 카드가 작다 — 가장 급한 3건까지만 보인다(나머지는 「전체 일정 보기」로).
  return tasks.slice(0, 3)
}
