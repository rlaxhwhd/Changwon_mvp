import { api, queryString } from '../../shared/api'
import type { ListParams, Paginated } from './query'
import type { RosterMetadata, RosterStudent } from './studentRoster'
import type { StudentStat } from '../../src_v2/components/StudentStatCards'
import { typeLabel } from '../../src_v2/data/careerProcess'

export function queryAcademicStudents(params: ListParams): Promise<Paginated<RosterStudent>> {
  return api(`/academic-students?${queryString(params)}`)
}

export function fetchAcademicStudentMetadata(): Promise<RosterMetadata> {
  return api('/academic-students/metadata')
}

export interface AcademicStudentDetail extends RosterStudent {
  sex: string
  graduationMonth: string | null
  diagnosisCount: number
  counsels: { id: string; type: string; status: 'REQ' | 'CONFIRMED' | 'DONE'; date: string }[]
  programs: { id: string; title: string; date: string; completed: boolean }[]
}

export function fetchAcademicStudentDetail(id: string): Promise<AcademicStudentDetail> {
  return api(`/academic-students/${encodeURIComponent(id)}`)
}

export function academicStudentStats(data: AcademicStudentDetail): StudentStat[] {
  const completed = data.programs.filter(p => p.completed).length
  return [
    { kind: 'diagnosis', label: '진단 완료', value: data.diagnosisCount ? String(data.diagnosisCount) : '없음',
      unit: data.diagnosisCount ? '건' : '', pct: 0, hideMeter: true, foot: data.studentType ? typeLabel(data.studentType) : '진단 유형 없음' },
    { kind: 'counsel', label: '상담 현황', total: data.counsels.length ? String(data.counsels.length) : '없음',
      unit: data.counsels.length ? '건' : '', foot: '현재 시스템 기록 · 취소 제외',
      channels: ['진로취업','심리','교수'].map(label => ({label, count: `${data.counsels.filter(c => c.type === label).length}건`})) },
    { kind: 'roadmap', label: '로드맵 이행률', value: data.hasRoadmap ? String(data.progress) : '없음',
      unit: data.hasRoadmap ? '%' : '', pct: data.progress, hideMeter: !data.hasRoadmap, foot: data.hasRoadmap ? '현재 로드맵' : '로드맵 없음' },
    { kind: 'program', label: '비교과 활동', value: data.programs.length ? String(data.programs.length) : '없음',
      unit: data.programs.length ? '건' : '', pct: data.programs.length ? Math.round(completed/data.programs.length*100) : 0, hideMeter: !data.programs.length,
      foot: data.programs.length ? `이수 ${completed}건` : '활동 기록 없음' },
    { kind: 'course', label: '학점', value: data.gpa ?? '없음', pct: 0, hideMeter: true, foot: '학사 DB 제공 평점' },
  ]
}

export async function downloadAcademicStudents(params: ListParams): Promise<void> {
  const response = await fetch(`/api/v1/academic-students/export?${queryString(params)}`, {
    headers: { 'X-DC-Portal': 'admin', 'X-DC-Identity': localStorage.getItem('dc_active_staff') ?? '' },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(typeof error?.detail === 'string' ? error.detail : '엑셀 다운로드에 실패했습니다.')
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url; link.download = '학생목록.xlsx'; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
