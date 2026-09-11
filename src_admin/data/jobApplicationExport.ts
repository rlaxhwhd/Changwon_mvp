// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원자 명단 내보내기(CSV) — 정본은 서버다.
//
// 예전에는 브라우저가 지원 배열 전체와 학생 명단을 조합해 행을 만들었다.
// 그러면 ① 담당 범위 밖 학생이 섞이고 ② 「대학」이 학과명 Map 조회라
// (단대코드,학과코드) 쌍을 쓰지 않으며(CLAUDE.md 규칙 7) ③ 다운로드 사실이 남지 않는다.
//
// 이제 목록·집계·CSV 가 같은 필터와 같은 범위 술어를 쓰고, 서버가 다운로드를
// dc.job_access_event 에 감사한다. 공용 api() 헬퍼는 JSON 전용이라 여기서만
// fetch 를 직접 쓴다.
// ─────────────────────────────────────────────────────────────────────────────

export interface JobApplicantExportFilter {
  postingId?: string
  status?: string
  stageId?: string
  collegeCode?: string
  deptCode?: string
  grade?: number
  q?: string
}

function exportUrl(filter: JobApplicantExportFilter): string {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') query.set(name, String(value))
  }
  return `/api/v1/job-applications/export?${query.toString()}`
}

/** CSV 본문(BOM 포함). 필터를 비우면 담당 범위의 전체 지원이 나온다. */
export async function fetchJobApplicantCsv(filter: JobApplicantExportFilter = {}): Promise<string> {
  const identity = localStorage.getItem('dc_active_staff')
  const headers = new Headers()
  if (identity) headers.set('X-DC-Identity', identity)
  const response = await fetch(exportUrl(filter), { headers })
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(error?.detail ?? '명단을 내려받지 못했습니다.')
  }
  return response.text()
}
