import { api, queryString } from '../../shared/api'
import type { ListParams, Paginated } from './query'
import type { RosterMetadata, RosterStudent } from './studentRoster'
import type { StudentStat } from '../../src_v2/components/StudentStatCards'
import { typeLabel } from '../../src_v2/data/careerProcess'
import { questLevelStat, type QuestLevel } from '../../shared/quests'
import { counselBucketChannels, type CareTrack } from '../../src_v2/data/counselTrack'
import type { GrowthAcademicMajor } from '../../shared/growthStore'

export function queryAcademicStudents(params: ListParams): Promise<Paginated<RosterStudent>> {
  return api(`/academic-students?${queryString(params)}`)
}

export function fetchAcademicStudentMetadata(diagnosed = false): Promise<RosterMetadata> {
  return api('/academic-students/metadata' + (diagnosed ? '?diagnosed=true' : ''))
}

export interface AcademicStudentDetail extends RosterStudent {
  sex: string
  /** 학사 for_yn — Y/N 밖의 값은 null(미상). */
  foreigner: boolean | null
  graduationMonth: string | null
  /** 학사 전공명(MAJOR_CD) — 학과(major)와 별개. 없으면 null. */
  majorName: string | null
  /** 학사 졸업예정년월(GRAD_EXP_YM) 「YYYY-MM」 — 졸업생은 graduationMonth 를 쓴다. */
  graduationExpectedMonth: string | null
  /** 학사 생년월일 「YYYY-MM-DD」 — 원천 열 이름은 AGE 지만 값은 YYYYMMDD(0024). */
  birthDate: string | null
  /** 학사 입학일 「YYYY-MM-DD」(0024). */
  admissionDate: string | null
  /** 학사 이수 학기 수(0024). */
  completedSemesters: number | null
  /** 학사 집전화(0024) — 범위 안 상세에서만 온다. */
  homePhone: string | null
  /** 학사 다전공(0024) — 취소·포기·이수 실패도 상태 라벨과 함께 온다. 없으면 []. */
  majors: GrowthAcademicMajor[]
  diagnosisCount: number
  /** careTrack 은 진로취업 행에만 있다 — 심리·교수 상담은 null 로 온다. */
  counsels: { id: string; type: string; status: 'REQ' | 'CONFIRMED' | 'DONE'; date: string; careTrack: CareTrack | null }[]
  programs: { id: string; title: string; date: string; completed: boolean }[]
  /** 학년 성장 레벨 — 학생 라운지와 같은 값(서버 XP 원장 파생). */
  quest: QuestLevel
  /** 서비스 학생 행(dc.student) 유무 — false 면 범위 프로필을 조회하지 않는다. */
  hasServiceProfile?: boolean
  /** 학사 연락처·주소(0023) — 범위 안 상세에서만 온다. 목록·내보내기에는 없다. */
  mobile: string | null
  email: string | null
  postCode: string | null
  address: string | null
  /** 학사 증명사진 프록시 경로(0025) — 범위 안 상세에서만 온다. null 이면 요청하지 않는다. */
  photoUrl: string | null
}

export function fetchAcademicStudentDetail(id: string): Promise<AcademicStudentDetail | null> {
  return api(`/academic-students/${encodeURIComponent(id)}?optional=true`)
}

export function academicStudentStats(data: AcademicStudentDetail): StudentStat[] {
  const completed = data.programs.filter(p => p.completed).length
  return [
    { kind: 'diagnosis', label: '진단 완료', value: data.diagnosisCount ? String(data.diagnosisCount) : '없음',
      unit: data.diagnosisCount ? '건' : '', pct: 0, hideMeter: true,
      // 유형은 설명이 아니라 진단 결과값이다 — 진단 결과 카드와 같은 강조로 그린다.
      foot: data.studentType ? typeLabel(data.studentType) : '진단 유형 없음', footResult: !!data.studentType },
    { kind: 'counsel', label: '상담 현황', total: data.counsels.length ? String(data.counsels.length) : '없음',
      unit: data.counsels.length ? '건' : '', foot: '취소, 노쇼 제외',
      // 갈래는 학생 라운지와 같은 판정을 쓴다(counselTrack) — 진로취업을 일반/CARE 7+ 로 가르고
      // 심리·지도교수는 기타로 묶는다. 여기서 다시 세면 같은 학생의 숫자가 두 화면에서 갈린다.
      channels: counselBucketChannels(data.counsels.map(c => ({ type: c.type, careTrack: c.careTrack ?? undefined }))) },
    { kind: 'roadmap', label: '로드맵 이행률', value: data.hasRoadmap ? String(data.progress) : '없음',
      unit: data.hasRoadmap ? '%' : '', pct: data.progress, hideMeter: !data.hasRoadmap, foot: data.hasRoadmap ? '현재 로드맵' : '로드맵 없음' },
    { kind: 'program', label: '비교과 활동', value: data.programs.length ? String(data.programs.length) : '없음',
      unit: data.programs.length ? '건' : '', pct: data.programs.length ? Math.round(completed/data.programs.length*100) : 0, hideMeter: !data.programs.length,
      foot: data.programs.length ? `이수 ${completed}건` : '활동 기록 없음' },
    questLevelStat(data.quest),
  ]
}

export async function downloadAcademicStudents(params: ListParams, ids: string[]): Promise<void> {
  if (!ids.length) return
  const response = await fetch(`/api/v1/academic-students/export?${queryString(params)}`, {
    method: 'POST', body: JSON.stringify({ ids }),
    headers: { 'Content-Type': 'application/json', 'X-DC-Portal': 'admin', 'X-DC-Identity': localStorage.getItem('dc_active_staff') ?? '' },
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
