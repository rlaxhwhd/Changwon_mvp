import { useState } from 'react'
import StudentChargeTable from '../components/StudentChargeTable'
import StudentDetailModal from '../components/StudentDetailModal'
import { getActiveCounselor } from '../data/counselors'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 생성 (상담사) — PROCESS.md §6-7
//
// 「아직 로드맵이 없는 학생을 찾아 만든다」는 작업 대기열이다.
// 「로드맵 이행률 현황」(/roadmap/progress)은 이행률 분포·정체 학생을 보는 통계
// 화면이라 별개다.
//
// 표는 학생 목록과 같은 것을 쓴다(StudentChargeTable) — 필터·검색·페이지네이션을
// 두 벌 만들지 않는다(CLAUDE.md 규칙 12). 다른 것은 마지막 칸뿐이다.
//
// 생성은 여기서 하지 않는다. 행이나 「생성」을 누르면 학생 상세의 로드맵 탭이 열리고
// 거기 「목표 달성 계획」 카드 안에서 만든다 — 생성이 일어나는 자리는 한 곳이어야
// 상담 중 동선(상세를 열어 둔 채로 만든다)과 어긋나지 않는다.
// ─────────────────────────────────────────────────────────────────────────
export default function RoadmapCreate() {
  const counselor = getActiveCounselor()
  const [openId, setOpenId] = useState<string | null>(null)
  // 모달을 닫을 때 목록을 다시 읽는다 — 방금 만든 로드맵이 이행률로 바뀌어야 한다.
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <StudentChargeTable
        departments={[]}
        title="로드맵 생성"
        scopeLabel="전 학과 · 로드맵이 없으면 생성, 있으면 이행률"
        mode="roadmap"
        onPickStudent={setOpenId}
        refreshKey={refreshKey}
      />

      {openId && (
        <StudentDetailModal
          studentId={openId}
          role={counselor.role}
          initialTab="roadmap"
          onClose={() => { setOpenId(null); setRefreshKey(n => n + 1) }}
        />
      )}
    </>
  )
}
