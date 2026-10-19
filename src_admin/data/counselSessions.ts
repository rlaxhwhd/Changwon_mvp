// ─────────────────────────────────────────────────────────────────────────
// 상담 진행 대장 — 확정된(아직 진행하지 않은) 내 담당 상담 1건 = 1행.
//
// 접수함은 오늘 이후 신청만 다루고, 상담일지는 완료된 상담만 다룬다.
// 그 사이 — 일정이 잡혔지만 아직 완료·불참 처리되지 않은 상담 — 를 여기서 모아 상담 진행 화면으로 보낸다.
// 판정·집계는 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면이 다시 세지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { getRequestsByAssignee, splitMajorGrade } from './counselRequests'
import type { CounselMethod, CounselRequestType } from './schema/counselRequest'
import type { CareTrack } from '../../src_v2/data/counselTrack'
import type { StudentType } from '../../src_v2/data/careerProcess'

/** 일정 기준 진행 시점 — 오늘 / 예정 / 지난 일정(완료·불참 처리 대기) */
export type SessionTiming = '오늘' | '예정' | '지남'

export const SESSION_TIMINGS: SessionTiming[] = ['오늘', '예정', '지남']

/** 배지 색 — 다른 목록의 상태 배지와 같은 토큰을 쓴다 */
export const SESSION_TIMING_CLASS: Record<SessionTiming, string> = {
  오늘: 'admin-chip-ok',
  예정: 'admin-chip-cancel',
  지남: 'admin-chip-wait',
}

export interface SessionRow {
  requestId: string
  studentId: string
  studentNo: string
  studentName: string
  studentMajor: string
  studentType: StudentType | null
  type: CounselRequestType
  careTrack?: CareTrack
  method: CounselMethod
  topic: string
  /** 상담일 YYYY-MM-DD */
  date: string
  /** 상담 시간 HH:mm~HH:mm (슬롯 없으면 빈 값) */
  time: string
  timing: SessionTiming
}

const pad = (value: number) => String(value).padStart(2, '0')
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

/** 상담사 1명의 진행 대장 — 상담일·시간 순(지난 일정이 맨 위로 온다). */
export function getSessionRows(counselorId: string): SessionRow[] {
  const today = todayKey()
  return getRequestsByAssignee(counselorId)
    .filter(r => r.status === '확정')
    .map(r => {
      const date = r.slot?.date ?? r.requestedAt.slice(0, 10)
      const timing: SessionTiming = date === today ? '오늘' : date > today ? '예정' : '지남'
      return {
        requestId: r.id,
        studentId: r.studentId,
        studentNo: r.studentNo,
        studentName: r.studentName,
        // 상담 시드의 studentMajor 에는 학년이 붙어 있다 — 쪼개는 규칙은 counselRequests 가 갖고 있다.
        studentMajor: splitMajorGrade(r.studentMajor).major,
        studentType: r.studentType,
        type: r.type,
        careTrack: r.careTrack,
        method: r.method,
        topic: r.topic,
        date,
        time: r.slot ? `${r.slot.start}~${r.slot.end}` : '',
        timing,
      }
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
}

/** 상단 요약 — 진행 시점별 건수. DB 전환 시 COUNT 쿼리. */
export function getSessionSummary(rows: SessionRow[]) {
  const count = (t: SessionTiming) => rows.filter(r => r.timing === t).length
  return { total: rows.length, 오늘: count('오늘'), 예정: count('예정'), 지남: count('지남') }
}

/** 학과 드롭다운 — 대장에 실제로 있는 학과만(상담일지와 같은 규약). */
export function getSessionMajors(rows: SessionRow[]) {
  return [...new Set(rows.map(r => r.studentMajor))].sort()
}
