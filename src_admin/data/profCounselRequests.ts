// ─────────────────────────────────────────────────────────────────────────────
// 교수상담 신청 투영 로더 — 원천은 서버(GET /counsel-requests)가 채운 shared/counselStore 다.
// 현행 DB 대응: CON_PROF_INFO(신청+결과 한 행, 18.4만건) → dc.counsel_request(type=PROF).
// ★ 학생 owner(STUDENTS·counselSeed)를 거치지 않는다 — 거치면 상세 프로필이 없는 지도학생의
//   신청이 접수·기록·실적에서 사라진다. 관리자 쪽에 별도 신청 스토어를 만들지 말 것.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  CounselMethod,
  CounselRequestStatus,
  CounselSlot,
  EnrollmentStatus,
} from '../../src_v2/data/students'
import { counselRequests, performCounselAction } from '../../shared/counselStore'
import { mockLatency, paginate } from './query'
import type { ListParams, Paginated } from './query'

export interface ProfCounselRequestRow {
  /** 학생 상담 신청의 단일 식별자. */
  id: string
  /** 신청 학생 식별자. */
  studentId: string
  /** 학생 학번 스냅샷. */
  studentNo: string
  /** 학생 이름 스냅샷. */
  studentName: string
  /** 학생 학과 스냅샷. */
  studentMajor: string
  /** 학생 학년 스냅샷. */
  studentGrade: number
  /** 학생 학적 상태 스냅샷. */
  enrollmentStatus: EnrollmentStatus
  /** 확정 또는 신청한 상담 방식. */
  method: CounselMethod
  /** 학생이 작성한 상담 주제. */
  topic: string
  /** 학생이 신청한 시각. */
  requestedAt: string
  /** 신청의 현재 전이 상태. */
  status: CounselRequestStatus
  /** 학생 희망 또는 교수가 확정한 상담 슬롯. */
  slot?: CounselSlot
  /** 현재 교수의 활성 지도학생인지 여부. */
  isAdvisee: boolean
}
export type ProfReqTab = '전체' | CounselRequestStatus

/**
 * 학과명 정규화 — 일부 데모 owner의 major가 "컴퓨터공학과 4학년"처럼 학년을 포함한다.
 * 학년은 별도 필드(studentGrade)로 이미 들고 있어 화면에서 "…4학년 · 4학년" 중복이 되고,
 * 그 값이 상담기록 snapshot.major로 굳으면 이관 데이터까지 오염된다 → 투영 단계에서 떼어낸다.
 */
function majorOnly(major: string): string {
  return major.replace(/\s*\d+학년$/, '')
}

function allRows(professorId: string): ProfCounselRequestRow[] {
  return counselRequests()
    .filter(request => request.type === '교수' && request.professorId === professorId)
    .map(request => ({
      id: request.id,
      studentId: request.studentId,
      studentNo: request.studentNo,
      studentName: request.studentName,
      studentMajor: majorOnly(request.studentMajor),
      studentGrade: request.studentGrade ?? 0,
      enrollmentStatus: request.studentStatus ?? '재학',
      method: request.method,
      topic: request.topic,
      requestedAt: request.requestedAt,
      status: request.status,
      slot: request.slot,
      isAdvisee: request.isAdvisee ?? false,
    }))
}
/** [DB-ready] 교수 소유 type=교수 신청 투영이며 페이징 전에 범위를 좁힌다. */
export async function queryProfCounselRequests(
  params: ListParams & { professorId: string; tab?: ProfReqTab },
): Promise<Paginated<ProfCounselRequestRow>> {
  await mockLatency()
  const q = (params.q ?? '').trim().toLowerCase()
  const method = params.filters?.method
  const rows = allRows(params.professorId)
    .filter(row => !params.tab || params.tab === '전체' || row.status === params.tab)
    .filter(row => !method || row.method === method)
    .filter(row => !q || `${row.studentName} ${row.studentNo}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.status === '대기') - Number(a.status === '대기')
      || b.requestedAt.localeCompare(a.requestedAt))
  return paginate(rows, params)
}
/** [DB-ready] 교수 범위의 상태별 신청 — 알림 벨처럼 페이징이 필요 없는 곳이 쓴다. */
export function getProfRequestsByStatus(
  professorId: string,
  status: CounselRequestStatus,
): ProfCounselRequestRow[] {
  return allRows(professorId).filter(row => row.status === status)
}

export function getProfReqTabCounts(professorId: string): Record<ProfReqTab, number> {
  const rows = allRows(professorId)
  const counts: Record<ProfReqTab, number> = { 전체: rows.length, 대기: 0, 확정: 0, 완료: 0, 취소: 0 }
  rows.forEach(row => { counts[row.status] += 1 })
  return counts
}
/** [DB-ready] 교수 범위 안에서 신청 ID의 상담 투영 행을 조회한다. */
export function getProfRequestById(
  professorId: string,
  id: string,
): ProfCounselRequestRow | undefined {
  return allRows(professorId).find(row => row.id === id)
}

/** 대기 신청을 확정 상태와 교수 확정 슬롯으로 전이한다. 서버가 정본이다. */
export async function confirmProfRequest(id: string, slot: CounselSlot): Promise<void> {
  await performCounselAction(id, 'confirm', { slot })
}

/** 대기 신청을 취소 상태로 전이한다. 취소 사유는 서버가 필수로 요구한다. */
export async function cancelProfRequest(id: string, reason: string): Promise<void> {
  await performCounselAction(id, 'cancel', { reason })
}

/** 확정된 신청을 상담 기록과 함께 완료 상태로 전이한다(서버가 한 트랜잭션으로 기록+전이를 처리). */
export async function completeProfRequest(
  id: string,
  record: { summary: string; comment?: string; followUp?: string },
): Promise<void> {
  await performCounselAction(id, 'complete', {
    summary: record.summary, comment: record.comment ?? '', followUp: record.followUp ?? '',
  })
}
