import { useNavigate, useParams } from 'react-router-dom'
import { getActiveStudent } from '../../data/students'
import { getModuleByTestId } from '../../data/careerProcess'
import { usePageHead } from '../../components/PageCrumb'
import DiagnosisHistory from '../../../shared/DiagnosisHistory'
import { useDiagnosisHistory } from '../../../shared/useDiagnosisHistory'
import './DiagnosisResultDetail.css'

export default function DiagnosisResultHistory() {
  const { testId = 'ccore' } = useParams()
  const student = getActiveStudent()
  const { data, error, retry } = useDiagnosisHistory(student.id)
  const navigate = useNavigate()
  const external = ['ccore', 'c2', 'c3', 'c4'].includes(testId)
  usePageHead(`${getModuleByTestId(testId)?.name ?? '진단'} 전체 결과 이력`, '회차별 그래프와 영역점수, 저장된 AI 코멘트를 비교합니다.')
  return <div className="dr-wrap">
    <div className="dr-header"><button className="dr-history-btn" onClick={() => navigate(`/diagnosis/employment/${testId}`)}>진단 결과로 돌아가기</button></div>
    {error ? <div className="dr-card" role="alert"><p>{error}</p><button className="dr-history-btn" onClick={retry}>다시 시도</button></div> :
      !data ? <p role="status">진단 이력을 불러오는 중입니다.</p> :
        <DiagnosisHistory results={data.results.filter(result => !external || result.source === 'hrtest')} studentId={data.studentId} testId={testId} />}
  </div>
}
