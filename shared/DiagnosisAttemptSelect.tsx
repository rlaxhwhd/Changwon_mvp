import './DiagnosisHistory.css'

type AttemptOption = { attemptNo: number; testedAt: string; isCurrent?: boolean }

export default function DiagnosisAttemptSelect({ attempts, value, onChange, label = '진단 회차', disabled = false }: {
  attempts: AttemptOption[]
  value?: number
  onChange: (attemptNo: number) => void
  label?: string
  disabled?: boolean
}) {
  return <select className="diagnosis-attempt-select" aria-label={label} value={value ?? ''}
    disabled={disabled || !attempts.length} onChange={event => onChange(Number(event.target.value))}>
    {!attempts.length && <option value="">응시 이력 없음</option>}
    {[...attempts].sort((a, b) => b.attemptNo - a.attemptNo).map(attempt => <option key={attempt.attemptNo} value={attempt.attemptNo}>
      {attempt.attemptNo}회차{attempt.testedAt ? ` · ${attempt.testedAt.slice(0, 10)}` : ''}{attempt.isCurrent ? ' · 최신 결과' : ''}
    </option>)}
  </select>
}
