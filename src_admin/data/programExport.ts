// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 한 건의 명단 내보내기(엑셀 xlsx) — 신청자·선발자 관리 화면이 보고 있는 목록.
// 여러 프로그램 명단은 서버(POST /programs/export, programManageFilter.downloadStudentRoster)가 만든다(2026-11-26).
//
// 명단 조립은 여기 한 곳이다(CLAUDE.md 규칙 10) — 화면은 행 배열만 받아 파일로 만든다.
// programs.ts 가 아니라 별도 모듈인 이유: 학생 로스터를 참조해야 하는데
// programs → studentRoster → roadmap → programs 순환이 생긴다.
// ─────────────────────────────────────────────────────────────────────────
import { selectionOf } from './programs'
import { collegeOf } from './studentRoster'
import { typeLabel } from '../../src_v2/data/careerProcess'
import type { Program, ProgramApplicant } from './schema/program'
import { outcomeLabel, selectionLabel } from './schema/program'

const HEADER = [
  '프로그램명', '회계년도', '차수', '이름', '학번', '대학', '학과',
  '학년', '학적구분', '진단유형', '상태', '신청일',
]

/** 신청 시점 스냅샷을 먼저 쓰고, 학생 단일소스에 있으면 최신 프로필로 채운다. */
function rowOf(program: Program, applicant: ProgramApplicant): string[] {
  const major = applicant.studentMajor
  return [
    program.title,
    program.fiscalYear,
    `${applicant.round ?? 1}차`,
    applicant.studentName,
    applicant.studentNo ?? applicant.studentId,
    collegeOf(major),
    major,
    applicant.studentGrade == null ? '' : `${applicant.studentGrade}학년`,
    applicant.studentStatus ?? '',
    typeLabel(applicant.studentType ?? null),
    applicant.outcomeStatus ? outcomeLabel(applicant.outcomeStatus) : selectionLabel(selectionOf(applicant)),
    applicant.appliedAt.slice(0, 10),
  ]
}

/** 프로그램 한 건의 명단 행 — 머리글 포함. 신청자·선발자 관리 화면이 보고 있는 목록을 그대로 받는다. */
export function toRosterRows(program: Program, applicants: ProgramApplicant[]): string[][] {
  return [HEADER, ...applicants.map(a => rowOf(program, a))]
}
