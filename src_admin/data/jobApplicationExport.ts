// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원자 명단 내보내기(CSV) — 요청서 "모든 지원자 현황 포함 엑셀 필수".
//
// 명단 조립은 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면은 행 배열만 받아 파일로 만든다.
// DB 전환 시 이 함수 하나가 export 엔드포인트 하나가 된다.
// programExport.ts(비교과)와 같은 규약: 스냅샷 우선, 학생 단일소스가 있으면 최신으로 보강.
// ─────────────────────────────────────────────────────────────────────────────
import { getJobById } from './jobsSource'
import {
  APPLICATION_STATUS_LABEL,
  attachmentLabel,
  currentStageLabel,
  getApplicationsByJob,
  getRecommendedJobs,
} from './jobApplications'
import { lastEventAt } from './jobApplicationEvents'
import { studentLiteOf, collegeOf } from './studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { JobApplication } from './schema/jobApplication'

const HEADER = [
  '공고명', '회사명', '이름', '학번', '대학', '학과',
  '학년', '학적구분', '진단유형', '제출 서류', '현재 전형', '상태', '지원일', '최종 변경일',
]

/** 지원 시점 스냅샷을 먼저 쓰고, 학생 단일소스에 있으면 최신 프로필로 채운다. */
function rowOf(application: JobApplication): string[] {
  const job = getJobById(application.jobId)
  const lite = studentLiteOf(application.studentId)
  const major = lite?.major ?? application.snapMajor
  const updated = lastEventAt(application.id)
  return [
    job?.role ?? '',
    job?.company ?? '',
    lite?.name ?? application.snapName,
    lite?.studentNo ?? application.snapStudentNo,
    collegeOf(major),
    major,
    `${lite?.grade ?? application.snapGrade}학년`,
    lite?.status ?? application.snapEnrollStatus,
    lite ? typeLabel(lite.studentType) : '',
    attachmentLabel(application),
    currentStageLabel(application),
    APPLICATION_STATUS_LABEL[application.status],
    application.appliedAt.slice(0, 10),
    updated ? updated.slice(0, 10) : '',
  ]
}

/**
 * 지원자 명단 행(헤더 제외).
 * jobIds 를 비우면 **추천채용 공고 전체**를 내보낸다 — 요청서의 "모든 지원자 현황".
 */
export function getJobApplicantExportRows(jobIds?: string[]): string[][] {
  const targets = jobIds?.length
    ? getRecommendedJobs().filter(j => jobIds.includes(j.id))
    : getRecommendedJobs()
  return targets.flatMap(job => getApplicationsByJob(job.id).map(rowOf))
}

/** CSV 문자열 (엑셀용 BOM 은 내려받는 쪽에서 붙인다) */
export function toJobApplicantCsv(jobIds?: string[]): string {
  return [HEADER, ...getJobApplicantExportRows(jobIds)]
    .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n')
}
