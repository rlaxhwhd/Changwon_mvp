let starStudentKeys = new Set<string>()

/** Only server-authorized IDs, aliases and student numbers; never match by name. */
export function setStarStudentKeys(keys: string[]): void {
  starStudentKeys = new Set(keys)
}

export function studentDisplayName(name: string | null | undefined, identity: string | null | undefined, star?: boolean): string {
  if (!name) return ''
  return (star ?? (!!identity && starStudentKeys.has(identity))) ? `${name} ⭐` : name
}
