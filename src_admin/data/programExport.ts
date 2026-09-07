// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 명단 내보내기(CSV) — 프로그램 관리에서 여러 건을 한 장으로.
//
// 명단 조립은 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면은 행 배열만 받아 파일로 만든다.
// DB 전환 시 이 함수 하나가 export 엔드포인트 하나가 된다.
// programs.ts 가 아니라 별도 모듈인 이유: 학생 로스터를 참조해야 하는데
// programs → studentRoster → roadmap → programs 순환이 생긴다.
// ─────────────────────────────────────────────────────────────────────────
import { getPrograms, selectionOf, selectedApplicants } from './programs'
import { studentLiteOf, collegeOf } from './studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { Program, ProgramApplicant } from './schema/program'

/** 내보낼 대상 — 신청한 학생 전체 vs 선발된 학생만 */
export type ExportTarget = 'applicants' | 'selected'

export const EXPORT_TARGETS: ExportTarget[] = ['applicants', 'selected']

export const EXPORT_TARGET_LABEL: Record<ExportTarget, string> = {
  applicants: '신청한 학생',
  selected: '선발된 학생',
}

const HEADER = [
  '프로그램명', '회계년도', '차수', '이름', '학번', '대학', '학과',
  '학년', '학적구분', '진단유형', '상태', '신청일',
]

/** 신청 시점 스냅샷을 먼저 쓰고, 학생 단일소스에 있으면 최신 프로필로 채운다. */
function rowOf(program: Program, applicant: ProgramApplicant): string[] {
  const lite = studentLiteOf(applicant.studentId)
  const major = lite?.major ?? applicant.studentMajor
  return [
    program.title,
    program.fiscalYear,
    `${applicant.round ?? 1}차`,
    lite?.name ?? applicant.studentName,
    lite?.studentNo ?? applicant.studentId,
    collegeOf(major),
    major,
    lite ? `${lite.grade}학년` : '',
    lite?.status ?? '',
    lite ? typeLabel(lite.studentType) : '',
    applicant.outcomeStatus ?? selectionOf(applicant),
    applicant.appliedAt.slice(0, 10),
  ]
}

/** 선택한 프로그램들의 명단 행(헤더 제외). 프로그램 목록 순서를 그대로 따른다. */
export function getApplicantExportRows(programIds: string[], target: ExportTarget): string[][] {
  const ids = new Set(programIds)
  return getPrograms()
    .filter(p => ids.has(p.id))
    .flatMap(p =>
      (target === 'selected' ? selectedApplicants(p) : p.applicants).map(a => rowOf(p, a)),
    )
}

/** CSV 문자열 (엑셀용 BOM 은 내려받는 쪽에서 붙인다) */
export function toApplicantCsv(programIds: string[], target: ExportTarget): string {
  return [HEADER, ...getApplicantExportRows(programIds, target)]
    .map(row => row.map(v => `"${v.replaceAll('"', '""')}"`).join(','))
    .join('\n')
}
