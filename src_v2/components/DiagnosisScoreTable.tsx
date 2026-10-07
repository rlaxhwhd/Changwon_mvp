import { useId, useState } from 'react'
import type { DiagnosisResult, FactorLevel, ResultRow } from '../data/diagnosisResults'
import { getDiagnosisTableGroups } from '../data/diagnosisChart'

const LEVEL_CLASS: Record<FactorLevel | '미등록', string> = { 매우낮음: 'low', 낮음: 'low', 보통: 'mid', 높음: 'high', 매우높음: 'high', 미등록: '' }
const scoreText = (score: number | null) => score == null ? '점수 없음'
  : score.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })

export default function DiagnosisScoreTable({ result, rows, detailRows = [], showFactorDesc = false }: {
  result: DiagnosisResult
  rows: ResultRow[]
  detailRows?: ResultRow[]
  showFactorDesc?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const tableId = useId()
  const groups = expanded ? getDiagnosisTableGroups(result, detailRows, rows) : [{ id: 'summary', name: '', rows }]
  const averaged = rows.some(row => row.averaged)
  const cells = (row: ResultRow) => <>
    <td className="drr-factor">{row.name}{showFactorDesc && row.desc && <small>{row.desc}</small>}</td>
    <td className="mid">{row.averaged ? <span title="영역 평균의 수준은 별도로 판정하지 않습니다">—</span>
      : <span className={`drr-level ${LEVEL_CLASS[row.level]}`}>{row.level}</span>}</td>
    <td className="num"><span className="drr-score">{scoreText(row.tScore)}</span></td>
  </>
  return <div className="drr-scores">
    {!!detailRows.length && <div className="drr-table-toolbar">
      <strong>{expanded ? '유형 점수' : '영역 점수'}</strong>
      <button type="button" className="drr-details-toggle" aria-expanded={expanded} aria-controls={tableId} onClick={() => setExpanded(value => !value)}>
        {expanded ? '상세 접기' : '하위항목 상세보기'}<span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
    </div>}
    <div className="drr-table-wrap" id={tableId}>
      <table className={`drr-table${expanded ? ' drr-table-grouped' : ''}`}>
        <thead><tr>
          {expanded && <th scope="col">영역</th>}
          <th scope="col">{!expanded && detailRows.length ? '영역' : '유형'}</th>
          <th scope="col" className="mid">수준</th>
          <th scope="col" className="num">{!expanded && averaged ? '평균 T점수' : 'T점수'}</th>
        </tr></thead>
        {groups.map(group => <tbody key={group.id}>
          {group.rows.map((row, index) => <tr key={row.factorCode ?? row.name}>
            {expanded && index === 0 && <th className="drr-area" scope="rowgroup" rowSpan={group.rows.length}>
              {group.name}
              {group.summary && <small>{group.summary.averaged ? '평균 ' : 'T점수 '}{scoreText(group.summary.tScore)}
                {!group.summary.averaged && <> · {group.summary.level}</>}
              </small>}
            </th>}
            {cells(row)}
          </tr>)}
        </tbody>)}
      </table>
    </div>
    {averaged && <p className="drr-table-note">영역 점수는 하위 2항목의 T점수 평균입니다. 유형별 점수와 수준은 상세보기에서 확인할 수 있습니다.</p>}
  </div>
}
