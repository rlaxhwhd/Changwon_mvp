import { api } from './api'
import type { StaffUser } from '../src_admin/data/schema/staff'
import type { DepartmentGroup } from '../src_v2/data/professors'

export type OrgAssignment = { id: string; collegeCode: string; deptCode: string; collegeName: string; deptName: string; roleCode: string; validFrom: string; validTo: string | null; isActive: boolean }
export interface StaffDetail extends StaffUser {
  collegeName?: string
  email?: string
  officeHours?: string
  departments?: string[]
  version: number
  orgAssignments: OrgAssignment[]
  counselProfile: { accept: boolean; officeHours: string; intro: string }
}

export const professorGroups: DepartmentGroup[] = []
export const directoryStaff: StaffUser[] = []
export let activeStaffDetail: StaffDetail | undefined

export async function loadProfessorGroups(): Promise<void> {
  const rows = await api<DepartmentGroup[]>('/staff?role=professor&groupBy=college')
  professorGroups.splice(0, professorGroups.length, ...rows)
}

export async function loadStaffDirectory(identity?: string): Promise<void> {
  const roles = ['professor', 'assistant', 'career', 'psych'] as const
  const lists = await Promise.all(roles.map(role => api<StaffUser[]>(`/staff?role=${role}`)))
  directoryStaff.splice(0, directoryStaff.length, ...lists.flat())
  activeStaffDetail = identity ? await api<StaffDetail>(`/staff/${identity}`) : undefined
}

export async function saveProfessorProfile(identity: string, patch: { accept: boolean; officeHours: string; intro: string }): Promise<void> {
  if (!activeStaffDetail || activeStaffDetail.id !== identity) throw new Error('교수 프로필을 먼저 불러와 주세요.')
  const result = await api<{ version: number }>(`/staff/${identity}/profile`, {
    method: 'PUT', body: JSON.stringify({ expectedVersion: activeStaffDetail.version, ...patch }),
  })
  activeStaffDetail = { ...activeStaffDetail, version: result.version, officeHours: patch.officeHours, counselProfile: { ...patch } }
  await loadProfessorGroups()
}
