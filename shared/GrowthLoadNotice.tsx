import { ensureGrowth, growthLoadError, growthState } from './growthStore'

/** 학생·상담사·자소서에서 실패를 빈 기록으로 오인하지 않게 한다. 부모가 useGrowth로 구독한다. */
export default function GrowthLoadNotice({ studentId }: { studentId: string }) {
  const error = growthLoadError(studentId)
  if (error) return <p role="alert">{error} <button type="button" onClick={() => ensureGrowth(studentId)}>다시 불러오기</button></p>
  if (!growthState(studentId)) return <p role="status">성장 기록을 불러오는 중입니다.</p>
  return null
}
