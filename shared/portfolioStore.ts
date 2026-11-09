// ─────────────────────────────────────────────────────────────────────────
// 학생 포트폴리오 스토어 — 회사 제출용 이력서를 학생이 여러 벌 만든다.
//
// 목록은 학생별로 들고 있고, 쓰기는 서버 응답 뒤 다시 읽어 dc:portfolio-updated 를 발행한다.
// 문서 본문은 편집기가 열 때만 읽는다. 제출본은 캐시하지 않는다 — 교직원 열람마다 감사가 남아야 한다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from './api'
import { invalidateStudent, revalidateStudent } from './studentCache'
import { DOCUMENT_ACCEPT, validateUpload } from './uploadPolicy'

export const PORTFOLIO_EVENT = 'dc:portfolio-updated'
export const PHOTO_ACCEPT = '.png,.jpg,.jpeg'

export type PortfolioSectionKey =
  | 'personal' | 'education' | 'military' | 'training' | 'experience' | 'career' | 'language' | 'certificate'
  | 'skill' | 'award' | 'overseas' | 'volunteer' | 'coverLetter' | 'document' | 'specialty' | 'careerDescription'

export interface PortfolioItem {
  id: string
  /** 원본 표시. 중복 거르기에만 쓴다. 직접 입력한 항목은 null 이다. */
  sourceRef: string | null
  /** 학사·기관이 확인한 자격. 서버가 정한다. */
  verified: boolean
  title: string
  fields: Record<string, string | number>
}

export interface PortfolioPersonal {
  name: string; studentNo: string; school: string; dept: string; grade: number | null
  email: string; phone: string; intro: string; photoFileId: string
  nameEn: string; birthDate: string; address: string
}

export interface PersonalSection { key: 'personal'; enabled: boolean; data: PortfolioPersonal }
export interface ListSection {
  key: Exclude<PortfolioSectionKey, 'personal'>
  enabled: boolean
  items: PortfolioItem[]
}
export type PortfolioSection = PersonalSection | ListSection
export interface PortfolioDocument { schemaVersion: 1; sections: PortfolioSection[] }

export interface PortfolioFile { id: string; name: string; size: number; contentType: string; downloadUrl: string }
export type PortfolioFiles = Record<string, PortfolioFile>

export interface PortfolioSummary {
  id: string; title: string; updatedAt: string; version: number; complete: boolean
  /** 학생당 한 벌. 교직원 학생 상세가 이 한 벌만 본다(0011). */
  representative: boolean
}

export interface PortfolioDetail extends Omit<PortfolioSummary, 'representative'> {
  document: PortfolioDocument
  missing: string[]
  files: PortfolioFiles
}

export interface PortfolioNotImported { sourceRef: string | null; title: string }
export interface CreatedPortfolio extends PortfolioDetail { notImported: PortfolioNotImported[] }

export interface PortfolioSource {
  personal: PortfolioPersonal
  sections: { key: ListSection['key']; items: PortfolioItem[] }[]
}

export interface SubmittedPortfolio {
  attemptNo: number
  title: string
  document: PortfolioDocument
  submittedAt: string
  version: number
  files: PortfolioFiles
}

interface PortfolioList { items: PortfolioSummary[]; limit: number }

const lists = new Map<string, PortfolioList>()

function base(studentId: string): string {
  return `/students/${encodeURIComponent(studentId)}/portfolios`
}

function publish(): void {
  window.dispatchEvent(new Event(PORTFOLIO_EVENT))
}

export function portfolioList(studentId: string): PortfolioSummary[] {
  return lists.get(studentId)?.items ?? []
}

export function portfolioLimit(studentId: string): number | null {
  return lists.get(studentId)?.limit ?? null
}

export async function ensurePortfolios(studentId: string): Promise<void> {
  await revalidateStudent('portfolios', studentId, async () => {
    lists.set(studentId, await api<PortfolioList>(base(studentId)))
    publish()
  })
}

/** 지원 모달은 제출 직전 버전이 필요하다 — 신선도를 믿지 않고 다시 읽는다. */
export function reloadPortfolios(studentId: string): Promise<void> {
  invalidateStudent('portfolios', studentId)
  return ensurePortfolios(studentId)
}

export async function createPortfolio(studentId: string, input: { title?: string; sourcePortfolioId?: string }): Promise<CreatedPortfolio> {
  const created = await api<CreatedPortfolio>(base(studentId), {
    method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(input),
  })
  await reloadPortfolios(studentId)
  return created
}

export function loadPortfolioDetail(studentId: string, id: string): Promise<PortfolioDetail> {
  return api<PortfolioDetail>(`${base(studentId)}/${encodeURIComponent(id)}`)
}

export async function savePortfolio(studentId: string, id: string, input: {
  title: string; document: PortfolioDocument; expectedVersion: number
}): Promise<PortfolioDetail> {
  const saved = await api<PortfolioDetail>(`${base(studentId)}/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(input),
  })
  await reloadPortfolios(studentId)
  return saved
}

/** 이름 변경도 전체 PUT 이다 — 상세를 읽어 문서와 함께 보낸다. */
export async function renamePortfolio(studentId: string, id: string, title: string): Promise<void> {
  const detail = await loadPortfolioDetail(studentId, id)
  await savePortfolio(studentId, id, { title, document: detail.document, expectedVersion: detail.version })
}

export async function deletePortfolio(studentId: string, row: PortfolioSummary): Promise<void> {
  await api(`${base(studentId)}/${encodeURIComponent(row.id)}/delete`, {
    method: 'POST', body: JSON.stringify({ expectedVersion: row.version }),
  })
  await reloadPortfolios(studentId)
}

/** 대표 지정·해제. 다른 벌이 대표였으면 서버가 같이 내린다. 판(version)은 바뀌지 않는다. */
export async function setRepresentative(studentId: string, id: string, representative: boolean): Promise<void> {
  await api(`${base(studentId)}/${encodeURIComponent(id)}/representative`, {
    method: 'POST', body: JSON.stringify({ representative }),
  })
  await reloadPortfolios(studentId)
}

/** 대표 포트폴리오. 학생 본인과 학생 상세 권한이 있는 교직원이 같은 경로를 쓴다. 없으면 null.
 *  교직원 열람마다 감사가 남아야 하므로 캐시하지 않는다. */
export function loadRepresentativePortfolio(studentId: string): Promise<PortfolioDetail | null> {
  return api<PortfolioDetail | null>(`/students/${encodeURIComponent(studentId)}/representative-portfolio`)
}

export function loadPortfolioSource(studentId: string): Promise<PortfolioSource> {
  return api<PortfolioSource>(`/students/${encodeURIComponent(studentId)}/portfolio-source`)
}

export function uploadPortfolioFile(slot: 'PORTFOLIO_PHOTO' | 'PORTFOLIO_DOCUMENT', file: File): Promise<PortfolioFile> {
  validateUpload(file, slot === 'PORTFOLIO_PHOTO' ? PHOTO_ACCEPT : DOCUMENT_ACCEPT)
  return api<PortfolioFile>(`/portfolio-files?slot=${slot}&name=${encodeURIComponent(file.name)}`, {
    method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file,
  })
}

/** 제출본. 교직원과 제출 학생이 같은 경로를 쓴다. 여는 시점에만 부른다. */
export function loadSubmittedPortfolio(applicationId: string): Promise<SubmittedPortfolio> {
  return api<SubmittedPortfolio>(`/job-applications/${encodeURIComponent(applicationId)}/portfolio`)
}
