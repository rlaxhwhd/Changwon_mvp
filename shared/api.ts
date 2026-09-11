export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** The identity selector is available only through the local development proxy.
 * The proxy supplies the secret token; it is never included in the browser build.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const identity = location.pathname.startsWith('/admin')
    ? localStorage.getItem('dc_active_staff')
    : localStorage.getItem('dc_active_student')
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (identity) headers.set('X-DC-Identity', identity)
  const response = await fetch(`/api/v1${path}`, { ...init, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { detail?: unknown; message?: string } | null
    throw new ApiError(response.status,
      typeof error?.detail === 'string' ? error.detail : error?.message ?? `요청에 실패했습니다. (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function queryString(params: object): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (key === 'studentIds' && value.length === 0) query.set('emptyStudentIds', 'true')
      for (const item of value) query.append(key, String(item))
    } else if (typeof value === 'object' && value !== null) {
      for (const [field, item] of Object.entries(value)) {
        if (item !== undefined) query.set(`${key}.${field}`, String(item))
      }
    } else query.set(key, String(value))
  }
  return query.toString()
}

export async function downloadApiFile(path: string, filename: string): Promise<void> {
  const identity = localStorage.getItem(location.pathname.startsWith('/admin') ? 'dc_active_staff' : 'dc_active_student')
  const response = await fetch(`/api/v1${path}`, { headers: identity ? { 'X-DC-Identity': identity } : {} })
  if (!response.ok) throw new ApiError(response.status, '내보내기에 실패했습니다. 다시 시도해 주세요.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
