// ─────────────────────────────────────────────────────────────────────────
// 성장 활동 기록 = 플랫폼 활동 로그.
//
// 학생이 손으로 쓰는 기록이 아니다 — 진단 완료·상담·로드맵 생성/확정/이행·비교과 신청/수료·
// 자격증·프로젝트 등 등록이 일어난 시각을 서버가 각 정본에서 모아 준다
// (GET /students/{id}/growth/activity-log). 「내 성장」과 라운지가 같은 값을 읽는다.
// 라벨·색은 kind 코드로 여기서 한 번만 붙인다(CLAUDE.md 4조).
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { getModuleByTestId } from './careerProcess'

interface ActivityRow { kind: string; at: string; title: string; ref: string }

export interface ActivityItem {
  key: string
  date: string
  /** 분류 — 진단·상담·로드맵·비교과·성장 기록 */
  type: string
  title: string
  /** 무슨 일이 있었는지 — 「자격증 등록」 같은 행위 */
  action: string
  tone: 'violet' | 'blue' | 'amber' | 'mint'
}

const LOOK: Record<string, { type: string; action: string; tone: ActivityItem['tone'] }> = {
  DIAGNOSIS_DONE:     { type: '진단', action: '진단 완료', tone: 'violet' },
  COUNSEL_REQUEST:    { type: '상담', action: '상담 신청', tone: 'blue' },
  COUNSEL_DONE:       { type: '상담', action: '상담 완료', tone: 'blue' },
  ROADMAP_CREATE:     { type: '로드맵', action: '로드맵 생성', tone: 'amber' },
  ROADMAP_REGENERATE: { type: '로드맵', action: '로드맵 재생성', tone: 'amber' },
  ROADMAP_CONFIRM:    { type: '로드맵', action: '로드맵 확정', tone: 'amber' },
  ROADMAP_ITEM_DONE:  { type: '로드맵', action: '로드맵 항목 이행', tone: 'amber' },
  PROGRAM_APPLY:      { type: '비교과', action: '비교과 신청', tone: 'mint' },
  PROGRAM_COMPLETE:   { type: '비교과', action: '비교과 수료', tone: 'mint' },
  GROWTH_CERTIFICATE: { type: '성장 기록', action: '자격증 등록', tone: 'violet' },
  GROWTH_LANGUAGE:    { type: '성장 기록', action: '어학 성적 등록', tone: 'violet' },
  GROWTH_PROJECT:     { type: '성장 기록', action: '프로젝트 등록', tone: 'violet' },
  GROWTH_SKILL:       { type: '성장 기록', action: '스킬 등록', tone: 'violet' },
  GROWTH_AWARD:       { type: '성장 기록', action: '수상 등록', tone: 'violet' },
  GROWTH_JOURNAL:     { type: '성장 기록', action: '성장경험일지 작성', tone: 'violet' },
}

const kstDate = (at: string) => new Date(at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

function toItem(row: ActivityRow, index: number): ActivityItem {
  const look = LOOK[row.kind] ?? { type: '활동', action: '', tone: 'blue' as const }
  const title = row.kind === 'DIAGNOSIS_DONE' ? (getModuleByTestId(row.ref)?.name ?? row.title)
    : row.kind.startsWith('COUNSEL_') ? `${row.ref} 상담 · ${row.title}`
    : row.title
  return { key: `${row.kind}-${row.ref}-${row.at}-${index}`, date: kstDate(row.at), type: look.type,
           title: title || look.action, action: title ? look.action : '', tone: look.tone }
}

/** 로그의 원천 이벤트 — 같은 브라우저에서 생긴 변화는 바로 다시 읽는다. */
const SOURCE_EVENTS = ['dc_growth_changed', 'dc_roadmap_changed', 'dc_programs_changed', 'dc:diagnosis-updated', 'dc:counsel-updated']

export function useActivityLog(studentId: string, limit = 30) {
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const bump = () => setRevision(value => value + 1)
    SOURCE_EVENTS.forEach(name => window.addEventListener(name, bump))
    return () => SOURCE_EVENTS.forEach(name => window.removeEventListener(name, bump))
  }, [])
  useEffect(() => {
    let alive = true
    api<{ items: ActivityRow[] }>(`/students/${encodeURIComponent(studentId)}/growth/activity-log?limit=${limit}`)
      .then(result => { if (alive) { setItems(result.items.map(toItem)); setError('') } })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : '활동 기록을 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [studentId, limit, revision])
  return { items, error }
}
