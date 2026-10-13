type Props = {
  testId: string
  canStart: boolean
  retestRequired: boolean
  pending: boolean
  busy: boolean
  onStart: () => void
  onRequest: () => void
}

export default function DiagnosisStartButton({ testId, canStart, retestRequired, pending, busy, onStart, onRequest }: Props) {
  const hintId = `retest-hint-${testId}`
  return <div className={`de-start-action${retestRequired ? ' has-retest-hint' : ''}`}
    tabIndex={retestRequired ? 0 : undefined}
    onClick={event => { if (retestRequired && event.target === event.currentTarget) event.currentTarget.focus() }}
    aria-label={retestRequired ? '검사시작 잠금 안내' : undefined}
    aria-describedby={retestRequired ? hintId : undefined}>
    <button className={`de-start-btn${retestRequired ? ' de-start-blurred' : ''}`} type="button"
      disabled={busy || !canStart} onClick={onStart}>
      <span>검사시작</span> <i className="fa-solid fa-arrow-up-right-from-square" aria-label="새 탭" />
    </button>
    {retestRequired && <div id={hintId} className="de-retest-hint" role="group" aria-label="재응시 요청">
      <p>{pending ? '재검사 응시 요청 승인 대기 중입니다' : '재검사 응시 요청이 필요합니다'}</p>
      <button type="button" disabled={pending || busy} onClick={onRequest}>
        {pending ? '승인 대기' : busy ? '요청 중…' : '재응시 요청'}
      </button>
    </div>}
  </div>
}
