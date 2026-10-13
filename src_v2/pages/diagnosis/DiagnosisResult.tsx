import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import {
  getRequiredTests,
  getModuleByTestId,
  typeLabel,
  type TestStatus,
} from '../../data/careerProcess'
import { getModuleStatusFor, getStudentType, importDiagnosis } from '../../data/pipeline'
import { getResultsByStudent } from '../../data/diagnosisResults'
import { ensureDiagnosisComment } from '../../../shared/diagnosisComment'
import AiProgressModal from '../../../shared/AiProgressModal'
import { externalDiagnosisLinks, diagnosisAttempts, diagnosisRetakes, loadStudentDiagnoses } from '../../../shared/diagnosisStore'
import { api } from '../../../shared/api'
import NextStepBanner from '../../components/NextStepBanner'
import { getActiveStudent } from '../../data/students'
import './EmploymentTest.css'
import './DiagnosisProcess.css'
import { usePageHead } from '../../components/PageCrumb'

const STATUS_LABEL: Record<TestStatus, string> = {
  done: '완료',
  available: '응시 가능',
  locked: '잠금',
}

type ResultCheck = { state: 'ready' | 'missing' | 'error'; message?: string }
const EXTERNAL_TESTS = ['ccore', 'c2', 'c3', 'c4']

async function checkResult(student: ReturnType<typeof getActiveStudent>, testId: string): Promise<ResultCheck> {
  try {
    const approved = diagnosisRetakes[student.id]?.requests.some(q => q.testId === testId && q.status === 'APPROVED')
    if (EXTERNAL_TESTS.includes(testId)) await importDiagnosis(student, testId, !approved)
    else await loadStudentDiagnoses(student.id)
    if (diagnosisRetakes[student.id]?.requests.some(q => q.testId === testId && q.status === 'APPROVED')) {
      return { state: 'missing', message: '새로 완료한 재진단 결과가 아직 없습니다.' }
    }
    const result = getResultsByStudent(student.id).find(r => r.testId === testId && r.isCurrent !== false
      && (!EXTERNAL_TESTS.includes(testId) || r.source === 'hrtest'))
    const incomplete = diagnosisAttempts.some(a => a.studentId === student.id && a.testId === testId
      && a.attemptNo === result?.attemptNo && a.status === '응답 누락')
    return result && !incomplete && !result.needsReview ? { state: 'ready' }
      : { state: 'missing', message: result?.needsReview ? '유형 확인이 필요합니다. 담당자에게 문의해 주세요.'
        : incomplete ? '응답 누락이 있습니다. 검사를 완료해 주세요.' : '완료된 검사 결과가 없습니다.' }
  } catch (e) {
    return { state: 'error', message: e instanceof Error ? e.message : '결과를 조회하지 못했습니다.' }
  }
}

const GUIDE_ITEMS = [
  {
    icon: 'fa-comments',
    title: '상담사 면담 자료로 활용',
    desc: '진로·심리·교수 상담을 신청할 때 검사 결과를 함께 공유하면, 상담사가 학생의 강점과 보완점을 빠르게 파악해 더 깊이 있는 상담을 받을 수 있어요.',
  },
  {
    icon: 'fa-route',
    title: 'AI 진로 로드맵에 자동 반영',
    desc: '검사 결과는 AI 진로 로드맵 생성 시 핵심 데이터로 사용되어, 학생의 적성과 역량에 맞춘 맞춤형 로드맵과 우선순위 추천을 만들어냅니다.',
  },
  {
    icon: 'fa-file-pdf',
    title: 'PDF 출력으로 외부 활용',
    desc: '검사 리포트는 PDF로 내려받아 학교 밖 상담기관, 멘토링, 취업 컨설팅 등 어디서든 본인의 진단 자료로 제출하거나 참고용으로 사용할 수 있어요.',
  },
  {
    icon: 'fa-shapes',
    title: '자소서·포트폴리오 작성 보조',
    desc: '객관적 진단 데이터로 본인의 강점과 직무 적합도를 정리해두면, 자기소개서·포트폴리오·면접 답변을 일관된 근거로 작성할 수 있습니다.',
  },
]

