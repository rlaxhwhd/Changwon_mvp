import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllResumes, RESUME_EVENT, type SavedResume } from './resumeMock'
import {
  agreeInterviewConsent, finishInterview, loadInterviewInfo, loadInterviewJobCategories, loadInterviews,
  searchInterviewCompanies, startInterview,
  type InterviewInfo, type InterviewSession, type InterviewSource, type InterviewStart,
} from './interviewApi'
import { ChoiceField, COMPANY_TYPES, EXPERIENCES, INDUSTRIES, OCCUPATIONS } from '../roadmap/ResumeApplicationFields'
import { usePageHead } from '../../components/PageCrumb'
import '../roadmap/AiResume.css'
import './AiConsulting.css'
import './AiInterview.css'
import './JobsWorkspace.css'

// 개인정보 수집·이용 동의서. 문구를 바꾸면 version 을 서버(backend/app/jobs.py INTERVIEW_CONSENT)와 함께 올린다.
// 서버는 아는 버전에 모든 항목 「예」인 동의만 받는다. 동의는 버전당 한 번만 받고(dc.job_interview_consent),
// 이미 동의한 학생은 동의 단계를 건너뛴다. version 을 올리면 모두 다시 동의한다.
const INTERVIEW_CONSENT = {
  version: '2026-11-18',
  items: [
    {
      id: 'privacy',
      title: '개인정보 수집·이용 동의',
      rows: [
        ['수집 항목', '학번, 이름, 학과, 선택한 자기소개서(문항·본문) 또는 직접 입력한 면접 내용(경험 글), 지원 정보(직종·업종·기업형태·경력·기업명·지원 직무·담당 업무)'],
        ['이용 목적', 'AI 모의면접 질문 생성, 면접 진행, 답변 평가 및 결과 제공'],
        ['보유 기간', '면접 결과 삭제 요청 또는 서비스 이용 종료 시까지'],
      ],
    },
    {
      id: 'media',
      title: '영상·음성 정보 수집·이용 동의',
      rows: [
        ['수집 항목', '면접 중 카메라로 촬영한 영상, 마이크로 녹음한 음성'],
        ['이용 목적', '답변 내용 분석과 면접 평가, 본인의 면접 결과 다시 보기'],
        ['보유 기간', '면접 결과 삭제 요청 또는 서비스 이용 종료 시까지'],
      ],
    },
    {
      id: 'provision',
      title: '개인정보 처리 위탁(제공) 동의',
      rows: [
        ['받는 곳', 'DeepResume (AI 면접 서비스 운영사)'],
        ['제공 항목', '위 개인정보와 영상·음성 정보 전체'],
        ['이용 목적', 'AI 모의면접 서비스 제공. 면접 영상과 평가 결과는 DeepResume 서버에 저장됩니다.'],
      ],
    },
  ],
} as const

type Step = 'setup' | 'consent' | 'device' | 'live' | 'done'
const STEPS: { id: Step; label: string }[] = [
  { id: 'setup', label: '질문 선택' },
  { id: 'consent', label: '개인정보 동의' },
  { id: 'device', label: '카메라·마이크 확인' },
  { id: 'live', label: 'AI 인터뷰' },
]

// 질문을 만드는 방식(Deep_APII_V2). cover 는 Deep 면접 시작①, none·company 는 면접 시작②(자소서 없음·기업별 질문).
const SOURCES: { id: InterviewSource; icon: string; title: string; desc: string }[] = [
  { id: 'cover', icon: 'fa-file-lines', title: '자소서 기반', desc: '저장한 자기소개서 내용으로 질문을 만듭니다.' },
  { id: 'none', icon: 'fa-comments', title: '자소서 없이', desc: '지원 정보와 경험 글로 직무 공통 질문을 만듭니다.' },
  { id: 'company', icon: 'fa-building', title: '기업별', desc: '등록된 기업의 실제 면접 질문으로 면접을 봅니다.' },
]
const EMPTY_DIRECT = { jobType: '', company: '', position: '', workTask: '', jobCategory: '전체', content: '' }
const COMPANY_SEARCH_DELAY_MS = 300

// 종료 직후에는 Deep 결과 목록에 아직 안 올라와 있을 수 있다 — 잠깐 기다렸다 다시 기록한다.
const FINISH_RETRY_MS = [0, 2000, 5000]

