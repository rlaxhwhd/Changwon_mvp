import { useEffect, useState, type ReactElement } from 'react'
import { agreeInterviewConsent, loadConsentState } from './interviewApi'
import { usePageHead } from '../../components/PageCrumb'
import '../roadmap/AiResume.css'
import './AiConsulting.css'
import './AiInterview.css'
import './JobsWorkspace.css'

// AI 자소서·AI 인터뷰(/jobs/home 하위 전체) 개인정보 동의서. 학생이 이 영역에 처음 들어올 때 한 번만 받는다
// (2026-11-18 사용자 지시). 문구를 바꾸면 version 을 서버(backend/app/jobs.py INTERVIEW_CONSENT)와 함께 올린다 —
// 서버는 아는 버전에 모든 항목 「예」인 동의만 받고, 동의는 학생·버전당 한 번만 기록한다(dc.job_interview_consent).
export const DEEP_CONSENT = {
  version: '2026-11-18.1',
  items: [
    {
      id: 'privacy',
      title: '개인정보 수집·이용 동의',
      rows: [
        ['수집 항목', '학번, 이름, 학과, 작성한 자기소개서(문항·본문·AI 작성 요청 내용), 지원 정보(직종·업종·기업형태·경력·기업명·지원 직무·담당 업무), 면접에서 직접 입력한 내용(경험 글)'],
        ['이용 목적', 'AI 자기소개서 작성·컨설팅(평가), AI 모의면접 질문 생성·진행·답변 평가 및 결과 제공'],
        ['보유 기간', '삭제 요청 또는 서비스 이용 종료 시까지'],
      ],
    },
    {
      id: 'media',
      title: '영상·음성 정보 수집·이용 동의',
      rows: [
        ['수집 항목', 'AI 인터뷰 중 카메라로 촬영한 영상, 마이크로 녹음한 음성'],
        ['이용 목적', '답변 내용 분석과 면접 평가, 본인의 면접 결과 다시 보기'],
        ['보유 기간', '삭제 요청 또는 서비스 이용 종료 시까지'],
      ],
    },
    {
      id: 'provision',
      title: '개인정보 외부 제공·위탁 동의',
      rows: [
        ['받는 곳', 'DeepResume (AI 자소서·AI 면접 서비스 운영사, 드림캐치가 아닌 외부 사이트)'],
        ['제공 항목', '위 개인정보와 영상·음성 정보 전체'],
        ['저장 위치', '제공한 정보는 외부 사이트인 DeepResume 서버에 저장됩니다. 자기소개서는 드림캐치에도 함께 저장되고, 면접 영상·평가 결과·컨설팅 결과는 DeepResume에만 저장됩니다.'],
      ],
    },
  ],
} as const

// 앱을 띄운 뒤 한 번만 서버에 묻는다 — 하위 화면을 오갈 때마다 다시 묻지 않는다.
let known: boolean | null = null

/** /jobs/home 하위 화면을 감싼다. 동의 전에는 화면 대신 동의서를 그린다. */
export default function DeepConsentGate({ children }: { children: ReactElement }) {
  const [consented, setConsented] = useState<boolean | null>(known)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    if (known !== null) return
    let stale = false
    loadConsentState()
      .then(state => { known = state.consented; if (!stale) setConsented(state.consented) })
      .catch((cause: unknown) => { if (!stale) setError(cause instanceof Error ? cause.message : '동의 여부를 확인하지 못했습니다.') })
    return () => { stale = true }
  }, [attempt])
  if (consented) return children
  return <DeepConsentForm loading={consented === null && !error} error={error}
    onRetry={() => { setError(''); setAttempt(count => count + 1) }}
    onAgreed={() => { known = true; setConsented(true) }} />
}

function DeepConsentForm({ loading, error, onRetry, onAgreed }: {
  loading: boolean; error: string; onRetry: () => void; onAgreed: () => void
}) {
  usePageHead('AI 자소서·인터뷰 이용 동의', '외부 AI 서비스(DeepResume)에 정보를 제공하는 데 동의합니다.')
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const allAgreed = DEEP_CONSENT.items.every(item => agreed[item.id])

  const agree = async () => {
    if (saving) return
    setSaving(true)
    setSaveError('')
    try {
      await agreeInterviewConsent(DEEP_CONSENT.version, Object.fromEntries(DEEP_CONSENT.items.map(item => [item.id, 'yes' as const])))
      onAgreed()
    } catch (cause: unknown) {
      setSaveError(cause instanceof Error ? cause.message : '동의를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ac-wrap jobs-workspace iv-wrap">
      {loading && <p className="ac-card-desc" role="status">동의 여부를 확인하는 중입니다.</p>}
      {error && (
        <p className="ac-preview-notice" role="alert">
          {error} <button type="button" className="ac-btn-ghost" onClick={onRetry}><i className="fa-solid fa-rotate" /> 다시 시도</button>
        </p>
      )}
      {!loading && !error && (
        <div className="ac-card">
          <h2 className="ac-card-title"><i className="fa-solid fa-shield-halved" /> AI 자소서·AI 인터뷰 이용 동의서</h2>
          <p className="ac-card-desc">
            AI 자소서 작성·컨설팅과 AI 인터뷰는 외부 AI 서비스(DeepResume)가 처리하며, 입력한 정보와 면접 영상은 외부 사이트에 저장됩니다.
            아래 내용을 읽고 모두 동의해야 이용할 수 있습니다. 한 번 동의하면 다시 묻지 않습니다.
          </p>
          {DEEP_CONSENT.items.map(item => (
            <section key={item.id} className="iv-consent">
              <h3>{item.title}</h3>
              <dl>
                {item.rows.map(([term, detail]) => (
                  <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>
                ))}
              </dl>
              <p className="iv-consent-note">동의를 거부할 수 있으며, 거부하면 AI 자소서·AI 인터뷰를 이용할 수 없습니다.</p>
              <label className="iv-consent-check">
                <input type="checkbox" checked={!!agreed[item.id]}
                  onChange={event => setAgreed(current => ({ ...current, [item.id]: event.target.checked }))} />
                위 내용에 동의합니다.
              </label>
            </section>
          ))}
          <label className="iv-consent-check iv-consent-all">
            <input type="checkbox" checked={allAgreed}
              onChange={event => setAgreed(Object.fromEntries(DEEP_CONSENT.items.map(item => [item.id, event.target.checked])))} />
            전체 동의
          </label>
          {saveError && <p className="ac-preview-notice" role="alert">{saveError}</p>}
          <div className="ac-actions">
            <button className="ac-btn-primary" disabled={!allAgreed || saving} onClick={() => void agree()}>
              {saving ? '동의를 저장하는 중…' : '동의하고 시작하기'} <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
