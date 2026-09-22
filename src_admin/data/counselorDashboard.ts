// 홈의 운영 숫자와 목록은 전용 API가 집계한다. 이 모듈은 표시 형식만 변환한다.
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../shared/api'
import type { StoredCounselRequest } from '../../shared/counselStore'
import type { CounselIntakeAnswer } from '../../src_v2/data/counselIntake'
import { STUDENT_TYPES, type StudentType } from '../../src_v2/data/careerProcess'
import { isCare7 } from '../../src_v2/data/counselTrack'
import { TYPE_TINT, typeColorVar, typeSwatchClass } from './studentRoster'

export interface Dashboard {
  uncontacted: { total: number; diagnosis: number; counsel: number; roadmap: number }
  refDate: string
  role: 'career' | 'psych'
  counts: { today: number; todayDone: number; pending: number; confirmed: number; done: number; active: number; recorded: number; recordCount: number }
  distribution: {
    total: number
    groups: { key: StudentType | null; label: string; count: number }[]
    risk: { base: number; high: number; core: number }
  }
  timeline: StoredCounselRequest[]
  intake: StoredCounselRequest[]
  programs: { id: string; title: string; category: string; capacity: number; applied: number; todayCount: number }[]
  programCount: number
  roadmap: { total: number; pending: number } | null
}

interface BriefingData {
  request: StoredCounselRequest
  doneCount: number
  roadmap: { targetRole: string; targetCompany: { name?: string }; status: string; progress: number } | null
  diagnoses: { total: number; done: number } | null
  intake: CounselIntakeAnswer[]
}

/** Re-fetch on entry, focus, visible-tab polling and in-app counseling changes.
 * Identity/path keys and AbortController prevent stale cross-account responses.
 * Failed refreshes retain data with an explicit stale/error banner, never zeroes.
 */
