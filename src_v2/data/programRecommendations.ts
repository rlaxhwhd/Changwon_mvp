import { api } from '../../shared/api'

export interface RecommendedProgram {
  id: string
  title: string
  desc: string
  endDate: string | null
}

/** 서버가 로그인 학생의 최신 CARE 7+ 진단유형과 학년(참가대상 학년, 미지정=전 학년)으로 거른다. */
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