export default function DiagnosisResult() {
  usePageHead('진단검사 결과', '상담사 승인 또는 로드맵 50% 달성 후 재진단하고, 상담을 통해 새 로드맵을 준비합니다.')
  const navigate = useNavigate()
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [aiProgress, setAiProgress] = useState('')
  const [aiError, setAiError] = useState('')

  const student = getActiveStudent()
  const [, update] = useState(0)
  const [requesting, setRequesting] = useState(false)
  const [requestNotice, setRequestNotice] = useState('')
  useEffect(() => {
    const changed = () => update(n => n + 1)
    window.addEventListener('dc:diagnosis-updated', changed)
    return () => window.removeEventListener('dc:diagnosis-updated', changed)
  }, [])
  const retake = diagnosisRetakes[student.id]
  const coreRequest = retake?.requests.find(q => q.testId === 'ccore' && q.status !== 'COMPLETED')
  async function requestRetake() {
    if (requesting) return
    setRequesting(true); setAiError('')
    try {
      await api('/diagnosis/retake-request', { method: 'POST' })
      await loadStudentDiagnoses(student.id)
      setRequestNotice('재검사 요청이 접수되었습니다. 상담사가 확인 후 승인합니다.')
    } catch (e) { setAiError(e instanceof Error ? e.message : '요청하지 못했습니다.') }
    finally { setRequesting(false) }
  }
  async function launchTest(testId: string) {
    if (evaluating) return
    const popup = window.open('about:blank', '_blank')
    if (popup) popup.opener = null
    setEvaluating(true); setAiError(''); setAiProgress('응시 권한을 확인하고 있습니다.')
    try {
      const { url } = await api<{url: string}>(`/diagnosis/external/${testId}/launch`, { method: 'POST' })
      if (!popup) throw new Error('팝업을 허용한 후 다시 검사시작을 눌러 주세요.')
      popup.location.href = url
    } catch (e) { popup?.close(); setAiError(e instanceof Error ? e.message : '검사를 열지 못했습니다.') }
    finally { setEvaluating(false) }
  }
  async function viewResult(testId: string) {
    if (evaluating) return
    setEvaluating(true); setAiError(''); setAiProgress('진단 결과를 확인하고 있습니다.')
    try {
      const awaitingRetake = retake?.requests.some(q => q.testId === testId && q.status === 'APPROVED')
      if (['ccore', 'c2', 'c3', 'c4'].includes(testId)) await importDiagnosis(student, testId, !awaitingRetake)
      else await loadStudentDiagnoses(student.id)
      if (awaitingRetake && diagnosisRetakes[student.id]?.requests.some(q => q.testId === testId && q.status === 'APPROVED')) {
        throw new Error('새로 완료한 재진단 결과가 아직 없습니다. 응시를 완료한 뒤 다시 확인해 주세요.')
      }
      const result = getResultsByStudent(student.id).find(r => r.testId === testId && r.isCurrent !== false)
      if (!result || result.needsReview) throw new Error('완료된 진단 결과를 확인할 수 없습니다. 검사 응시 상태를 확인해 주세요.')
      await ensureDiagnosisComment(student.id, testId, result.attemptNo, setAiProgress)
      navigate(`/diagnosis/employment/${testId}`)
    } catch (e) { setAiError(e instanceof Error ? e.message : '진단 코멘트를 저장하지 못했습니다.') }
    finally { setEvaluating(false) }
  }
  // 유형은 시드가 아니라 파이프라인이 준다 — C-CORE 를 마치며 주입된 값이 여기로 들어온다.
  const studentType = getStudentType(student)
  // 응시 대상 = 필수진단 CCORE + 내 유형의 후속진단 1종 (PROCESS.md §3)
  // 학년으로 배정하지 않는다. 전 모듈을 나열하지도 않는다.
  const required = getRequiredTests(studentType)
  const extra = (retake?.requests ?? []).filter(q => q.status === 'APPROVED' && !required.some(m => m.testId === q.testId))
    .map(q => getModuleByTestId(q.testId)).filter((m): m is NonNullable<typeof m> => !!m)
  const modulesWithStatus = [...required, ...extra].map(m => ({ ...m, status: getModuleStatusFor(student, m) }))
  const doneCount = modulesWithStatus.filter(m => m.status === 'done').length
  const availableCount = modulesWithStatus.filter(m => m.status === 'available').length
  const lockedCount = modulesWithStatus.filter(m => m.status === 'locked').length

  const [checks, setChecks] = useState<Record<string, ResultCheck>>({})
  const pendingChecks = useRef<Partial<Record<string, Promise<ResultCheck>>>>({})
  const checkKey = (testId: string) => `${student.id}:${testId}:${retake?.requests.find(q => q.testId === testId && q.status === 'APPROVED')?.id ?? 'stored'}`
  const targets = retake ? modulesWithStatus.filter(m => m.status !== 'locked').map(m => checkKey(m.testId)).join('|') : ''
  useEffect(() => {
    let cancelled = false
    let running = false
    let lastCheck = 0
    const refresh = async (force = false) => {
      if (running || force && Date.now() - lastCheck < 3000) return
      running = true
      lastCheck = Date.now()
      for (const key of targets.split('|').filter(Boolean)) {
        if (cancelled) break
        const testId = key.split(':')[1]
        if (force && pendingChecks.current[key]) {
          if ((await pendingChecks.current[key]).state === 'ready') continue
          delete pendingChecks.current[key]
        }
        const request = pendingChecks.current[key] ??= checkResult(getActiveStudent(), testId)
        const value = await request
        if (!cancelled) setChecks(current => ({ ...current, [key]: value }))
      }
      running = false
    }
    void refresh()
    const focus = () => { void refresh(true) }
    window.addEventListener('focus', focus)
    return () => { cancelled = true; window.removeEventListener('focus', focus) }
  }, [targets])
  async function retryResult(testId: string) {
    const key = checkKey(testId)
    delete pendingChecks.current[key]
    setChecks(current => { const next = { ...current }; delete next[key]; return next })
    const request = pendingChecks.current[key] = checkResult(student, testId)
    const value = await request
    setChecks(current => ({ ...current, [key]: value }))
  }

  return (
    <div className="de-wrap">
      <AiProgressModal open={evaluating} title="AI가 진단 결과를 평가 중입니다" progress={aiProgress} />
      {aiError && <p role="alert">{aiError}</p>}
      {requestNotice && <p role="status">{requestNotice}</p>}
      {/* 진단이 남은 학생에게는 여기서도 다음 걸음을 짚어 준다(끝난 학생에겐 안 뜬다). */}
      <NextStepBanner />
      <div className="de-access-notice" role="note">
        ‘검사시작’을 누르면 외부 검사 사이트가 새 탭으로 열립니다. 학번을 정확히 입력해 진단을 완료한 뒤 돌아오면 결과를 확인합니다. 저장된 결과나 검사기관 결과가 있어야 ‘결과보기’가 열립니다.
      </div>

      <section className="de-hero">
        <div className="de-hero-visual" aria-label="AI 홀로그램 진단 이미지">
          <img className="de-hero-image" src="/diagnosis_1.2.png" alt="AI 홀로그램 진단 이미지" />
        </div>
      </section>

      <section className="de-access-panel" aria-labelledby="diagnosis-access-title">
        <div className="de-access-heading">
          <div>
            <span className="de-access-eyebrow">진단 권한 현황</span>
            <h2 id="diagnosis-access-title">내 진단 결과와 응시 권한</h2>
          </div>
          <button
            className="de-type-request-btn"
            type="button"
            disabled={requesting || !!coreRequest}
            onClick={() => void requestRetake()}
          >
            <i className="fa-solid fa-rotate" />
            {requesting ? '요청 중…' : coreRequest?.status === 'PENDING' ? '재검사 요청 승인 대기' : coreRequest?.status === 'APPROVED' ? '재검사 응시 가능' : '진단유형 재검사 요청'}
          </button>
        </div>

        <div className="de-access-grid">
          <article className="de-access-item is-complete">
            <span className="de-access-icon"><i className="fa-solid fa-check" /></span>
            <div>
              <small>1회차 진단</small>
              <strong>{doneCount === modulesWithStatus.length ? '완료' : '진행 필요'}</strong>
              <p>학생 본인이 자유롭게 실시할 수 있습니다.</p>
            </div>
          </article>

          <article className="de-access-item is-locked">
            <span className="de-access-icon"><i className="fa-solid fa-lock" /></span>
            <div>
              <small>2회차 이상 재진단</small>
              <strong>{coreRequest?.status === 'APPROVED' ? '재응시 가능' : '상담사 승인 또는 이행률 50%'}</strong>
              <p>상담사 승인 또는 로드맵 50% 달성 시 C-CORE 재진단을 진행합니다.</p>
            </div>
          </article>

          <article className="de-access-item is-type">
            <span className="de-access-icon"><i className="fa-solid fa-user-tag" /></span>
            <div>
              <small>현재 진단유형</small>
              <strong>{typeLabel(studentType)}</strong>
              <p>진단 결과와 지정 유형은 학생이 직접 수정할 수 없습니다.</p>
            </div>
          </article>
        </div>

        <div className="de-access-notice" role="note">
          <i className="fa-solid fa-circle-info" />
          <span>재진단 후 새 유형에 맞는 후속진단과 CARE 7+ 상담을 진행하고 새 로드맵을 확정합니다.</span>
        </div>

      </section>

      <section className="de-toolbar de-toolbar--status-only" aria-label="진단 상태 요약">
        <div className="de-status-summary">
          <span className="de-status-chip done">완료 {doneCount}</span>
          <span className="de-status-chip available">응시 가능 {availableCount}</span>
          <span className="de-status-chip locked">잠금 {lockedCount}</span>
        </div>
      </section>

      <section className="de-card-grid" aria-label="진단 모듈 목록">
        {modulesWithStatus.map(result => (
          <article key={result.id} className={`de-test-card de-card--${result.status}`}>
            <div className={`de-card-art de-card-art-${result.art}`}>
              {result.status === 'locked' && (
                <span className="de-lock-badge"><i className="fa-solid fa-lock" /></span>
              )}
              <div className="de-card-copy">
                <h2>{result.name}</h2>
                <p>{result.desc}</p>
              </div>
              <img className="de-card-image" src={result.image} alt="" aria-hidden="true" />
            </div>

            <div className="de-card-meta">
              <div>
                <span className="de-meta-icon"><i className="fa-regular fa-clock" /></span>
                <span>
                  <small>소요 시간</small>
                  <strong>{result.time}</strong>
                </span>
              </div>
              <div>
                <span className="de-meta-icon"><i className="fa-solid fa-chart-simple" /></span>
                <span>
                  <small>문항 수</small>
                  <strong>{result.questions}</strong>
                </span>
              </div>
            </div>

            <div className="de-card-actions">
              <button className="de-start-btn" type="button"
                disabled={evaluating || result.status === 'locked' || !externalDiagnosisLinks[result.testId] || !retake?.permissions[result.testId]}
                onClick={() => void launchTest(result.testId)}>
                검사시작 <i className="fa-solid fa-arrow-up-right-from-square" aria-label="새 탭" />
              </button>
              <button type="button"
                className={`de-start-btn${checks[checkKey(result.testId)]?.state === 'missing' || result.status === 'locked' ? ' de-result-locked' : ''}`}
                disabled={evaluating || result.status === 'locked' || !checks[checkKey(result.testId)] || checks[checkKey(result.testId)].state === 'missing'}
                aria-describedby={`result-state-${result.testId}`}
                onClick={() => void (checks[checkKey(result.testId)]?.state === 'error' ? retryResult(result.testId) : viewResult(result.testId))}>
                <span className="de-result-label">결과보기</span>
                <i className={`fa-solid ${checks[checkKey(result.testId)]?.state === 'missing' || result.status === 'locked' ? 'fa-lock' : 'fa-arrow-right'}`} />
              </button>
            </div>
            <p id={`result-state-${result.testId}`} className="de-result-state" role="status">
              {result.status === 'locked' ? '선행 검사 완료 후 응시할 수 있습니다.'
                : !checks[checkKey(result.testId)] ? '결과 유무를 확인하고 있습니다.'
                : checks[checkKey(result.testId)].state === 'error' ? '조회하지 못했습니다. 결과보기를 눌러 다시 확인해 주세요.'
                : checks[checkKey(result.testId)].message}
            </p>
            {diagnosisAttempts.some(a => a.studentId === student.id && a.testId === result.testId && a.isCurrent && a.status === '응답 누락') &&
              <p role="status" className="de-recent-date">응답 누락 · 담당자 확인 필요</p>}
            {diagnosisAttempts.some(a => a.studentId === student.id && a.testId === result.testId && a.isCurrent && a.status === '유형 확인 필요') &&
              <p role="status" className="de-recent-date">유형 확인 필요 · 담당자에게 문의해 주세요.</p>}

            <div className="de-recent-date">
              {result.status === 'done' ? (
                <><i className="fa-regular fa-calendar-check" /> 최근 검사일시 {diagnosisAttempts.find(a => a.studentId === student.id && a.testId === result.testId && a.isCurrent)?.completedAt?.slice(0,10) ?? '—'}</>
              ) : (
                <><i className="fa-solid fa-circle-info" /> 상태: {STATUS_LABEL[result.status]}</>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="de-notice">
        <div className="de-notice-title">
          <span><i className="fa-solid fa-circle-info" /></span>
          <strong>검사 결과 안내사항</strong>
        </div>
        <p>
          검사 결과는 자기 이해와 성장의 참고자료로 활용해주세요.<br />
          결과 리포트에서는 AI 분석 요약과 추천 로드맵을 함께 확인할 수 있습니다.
        </p>
        <button onClick={() => setIsGuideOpen(true)}>
          결과 활용 가이드 자세히 보기
          <i className="fa-solid fa-arrow-up-right-from-square" />
        </button>
      </section>

      <Modal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="검사 결과, 이렇게 활용해보세요"
        size="md"
      >
        <div className="de-modal-body">
          <div className="de-modal-head-copy">
            <span className="de-modal-badge">
              <i className="fa-solid fa-lightbulb" />
              결과 활용 가이드
            </span>
            <p>
              진단 결과는 단순히 점수 확인용이 아니에요. 상담·로드맵·외부 활용까지
              여러 방면에서 학생의 진로 설계를 돕는 핵심 자료입니다.
            </p>
          </div>

          <ul className="de-modal-list">
            {GUIDE_ITEMS.map(item => (
              <li key={item.title} className="de-modal-item">
                <span className="de-modal-item-icon">
                  <i className={`fa-solid ${item.icon}`} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="de-modal-foot">
            <p>
              <i className="fa-solid fa-circle-info" />
              검사 결과는 개인정보 보호 기준에 따라 본인 동의 하에만 외부 공유가 가능합니다.
            </p>
            <button
              className="de-modal-primary"
              onClick={() => setIsGuideOpen(false)}
            >
              확인했어요
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
