/** Lean, authenticated /programs/mine response. Operation dates may be undecided. */
export interface MyProgram {
  id: string
  title: string
  description: string
  category: string
  manager: string
  location: string
  startDate: string | null
  endDate: string | null
  sessions: number
  appliedAt: string
  cancelledAt: string | null
  selection: string
  outcome: string | null
  attendance: string
}
