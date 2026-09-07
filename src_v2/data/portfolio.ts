// ─────────────────────────────────────────────────────────────────────────
// 포트폴리오 — 단일소스.
//
// 「마이페이지 > 포트폴리오」(/v2/mypage/portfolio)가 쓰고, 교직원 포털의 학생 상세
// 「포트폴리오」 탭이 같은 값을 읽어 이력서로 보여 준다. 두 화면이 각자 목록을 들면
// 학생이 고친 내용이 상담사에게 안 보인다 — 그래서 형과 seed 를 여기 둔다.
//
// 신원(이름·학과·학년·학점)은 학사 유래라 우리가 만들지 않고 학생 레코드에서 받는다
// (CLAUDE.md 1조). 그래서 프로필은 상수가 아니라 buildProfile(student) 이다 —
// 상담사가 다른 학생을 열면 그 학생의 이름이 나와야 한다.
// ─────────────────────────────────────────────────────────────────────────

import type { StudentData } from './students'

export interface ProfileData {
  name: string
  studentId: string
  school: string
  dept: string
  grade: string
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
  category: '언어' | '프레임워크' | '도구' | 'DB' | '디자인'
}

export interface Cert {
  id: string
  name: string
  issuer: string
  acquiredAt: string
  score?: string
}

export interface Language {
  id: string
  name: string
  test: string
  score: string
  acquiredAt: string
}

export interface Award {
  id: string
  title: string
  rank: string
  host: string
  date: string
  description: string
}

export interface Project {
  id: string
  title: string
  role: string
  period: string
  stack: string[]
  description: string
  link?: string
}

export interface Resume {
  id: string
  title: string
  category: string
  company: string
  position: string
  content: string
  isAi: boolean
  updatedAt: string
}


/** 헤더 신원 정보 — 학생 레코드 기준으로 채운다(이름/학과/학년/학점 일치). */
export function buildProfile(s: StudentData): ProfileData {
  return {
    name: s.name,
    // 학사 유래 값이다 — 리터럴로 박으면 교직원 화면에서 헤더 학번과 어긋난다(CLAUDE.md 1조).
    studentId: s.studentNo,
    school: '국립창원대학교',
    dept: s.major,
    grade: `${s.grade}학년`,
    email: 'student@cwnu.ac.kr',
    phone: '010-1234-5678',
    gpa: `${s.gpa} / 4.5`,
    major: s.major,
    intro:
      `${s.major} ${s.grade}학년입니다. 비교과 활동과 프로젝트 경험을 쌓으며 목표 직무에 필요한 역량을 단계적으로 준비하고 있어요.`,
  }
}

export const INITIAL_SKILLS: Skill[] = [
  { id: 's1', name: 'Java',       level: 4, category: '언어' },
  { id: 's2', name: 'Python',     level: 4, category: '언어' },
  { id: 's3', name: 'TypeScript', level: 3, category: '언어' },
  { id: 's4', name: 'React',      level: 4, category: '프레임워크' },
  { id: 's5', name: 'Spring Boot', level: 3, category: '프레임워크' },
  { id: 's6', name: 'Git / GitHub', level: 4, category: '도구' },
  { id: 's7', name: 'Figma',      level: 3, category: '디자인' },
  { id: 's8', name: 'MySQL',      level: 3, category: 'DB' },
  { id: 's9', name: 'PostgreSQL', level: 2, category: 'DB' },
]

export const INITIAL_CERTS: Cert[] = [
  { id: 'c1', name: 'SQLD (데이터분석 준전문가)', issuer: '한국데이터산업진흥원', acquiredAt: '2025.06.20' },
  { id: 'c2', name: '정보처리기능사', issuer: '한국산업인력공단', acquiredAt: '2024.11.10' },
  { id: 'c3', name: '컴퓨터활용능력 1급', issuer: '대한상공회의소', acquiredAt: '2024.04.05' },
]

