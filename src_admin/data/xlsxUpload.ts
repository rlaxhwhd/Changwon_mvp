/** 엑셀(.xlsx) 업로드 공통 — 서버는 한 행이라도 틀리면 저장하지 않고 행별 오류(detail.errors)를 돌려준다. */
import { ApiError } from '../../shared/api'

export interface UploadError { row: number; message: string }
/** 업로드가 행 오류로 거절되면 어느 행이 왜 틀렸는지 함께 들고 온다. */
export class UploadRejected extends Error {
  errors: UploadError[]
  constructor(message: string, errors: UploadError[]) {
    super(message)
    this.errors = errors
  }
}

export async function uploadWorkbook<T>(path: string, file: File): Promise<T> {
  // 행 오류 목록(detail.errors)은 공통 apiResponse 가 메시지만 남기고 버리므로 업로드는 응답을 직접 읽는다.
  const identity = localStorage.getItem('dc_active_staff')
  const response = await fetch(`/api/v1${path}`, {
    method: 'POST',
    body: file,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'X-DC-Portal': 'admin',
      ...(identity ? { 'X-DC-Identity': identity } : {}),
    },
  })
  if (response.ok) return response.json()
  const detail = (await response.json().catch(() => null) as { detail?: unknown } | null)?.detail
  if (detail && typeof detail === 'object' && 'errors' in detail && Array.isArray(detail.errors)) {
    const message = 'message' in detail && typeof detail.message === 'string' ? detail.message : '업로드에 실패했습니다.'
    throw new UploadRejected(message, detail.errors as UploadError[])
  }
  throw new ApiError(response.status, typeof detail === 'string' ? detail : `업로드에 실패했습니다. (${response.status})`)
}
