import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import {
  DIAGNOSIS_MODULES,
  getModuleStatus,
  type DiagnosisCategory,
  type TestStatus,
} from '../../data/careerProcess'
import { getActiveStudent, getStudentIap } from '../../data/students'
import './EmploymentTest.css'
import './DiagnosisProcess.css'

type CategoryTab = '전체' | DiagnosisCategory

const categories: CategoryTab[] = [
  '전체',
  ...Array.from(new Set(DIAGNOSIS_MODULES.map(m => m.category))),
]

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
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('전체')
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const student = getActiveStudent()
  const iap = getStudentIap(student)
  const modulesWithStatus = DIAGNOSIS_MODULES.map(m => ({ ...m, status: getModuleStatus(m) }))
  const doneCount = modulesWithStatus.filter(m => m.status === 'done').length
  const availableCount = modulesWithStatus.filter(m => m.status === 'available').length
  const lockedCount = modulesWithStatus.filter(m => m.status === 'locked').length

  const visibleResults =
    activeCategory === '전체'
      ? modulesWithStatus
      : modulesWithStatus.filter(m => m.category === activeCategory)

  const handleCardAction = (testId: string, status: TestStatus) => {
    if (status === 'locked') return
    if (status === 'done') navigate(`/diagnosis/employment/${testId}`)
    else navigate('/diagnosis/employment')
  }

  return (
    <div className="de-wrap">
      <section className="de-hero">
        <div className="de-hero-copy">
          <span>진단센터</span>
          <h1>다양한 검사로 나를 더 깊이 이해해보세요</h1>
          <p>
            진단은 <strong>단계별로 분할 실시</strong>됩니다. 검사가 1차로 유형을 산출하고,<br />
            상담사·AI가 이를 확정해 로드맵으로 연결합니다.
          </p>
        </div>
        <div className="de-hero-visual" aria-label="AI 홀로그램 진단 이미지">
          <img className="de-hero-image" src="/diagnosis_1.2.png" alt="AI 홀로그램 진단 이미지" />
        </div>
      </section>

      {/* 진단 프로세스 배너 — 학생유형 / IAP유형 / 진행률 */}
      <section className="de-proc-banner" aria-label="진단 프로세스 현황">
        <div className="de-proc-item">
          <small>학생 유형</small>
          <strong>{student.studentType}</strong>
          <span className="de-proc-sub">
            진로명확도 {student.typeScores.진로명확도} · 역량 {student.typeScores.역량준비도} · 취업 {student.typeScores.취업준비도}
          </span>
        </div>
        <i className="fa-solid fa-arrow-right de-proc-arrow" />
        <div className="de-proc-item">
          <small>IAP 유형</small>
          <strong>{iap.label}</strong>
          <span className="de-proc-sub">{iap.goal}</span>
        </div>
        <i className="fa-solid fa-arrow-right de-proc-arrow" />
        <div className="de-proc-item de-proc-progress">
          <small>진단 진행</small>
          <strong>{doneCount}/{DIAGNOSIS_MODULES.length} 모듈</strong>
          <div className="de-proc-bar">
            <span style={{ width: `${Math.round((doneCount / DIAGNOSIS_MODULES.length) * 100)}%` }} />
          </div>
        </div>
      </section>

      <section className="de-toolbar" aria-label="결과 필터">
        <div className="de-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={activeCategory === category ? 'active' : ''}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="de-status-summary">
          <span className="de-status-chip done">완료 {doneCount}</span>
          <span className="de-status-chip available">응시 가능 {availableCount}</span>
          <span className="de-status-chip locked">잠금 {lockedCount}</span>
        </div>
      </section>

      <section className="de-card-grid" aria-label="진단 모듈 목록">
        {visibleResults.map(result => (
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
