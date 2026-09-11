// ─────────────────────────────────────────────────────────────────────────
// 포트폴리오 — 정본은 서버다(dc.growth_entry · dc.growth_profile · dc.job_resume).
//
// 「마이페이지 > 포트폴리오」(/v2/mypage/portfolio)와 교직원 포털의 학생 상세
// 「포트폴리오」 탭이 **같은 projection** 을 읽는다.
//
// ★ 예전 INITIAL_SKILLS/CERTS/LANGS/AWARDS/PROJECTS/RESUMES 는 **전 학생 공통 상수**였다.
//   localStorage 조차 없어 학생이 고쳐도 교직원 화면에는 원래 상수가 보였고, 아무도 쓴 적
//   없는 실적이 모두에게 자기 것처럼 보였다. buildProfile 의 'student@cwnu.ac.kr' ·
//   '010-1234-5678' 도 합성값이었다. 전부 이관하지 않았다 — 소유자가 없기 때문이다.
//   빈 값은 빈 값이다.
//
// 신원(이름·학과·학년·학점)은 학사 유래라 우리가 만들지 않는다(CLAUDE.md 1조).
// ─────────────────────────────────────────────────────────────────────────
import { loadPortfolio } from '../../shared/growthStore'
import type { GrowthEntry, PortfolioDTO, PortfolioResume } from '../../shared/growthStore'

export interface ProfileData {
  name: string
  studentId: string
  school: string
  dept: string
  grade: string
  /** 자기입력 연락처. 본인에게만 내려온다 — 없으면 빈 값이다. */
  email: string
  phone: string
  gpa: string
  major: string
  intro: string
}

/* ── Data Models ────────────────────────────────────────────────── */
export interface Skill {
  id: string
  name: string
  level: 1 | 2 | 3 | 4 | 5
  /** 분류 코드(GROWTH_SKILL_CATEGORY). 한글은 표시용 라벨이다. */
  category: string | null
  version: number
}

export interface Cert {
  id: string
  name: string
  issuer: string
  acquiredAt: string
  score?: string
  version: number
}

export interface Language {
  id: string
  name: string
  test: string
  score: string
  acquiredAt: string
  version: number
}

export interface Award {
  id: string
  title: string
  rank: string
  host: string
  date: string
  description: string
  version: number
}

export interface Project {
  id: string
  title: string
  role: string
  period: string
  stack: string[]
  description: string
  link?: string
  version: number
}

export interface Resume {
  id: string
  title: string
  category: string
  company: string
  position: string
  content: string
  /** AI 초안 여부는 별도 산출물(ai_run)로만 알 수 있다. 원본에 파생값을 넣지 않는다. */
  isAi: boolean
  updatedAt: string
}

export interface PortfolioView {
  profile: ProfileData
  skills: Skill[]
  certs: Cert[]
  languages: Language[]
  awards: Award[]
  projects: Project[]
  resumes: Resume[]
  /** 학사·기관이 확인한 취득 자격. 자기신고와 한 목록으로 합치지 않는다. */
  academicCerts: PortfolioDTO['academicCerts']
  version: number
  canEdit: boolean
}

function text(content: Record<string, unknown>, field: string): string {
  const value = content[field]
  return typeof value === 'string' ? value : ''
}

function dateOf(entry: GrowthEntry): string {
  return entry.occurredOn ?? entry.dateText ?? ''
}

function toResume(row: PortfolioResume): Resume {
  return {
    id: row.id,
    title: row.title,
    category: row.categoryLabel ?? row.categoryCode ?? '',
    company: row.company ?? '',
    position: row.position ?? '',
    content: row.content,
    isAi: false,
    updatedAt: row.updatedAt,
  }
}

/** 서버 projection 을 화면 형태로 옮긴다. 값을 만들어 채우지 않는다. */
export function toPortfolioView(dto: PortfolioDTO): PortfolioView {
  return {
    profile: {
      name: dto.profile.name,
      studentId: dto.profile.studentNo,
      school: dto.profile.school,
      dept: dto.profile.dept,
      grade: dto.profile.grade === null ? '' : `${dto.profile.grade}학년`,
      email: dto.profile.email ?? '',
      phone: dto.profile.phone ?? '',
      gpa: dto.profile.gpa ? `${dto.profile.gpa} / 4.5` : '',
      major: dto.profile.dept,
      intro: dto.profile.intro,
    },
    skills: dto.skills.map(entry => ({
      id: entry.id, name: entry.title,
      level: (Number(entry.content.level) || 1) as Skill['level'],
      category: entry.categoryCode, version: entry.version,
    })),
    certs: dto.certs.map(entry => ({
      id: entry.id, name: entry.title, issuer: text(entry.content, 'issuer'),
      acquiredAt: dateOf(entry), score: text(entry.content, 'scoreText') || undefined,
      version: entry.version,
    })),
    languages: dto.languages.map(entry => ({
      id: entry.id, name: text(entry.content, 'language') || entry.title,
      test: text(entry.content, 'testName'), score: text(entry.content, 'scoreText'),
      acquiredAt: dateOf(entry), version: entry.version,
    })),
    awards: dto.awards.map(entry => ({
      id: entry.id, title: entry.title, rank: text(entry.content, 'rank'),
      host: text(entry.content, 'host'), date: dateOf(entry),
      description: text(entry.content, 'description'), version: entry.version,
    })),
    projects: dto.projects.map(entry => ({
      id: entry.id, title: entry.title, role: text(entry.content, 'role'),
      period: text(entry.content, 'periodText'),
      stack: Array.isArray(entry.content.stack) ? entry.content.stack as string[] : [],
      description: text(entry.content, 'description'),
      link: text(entry.content, 'link') || undefined, version: entry.version,
    })),
    resumes: dto.resumes.map(toResume),
    academicCerts: dto.academicCerts,
    version: dto.version,
    canEdit: dto.capabilities.canEdit,
  }
}

/** 학생 1명의 포트폴리오. 화면 진입 때 한 번 읽는다. */
export async function fetchPortfolio(studentId: string): Promise<PortfolioView> {
  return toPortfolioView(await loadPortfolio(studentId))
}

/** 숙련도 라벨 — 인덱스가 곧 단계다(0 은 안 쓴다). */
export const LEVEL_LABELS = ['', '초급', '초중급', '중급', '고급', '전문가']
