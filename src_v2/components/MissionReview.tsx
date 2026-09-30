import type { MissionResult } from '../../shared/missions'
export default function MissionReview({ result }: { result: MissionResult }) {
  return <div className="lm-review"><div className="lm-score"><span>학습 결과</span><strong>{result.correctCount}<small> / {result.totalCount} 정답</small></strong><b>정답률 {result.totalCount ? Math.round(result.correctCount / result.totalCount * 100) : 0}%</b></div>
    {result.questPassCount && <p className="lm-intro">이수 기준: {result.questPassCount}개 이상 정답 · {result.questPassed ? '퀘스트 이수' : '다시 도전해 보세요'}</p>}
    <ol className="lm-question-list">{result.reviews.map((item, index) => <li key={item.id} className="lm-question"><div className="lm-question-heading"><span>Q{index + 1} · {item.kind}</span><b className={item.correct ? 'lm-correct' : 'lm-wrong'}>{item.correct ? '정답' : '오답'}</b></div><h3>{item.prompt}</h3><dl><div><dt>내 답안</dt><dd>{item.userAnswer}</dd></div><div><dt>정답</dt><dd>{item.correctAnswer}</dd></div></dl>{item.explanation && <p className="lm-explanation">{item.explanation}</p>}</li>)}</ol></div>
}