export const INITIAL_LANGS: Language[] = [
  { id: 'l1', name: 'TOEIC',  test: '정기시험', score: '765점', acquiredAt: '2026.02.10' },
  { id: 'l2', name: 'OPIc',   test: '말하기',  score: 'IM2',    acquiredAt: '2025.12.08' },
]

export const INITIAL_AWARDS: Award[] = [
  {
    id: 'a1',
    title: '교내 캡스톤디자인 경진대회',
    rank: '우수상',
    host: '국립창원대학교 공과대학',
    date: '2025.11.22',
    description: 'AI 기반 학사 일정 챗봇 프로젝트로 우수상 수상. 팀 4명 중 백엔드 + 프롬프트 설계 담당.',
  },
  {
    id: 'a2',
    title: 'SW중심대학 해커톤 (제8회)',
    rank: '본선 진출',
    host: 'SW중심대학협의회',
    date: '2025.08.18',
    description: '청년 1인가구를 위한 식단 추천 서비스. React + FastAPI 풀스택 구현.',
  },
  {
    id: 'a3',
    title: '2024 창원시 빅데이터 공모전',
    rank: '장려상',
    host: '창원특례시',
    date: '2024.10.15',
    description: '시내버스 노선 최적화 분석. Python + Pandas + Folium으로 시각화.',
  },
]

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'pj1',
    title: 'CWNU 학사 챗봇 — Mate',
    role: '백엔드 / 프롬프트 설계',
    period: '2025.09 ~ 2025.11',
    stack: ['Python', 'FastAPI', 'OpenAI API', 'PostgreSQL'],
    description: '학사 일정·강의 정보·식단을 자연어로 묻는 LINE 챗봇. 학생 250명 베타 사용.',
    link: 'https://github.com/example/mate-cwnu',
  },
  {
    id: 'pj2',
    title: '1인가구 식단 추천 — Soloplate',
    role: '풀스택 + 모델 튜닝',
    period: '2025.07 ~ 2025.08',
    stack: ['React', 'TypeScript', 'FastAPI', 'GPT-4o-mini'],
    description: '예산·알레르기·냉장고 재료를 입력하면 3끼 식단을 추천. 해커톤 본선 진출작.',
    link: 'https://github.com/example/soloplate',
  },
]

export const INITIAL_RESUMES: Resume[] = [
  {
    id: 'r1',
    title: '카카오 백엔드 신입 · 1번 문항',
    category: '본인 강점',
    company: '카카오',
    position: '백엔드 개발',
    isAi: true,
    updatedAt: '2026.04.20',
    content:
      '대학 4년 동안 가장 자주 마주한 문장은 "한 번 더 측정해 봐"였습니다. 캡스톤 챗봇 프로젝트에서 사용자 250명이 보낸 7,400건의 질문을 직접 라벨링하고...',
  },
  {
    id: 'r2',
    title: '네이버 클라우드 인턴 · 자기소개',
    category: '지원동기',
    company: '네이버 클라우드',
    position: '플랫폼 인턴',
    isAi: false,
    updatedAt: '2026.03.12',
    content:
      '클라우드 인프라를 처음 만난 건 1인가구 식단 추천 서비스를 AWS 프리티어에 올리던 2학년 여름이었습니다. 인스턴스를 켜자마자 비용 알림이 떠서 한 시간 만에 내렸지만...',
  },
  {
    id: 'r3',
    title: '쿠팡 SE 인턴 · 협업 경험',
    category: '협업 경험',
    company: '쿠팡',
    position: 'Software Engineer 인턴',
    isAi: true,
    updatedAt: '2026.02.28',
    content:
      '협업이 처음부터 순탄했던 건 아닙니다. 캡스톤 첫 2주, 우리 팀은 PR 리뷰 한 번 없이 main 브랜치에 직접 푸시하다가 같은 파일을 세 번 덮어쓴 적이 있어요...',
  },
]

/** 숙련도 라벨 — 인덱스가 곧 단계다(0 은 안 쓴다). */
export const LEVEL_LABELS = ['', '초급', '초중급', '중급', '고급', '전문가']
