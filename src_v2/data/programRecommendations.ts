import { api } from '../../shared/api'

export interface RecommendedProgram {
  id: string
  title: string
  desc: string
  endDate: string | null
}

/** Server filters by the authenticated student's latest CARE 7+ type. */
export async function loadProgramRecommendations(): Promise<RecommendedProgram[]> {
  const items: RecommendedProgram[] = []
  for (let page = 1; ; page++) {
    const result = await api<{ items: RecommendedProgram[]; totalCount: number }>(
      `/programs?recommended=true&pageSize=100&page=${page}`,
    )
    items.push(...result.items)
    if (!result.items.length || items.length >= result.totalCount) return items
  }
}
