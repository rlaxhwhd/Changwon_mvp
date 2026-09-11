import { api } from './api'
import type { StudentData, CounselOwner } from '../src_v2/data/students'

export interface StudentChoice { id: string; name: string; major: string; grade: number }
let choices: StudentChoice[] = []
let profiles: StudentData[] = []
let owners: CounselOwner[] = []

export function studentChoices(): StudentChoice[] { return choices }
export function studentProfiles(): StudentData[] { return profiles }
export function counselOwnerProfiles(): CounselOwner[] { return owners }
export function setStudentChoices(value: StudentChoice[]): void { choices = value }

export async function loadProfiles(): Promise<void> {
  const result = await api<{ students: StudentData[]; counselOwners: CounselOwner[] }>('/bootstrap/profiles')
  profiles.splice(0,profiles.length,...result.students)
  owners.splice(0,owners.length,...result.counselOwners)
}
