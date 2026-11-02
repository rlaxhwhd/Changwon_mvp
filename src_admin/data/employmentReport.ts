/** 취업예측분석시스템(/admin/forecast) 취업 현황 대장 — 서버 `dc.employment_report`(151). 시스템관리자 전용. */
import { api, ApiError, downloadApiFile, queryString } from '../../shared/api'
import type { Paginated } from './query'

export interface CodeOption { code: string; label: string }
export interface EmploymentOptions { companyTypes: CodeOption[]; regions: CodeOption[]; surveyYears: number[] }

export interface EmploymentRow {
  id: number
  surveyYear: number
  studentNo: string
  name: string | null
  collegeName: string | null
  deptName: string | null
  sex: '남' | '여' | null
  /** YYYY-MM */
  graduationMonth: string | null
  companyName: string
  duty: string
  companyTypeCode: string
  companyType: string
  regionCode: string
  region: string
  /** YYYY-MM */
  employedMonth: string
  writer: string | null
}

export interface AcademicStudent {
  studentNo: string
  name: string | null
  collegeName: string | null
  deptName: string
  sex: '남' | '여' | null
  graduationMonth: string | null
  status: string
}

export type SearchField = 'college' | 'dept' | 'studentNo' | 'sex' | 'name'
export interface EmploymentFilters {
  surveyYear?: number
  /** YYYY-MM */
  graduationFrom?: string
  graduationTo?: string
  field: SearchField
  q: string
}

export interface EmploymentInput {
  surveyYear: number
  studentNo: string
  graduationMonth: string | null
  companyName: string
  duty: string
  companyTypeCode: string
  regionCode: string
  employedMonth: string
}

export interface UploadError { row: number; message: string }
/** 업로드가 행 오류로 거절되면 어느 행이 왜 틀렸는지 함께 들고 온다. */
export class UploadRejected extends Error {
  errors: UploadError[]
  constructor(message: string, errors: UploadError[]) {
    super(message)
    this.errors = errors
  }
}

const filterQuery = (f: EmploymentFilters) => queryString({
  surveyYear: f.surveyYear, graduationFrom: f.graduationFrom, graduationTo: f.graduationTo, field: f.field, q: f.q || undefined,
})

export const fetchEmploymentOptions = () => api<EmploymentOptions>('/forecast/options')

export function queryEmployments(params: EmploymentFilters & { page: number; pageSize: number }): Promise<Paginated<EmploymentRow>> {
  return api(`/forecast/employments?${filterQuery(params)}&page=${params.page}&pageSize=${params.pageSize}`)
}

export const searchAcademicStudents = (q: string) =>
  api<{ items: AcademicStudent[] }>(`/forecast/students?${queryString({ q })}`).then(r => r.items)

export const saveEmployment = (id: number | null, input: EmploymentInput) =>
  api<EmploymentRow>(id ? `/forecast/employments/${id}` : '/forecast/employments', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) })

export const deleteEmployments = (ids: number[]) =>
  api<{ deleted: number }>('/forecast/employments/delete', { method: 'POST', body: JSON.stringify({ ids }) })

export const downloadEmployments = (filters: EmploymentFilters) =>
  downloadApiFile(`/forecast/employments/export?${filterQuery(filters)}`, `취업현황_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.xlsx`)

export async function uploadEmployments(file: File): Promise<{ inserted: number; updated: number }> {
  // 행 오류 목록(detail.errors)은 공통 apiResponse 가 메시지만 남기고 버리므로 이 호출만 응답을 직접 읽는다.
  const identity = localStorage.getItem('dc_active_staff')
  const response = await fetch('/api/v1/forecast/employments/upload', {
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

/** 'YYYY-MM' → 'YYYY.MM' (목록·양식 표기) */
export const dotMonth = (month: string | null) => month ? month.replace('-', '.') : '-'
