import type { DiagnosisResult } from '../src_v2/data/diagnosisResults'
import { getModuleByTestId } from '../src_v2/data/careerProcess'
import DiagnosisResultReport from '../src_v2/components/DiagnosisResultReport'
import './DiagnosisHistory.css'

/** 동일 학생·검사의 저장된 회차만 비교한다. 조회 권한과 원본 선택은 호스트가 담당한다. */
export default function DiagnosisHistory({ results, studentId, testId }: {
  results: DiagnosisResult[]; studentId: string; testId: string
}) {
  const history = results.filter(result => result.studentId === studentId && result.testId === testId)
    .sort((a, b) => a.attemptNo - b.attemptNo)
  const name = getModuleByTestId(testId)?.name ?? testId
  return <section className="diagnosis-history" aria-label={`${name} 전체 결과 이력`}>
    <header className="diagnosis-history-heading">
      <h3>{name} · 전체 결과 이력 <span>{history.length}회</span></h3>
      <p>이전 회차부터 순서대로 비교합니다. 좌우로 이동해 그래프와 영역점수의 변화를 확인하세요.</p>
    </header>
    {!history.length ? <p className="diagnosis-history-empty">저장된 진단 결과가 없습니다.</p> :
      <div className="diagnosis-history-track" tabIndex={0} role="region" aria-label="회차별 결과 비교, 좌우 스크롤">
        {history.map(result => <article className="diagnosis-history-attempt" key={`${studentId}:${testId}:${result.attemptNo}`}>
          <header className="diagnosis-history-attempt-head">
            <strong>{result.attemptNo}회차</strong>
            <time dateTime={result.testedAt}>{result.testedAt.slice(0, 10)}</time>
            {result.isCurrent && <span>최신 결과</span>}
          </header>
          <DiagnosisResultReport result={result} showChart collapseComments namedChartAxes />
        </article>)}
      </div>}
  </section>
}
