import type { ReactElement } from 'react'
import { getStageAccess } from '../data/careerProcess'
import type { Stage } from '../data/careerProcess'
import { getPipelineState } from '../data/pipeline'
import { getActiveStudent } from '../data/students'
import StageLockNotice from './StageLockNotice'

// ─────────────────────────────────────────────────────────────────────────
// 순차 게이팅 라우트 가드 (CLAUDE.md 13조)
//
// 잠금 판정을 화면마다 넣지 않고 라우트 한 곳에서 감싼다 — 화면은 자기가 잠겼는지
// 알 필요가 없다. 잠겼으면 안내 패널이 대신 그려진다(빈 화면을 주지 않는다).
//
// ⚠ 진단센터는 감싸지 않는다. 첫 관문이라 언제나 열려 있어야 한다.
// ─────────────────────────────────────────────────────────────────────────

export interface StageGateProps {
  stage: Stage
  /** 학생이 부르는 화면 이름 — 「경력개발 로드맵」처럼 메뉴에 적힌 그대로 */
  title: string
  children: ReactElement
}

export default function StageGate({ stage, title, children }: StageGateProps) {
  const state = getPipelineState(getActiveStudent())
  if (getStageAccess(state)[stage] === 'locked') {
    return <StageLockNotice stage={stage} state={state} title={title} />
  }
  return children
}
