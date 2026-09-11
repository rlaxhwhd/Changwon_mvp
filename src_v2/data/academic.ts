// ─────────────────────────────────────────────────────────────────────────
// 스킬트리 파생 — 순수 함수 계층
//
// 입력은 AcademicSnapshot 하나뿐이다. JSON도 localStorage도 fetch도 모른다
// (그건 academic/repository.ts 의 몫). 모듈 로드 시점에 아무것도 계산하지
// 않으므로 데이터가 API에서 와도 그대로 동작한다.
//
// 집계·파생은 전부 여기서 한다 (CLAUDE.md 원칙 10). 화면은 계산하지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import type { StudentData, StudentCounselRequest } from './students'
import { typeLabel } from './careerProcess'
import type {
  AcademicSnapshot, Cert, CourseClass, JobRole,
} from './academic/repository'

export type {
  AcademicSnapshot, Skill, Subject, CurriculumRow, CourseSkill,
  Enrollment, Cert, JobRole, CourseClass, StudentCert, JobInterest,
} from './academic/repository'

// ── 뷰 모델 ──────────────────────────────────────────────────────────────

export interface CourseRow {
  /** 과목코드 — 화면 식별자 겸 key */
  code: string
  name: string
  credit: number
  courseCls: CourseClass
  recGrade: number
  /** 이 과목이 채우는 스킬 라벨 */
  skills: string[]
  icon: string
  /** 이수 완료 = 체크표시 */
  done: boolean
  /** 수강중(이수 전) */
  inProgress: boolean
  /** 타학과 과목 */
  external: boolean
  externalDept?: string
  grade: string | null
  term?: string
}

export interface CourseGroup {
  title: string
  subtitle: string
  fitPercent: number
  doneCount: number
  totalCount: number
  rows: CourseRow[]
}

export interface FoundationItem {
  id: string
  icon: string
  name: string
  subtitle: string
  complete: boolean
  progress: number
  progressLabel: string
}

export interface CertRow {
  certId: string
  label: string
  issuer: string
  kind: string
  icon: string
  /** 실제 취득분 = 체크표시 */
  owned: boolean
  acquiredDt?: string
  /** 학생이 목표로 담은 것(삭제 가능) */
  added: boolean
}

export interface DirectionRow {
  jobId: string
  name: string
  icon: string
  subtitle: string
  fitPercent: number
  matchedCount: number
  totalCount: number
  /** 부족 스킬 라벨 (가중치 높은 순) */
  gapSkills: string[]
  whatToDo: string[]
  targetOrgs: string[]
  /** 학생이 추가로 담은 직무(삭제 가능) */
  added: boolean
}

export interface SkillTreeData {
  studentId: string
  studentName: string
  deptName: string
  entryYear: string
  foundation: FoundationItem[]
  core: CourseGroup
  expert: CourseGroup
  certification: { title: string; subtitle: string; rows: CertRow[]; ownedCount: number }
  directions: DirectionRow[]
  defaultDirectionId: string
  analysis: {
    connectedSkills: number
    totalSkills: number
    strongSkills: number
    weakSkills: number
    overallPercent: number
    description: string
  }
}

// ── 파생 ─────────────────────────────────────────────────────────────────

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

/**
 * 스킬별 보유도 0~1.
 * 매핑 과목 중 이수 비율. 관련 자격증을 실제 취득했으면 최소 0.6 보장.
 * (목표로만 담은 자격증은 반영하지 않는다 — 안 그러면 담기만 해도 적합도가 오른다)
 */
function computeSkillScores(
  snap: AcademicSnapshot,
  doneCodes: Set<string>,
  ownedCertIds: Set<string>,
): Map<string, number> {
  const scores = new Map<string, number>()
  for (const skill of snap.skills) {
    const mapped = snap.courseSkills.filter(m => m.skillId === skill.skillId)
    const hit = mapped.filter(m => doneCodes.has(m.curiNum)).length
    let score = mapped.length ? hit / mapped.length : 0
    const byCert = snap.certs.some(
      c => ownedCertIds.has(c.certId) && c.skillIds.includes(skill.skillId))
    if (byCert) score = Math.max(score, 0.6)
    scores.set(skill.skillId, Math.min(1, score))
  }
  return scores
}

/**
 * 스킬트리 화면 데이터. 순수 함수 — 같은 입력이면 항상 같은 출력.
 *
 * 과목 표시 규칙 (요구사항):
 *   대상 = 본인 학과 교육과정 전공과목  ∪  본인이 실제 수강한 전 과목(타학과 포함)
 *   핵심역량 = 권장학년 1~2   ·   전문역량 = 권장학년 3 이상
 *   체크표시 = finishYn === 'Y'
 *   타학과   = 과목 주관학과 ≠ 본인 학과
 * 합집합이므로 아직 안 들은 학과 과목도 미이수로 뜨고, 교육과정에 없는
 * 타학과 수강분도 빠지지 않는다.
 *
 * `counselRequests` 는 호출부가 주입한다 — 상담은 학생 프로필이 아니라 상담 스토어가
 * 소유한다(서버가 프로필 응답에서 떼어 낸다). 이 계층이 스토어를 직접 읽지 않게 한다.
 */
