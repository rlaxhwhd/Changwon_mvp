/** 취업예측분석시스템(/admin/forecast) 취업 현황 대장 — 서버 `dc.employment_report`(151). 시스템관리자 전용. */
import { api, downloadApiFile, queryString } from '../../shared/api'
import { uploadWorkbook } from './xlsxUpload'
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

export { UploadRejected } from './xlsxUpload'
export type { UploadError } from './xlsxUpload'

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

export const uploadEmployments = (file: File) =>
  uploadWorkbook<{ inserted: number; updated: number }>('/forecast/employments/upload', file)

/** 'YYYY-MM' → 'YYYY.MM' (목록·양식 표기) */
export const dotMonth = (month: string | null) => month ? month.replace('-', '.') : '-'