function useResource<T>(path: string | null, identity: string) {
  const key = `${identity}:${path}`
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' })
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(v => v + 1), [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    let running = false
    const load = async () => {
      if (running || controller.signal.aborted) return
      running = true
      try {
        const data = await api<T>(path, { signal: controller.signal })
        if (!controller.signal.aborted) setState({ key, data, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setState(previous => ({
          key, data: previous.key === key ? previous.data : null,
          error: error instanceof Error ? error.message : '조회하지 못했습니다.',
        }))
      } finally { running = false }
    }
    const visible = () => { if (document.visibilityState === 'visible') void load() }
    void load()
    const timer = window.setInterval(visible, 30_000)
    window.addEventListener('focus', visible)
    window.addEventListener('dc:counsel-updated', visible)
    document.addEventListener('visibilitychange', visible)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', visible)
      window.removeEventListener('dc:counsel-updated', visible)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [path, identity, key, revision])
  const current = state.key === key ? state : { data: null, error: '' }
  return { ...current, refresh }
}

export function useCounselDashboard(identity: string) {
  return useResource<Dashboard>('/counsel-dashboard', identity)
}

export function useCounselBriefing(requestId: string | null, identity: string) {
  const resource = useResource<BriefingData>(requestId ? `/counsel-dashboard/requests/${encodeURIComponent(requestId)}` : null, identity)
  return { ...resource, data: resource.data ? getBriefing(resource.data) : null }
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round(part / total * 1000) / 10
}

export function getHelloSummary(data: Dashboard) {
  return { refDate: data.refDate, todayCount: data.counts.today, todayDone: data.counts.todayDone,
    studentCount: data.distribution.total, recordCount: data.counts.recordCount }
}

export function getKpis(data: Dashboard) {
  const c = data.counts
  const cards = [
    { key: 'today', name: '오늘 상담', value: c.today, unit: '건', ratio: pct(c.todayDone, c.today), detail: `${c.todayDone} / ${c.today} 완료`, tint: 's-green', solid: 'b-green' },
    { key: 'intake', name: '접수 대기', value: c.pending, unit: '건', ratio: pct(c.confirmed, c.pending + c.confirmed), detail: `${c.confirmed} / ${c.pending + c.confirmed} 확정`, tint: 's-orange', solid: 'b-orange' },
    { key: 'record', name: '상담일지 미작성', value: c.done - c.recorded, unit: '건', ratio: pct(c.recorded, c.done), detail: `${c.recorded} / ${c.done} 작성`, tint: 's-purple', solid: 'b-purple' },
  ]
  if (data.roadmap) {
    const { total, pending } = data.roadmap
    cards.splice(2, 0, { key: 'roadmap', name: '로드맵 변경요청', value: pending, unit: '건', ratio: pct(total - pending, total), detail: `${total - pending} / ${total} 처리`, tint: 's-red', solid: 'b-red' })
  }
  return cards
}

export function getTypeDistribution(data: Dashboard) {
  const { total, groups } = data.distribution
  let cursor = 0
  const slices = groups.map(group => {
    const ratio = pct(group.count, total)
    const from = cursor
    cursor += total ? group.count / total * 100 : 0
    return { code: group.key, label: group.label, count: group.count, ratio,
      swatch: group.key ? typeSwatchClass(group.key) : '', from, to: cursor }
  })
  const stops = [...slices.map(s => `${typeColorVar(s.code)} ${s.from}% ${s.to}%`),
    `${typeColorVar(null)} ${Math.min(cursor, 100)}% 100%`].join(', ')
  return { total, slices, gradient: `conic-gradient(${stops})` }
}

function timelineItem(r: StoredCounselRequest) {
  const meta = r.studentType ? STUDENT_TYPES.find(t => t.code === r.studentType) : undefined
  return { requestId: r.id, studentId: r.studentId, time: r.slot?.start ?? '시간 미정',
    name: r.studentName, meta: `${r.studentMajor} · ${r.method}`, typeCode: r.studentType,
    typeLabel: meta?.label, typeTint: r.studentType ? TYPE_TINT[r.studentType] : undefined,
    // 일반 진로취업 상담과 CARE 7+ 연계 상담을 카드에서 가른다 — 판정은 counselTrack 단일 소스.
    care7: r.type === '진로취업' && isCare7(r.careTrack),
    topic: r.topic, status: r.status }
}

export function getTodayTimeline(data: Dashboard) { return data.timeline.map(timelineItem) }

function getBriefing(data: BriefingData) {
  const r = data.request
  const item = timelineItem(r)
  // 상담 전 확인 순서: 진단 → 상담 횟수 → 로드맵 이행률.
  const scores = [
    { label: '진단 완료', value: data.diagnoses ? String(data.diagnoses.done) : '없음', unit: data.diagnoses ? `/${data.diagnoses.total}` : '', ink: 'f-blue' },
    { label: '상담 횟수', value: String(data.doneCount), unit: '회', ink: 'f-orange' },
    data.roadmap
      ? { label: '로드맵 이행률', value: String(data.roadmap.progress), unit: '%', ink: 'f-green' }
      : { label: '로드맵 이행률', value: '생성 전', unit: '', ink: 'f-purple' },
  ]
  const rows = [{ label: '상담 주제', value: r.topic, tint: 's-blue' }]
  if (data.roadmap) {
    rows.push({ label: '목표', value: [data.roadmap.targetRole, data.roadmap.targetCompany?.name].filter(Boolean).join(' · ') || '등록된 목표가 없습니다.', tint: 's-teal' })
    rows.push({ label: '로드맵', value: data.roadmap.status === 'CONFIRMED' ? '확정' : data.roadmap.status === 'REVIEW' ? '검토중' : '초안', tint: 's-purple' })
  }
  return { ...item, mode: r.method, scores, rows, intake: data.intake }
}

export function getIntake(data: Dashboard) {
  const colors = ['s-teal', 's-blue', 's-purple', 's-green', 's-orange']
  return data.intake.map((r, i) => ({ requestId: r.id, studentId: r.studentId,
    initial: r.studentName.slice(0, 1), name: r.studentName, meta: r.studentMajor,
    sub: `${r.type} · ${r.slot?.date ?? '일정 미정'}${r.slot ? ` ${r.slot.start}` : ''}`,
    status: r.status, tint: colors[i % colors.length] }))
}

export function getMyPrograms(data: Dashboard) {
  return data.programs.map((p, i) => ({ ...p, code: p.id.toUpperCase(), ratio: pct(p.applied, p.capacity),
    solid: ['b-teal', 'b-blue', 'b-purple'][i % 3], tint: ['s-teal', 's-blue', 's-purple'][i % 3] }))
}

export function getPerformance(data: Dashboard) {
  const c = data.counts
  const rows = [
    { key: 'progress', name: '상담 진행률', value: pct(c.done, c.confirmed + c.done), tint: 's-green', solid: 'b-green', ink: 'f-green' },
    { key: 'record', name: '상담일지 완성률', value: pct(c.recorded, c.done), tint: 's-teal', solid: 'b-teal', ink: 'f-teal' },
    { key: 'confirm', name: '신청 확정률', value: pct(c.confirmed + c.done, c.active), tint: 's-orange', solid: 'b-orange', ink: 'f-orange' },
  ]
  if (data.roadmap) rows.push({ key: 'roadmap', name: '로드맵 요청 처리율', value: pct(data.roadmap.total - data.roadmap.pending, data.roadmap.total), tint: 's-red', solid: 'b-red', ink: 'f-red' })
  return rows
}