function subscribeResumes(onChange: () => void) {
  window.addEventListener(RESUME_EVENT, onChange)
  return () => window.removeEventListener(RESUME_EVENT, onChange)
}

/** 면접 질문을 만들려면 자소서에 직종·기업명·지원 직무·본문이 있어야 한다(Deep 필수값). 빠진 것을 돌려준다. */
function missingForInterview(resume: SavedResume): string[] {
  return [
    !resume.jobType.trim() && '직종', !resume.company.trim() && '기업명',
    !resume.position.trim() && '지원 직무', !resume.content.trim() && '본문',
  ].filter((label): label is string => !!label)
}

function mediaErrorMessage(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : ''
  if (name === 'NotAllowedError') return '카메라·마이크 사용이 차단되어 있습니다. 브라우저 주소창의 권한 설정에서 허용한 뒤 다시 확인해 주세요.'
  if (name === 'NotFoundError') return '카메라 또는 마이크를 찾지 못했습니다. 장치가 연결되어 있는지 확인해 주세요.'
  if (name === 'NotReadableError') return '다른 프로그램이 카메라·마이크를 쓰고 있습니다. 해당 프로그램을 닫고 다시 확인해 주세요.'
  return '카메라·마이크를 확인하지 못했습니다. 장치와 브라우저 권한을 확인해 주세요.'
}

async function recordFinish(id: string, resultId: string): Promise<void> {
  let last: unknown
  for (const wait of FINISH_RETRY_MS) {
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    try { await finishInterview(id, resultId); return } catch (cause: unknown) { last = cause }
  }
  throw last
}

