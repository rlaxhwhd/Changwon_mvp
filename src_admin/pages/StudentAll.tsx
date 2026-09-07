import StudentChargeTable from '../components/StudentChargeTable'

// ─────────────────────────────────────────────────────────────────────────
// 전체 학생 목록 (상담사) — 학생 관리 §3-1-⑧.
// 담당 학생 목록과 표·데이터 항목이 같다(StudentChargeTable 공유). 다른 것은 조회 범위뿐이다.
//
// ★ departments=[] 는 studentRoster.getFullRoster 규약상 "전 학과"다.
//   상담사 8명 전원이 departments=[] (전 학과 담당)이라 지금은 담당 목록과 모수가 같다.
//   SPEC §2 는 상담사를 담당 단과대로 좁히지만, 그 범위 판정은 accessScope.ts(미신설)
//   한 곳에서 하기로 되어 있다. 여기서 임시 필터를 만들지 않는다 — 만들면 판정이 또 흩어진다.
// ─────────────────────────────────────────────────────────────────────────
export default function StudentAll() {
  return (
    <StudentChargeTable
      departments={[]}
      title="전체 학생 목록"
      scopeLabel="전 학과 · 담당 배정과 무관한 재학생 전량"
    />
  )
}
