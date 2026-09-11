import type { StaffUser } from '../src_admin/data/schema/staff'

export const staffProfiles: StaffUser[] = []
export function setStaffProfiles(rows: StaffUser[]) {
  staffProfiles.splice(0, staffProfiles.length, ...rows)
}
