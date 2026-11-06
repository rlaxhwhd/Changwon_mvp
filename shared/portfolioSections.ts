// 포트폴리오 항목 정의 — 편집기와 제출본 표시가 같이 쓴다. 필드 키의 정본은 서버(portfolio_document.py)다.
import type { ListSection, PersonalSection, PortfolioDocument, PortfolioItem, PortfolioSectionKey } from './portfolioStore'

export interface FieldDef {
  key: string
  label: string
  kind?: 'text' | 'long' | 'level' | 'file'
  placeholder?: string
  /** 있으면 선택 상자로 입력한다. 저장값은 문자열이다. */
  options?: string[]
}

export interface SectionDef {
  key: PortfolioSectionKey
  label: string
  icon: string
  required?: boolean
  /** 항목 이름 칸의 라벨. 없으면 titleField 값을 항목 이름으로 쓴다. */
  titleLabel?: string
  titleField?: string
  fields: FieldDef[]
  /** 기존 기록에서 불러올 수 있는 항목 */
  importable?: boolean
  /** 표시할 때 기간으로 묶는 두 칸 */
  period?: [string, string]
}

const DATE = 'YYYY.MM'
const description: FieldDef = { key: 'description', label: '내용', kind: 'long' }

export const SECTION_DEFS: SectionDef[] = [
  { key: 'personal', label: '인적사항', icon: 'fa-id-card', required: true, importable: true, fields: [] },
  {
    key: 'education', label: '학력사항', icon: 'fa-graduation-cap', required: true, titleField: 'schoolName',
    period: ['admittedOn', 'graduatedOn'],
    fields: [
      { key: 'schoolName', label: '학교명' }, { key: 'degree', label: '학력', options: ['고등학교', '전문학사', '학사', '석사', '박사'] },
      { key: 'track', label: '계열', options: ['인문', '사회', '공학', '자연', '의약', '교육', '예체능', '기타'] },
      { key: 'major', label: '전공' }, { key: 'additionalMajorType', label: '전공 추가', options: ['복수전공', '부전공', '연계전공'] },
      { key: 'additionalMajor', label: '추가 전공' }, { key: 'status', label: '졸업 구분', options: ['졸업', '졸업예정', '재학', '휴학', '수료', '중퇴'] },
      { key: 'admissionType', label: '입학 구분', options: ['입학', '편입'] }, { key: 'admittedOn', label: '입학', placeholder: DATE },
      { key: 'graduatedOn', label: '졸업', placeholder: DATE }, { key: 'gpa', label: '학점' },
      { key: 'gpaScale', label: '기준학점', options: ['4.0', '4.3', '4.5', '100'] },
    ],
  },
  {
    key: 'military', label: '병역사항', icon: 'fa-shield-halved', titleField: 'serviceType', period: ['startOn', 'endOn'],
    fields: [
      { key: 'serviceType', label: '군필여부', options: ['군필', '미필', '복무중', '면제', '비대상'] },
      { key: 'branch', label: '군별', options: ['육군', '해군', '공군', '해병대', '기타'] },
      { key: 'rank', label: '계급', options: ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '소위', '중위', '대위', '기타'] },
      { key: 'startOn', label: '입대일', placeholder: DATE }, { key: 'endOn', label: '전역일', placeholder: DATE },
      { key: 'dischargeType', label: '전역사유', options: ['만기전역', '의가사전역', '의병전역', '소집해제', '기타'] },
      { key: 'exemptionReason', label: '면제사유' },
    ],
  },
  {
    key: 'training', label: '교육사항(NCS)', icon: 'fa-chalkboard-user', titleLabel: '교육명', importable: true,
    period: ['startOn', 'endOn'],
    fields: [
      { key: 'organizer', label: '교육 기관' }, { key: 'startOn', label: '시작', placeholder: DATE },
      { key: 'endOn', label: '종료', placeholder: DATE }, { key: 'hours', label: '교육 시간' }, description,
    ],
  },
  {
    key: 'experience', label: '경험사항', icon: 'fa-lightbulb', titleLabel: '경험명', importable: true,
    period: ['startOn', 'endOn'],
    fields: [
      { key: 'organization', label: '소속·기관' }, { key: 'role', label: '역할' },
      { key: 'startOn', label: '시작', placeholder: DATE }, { key: 'endOn', label: '종료', placeholder: DATE },
      description, { key: 'result', label: '성과', kind: 'long' }, { key: 'link', label: '링크', placeholder: 'https://' },
    ],
  },
  {
    key: 'career', label: '경력사항', icon: 'fa-briefcase', titleField: 'company', period: ['startOn', 'endOn'],
    fields: [
      { key: 'company', label: '회사명' }, { key: 'department', label: '부서' }, { key: 'position', label: '직책' },
      { key: 'employmentType', label: '고용 형태' }, { key: 'startOn', label: '입사', placeholder: DATE },
      { key: 'endOn', label: '퇴사', placeholder: DATE }, { ...description, label: '담당 업무' },
    ],
  },
  {
    key: 'language', label: '어학', icon: 'fa-language', titleLabel: '어학 이름', importable: true,
    fields: [
      { key: 'language', label: '언어' }, { key: 'testName', label: '시험명' }, { key: 'scoreText', label: '점수·등급' },
      { key: 'issuer', label: '발급 기관' }, { key: 'acquiredOn', label: '취득일', placeholder: DATE }, description,
    ],
  },
  {
    key: 'certificate', label: '자격증', icon: 'fa-certificate', titleLabel: '자격증명', importable: true,
    fields: [
      { key: 'issuer', label: '발급 기관' }, { key: 'certNo', label: '자격 번호' }, { key: 'scoreText', label: '점수·등급' },
      { key: 'acquiredOn', label: '취득일', placeholder: DATE }, description,
    ],
  },
  {
    key: 'skill', label: '보유 스킬', icon: 'fa-screwdriver-wrench', titleLabel: '스킬명', importable: true,
    fields: [{ key: 'level', label: '숙련도', kind: 'level' }, description],
  },
  {
    key: 'award', label: '수상경력', icon: 'fa-trophy', titleLabel: '수상명', importable: true,
    fields: [
      { key: 'host', label: '주최' }, { key: 'rank', label: '등급' },
      { key: 'awardedOn', label: '수상일', placeholder: DATE }, description,
    ],
  },
  {
    key: 'overseas', label: '해외경험/경력', icon: 'fa-earth-asia', titleField: 'country', period: ['startOn', 'endOn'],
    fields: [
      { key: 'country', label: '국가' }, { key: 'purpose', label: '목적' },
      { key: 'startOn', label: '시작', placeholder: DATE }, { key: 'endOn', label: '종료', placeholder: DATE }, description,
    ],
  },
  {
    key: 'volunteer', label: '봉사활동', icon: 'fa-hand-holding-heart', titleLabel: '활동명', period: ['startOn', 'endOn'],
    fields: [
      { key: 'organization', label: '기관' }, { key: 'startOn', label: '시작', placeholder: DATE },
      { key: 'endOn', label: '종료', placeholder: DATE }, { key: 'hours', label: '봉사 시간' }, description,
    ],
  },
  {
    key: 'coverLetter', label: '자기소개서', icon: 'fa-file-lines', titleField: 'question', importable: true,
    fields: [{ key: 'question', label: '문항', kind: 'long' }, { key: 'answer', label: '답변', kind: 'long' }],
  },
  {
    key: 'document', label: '포트폴리오 및 기타문서', icon: 'fa-paperclip', titleLabel: '문서 이름', importable: true,
    fields: [{ key: 'fileId', label: '파일', kind: 'file' }, description],
  },
  { key: 'specialty', label: '특기사항', icon: 'fa-star', titleLabel: '제목', fields: [description] },
  {
    key: 'careerDescription', label: '경력기술서', icon: 'fa-pen-to-square', titleField: 'company',
    fields: [{ key: 'company', label: '회사명' }, description],
  },
]

export const LEVEL_NAMES = ['', '초급', '초중급', '중급', '고급', '전문가']

/** 학사가 정하는 칸. 서버가 덮어쓰므로 입력을 받지 않는다(CLAUDE.md 규칙 1). */
const ENROLLMENT_LOCKED = ['schoolName', 'major', 'status', 'gpa']
const CERT_LOCKED = ['issuer', 'certNo', 'acquiredOn']

export const isEnrollment = (item: PortfolioItem) => item.sourceRef === 'academic:enrollment'
export const isCertified = (item: PortfolioItem) => (item.sourceRef ?? '').startsWith('cert:')

export function isLocked(section: PortfolioSectionKey, item: PortfolioItem, field: string): boolean {
  if (section === 'education') return isEnrollment(item) && ENROLLMENT_LOCKED.includes(field)
  if (section === 'certificate') return isCertified(item) && CERT_LOCKED.includes(field)
  return false
}

export function personalOf(document: PortfolioDocument): PersonalSection['data'] {
  return (document.sections.find(section => section.key === 'personal') as PersonalSection).data
}

export function listSection(document: PortfolioDocument, key: PortfolioSectionKey): ListSection | undefined {
  return document.sections.find((section): section is ListSection => section.key === key && 'items' in section)
}