export function deriveSkillTree(
  snap: AcademicSnapshot,
  student: StudentData,
  counselRequests: StudentCounselRequest[],
): SkillTreeData {
  const { deptCode, entryYear } = snap

  const skillById = new Map(snap.skills.map(s => [s.skillId, s]))
  const subjectByCode = new Map(snap.subjects.map(s => [s.curiNum, s]))
  const deptNameByCode = new Map(snap.departments.map(d => [d.deptCode, d.deptName]))
  const deptName = deptNameByCode.get(deptCode) ?? student.major

  const enrollByCode = new Map(snap.enrollments.map(e => [e.curiNum, e]))
  const doneCodes = new Set(snap.enrollments.filter(e => e.finishYn === 'Y').map(e => e.curiNum))

  // 입학년도 교육과정이 아직 적재되지 않은 학번이 있다(신입생이 대표적이다 —
  // 교육과정은 2021년치만 들어와 있는데 학번은 2026이다). 그대로 두면 본인 학과
  // 전공과목이 전부 '타학과'로 찍히므로, 그 학과에 있는 가장 최근 연도로 대신한다.
  // 학과 자체가 교육과정에 없으면 그때는 '타학과'가 맞는 판정이다.
  const deptYears = [...new Set(snap.curriculum.filter(c => c.deptCode === deptCode).map(c => c.curriYear))]
  const curriYear = deptYears.includes(entryYear)
    ? entryYear
    : (deptYears.sort((a, b) => b.localeCompare(a))[0] ?? entryYear)

  /** 본인 학과 교육과정에서 이 과목을 찾는다(없으면 타학과). */
  const ownRowOf = (code: string) =>
    snap.curriculum.find(
      c => c.deptCode === deptCode && c.curriYear === curriYear && c.curiNum === code)

  /** 권장학년 — 본인 학과 우선, 없으면(타학과) 그 과목 주관학과 교육과정에서. */
  const recGradeOf = (code: string) =>
    ownRowOf(code)?.recGrade ?? snap.curriculum.find(c => c.curiNum === code)?.recGrade ?? 9

  // 대상 과목 = 본인 학과 전공 교육과정 ∪ 실제 수강분
  // (교양은 제외 — 기초역량 열에서 따로 집계한다)
  const ownMajor = snap.curriculum
    .filter(c => c.deptCode === deptCode && c.curriYear === curriYear && c.courseCls.startsWith('전공'))
    .map(c => c.curiNum)
  const takenNonGe = snap.enrollments
    .filter(e => !e.courseCls.startsWith('교양'))
    .map(e => e.curiNum)
  const codes = [...new Set([...ownMajor, ...takenNonGe])]

  const rows: CourseRow[] = codes.flatMap(code => {
    const subject = subjectByCode.get(code)
    if (!subject) return []
    const own = ownRowOf(code)
    const enr = enrollByCode.get(code)
    const external = subject.openDeptCd !== deptCode
    const mapped = snap.courseSkills.filter(m => m.curiNum === code)
    return [{
      code,
      name: subject.curiNm,
      credit: subject.cdtNum,
      courseCls: own ? own.courseCls : ('타학과' as CourseClass),
      recGrade: recGradeOf(code),
      skills: mapped.map(m => skillById.get(m.skillId)?.label ?? m.skillId),
      icon: skillById.get(mapped[0]?.skillId ?? '')?.icon ?? 'fa-book',
      done: enr?.finishYn === 'Y',
      inProgress: !!enr && enr.finishYn !== 'Y',
      external,
      externalDept: external ? (deptNameByCode.get(subject.openDeptCd) ?? '교양') : undefined,
      grade: enr?.grade ?? null,
      term: enr ? `${enr.year}-${enr.smt}` : undefined,
    }]
  })

  const group = (title: string, subtitle: string, list: CourseRow[]): CourseGroup => {
    const sorted = [...list].sort((a, b) => a.recGrade - b.recGrade || a.code.localeCompare(b.code))
    const doneCount = sorted.filter(r => r.done).length
    return {
      title, subtitle, rows: sorted,
      doneCount, totalCount: sorted.length, fitPercent: pct(doneCount, sorted.length),
    }
  }

  const core = group('핵심 역량', '1~2학년 학과 개설과목', rows.filter(r => r.recGrade <= 2))
  const expert = group('전문 역량', '3~4학년 심화 · 실무 과목', rows.filter(r => r.recGrade >= 3))

  // ── 기초 역량 ──
  const geRequired = snap.curriculum.filter(
    c => c.deptCode === deptCode && c.curriYear === entryYear && c.courseCls === '교양필수')
  const geDone = geRequired.filter(c => doneCodes.has(c.curiNum)).length
  const programDone = snap.programRecords.filter(p => p.completed).length
  const counselDone = counselRequests.filter(r => r.status === '완료').length
  const diagDone = Object.keys(student.typeScores ?? {}).length > 0

  const foundation: FoundationItem[] = [
    {
      id: 'diagnosis', icon: 'fa-chart-simple', name: '진단', subtitle: '취업지원검사',
      complete: diagDone, progress: diagDone ? 100 : 0,
      progressLabel: diagDone ? `${typeLabel(student.studentType)} 판정` : '미응시',
    },
    {
      id: 'program', icon: 'fa-layer-group', name: '비교과 프로그램', subtitle: '참여 프로그램 이수',
      complete: programDone > 0 && programDone === snap.programRecords.length,
      progress: pct(programDone, snap.programRecords.length),
      progressLabel: `${programDone} / ${snap.programRecords.length}개 이수`,
    },
    {
      id: 'counsel', icon: 'fa-user', name: '진로 상담', subtitle: '진로취업 상담 이력',
      complete: counselDone > 0, progress: Math.min(100, counselDone * 34),
      progressLabel: counselDone > 0 ? `${counselDone}회 완료` : '이력 없음',
    },
    {
      id: 'liberal', icon: 'fa-book', name: '필수 교양', subtitle: '교양필수 이수 현황',
      complete: geRequired.length > 0 && geDone === geRequired.length,
      progress: pct(geDone, geRequired.length),
      progressLabel: `${geDone} / ${geRequired.length}과목`,
    },
  ]

  // ── 자격 ──
  const certById = new Map(snap.certs.map(c => [c.certId, c]))
  const certRows: CertRow[] = snap.studentCerts.flatMap(sc => {
    const c = certById.get(sc.certId)
    if (!c) return []
    return [{
      certId: c.certId, label: c.label, issuer: c.issuer, kind: c.kind, icon: c.icon,
      owned: !sc.added, acquiredDt: sc.acquiredDt, added: sc.added,
    }]
  })
  const ownedCertIds = new Set(certRows.filter(r => r.owned).map(r => r.certId))

  // ── 직무 적합도 ──
  const scores = computeSkillScores(snap, doneCodes, ownedCertIds)
  const jobById = new Map(snap.jobRoles.map(j => [j.jobId, j]))

  const directions: DirectionRow[] = snap.jobInterests.flatMap(({ jobId, added }) => {
    const job = jobById.get(jobId)
    if (!job) return []
    const totalW = job.skills.reduce((a, s) => a + s.weight, 0)
    const gotW = job.skills.reduce((a, s) => a + s.weight * (scores.get(s.skillId) ?? 0), 0)
    return [{
      jobId: job.jobId, name: job.label, icon: job.icon, subtitle: job.summary,
      fitPercent: totalW > 0 ? Math.round((gotW / totalW) * 100) : 0,
      matchedCount: job.skills.filter(s => (scores.get(s.skillId) ?? 0) > 0).length,
      totalCount: job.skills.length,
      gapSkills: job.skills
        .filter(s => (scores.get(s.skillId) ?? 0) < 0.4)
        .sort((a, b) => b.weight - a.weight)
        .map(s => skillById.get(s.skillId)?.label ?? s.skillId),
      whatToDo: job.whatToDo, targetOrgs: job.targetOrgs,
      added,
    }]
  })

  const relevant = [...new Set(directions.flatMap(d => jobById.get(d.jobId)?.skills.map(s => s.skillId) ?? []))]
  const top = directions[0]

  return {
    studentId: snap.studentId,
    studentName: student.name,
    deptName,
    entryYear,
    foundation,
    core,
    expert,
    certification: {
      title: '자격', subtitle: '학과 관련 및 공인 자격증',
      rows: certRows, ownedCount: ownedCertIds.size,
    },
    directions,
    defaultDirectionId: top?.jobId ?? '',
    analysis: {
      connectedSkills: relevant.filter(id => (scores.get(id) ?? 0) > 0).length,
      totalSkills: relevant.length,
      strongSkills: relevant.filter(id => (scores.get(id) ?? 0) >= 0.7).length,
      weakSkills: relevant.filter(id => (scores.get(id) ?? 0) < 0.4).length,
      overallPercent: top?.fitPercent ?? 0,
      description: top
        ? `${top.name} 기준 적합도 ${top.fitPercent}%. ` +
          (top.gapSkills.length
            ? `${top.gapSkills.slice(0, 3).join(' · ')} 보완이 우선 과제입니다.`
            : '요구 역량을 모두 충족했습니다.')
        : '관심 직무를 추가하면 적합도를 분석합니다.',
    },
  }
}

/** 아직 담지 않은 직무 — "직무 추가" 목록. */
export function availableJobs(snap: AcademicSnapshot): JobRole[] {
  const have = new Set(snap.jobInterests.map(j => j.jobId))
  return snap.jobRoles.filter(j => !have.has(j.jobId))
}

/** 아직 담지 않은 자격증 — "자격증 추가" 목록. */
export function availableCerts(snap: AcademicSnapshot): Cert[] {
  const have = new Set(snap.studentCerts.map(c => c.certId))
  return snap.certs.filter(c => !have.has(c.certId))
}
