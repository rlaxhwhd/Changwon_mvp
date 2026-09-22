/** 상태값은 변경하지 않고 기존 의미색 토큰으로 표시만 통일한다. */
const statusClasses: Record<string, string> = {
  대기: 'wait', 미작성: 'wait', 신청: 'wait',
  예정: 'scheduled', 확정: 'scheduled', 작성중: 'draft', '임시 저장': 'draft', 임시저장: 'draft',
  완료: 'done', 수료: 'done', 출석: 'done', 선발: 'done',
  취소: 'cancel', 미선발: 'cancel', 미수료: 'cancel',
  노쇼: 'penalty',
}

export default function AdminStatusBadge({ status }: { status: string }) {
  return <span className={`admin-chip admin-chip-${statusClasses[status] ?? 'cancel'}`}>{status}</span>
}
