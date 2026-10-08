import { api } from './api'
import { setStarStudentKeys } from './studentDisplayName'
import type { StudentData, CounselOwner } from '../src_v2/data/students'

export interface StudentChoice { id: string; name: string; major: string; grade: number }
let choices: StudentChoice[] = []
let profiles: StudentData[] = []
let owners: CounselOwner[] = []

export function studentChoices(): StudentChoice[] { return choices }
export function studentProfiles(): StudentData[] { return profiles }
export function counselOwnerProfiles(): CounselOwner[] { return owners }
export function setStudentChoices(value: StudentChoice[]): void { choices = value }

/** Scoped individual lookup; never infer existence from bootstrap or JSON history. */
export async function loadStudentProfile(identity: string): Promise<StudentData> {
  const profile = await api<StudentData>(`/students/${encodeURIComponent(identity)}`)
  const index = profiles.findIndex(p => p.id === profile.id)
  if (index < 0) profiles.push(profile)
  else profiles.splice(index, 1, profile)
  return profile
}

export async function loadProfiles(): Promise<void> {
  const result = await api<{ students: StudentData[]; counselOwners: CounselOwner[]; starStudentKeys: string[] }>('/bootstrap/profiles')
  setStarStudentKeys(result.starStudentKeys)
  profiles.splice(0,profiles.length,...result.students)
  owners.splice(0,owners.length,...result.counselOwners)
}
