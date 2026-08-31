// ─────────────────────────────────────────────────────────────────────────
// 학생 상담 신청 reader (단일 접근 모듈 — 읽기)
// counselRequestsWrite 의 짝. 화면은 localStorage·원천 배열을 직접 보지 않는다.
//  · 원천: students.getStudentCounselRequests (base JSON + dc_counsel_owners 오버레이 병합)
//  · 집계·필터는 여기서 끝낸다 — 화면은 이미 정리된 행만 받는다(CLAUDE.md 규칙 10).
//    DB 전환 시 getMyCounselWeek 는 "이번 주 슬롯 조회" SQL 한 방이 된다.
// ─────────────────────────────────────────────────────────────────────────
import { getActiveStudentId, getStudentCounselRequests } from './students'
import type { CounselRequestType } from './students'
import { getCounselorLabel } from './counselorsRead'
import { PROFESSOR_GROUPS } from './professors'
import { getCounselWeek } from '../lib/counselCalendar'

/** 상태 색 기준 — 완료 민트 / 예정(확정) 파랑 / 대기 앰버 (수정.md §2-4 상태 사전) */
export type CounselWeekTone = 'pending' | 'scheduled' | 'done'

export interface CounselWeekEntry {
  id: string
  type: CounselRequestType
  typeLabel: string
  /** 상담사 또는 교수 표시명 */
  partner: string
  /** 그리드 헤더와 같은 짧은 라벨 (예: 09/01 (화)) */
  dayLabel: string
  iso: string
  time: string
  place: string
  status: string
  tone: CounselWeekTone
}

const TYPE_LABEL: Record<CounselRequestType, string> = {
  진로취업: '진로취업',
  심리: '심리',
  교수: '교수',
}

const TONE: Record<string, CounselWeekTone> = {
  대기: 'pending',
  확정: 'scheduled',
  완료: 'done',
}

/** 교수 id → 표시명. 교수 풀은 상담사 id 공간과 분리돼 있어 별도로 찾는다. */
function professorLabel(id: string | undefined): string {
  if (!id) return '교수 배정 중'
  for (const group of PROFESSOR_GROUPS) {
    for (const professors of Object.values(group.divisions)) {
      const hit = professors.find(p => p.id === id)
      if (hit) return `${hit.name} ${hit.title}`
    }
  }
  return '교수 배정 중'
}

/**
 * 활성 학생의 "이번 주(월~금)" 상담 일정을 유형 구분 없이 모아 시간순으로 반환한다.
 * 취소 건은 일정이 아니므로 제외한다. 슬롯이 아직 없는 신청도 제외한다 —
 * 날짜가 없으면 "이번 주"에 넣을 근거가 없다.
 */
export function getMyCounselWeek(base: Date = new Date()): CounselWeekEntry[] {
  const week = getCounselWeek(base)
  const dayByIso = new Map(week.map(d => [d.iso, d]))

  return getStudentCounselRequests(getActiveStudentId())
    .filter(r => r.status !== '취소')
    .filter(r => !!r.slot?.date && dayByIso.has(r.slot.date))
    .map(r => ({
      id: r.id,
      type: r.type,
      typeLabel: TYPE_LABEL[r.type] ?? r.type,
      partner: r.type === '교수' ? professorLabel(r.professorId) : getCounselorLabel(r.assignedCounselorId),
      dayLabel: dayByIso.get(r.slot!.date)!.label,
      iso: r.slot!.date,
      time: r.slot!.start,
      place: r.slot!.place ?? (r.method === '비대면' ? '비대면' : '장소 안내 예정'),
      status: r.status,
      tone: TONE[r.status] ?? 'pending',
    }))
    .sort((a, b) => (a.iso === b.iso ? a.time.localeCompare(b.time) : a.iso.localeCompare(b.iso)))
}
