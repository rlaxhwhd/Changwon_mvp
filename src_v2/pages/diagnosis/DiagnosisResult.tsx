import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import {
  getRequiredTests,
  getModuleByTestId,
  typeLabel,
  type TestStatus,
} from '../../data/careerProcess'
import { completeDiagnosis, getModuleStatusFor, getStudentType } from '../../data/pipeline'
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
  usePageHead('진단검사 결과', '1회차 진단은 학생이 자유롭게 실시할 수 있습니다. 재진단과 진단유형 변경은 상담사와 상담 후 진행됩니다.')
  const navigate = useNavigate()
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [hasRequestedTypeChange, setHasRequestedTypeChange] = useState(false)

  const student = getActiveStudent()
  // 유형은 시드가 아니라 파이프라인이 준다 — C-CORE 를 마치며 주입된 값이 여기로 들어온다.
  const studentType = getStudentType(student)
  // 응시 대상 = 필수진단 CCORE + 내 유형의 후속진단 1종 (PROCESS.md §3)
  // 학년으로 배정하지 않는다. 전 모듈을 나열하지도 않는다.
  const modulesWithStatus = getRequiredTests(studentType).map(m => ({ ...m, status: getModuleStatusFor(student, m) }))
  const doneCount = modulesWithStatus.filter(m => m.status === 'done').length
  const availableCount = modulesWithStatus.filter(m => m.status === 'available').length
  const lockedCount = modulesWithStatus.filter(m => m.status === 'locked').length

  // 응시 확인 — 실제 검사 문항이 없으므로(판정식 미확정) "응시했다"는 사실만 기록한다.
  const [pendingTestId, setPendingTestId] = useState<string | null>(null)
  const pendingModule = pendingTestId ? getModuleByTestId(pendingTestId) : undefined

  const handleCardAction = (testId: string, status: TestStatus) => {
    if (status === 'locked') return
    if (status === 'done') navigate(`/diagnosis/employment/${testId}`)
    else setPendingTestId(testId)
  }

  const confirmAttempt = () => {
    if (!pendingTestId) return
    completeDiagnosis(student, pendingTestId)
    setPendingTestId(null)
    // 응시 결과가 유형·게이트를 바꾼다 — 화면 전체가 새 상태를 봐야 한다.
    navigate(0)
  }

  return (
    <div className="de-wrap">
      {/* 진단이 남은 학생에게는 여기서도 다음 걸음을 짚어 준다(끝난 학생에겐 안 뜬다). */}
      <NextStepBanner />

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
            className={`de-type-request-btn${hasRequestedTypeChange ? ' is-requested' : ''}`}
            type="button"
            onClick={() => setHasRequestedTypeChange(true)}
            disabled={hasRequestedTypeChange}
          >
            <i className={`fa-solid ${hasRequestedTypeChange ? 'fa-circle-check' : 'fa-paper-plane'}`} />
            {hasRequestedTypeChange ? '수정 신청 완료' : '진단유형 수정 신청'}
          </button>
        </div>

        <div className="de-access-grid">
          <article className="de-access-item is-complete">
            <span className="de-access-icon"><i className="fa-solid fa-check" /></span>
            <div>
              <small>1회차 진단</small>
              <strong>완료</strong>
              <p>학생 본인이 자유롭게 실시할 수 있습니다.</p>
            </div>
          </article>

          <article className="de-access-item is-locked">
            <span className="de-access-icon"><i className="fa-solid fa-lock" /></span>
            <div>
              <small>2회차 이상 재진단</small>
              <strong>상담사 승인 전 잠금</strong>
              <p>상담 진행 후 상담사가 응시 권한을 열 수 있습니다.</p>
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
          <span>재진단 및 진단유형 변경은 상담사와 상담 및 논의 후 진행 가능합니다.</span>
        </div>

        {hasRequestedTypeChange && (
          <p className="de-request-feedback" role="status" aria-live="polite">
            <i className="fa-solid fa-circle-check" />
            진단유형 수정 요청을 상담사에게 전달했습니다.
          </p>
        )}
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

            <button
              className={`de-start-btn de-start-btn--${result.status}`}
              onClick={() => handleCardAction(result.testId, result.status)}
              disabled={result.status === 'locked'}
            >
              {result.status === 'done' && <>결과 보기<i className="fa-solid fa-arrow-right" /></>}
              {result.status === 'available' && <>검사 시작<i className="fa-solid fa-arrow-right" /></>}
              {result.status === 'locked' && <><i className="fa-solid fa-lock" />선행 검사 완료 후 응시</>}
            </button>

            <div className="de-recent-date">
              {result.status === 'done' ? (
                <><i className="fa-regular fa-calendar-check" /> 최근 검사일시 {result.recentAt}</>
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

      {/* 응시 확인 — 누르면 되돌릴 수 없는 기록이 남으므로 한 번 묻는다. */}
      <Modal
        open={pendingModule != null}
        onClose={() => setPendingTestId(null)}
        title={pendingModule ? `${pendingModule.name} 응시` : ''}
        size="sm"
      >
        {pendingModule && (
          <div className="de-attempt-confirm">
            <p className="de-attempt-decides">
              <i className="fa-solid fa-circle-info" />
              {pendingModule.decides}
            </p>
            <dl className="de-attempt-meta">
              <div><dt>소요 시간</dt><dd>{pendingModule.time}</dd></div>
              <div><dt>문항 수</dt><dd>{pendingModule.questions}</dd></div>
              <div><dt>진단 영역</dt><dd>{pendingModule.factors.map(f => f.name).join(' · ')}</dd></div>
            </dl>
            <p className="de-attempt-note">
              검사 문항은 아직 준비 중입니다. 지금은 <b>응시를 완료한 것으로 기록</b>하고
              다음 단계를 열어 드립니다.
            </p>
            <div className="de-attempt-actions">
              <button type="button" className="de-attempt-cancel" onClick={() => setPendingTestId(null)}>
                취소
              </button>
              <button type="button" className="de-attempt-submit" onClick={confirmAttempt}>
                응시 완료 <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
        )}
      </Modal>

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