export default function AiInterview() {
  usePageHead('AI 인터뷰', '내 자소서나 지원 정보로 AI 면접관과 모의면접을 진행합니다.')
  const navigate = useNavigate()
  const resumes = useSyncExternalStore(subscribeResumes, getAllResumes)

  const [step, setStep] = useState<Step>('setup')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<InterviewSession[] | null>(null)

  // 1. 질문 선택
  const [source, setSource] = useState<InterviewSource>('cover')
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [industry, setIndustry] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [experience, setExperience] = useState('')
  const resume = resumes.find(item => item.id === resumeId)
  // 자소서 없이·기업별: 자소서 대신 직접 적는 지원 정보.
  const [direct, setDirect] = useState(EMPTY_DIRECT)
  const setField = (field: keyof typeof EMPTY_DIRECT) => (value: string) => setDirect(current => ({ ...current, [field]: value }))
  // 기업별: Deep 에 질문이 등록된 기업만 된다 — 입력이 멈춘 뒤 자동완성을 받고, 목록에서 고른 이름만 인정한다(picked).
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [picked, setPicked] = useState<{ company: string; categories: string[] } | null>(null)
  const companyPicked = source !== 'company' || (!!picked && picked.company === direct.company)
  useEffect(() => {
    const query = direct.company.trim()
    if (source !== 'company' || !query || companyPicked) { setSuggestions([]); return }
    let stale = false
    const timer = setTimeout(() => {
      searchInterviewCompanies(query)
        .then(items => { if (!stale) setSuggestions(items) })
        .catch(() => { if (!stale) setSuggestions([]) })
    }, COMPANY_SEARCH_DELAY_MS)
    return () => { stale = true; clearTimeout(timer) }
  }, [source, direct.company, companyPicked])
  const pickCompany = (company: string) => {
    setDirect(current => ({ ...current, company, jobCategory: '전체' }))
    setPicked({ company, categories: [] })
    loadInterviewJobCategories(company)
      .then(categories => setPicked(current => (current?.company === company ? { company, categories } : current)))
      .catch(() => undefined)  // 직무 목록을 못 받으면 「전체」로만 시작한다.
  }
  // 자소서에 저장된 업종·기업형태·경력. 저장된 값은 그대로 쓰고, 비어 있는 것만 아래 카드에서 고른다.
  // 읽지 못하면 세 가지를 모두 묻는다(서버가 저장된 값을 우선한다).
  const [saved, setSaved] = useState<{ resumeId: string; info: InterviewInfo } | null>(null)
  useEffect(() => {
    if (!resumeId) return
    let stale = false
    const blank = { industry: '', companyType: '', experience: '' }
    loadInterviewInfo(resumeId).catch(() => blank).then(info => { if (!stale) setSaved({ resumeId, info }) })
    return () => { stale = true }
  }, [resumeId])
  const info = source === 'cover' && saved && saved.resumeId === resumeId ? saved.info : null
  const chosen = { industry: info?.industry || industry, companyType: info?.companyType || companyType,
    experience: info?.experience || experience }
  const askInfo = !!info && (!info.industry || !info.companyType || !info.experience)
  const chosenReady = !!chosen.industry && !!chosen.companyType && !!chosen.experience
  const setupReady = source === 'cover'
    ? !!resume && missingForInterview(resume).length === 0 && !!info && chosenReady
    : chosenReady && !!direct.jobType && !!direct.company.trim() && !!direct.position.trim() && companyPicked

  // 2. 동의
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const allAgreed = INTERVIEW_CONSENT.items.every(item => agreed[item.id])
  // 현재 동의서 버전에 이미 동의했는지(서버 기록). 모르면 동의를 받는다 — 다시 동의해도 처음 기록이 남는다.
  const [consented, setConsented] = useState(false)
  const [agreeing, setAgreeing] = useState(false)

  // 3. 카메라·마이크
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<{ context: AudioContext; frame: number } | null>(null)
  const [deviceState, setDeviceState] = useState<'idle' | 'checking' | 'ok'>('idle')
  const [micLevel, setMicLevel] = useState(0)
  const [micHeard, setMicHeard] = useState(false)

  // 4. 면접
  const [starting, setStarting] = useState(false)
  const [session, setSession] = useState<{ id: string; iframeUrl: string } | null>(null)
  const [liveState, setLiveState] = useState<'loading' | 'ready' | 'started'>('loading')
  const [finishNote, setFinishNote] = useState('')

  const refreshHistory = () => {
    loadInterviews()
      .then(loaded => { setHistory(loaded.items); setConsented(loaded.consented) })
      .catch(() => setHistory(null))
  }
  useEffect(refreshHistory, [])

  const agree = async () => {
    if (agreeing) return
    setAgreeing(true)
    setError('')
    try {
      await agreeInterviewConsent(INTERVIEW_CONSENT.version,
        Object.fromEntries(INTERVIEW_CONSENT.items.map(item => [item.id, 'yes' as const])))
      setConsented(true)
      setStep('device')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : '동의를 저장하지 못했습니다.')
    } finally {
      setAgreeing(false)
    }
  }

  const stopDevices = () => {
    if (audioRef.current) {
      cancelAnimationFrame(audioRef.current.frame)
      void audioRef.current.context.close()
      audioRef.current = null
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setMicLevel(0)
  }
  // 화면을 떠나면 카메라·마이크를 반드시 끈다.
  useEffect(() => stopDevices, [])

  const checkDevices = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저 또는 접속 주소에서는 카메라·마이크를 쓸 수 없습니다. 최신 Chrome·Edge 로 https 주소에 접속해 주세요.')
      return
    }
    stopDevices()
    setDeviceState('checking')
    setMicHeard(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      // 마이크 입력 크기 — 말할 때 막대가 움직이는지 학생이 직접 확인한다.
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const meter = { context, frame: 0 }
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let peak = 0
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128))
        const level = Math.min(100, Math.round((peak / 128) * 250))
        setMicLevel(level)
        if (level > 12) setMicHeard(true)
        meter.frame = requestAnimationFrame(tick)
      }
      meter.frame = requestAnimationFrame(tick)
      audioRef.current = meter
      setDeviceState('ok')
    } catch (cause: unknown) {
      stopDevices()
      setDeviceState('idle')
      setError(mediaErrorMessage(cause))
    }
  }

  // 면접 화면(IFRAME)이 카메라·마이크를 쓰도록 여기서 쓰던 것은 끄고 세션을 만든다.
  // 버튼 클릭 직후에 iframe 을 열어야 브라우저가 면접관 음성 자동 재생을 허용한다.
  const begin = async () => {
    if (!setupReady || starting) return
    setStarting(true)
    setError('')
    stopDevices()
    setDeviceState('idle')
    const input: InterviewStart = source === 'cover'
      ? { source, resumeId: resume?.id, ...chosen }
      : { source, ...chosen, jobType: direct.jobType, company: direct.company.trim(), position: direct.position.trim(),
          workTask: direct.workTask.trim(),
          ...(source === 'none' ? { content: direct.content.trim() } : { jobCategory: direct.jobCategory }) }
    try {
      const created = await startInterview(input)
      setSession(created)
      setLiveState('loading')
      setStep('live')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'AI 인터뷰를 시작하지 못했습니다.')
    } finally {
      setStarting(false)
    }
  }

  // 면접 화면이 보내는 진행 이벤트. 보낸 곳이 면접 화면 주소인지 반드시 확인한다.
  useEffect(() => {
    if (!session) return
    const frameOrigin = new URL(session.iframeUrl).origin
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; result_id?: unknown } | null
      if (event.origin !== frameOrigin || !data || data.source !== 'deepresume-interview') return
      if (data.type === 'ready') setLiveState(current => (current === 'loading' ? 'ready' : current))
      if (data.type === 'started') setLiveState('started')
      if (data.type === 'finished') {
        const resultId = data.result_id == null ? '' : String(data.result_id)
        const record = resultId ? recordFinish(session.id, resultId) : Promise.reject(new Error('결과 번호를 받지 못했습니다.'))
        record
          .then(() => setFinishNote(''))
          .catch((cause: unknown) => setFinishNote(
            `면접은 끝났지만 완료 기록을 남기지 못했습니다. ${cause instanceof Error ? cause.message : ''}`.trim()))
          .finally(() => { setSession(null); setStep('done'); refreshHistory() })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [session])

  const leaveLive = () => {
    if (!window.confirm('면접 화면을 닫습니다. 진행 중인 면접은 이어서 할 수 없습니다. 닫을까요?')) return
    setSession(null)
    setStep('setup')
    refreshHistory()
  }

  const restart = () => {
    setStep('setup')
    setAgreed({})
    setFinishNote('')
    setError('')
  }

  const stepIndex = STEPS.findIndex(item => item.id === step)

  return (
    <div className="ac-wrap jobs-workspace iv-wrap">
      <header className="ac-header">
        <button className="ac-back-btn" onClick={() => navigate('/jobs/home')} aria-label="AI 자소서/면접으로">
          <i className="fa-solid fa-arrow-left" />
        </button>
        {step !== 'done' && (
          <ol className="iv-steps" aria-label="진행 단계">
            {STEPS.map((item, index) => (
              <li key={item.id} className={index === stepIndex ? 'active' : index < stepIndex ? 'done' : ''}
                aria-current={index === stepIndex ? 'step' : undefined}>
                <span>{index < stepIndex ? <i className="fa-solid fa-check" /> : index + 1}</span>{item.label}
              </li>
            ))}
          </ol>
        )}
      </header>
      {error && <p className="ac-preview-notice" role="alert">{error}</p>}

      {/* ── 1. 질문 선택 ── */}
      {step === 'setup' && (
        <>
          <div className="ac-card">
            <h2 className="ac-card-title"><i className="fa-solid fa-list-check" /> 면접 질문 방식</h2>
            <p className="ac-card-desc">어떤 내용으로 면접 질문을 만들지 선택해 주세요.</p>
            <div className="iv-sources" role="radiogroup" aria-label="면접 질문 방식">
              {SOURCES.map(item => (
                <button key={item.id} type="button" role="radio" aria-checked={source === item.id}
                  className={`iv-source${source === item.id ? ' active' : ''}`}
                  onClick={() => { setSource(item.id); setError('') }}>
                  <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                  <strong>{item.title}</strong>
                  <span>{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {source !== 'cover' && (
            <div className="ac-card">
              <h2 className="ac-card-title"><i className="fa-solid fa-building-user" /> 지원 정보</h2>
              <p className="ac-card-desc">
                {source === 'company'
                  ? '지원 기업을 목록에서 고르면 그 기업에 등록된 실제 면접 질문으로 면접을 봅니다.'
                  : '자소서 없이 지원 정보와 경험 글을 바탕으로 직무 공통 질문을 만듭니다.'}
              </p>
              <div className="iv-fields">
                <div className="iv-combo">
                  <label className="rs-application-text">기업명
                    <input value={direct.company} maxLength={100} autoComplete="off"
                      placeholder={source === 'company' ? '기업명을 입력하고 목록에서 선택' : '예: 엔잡'}
                      role={source === 'company' ? 'combobox' : undefined}
                      aria-autocomplete={source === 'company' ? 'list' : undefined}
                      aria-expanded={source === 'company' ? suggestions.length > 0 : undefined}
                      onChange={event => setField('company')(event.target.value)} />
                  </label>
                  {source === 'company' && suggestions.length > 0 && (
                    <ul className="iv-suggest" role="listbox" aria-label="등록된 기업">
                      {suggestions.map(name => (
                        <li key={name} role="option" aria-selected={false}>
                          <button type="button" onClick={() => pickCompany(name)}>{name}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {source === 'company' && !!direct.company.trim() && !companyPicked && suggestions.length === 0 && (
                    <p className="iv-field-hint">질문이 등록된 기업만 고를 수 있습니다. 목록에 나오는 기업명을 선택해 주세요.</p>
                  )}
                </div>
                <label className="rs-application-text">지원 직무
                  <input value={direct.position} maxLength={100} placeholder="예: 개발팀"
                    onChange={event => setField('position')(event.target.value)} />
                </label>
                <label className="rs-application-text">담당 업무 <small>(선택)</small>
                  <input value={direct.workTask} maxLength={100} placeholder="예: 백엔드"
                    onChange={event => setField('workTask')(event.target.value)} />
                </label>
              </div>
              {source === 'company' && companyPicked && picked && (
                <ChoiceField label="직무" options={['전체', ...picked.categories]} value={direct.jobCategory} onChange={setField('jobCategory')} />
              )}
              <ChoiceField label="직종" options={OCCUPATIONS} value={direct.jobType} onChange={setField('jobType')} />
              <ChoiceField label="업종" options={INDUSTRIES} value={industry} onChange={setIndustry} />
              <ChoiceField label="기업형태" options={COMPANY_TYPES} value={companyType} onChange={setCompanyType} />
              <ChoiceField label="경력" options={EXPERIENCES} value={experience} onChange={setExperience} />
              {source === 'none' && (
                <label className="rs-application-text iv-textarea">경험 글 <small>(선택 · 1,000자 이내)</small>
                  <textarea value={direct.content} maxLength={1000} rows={5}
                    placeholder="면접관이 참고할 경험을 적어 주세요. 예: 동아리에서 서버를 만든 경험…"
                    onChange={event => setField('content')(event.target.value)} />
                  <span className="iv-field-hint">{direct.content.length} / 1,000</span>
                </label>
              )}
            </div>
          )}

          {source === 'cover' && <div className="ac-card">
            <h2 className="ac-card-title"><i className="fa-solid fa-file-lines" /> 면접에 쓸 자소서</h2>
            <p className="ac-card-desc">선택한 자소서의 문항과 본문으로 면접관이 질문합니다.</p>
            <div className="ac-pick-list">
              {resumes.length === 0 && <div className="ac-empty">
                <h3>저장된 자소서가 없습니다.</h3>
                <p>자기소개서를 먼저 작성하고 저장하면 면접에 쓸 수 있습니다.</p>
                <button type="button" className="ac-btn-primary" onClick={() => navigate('/jobs/home/resume')}>자소서 작성하기</button>
              </div>}
              {resumes.map(item => {
                const missing = missingForInterview(item)
                const active = resumeId === item.id
                return (
                  <button key={item.id} className={`ac-pick-item${active ? ' active' : ''}`} aria-pressed={active}
                    disabled={missing.length > 0} onClick={() => setResumeId(item.id)}>
                    <span className={`ac-pick-radio${active ? ' active' : ''}`}>
                      {active && <i className="fa-solid fa-check" />}
                    </span>
                    <div className="ac-pick-body">
                      <div className="ac-pick-head">
                        <span className="ac-badge">{item.categoryLabel}</span>
                        <span className="ac-pick-date"><i className="fa-solid fa-calendar" /> {item.createdAt.slice(0, 10)}</span>
                      </div>
                      <h3 className="ac-pick-title">{item.title}</h3>
                      <div className="ac-pick-meta">
                        <span><i className="fa-solid fa-building" /> {item.company || '기업명 없음'}</span>
                        <span><i className="fa-solid fa-briefcase" /> {item.jobType || '직종 없음'} · {item.position || '지원 직무 없음'}</span>
                      </div>
                      {missing.length > 0 && (
                        <p className="iv-pick-missing">{missing.join('·')} 칸이 비어 있어 면접에 쓸 수 없습니다. 자소서를 수정해 주세요.</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>}

          {resume && askInfo && (
            <div className="ac-card">
              <h2 className="ac-card-title"><i className="fa-solid fa-building-user" /> 지원 정보</h2>
              <p className="ac-card-desc">
                {resume.company} · {resume.jobType} · {resume.position} 지원으로 면접을 봅니다.
                이 자소서에 저장되지 않은 정보만 선택해 주세요.
              </p>
              {!info.industry && <ChoiceField label="업종" options={INDUSTRIES} value={industry} onChange={setIndustry} />}
              {!info.companyType && <ChoiceField label="기업형태" options={COMPANY_TYPES} value={companyType} onChange={setCompanyType} />}
              {!info.experience && <ChoiceField label="경력" options={EXPERIENCES} value={experience} onChange={setExperience} />}
            </div>
          )}

          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home')}>취소</button>
            <button className="ac-btn-primary" disabled={!setupReady}
              onClick={() => { setError(''); setStep(consented ? 'device' : 'consent') }}>
              다음 <i className="fa-solid fa-arrow-right" />
            </button>
          </div>

          {history && history.length > 0 && (
            <div className="ac-card iv-history">
              <div className="iv-live-head">
                <h2 className="ac-card-title"><i className="fa-solid fa-clock-rotate-left" /> 지난 AI 인터뷰</h2>
                <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home/interview/results')}>
                  <i className="fa-solid fa-square-poll-vertical" /> 결과 보기
                </button>
              </div>
              <ul>
                {history.map(item => (
                  <li key={item.id}>
                    <span className="iv-history-date">{item.createdAt.slice(0, 10)}</span>
                    <strong>{item.resumeTitle || (item.mode === 'company' ? '기업별 질문 면접' : '자소서 없이 본 면접')}</strong>
                    <span className="iv-history-company">{item.company}</span>
                    <span className={`iv-history-state${item.finishedAt ? ' done' : ''}`}>{item.finishedAt ? '완료' : '미완료'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ── 2. 개인정보 동의 ── */}
      {step === 'consent' && (
        <div className="ac-card">
          <h2 className="ac-card-title"><i className="fa-solid fa-shield-halved" /> 개인정보 수집·이용 동의서</h2>
          <p className="ac-card-desc">
            AI 인터뷰는 카메라 영상과 마이크 음성을 녹화해 평가합니다. 아래 내용을 읽고 모두 동의해야 시작할 수 있습니다.
            한 번 동의하면 다음 인터뷰부터는 다시 묻지 않습니다.
          </p>
          {INTERVIEW_CONSENT.items.map(item => (
            <section key={item.id} className="iv-consent">
              <h3>{item.title}</h3>
              <dl>
                {item.rows.map(([term, detail]) => (
                  <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>
                ))}
              </dl>
              <p className="iv-consent-note">동의를 거부할 수 있으며, 거부하면 AI 인터뷰를 이용할 수 없습니다.</p>
              <label className="iv-consent-check">
                <input type="checkbox" checked={!!agreed[item.id]}
                  onChange={event => setAgreed(current => ({ ...current, [item.id]: event.target.checked }))} />
                위 내용에 동의합니다.
              </label>
            </section>
          ))}
          <label className="iv-consent-check iv-consent-all">
            <input type="checkbox" checked={allAgreed}
              onChange={event => setAgreed(Object.fromEntries(INTERVIEW_CONSENT.items.map(item => [item.id, event.target.checked])))} />
            전체 동의
          </label>
          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={() => setStep('setup')}><i className="fa-solid fa-arrow-left" /> 이전</button>
            <button className="ac-btn-primary" disabled={!allAgreed || agreeing} onClick={() => void agree()}>
              {agreeing ? '동의를 저장하는 중…' : '동의하고 다음'} <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. 카메라·마이크 확인 ── */}
      {step === 'device' && (
        <div className="ac-card">
          <h2 className="ac-card-title"><i className="fa-solid fa-video" /> 카메라·마이크 확인</h2>
          <p className="ac-card-desc">
            면접 전에 얼굴이 잘 보이고 목소리가 잘 들리는지 확인해 주세요. 브라우저가 권한을 물으면 「허용」을 눌러 주세요.
          </p>
          <div className="iv-device">
            <div className="iv-preview">
              <video ref={videoRef} autoPlay playsInline muted aria-label="카메라 미리보기" />
              {deviceState !== 'ok' && (
                <div className="iv-preview-empty">
                  <i className="fa-solid fa-video-slash" aria-hidden="true" />
                  <span>{deviceState === 'checking' ? '카메라를 켜는 중입니다.' : '확인을 시작하면 내 모습이 보입니다.'}</span>
                </div>
              )}
            </div>
            <ul className="iv-checks">
              <li className={deviceState === 'ok' ? 'ok' : ''}>
                <i className={`fa-solid ${deviceState === 'ok' ? 'fa-circle-check' : 'fa-circle'}`} aria-hidden="true" />
                <div><strong>카메라</strong><span>{deviceState === 'ok' ? '화면에 얼굴이 보이는지 확인해 주세요.' : '아직 확인하지 않았습니다.'}</span></div>
              </li>
              <li className={micHeard ? 'ok' : ''}>
                <i className={`fa-solid ${micHeard ? 'fa-circle-check' : 'fa-circle'}`} aria-hidden="true" />
                <div>
                  <strong>마이크</strong>
                  <span>
                    {deviceState !== 'ok' ? '아직 확인하지 않았습니다.'
                      : micHeard ? '목소리가 들립니다.' : '"안녕하세요"라고 말해 보세요. 막대가 움직여야 합니다.'}
                  </span>
                  <div className="iv-meter" role="meter" aria-label="마이크 입력 크기" aria-valuemin={0} aria-valuemax={100} aria-valuenow={micLevel}>
                    <span style={{ width: `${micLevel}%` }} />
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <p className="iv-device-tip">
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> 조용하고 밝은 곳에서, 이어폰을 쓰면 더 정확하게 녹음됩니다.
            면접을 시작하면 중간에 새로고침하지 마세요. 면접 화면은 한 번만 열 수 있습니다.
          </p>
          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={() => { stopDevices(); setDeviceState('idle'); setStep(consented ? 'setup' : 'consent') }}>
              <i className="fa-solid fa-arrow-left" /> 이전
            </button>
            <button className="iv-btn-mint" disabled={deviceState === 'checking'} onClick={() => void checkDevices()}>
              <i className="fa-solid fa-rotate" /> {deviceState === 'ok' ? '다시 확인' : '카메라·마이크 확인'}
            </button>
            <button className="ac-btn-primary" disabled={deviceState !== 'ok' || !micHeard || starting} onClick={() => void begin()}>
              <i className="fa-solid fa-play" /> {starting ? '면접을 준비하는 중…' : '면접 시작'}
            </button>
          </div>
        </div>
      )}

      {/* ── 4. 면접 (DeepResume IFRAME) ── */}
      {step === 'live' && session && (
        <div className="ac-card iv-live">
          <div className="iv-live-head">
            <h2 className="ac-card-title"><i className="fa-solid fa-video" /> AI 인터뷰</h2>
            <span className={`iv-live-state ${liveState}`} role="status">
              {liveState === 'loading' ? '면접 화면을 여는 중' : liveState === 'ready' ? '면접 준비 중' : '면접 진행 중'}
            </span>
            <button className="ac-btn-ghost" onClick={leaveLive}><i className="fa-solid fa-xmark" /> 면접 닫기</button>
          </div>
          <iframe className="iv-frame" src={session.iframeUrl} title="DeepResume AI 인터뷰"
            allow="camera; microphone; autoplay" />
          <p className="iv-device-tip">
            <i className="fa-solid fa-circle-info" aria-hidden="true" /> 화면이 열리지 않으면 「면접 닫기」 후 처음부터 다시 시작해 주세요.
            새로고침하면 면접 화면이 만료됩니다.
          </p>
        </div>
      )}

      {/* ── 5. 종료 ── */}
      {step === 'done' && (
        <div className="ac-card iv-done">
          <span className="iv-done-icon"><i className="fa-solid fa-circle-check" /></span>
          <h2>AI 인터뷰를 마쳤습니다.</h2>
          <p>수고하셨습니다. 면접 영상과 평가 결과는 DeepResume에 저장되었습니다.</p>
          {finishNote && <p className="ac-preview-notice" role="alert">{finishNote}</p>}
          <div className="ac-actions">
            <button className="ac-btn-ghost" onClick={restart}><i className="fa-solid fa-rotate" /> 다시 면접 보기</button>
            <button className="ac-btn-ghost" onClick={() => navigate('/jobs/home')}><i className="fa-solid fa-house" /> 처음으로</button>
            <button className="ac-btn-primary" onClick={() => navigate('/jobs/home/interview/results')}>
              <i className="fa-solid fa-square-poll-vertical" /> 결과 보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
