import { api } from './api'
import type { DepartmentNode } from '../src_admin/data/schema/department'

export const departments: DepartmentNode[] = []

export async function loadDepartments(): Promise<void> {
  const rows = await api<DepartmentNode[]>('/departments')
  departments.splice(0, departments.length, ...rows)
}
