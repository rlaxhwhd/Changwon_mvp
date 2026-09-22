import StudentChargeTable from '../components/StudentChargeTable'

// ─────────────────────────────────────────────────────────────────────────
// 전체 학생 목록 (상담사) — 학생 관리 §3-1-⑧.
// 담당 학생 목록과 표·데이터 항목이 같다(StudentChargeTable 공유). 다른 것은 조회 범위뿐이다.
//
// 학사 원천의 학부·대학원 전체 학적을 읽는다. 담당 목록과 서버 조회 경로를 구분한다.
// 목록 열람은 서비스 가입이나 상담·로드맵의 담당 권한을 새로 부여하지 않는다.
// ─────────────────────────────────────────────────────────────────────────
export default function StudentAll() {
  return (
    <StudentChargeTable
      departments={[]}
      academic
      title="전체 학생 목록"
      scopeLabel="학사 DB 전체 · 학부·대학원 · 모든 학적 상태"
    />
  )
}
