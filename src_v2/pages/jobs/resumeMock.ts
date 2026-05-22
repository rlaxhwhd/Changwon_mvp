export interface SavedResume {
  id: string
  title: string
  company: string
  jobType: string
  position: string
  categoryLabel: string
  content: string
  createdAt: string
}

const sample = `저는 컴퓨터공학을 전공하며 소프트웨어 개발에 대한 열정을 키워왔습니다. 대학 시절 다양한 프로젝트 경험을 통해 문제 해결 능력과 팀워크를 체득했으며, 특히 웹 애플리케이션 개발 분야에서 깊은 역량을 쌓아왔습니다. 캠퍼스 커뮤니티 플랫폼 프로젝트에서 백엔드 개발을 담당하며 풀스택 개발 경험을 쌓았고, 교내 해커톤에서 최우수상을 수상했습니다.`

export const SAVED_RESUMES: SavedResume[] = [
  {
    id: 'r1',
    title: '삼성전자 SW직군 자기소개서',
    company: '삼성전자',
    jobType: 'IT/SW',
    position: '백엔드 개발',
    categoryLabel: '지원동기',
    content: sample,
    createdAt: '2026-03-21',
  },
  {
    id: 'r2',
    title: '네이버 신입 공채',
    company: '네이버',
    jobType: 'IT/SW',
    position: '프론트엔드 개발',
    categoryLabel: '강점',
    content: sample,
    createdAt: '2026-03-15',
  },
  {
    id: 'r3',
    title: '카카오 인턴십 지원서',
    company: '카카오',
    jobType: 'IT/SW',
    position: '풀스택 개발',
    categoryLabel: '직무관련경험',
    content: sample,
    createdAt: '2026-02-28',
  },
]
