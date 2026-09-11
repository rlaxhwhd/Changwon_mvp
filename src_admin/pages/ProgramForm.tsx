import {
  LuCalendar, LuCalendarClock, LuCalendarRange, LuChevronRight,
  LuCircleHelp, LuClipboardList, LuClock, LuGripVertical, LuHouse, LuImage,
  LuMapPin, LuPaperclip, LuPlus, LuSmile, LuTrash2,
  LuUpload, LuUserRound, LuUsers, LuX,
} from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminModal from '../components/AdminModal'
import RichEditor from '../components/RichEditor'
import { COUNSELORS } from '../data/counselors'
import { addProgram, getProgramById, updateProgram } from '../data/programs'
import {
  COMPETENCY_SURVEY_ATTACHMENT,
  COMPETENCY_SURVEY_GROUPS,
  SATISFACTION_FORMS,
} from '../data/schema/program'
import type { ProgramCategory } from '../data/schema/program'
import { STUDENT_TYPES, typeLabel } from '../../src_v2/data/careerProcess'
import type { StudentType } from '../../src_v2/data/careerProcess'
import { ROADMAP_ENTRIES, ROADMAP_ENTRY_DESC, ROADMAP_ENTRY_LABEL } from '../../src_v2/data/schema/roadmap'
import type { RoadmapEntry } from '../../src_v2/data/schema/roadmap'
import './ProgramForm.css'

const MAJOR_CATS = ['진로', '취업', 'STAR트랙', 'FJT트랙']
const MINOR_CATS = ['S(진로탐색)', 'M(진로설정)', 'A(역량강화)', 'R(취업촉진)', 'T(우수인재)', '기타']
const FISCAL_YEARS = ['2026', '2027']
const GRADE_OPTIONS = ['1학년', '2학년', '3학년', '4학년']
const TARGET_KEYS = ['학부생', '대학원생', '교직원'] as const
const EXTRA_TYPES = ['객관식(설문 선택형)', '객관식(설문 중복 선택형)', '주관식(설문 서술형, MAX500)', '개인정보 동의서', '첨부파일']
const EXTRA_SUBLINK: Record<string, string> = {
  '객관식(설문 선택형)': '보기/선택지 설정',
  '객관식(설문 중복 선택형)': '보기/선택지 설정',
  '개인정보 동의서': '동의서 내용 설정',
  '첨부파일': '파일 형식/개수 설정',
}
// 등록 화면의 사업 구분 라벨 → 비교과 분류 코드.
const CATEGORY_MAP: Record<string, ProgramCategory> = {
  '진로': 'CAREER', '취업': 'EMPLOY', 'STAR트랙': 'CAREER', 'FJT트랙': 'CAREER',
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type TargetKey = (typeof TARGET_KEYS)[number]
type ExtraItem = { id: string; type: string; question: string }

let seq = 0
const nextId = () => `extra_${(seq += 1)}`
const DEFAULT_EXTRAS: ExtraItem[] = [
  { id: nextId(), type: '객관식(설문 선택형)', question: '참여 동기를 선택해주세요.' },
  { id: nextId(), type: '객관식(설문 중복 선택형)', question: '관심 있는 분야를 선택해주세요. (복수선택 가능)' },
  { id: nextId(), type: '주관식(설문 서술형, MAX500)', question: '기대하는 점을 자유롭게 작성해주세요.' },
  { id: nextId(), type: '개인정보 동의서', question: '개인정보 수집 및 이용에 동의해주세요.' },
  { id: nextId(), type: '첨부파일', question: '포트폴리오 파일을 첨부해주세요.' },
]

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 오늘 YYYY-MM-DD — 날짜칸 기본값.
 * toISOString() 은 UTC 라 KST 오전 9시 전에는 어제가 나온다. 로컬 값으로 조립한다.
 */
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 썸네일 저장 한도 — 권장 800x450 을 담을 수 있는 긴 변 기준. */
const THUMB_MAX_PX = 800

/** 고른 이미지를 THUMB_MAX_PX 안으로 줄여 data URL 로 만든다(채용공고 로고와 같은 방식). */
function toThumbDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지 파일만 등록할 수 있습니다.'))
      img.onload = () => {
        const scale = Math.min(1, THUMB_MAX_PX / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('이미지를 처리하지 못했습니다.')); return }
        ctx.drawImage(img, 0, 0, w, h)
        // 사진 계열이라 JPEG 가 PNG 보다 훨씬 작다 — 저장 한도를 넘기지 않는 쪽을 고른다.
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
function fmtDate(date: string, time: string) {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${y}.${pad(m)}.${pad(d)} (${wd})${time ? ` ${time}` : ''}`
}

export default function ProgramForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const editing = Boolean(id)
  const existing = useMemo(() => (id ? getProgramById(id) : undefined), [id])
  const today = todayISO()

  const [majorCat, setMajorCat] = useState<string>(existing && MAJOR_CATS.includes(existing.category) ? existing.category : MAJOR_CATS[0])
  const [minorCat, setMinorCat] = useState(MINOR_CATS[0])
  // CARE 7+ 분류 — 6유형 중복 선택. 코드(T1~T6)만 담고 라벨은 typeLabel()로 그린다.
  const [careTypes, setCareTypes] = useState<StudentType[]>(existing?.careTypes ?? [])
  // 로드맵 편입 — 선택한 유형 학생의 IAP 실행 축에 칸을 만든다(PROCESS.md §6-4)
  const [roadmapEntry, setRoadmapEntry] = useState<RoadmapEntry>(existing?.roadmapEntry ?? 'NONE')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [fiscalYear, setFiscalYear] = useState(existing?.fiscalYear ?? FISCAL_YEARS[0])
  const [purpose, setPurpose] = useState(existing?.desc ?? '')
  // 새로 등록할 때 날짜칸은 전부 오늘에서 시작한다 — 담당자가 지나간 날짜를 지우고
  // 다시 쓰지 않게. 수정할 때는 저장된 값이 우선이다.
  const [noticeDate, setNoticeDate] = useState(today)
  const [noticeTime, setNoticeTime] = useState('10:00')
  const [applyStartDate, setApplyStartDate] = useState(existing?.startDate ?? today)
  const [applyStartTime, setApplyStartTime] = useState('10:00')
  const [applyEndDate, setApplyEndDate] = useState(existing?.endDate ?? today)
  const [applyEndTime, setApplyEndTime] = useState('17:00')
  const [runStartDate, setRunStartDate] = useState(existing?.runStartDate ?? today)
  const [runStartTime, setRunStartTime] = useState('10:00')
  const [runEndDate, setRunEndDate] = useState(existing?.runEndDate ?? today)
  const [runEndTime, setRunEndTime] = useState('17:00')
  const [place, setPlace] = useState(existing?.location ?? '')
  const [sessions, setSessions] = useState(existing ? String(existing.sessions) : '1')
  const [managerName, setManagerName] = useState(existing?.manager ?? (COUNSELORS[0]?.name ?? ''))
  const [targets, setTargets] = useState<Record<TargetKey, boolean>>({ 학부생: true, 대학원생: false, 교직원: false })
  const [grades, setGrades] = useState<Record<string, boolean>>({ '1학년': true, '2학년': true, '3학년': true, '4학년': true })
  const [manager, setManager] = useState<{ name: string; role: string } | null>(() => {
    const counselor = existing
      ? COUNSELORS.find(c => c.name === existing.manager) ?? COUNSELORS[0]
      : COUNSELORS[0]
    return counselor ? { name: counselor.name, role: counselor.roleLabel } : null
  })
  const [limitCount, setLimitCount] = useState(existing ? String(existing.capacity) : '100')
  const [selectCount, setSelectCount] = useState('30')
  const [selectMethod, setSelectMethod] = useState<'선착순' | '심사'>('선착순')
  const [certificate, setCertificate] = useState<'발급' | '미발급'>('발급')
  const [completeHours, setCompleteHours] = useState('2')
  // 기존 글을 불러온다 — 예전에는 항상 빈 값으로 시작해서, 수정하려고 열면
  // 이미 쓴 상세 내용이 사라진 것처럼 보였다.
  const [detail, setDetail] = useState(existing?.detail ?? '')
  // 썸네일 — 올려둘 서버가 없어 THUMB_MAX_PX 로 줄여 data URL 로 담는다.
  // 원본을 그대로 담으면 목록(dc_programs) 하나가 localStorage 한도를 넘겨 저장이
  // 통째로 실패한다(채용공고 로고와 같은 규약). DB 전환 시 이 자리는 파일 URL 이 된다.
  const [thumb, setThumb] = useState(existing?.image ?? '')
  const [thumbError, setThumbError] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)
  const [extras, setExtras] = useState<ExtraItem[]>(DEFAULT_EXTRAS)
  const [pinned, setPinned] = useState(existing?.pinned ?? false)
  // 만족도 조사 — 실시할 때만 질문지를 고른다. 질문지는 관리자 모듈이 사전 등록한다.
  const [satisfaction, setSatisfaction] = useState(existing?.satisfactionSurvey ?? true)
  const [satisfactionFormId, setSatisfactionFormId] = useState(existing?.satisfactionFormId ?? SATISFACTION_FORMS[0].id)
  // 역량향상률 조사 — 실시할 때만 조사 영역을 고른다. 체크한 영역의 질문지만 조사된다.
  const [competency, setCompetency] = useState(existing?.competencySurvey ?? true)
  const [competencyAreas, setCompetencyAreas] = useState<string[]>(existing?.competencyAreas ?? [])
  // 통계값 반영 — 미포함이면 통계 요청의 참가/수료 인원에서 빠진다.
  const [includeInStats, setIncludeInStats] = useState(existing?.includeInStats ?? true)
  const [saved, setSaved] = useState(false)

  const onlyGradeDisabled = targets.대학원생 || targets.교직원
  const checkedTargets = TARGET_KEYS.filter(k => targets[k])
  const selectedGrades = GRADE_OPTIONS.filter(g => grades[g])
  const gradeLabel = selectedGrades.length === 0
    ? '학년 미선택'
    : selectedGrades.length === GRADE_OPTIONS.length
      ? '학부전체'
      : selectedGrades.join(', ')
  const targetSummary = (() => {
    if (checkedTargets.length === 0) return ''
    const first = checkedTargets[0]
    const base = first === '학부생' ? `학부생 (${gradeLabel})` : first
    return checkedTargets.length > 1 ? `${base} 외 ${checkedTargets.length - 1}개` : base
  })()
  const capacityLabel = `${selectCount || '-'}명 / ${limitCount || '-'}명 (${selectMethod === '선착순' ? '선착순 선발' : '심사 후 선발'})`

  const canSave = title.trim() !== '' && applyStartDate !== '' && applyEndDate !== '' && managerName !== '' && !saved

  const handleSave = () => {
    if (!canSave) return
    const payload = {
      title: title.trim(),
      // 두 칸은 서로 다른 것이다 — 한 칸에 합치면 상세 내용이 프로그램 내용을 덮어썼다.
      desc: purpose.trim(),
      detail: detail.trim() || undefined,
      category: CATEGORY_MAP[majorCat] ?? '기타',
      careTypes,
      // 유형을 아무것도 안 골랐으면 편입할 대상이 없다 — 값이 남지 않게 정리한다.
      roadmapEntry: careTypes.length === 0 ? ('NONE' as RoadmapEntry) : roadmapEntry,
      startDate: applyStartDate,
      endDate: applyEndDate,
      runStartDate,
      runEndDate,
      fiscalYear,
      sessions: Math.max(1, Number(sessions) || 1),
      manager: managerName,
      capacity: Number(limitCount) || Number(selectCount) || 20,
      location: place.trim(),
      status: existing?.status ?? 'RECRUITING',
      pinned,
      satisfactionSurvey: satisfaction,
      // 미실시면 질문지 선택은 의미가 없다 — 값이 남지 않게 정리한다.
      satisfactionFormId: satisfaction ? satisfactionFormId : undefined,
      competencySurvey: competency,
      competencyAreas: competency ? competencyAreas : [],
      includeInStats,
      // 안 고르면 필드를 만들지 않는다 — 빈 문자열이 남으면 공고가 '이미지 있음'으로 읽는다.
      image: thumb || undefined,
    }
    const saving = editing && id ? updateProgram(id, payload) : addProgram(payload).then(() => undefined)
    saving.then(() => {
      setSaved(true)
      window.setTimeout(() => navigate(editing ? '/programs/manage' : '/programs'), 400)
    }).catch((error: unknown) => {
      // 서버가 거절한 이유를 그대로 보여 준다 — 저장된 척하고 넘어가지 않는다.
      window.alert(error instanceof Error ? error.message : '저장하지 못했습니다.')
    })
  }

  /** 유형 체크 토글 — 저장 순서는 항상 T1~T6를 유지한다. */
  const toggleCareType = (code: StudentType) =>
    setCareTypes(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
      return STUDENT_TYPES.filter(t => next.includes(t.code)).map(t => t.code)
    })

  /** 조사 영역 체크 토글 — 저장 순서는 항상 COMPETENCY_SURVEY_GROUPS 순서를 유지한다. */
  const toggleArea = (key: string) =>
    setCompetencyAreas(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      return COMPETENCY_SURVEY_GROUPS.flatMap(g => g.areas.map(a => a.key)).filter(k => next.includes(k))
    })

  const addExtra = () => setExtras(prev => [...prev, { id: nextId(), type: EXTRA_TYPES[0], question: '' }])
  const removeExtra = (id: string) => setExtras(prev => prev.filter(x => x.id !== id))
  const patchExtra = (id: string, patch: Partial<ExtraItem>) => setExtras(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)))

  return (
    <div className={`pf${editing ? ' pf-embedded' : ''}`}>
      <div className="pf-inner">
        {/* Top bar — 신규 등록(standalone)에서만. 수정 탭은 부모 셸이 헤더·탭을 제공. */}
        {!editing && (
          <div className="pf-topbar">
            <div>
              <h1 className="pf-title">프로그램 개설 관리</h1>
              <nav className="pf-crumbs" aria-label="breadcrumb">
                <Link to="/"><LuHouse /></Link>
                <LuChevronRight className="pf-crumb-sep" />
                <Link to="/programs/manage">프로그램 관리</Link>
                <LuChevronRight className="pf-crumb-sep" />
                <span className="is-current">프로그램 개설 관리</span>
              </nav>
            </div>
            <div className="pf-topbar-actions">
              <button type="button" className="pf-btn pf-btn-ghost" onClick={() => navigate('/programs')}>취소</button>
              <button type="button" className="pf-btn pf-btn-primary" disabled={!canSave} onClick={handleSave}>{saved ? '저장됨' : '저장'}</button>
            </div>
          </div>
        )}

        <div className="pf-grid">
          {/* ── 기본 정보 ── */}
          <section className="pf-card">
            <div className="pf-card-head">
              <h2><span className="pf-head-icon"><LuClipboardList /></span> 기본 정보</h2>
              <span className="pf-req-note"><span className="pf-req">*</span> 필수 입력 항목</span>
            </div>

            <div className="pf-fields">
              {/* 상단 고정 — 목록 최상단 우선 노출 */}
              <div className="pf-field">
                <span className="pf-label">상단 고정</span>
                <label className="pf-check">
                  <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
                  프로그램 목록 상단에 고정 노출
                </label>
                <span className="pf-help">체크 시 등록일과 무관하게 목록 최상단에 우선 노출됩니다.</span>
              </div>

              {/* 프로그램 분류 */}
              <div className="pf-field">
                <span className="pf-label">프로그램 분류 <span className="pf-req">*</span></span>
                <div className="pf-cols-2">
                  <div className="pf-field" style={{ gap: 6 }}>
                    <span className="pf-sub">대분류</span>
                    <select className="pf-select" value={majorCat} onChange={e => setMajorCat(e.target.value)}>
                      {MAJOR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="pf-field" style={{ gap: 6 }}>
                    <span className="pf-sub">소분류</span>
                    <select className="pf-select" value={minorCat} onChange={e => setMinorCat(e.target.value)}>
                      {MINOR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <span className="pf-help">프로그램 성격에 맞는 분류를 선택해주세요.</span>
              </div>

              {/* CARE 7+ 분류 — 진단 6유형(T1~T6) 중복 선택 */}
              <div className="pf-field">
                <span className="pf-label">CARE 7+ 분류</span>
                <div className="pf-inline">
                  {STUDENT_TYPES.map(t => (
                    <label key={t.code} className="pf-check">
                      <input
                        type="checkbox"
                        checked={careTypes.includes(t.code)}
                        onChange={() => toggleCareType(t.code)}
                      />
                      {typeLabel(t.code)}
                    </label>
                  ))}
                </div>
                <span className="pf-help">이 프로그램을 권장할 진단 유형을 선택해주세요. 중복 선택할 수 있습니다.</span>
              </div>

              {/* 로드맵 편입 — 선택한 유형 학생의 IAP 실행 축에 칸을 만든다 */}
              <div className="pf-field">
                <span className="pf-label">로드맵 편입</span>
                <div className="pf-inline">
                  {ROADMAP_ENTRIES.map(e => (
                    <label key={e} className="pf-radio">
                      <input
                        type="radio"
                        name="roadmapEntry"
                        checked={roadmapEntry === e}
                        disabled={careTypes.length === 0}
                        onChange={() => setRoadmapEntry(e)}
                      />
                      {ROADMAP_ENTRY_LABEL[e]}
                    </label>
                  ))}
                </div>
                <span className="pf-help">
                  {careTypes.length === 0
                    ? 'CARE 7+ 분류에서 대상 유형을 먼저 선택해주세요.'
                    : ROADMAP_ENTRY_DESC[roadmapEntry]}
                </span>
                {roadmapEntry !== 'NONE' && careTypes.length > 0 && (
                  <span className="pf-help">
                    {careTypes.map(t => typeLabel(t)).join(' · ')} 학생의 <b>IAP 실행</b> 축에 이 프로그램 칸이 추가됩니다.
                    칸은 학생이 <b>수료</b>하면 자동으로 완료 처리됩니다.
                  </span>
                )}
              </div>

              {/* 프로그램명 */}
              <div className="pf-field">
                <span className="pf-label">프로그램명 <span className="pf-req">*</span></span>
                <div className="pf-inputwrap">
                  <input className="pf-input has-counter" maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="프로그램명을 입력해주세요." />
                  <span className="pf-counter">{title.length} / 100</span>
                </div>
              </div>

              {/* 회계년도 */}
              <div className="pf-field">
                <span className="pf-label">회계년도 <span className="pf-req">*</span></span>
                <select className="pf-select" style={{ maxWidth: 280 }} value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}>
                  {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="pf-help">프로그램 예산 및 정산이 이루어지는 회계연도를 선택해주세요.</span>
              </div>

              {/* 프로그램 내용 — 학생 공고의 「프로그램 내용」 칸에 그대로 나간다 */}
              <div className="pf-field">
                <span className="pf-label">프로그램 내용 <span className="pf-req">*</span></span>
                <div className="pf-textarea-wrap">
                  <textarea className="pf-textarea" maxLength={1000} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="프로그램의 목적과 진행 내용을 입력해주세요." />
                  <span className="pf-counter">{purpose.length} / 1000</span>
                </div>
              </div>

              {/* 공고 일시 */}
              <div className="pf-field">
                <span className="pf-label">공고 일시 <span className="pf-req">*</span></span>
                <div className="pf-datetime" style={{ maxWidth: 360 }}>
                  <input className="pf-input" type="date" value={noticeDate} onChange={e => setNoticeDate(e.target.value)} />
                  <input className="pf-input" type="time" value={noticeTime} onChange={e => setNoticeTime(e.target.value)} />
                </div>
              </div>

              {/* 접수 기간 */}
              <div className="pf-field">
                <span className="pf-label">접수 기간 <span className="pf-req">*</span></span>
                <div className="pf-range">
                  <div className="pf-datetime">
                    <input className="pf-input" type="date" value={applyStartDate} onChange={e => setApplyStartDate(e.target.value)} />
                    <input className="pf-input" type="time" value={applyStartTime} onChange={e => setApplyStartTime(e.target.value)} />
                  </div>
                  <span className="pf-range-sep">~</span>
                  <div className="pf-datetime">
                    <input className="pf-input" type="date" value={applyEndDate} onChange={e => setApplyEndDate(e.target.value)} />
                    <input className="pf-input" type="time" value={applyEndTime} onChange={e => setApplyEndTime(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 운영 기간 */}
              <div className="pf-field">
                <span className="pf-label">운영 기간 <span className="pf-req">*</span></span>
                <div className="pf-range">
                  <div className="pf-datetime">
                    <input className="pf-input" type="date" value={runStartDate} onChange={e => setRunStartDate(e.target.value)} />
                    <input className="pf-input" type="time" value={runStartTime} onChange={e => setRunStartTime(e.target.value)} />
                  </div>
                  <span className="pf-range-sep">~</span>
                  <div className="pf-datetime">
                    <input className="pf-input" type="date" value={runEndDate} onChange={e => setRunEndDate(e.target.value)} />
                    <input className="pf-input" type="time" value={runEndTime} onChange={e => setRunEndTime(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 실시 장소 */}
              <div className="pf-field">
                <span className="pf-label">실시 장소 <span className="pf-req">*</span></span>
                <div className="pf-inputwrap">
                  <input className="pf-input has-counter" maxLength={100} value={place} onChange={e => setPlace(e.target.value)} placeholder="실시 장소를 입력해주세요." />
                  <span className="pf-counter">{place.length} / 100</span>
                </div>
              </div>

              {/* 참가 대상 */}
              <div className="pf-field">
                <span className="pf-label">참가 대상 <span className="pf-req">*</span></span>
                <div className="pf-field-inline">
                  <span className="pf-sub">구분</span>
                  <div className="pf-inline">
                    {TARGET_KEYS.map(k => (
                      <label key={k} className="pf-check">
                        <input type="checkbox" checked={targets[k]} onChange={e => setTargets(prev => ({ ...prev, [k]: e.target.checked }))} />
                        {k}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pf-field-inline">
                  <span className="pf-sub">학년</span>
                  <div className="pf-inline">
                    {GRADE_OPTIONS.map(g => (
                      <label key={g} className="pf-check">
                        <input type="checkbox" checked={!!grades[g]} disabled={onlyGradeDisabled} onChange={e => setGrades(prev => ({ ...prev, [g]: e.target.checked }))} />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                <span className="pf-help">대학원생, 교직원 선택 시 학년 선택은 비활성화됩니다.</span>
              </div>

              {/* 담당자 */}
              <div className="pf-field">
                <span className="pf-label">담당자 <span className="pf-req">*</span></span>
                <div>
                  <button type="button" className="pf-btn-outline" onClick={() => {
                    const counselor = COUNSELORS[0]
                    setManager(counselor ? { name: counselor.name, role: counselor.roleLabel } : null)
                  }}>교직원 검색</button>
                </div>
                {manager && (
                  <div className="pf-chip">
                    {manager.name} ({manager.role})
                    <button type="button" aria-label="담당자 삭제" onClick={() => setManager(null)}><LuX /></button>
                  </div>
                )}
              </div>

              <div className="pf-field">
                <span className="pf-label">관리 담당자<span className="pf-req">*</span></span>
                <select className="pf-select" value={managerName} onChange={e => setManagerName(e.target.value)}>
                  <option value="">담당자를 선택해주세요.</option>
                  {COUNSELORS.map(counselor => (
                    <option key={counselor.id} value={counselor.name}>{counselor.name} ({counselor.roleLabel})</option>
                  ))}
                </select>
              </div>

              {/* 인원·선발방식·수료·인증서 — 열 정렬 그리드 (참여 인증서를 선발 인원과 같은 열에) */}
              <div className="pf-fieldgrid">
                {/* 1행 1열: 신청 제한 인원 */}
                <div className="pf-field">
                  <span className="pf-label">신청 제한 인원 <span className="pf-req">*</span></span>
                  <div className="pf-suffix-wrap">
                    <input className="pf-input" type="number" min={0} value={limitCount} onChange={e => setLimitCount(e.target.value)} />
                    <span className="pf-suffix">명</span>
                  </div>
                  <span className="pf-help">0 또는 비워두면 제한 없음</span>
                </div>

                {/* 1행 2열: 선발 인원 */}
                <div className="pf-field">
                  <span className="pf-label">선발 인원 <span className="pf-req">*</span></span>
                  <div className="pf-suffix-wrap">
                    <input className="pf-input" type="number" min={0} value={selectCount} onChange={e => setSelectCount(e.target.value)} />
                    <span className="pf-suffix">명</span>
                  </div>
                </div>

                <div className="pf-field">
                  <span className="pf-label">총회차 <span className="pf-req">*</span></span>
                  <div className="pf-suffix-wrap">
                    <input className="pf-input" type="number" min={1} value={sessions} onChange={e => setSessions(e.target.value)} />
                    <span className="pf-suffix">회</span>
                  </div>
                </div>

                {/* 1행 3열: 선발 방식 */}
                <div className="pf-field">
                  <span className="pf-label">선발 방식 <span className="pf-req">*</span></span>
                  <div className="pf-radio-row">
                    <label className="pf-radio"><input type="radio" name="selectMethod" checked={selectMethod === '선착순'} onChange={() => setSelectMethod('선착순')} /> 선착순 선발</label>
                    <label className="pf-radio"><input type="radio" name="selectMethod" checked={selectMethod === '심사'} onChange={() => setSelectMethod('심사')} /> 심사 후 선발</label>
                  </div>
                </div>

                {/* 2행 1열: 수료 시간 */}
                <div className="pf-field">
                  <span className="pf-label">수료 시간 <span className="pf-req">*</span></span>
                  <div className="pf-suffix-wrap">
                    <input className="pf-input" type="number" min={0} value={completeHours} onChange={e => setCompleteHours(e.target.value)} />
                    <span className="pf-suffix">시간</span>
                  </div>
                  <span className="pf-help">프로그램 수료 시 인정되는 시간입니다.</span>
                </div>

                {/* 2행 2열: 참여 인증서 (선발 인원과 같은 열) */}
                <div className="pf-field">
                  <span className="pf-label">참여 인증서 <span className="pf-req">*</span></span>
                  <div className="pf-radio-row">
                    <label className="pf-radio"><input type="radio" name="certificate" checked={certificate === '발급'} onChange={() => setCertificate('발급')} /> 발급</label>
                    <label className="pf-radio"><input type="radio" name="certificate" checked={certificate === '미발급'} onChange={() => setCertificate('미발급')} /> 미발급</label>
                  </div>
                </div>
              </div>

              {/* 첨부 파일 */}
              <div className="pf-field">
                <span className="pf-label">첨부 파일</span>
                <div className="pf-dropzone">
                  <span className="pf-dropzone-title"><LuUpload /> 파일 선택 또는 드래그하여 업로드</span>
                  <span className="pf-dropzone-hint">PDF, HWP, DOC, XLS, PPT, ZIP 파일 지원 (최대 20MB)</span>
                </div>
                <div><button type="button" className="pf-btn-outline"><LuPlus /> 파일 추가</button></div>
              </div>

              {/* 신청 시 추가 정보 */}
              <div className="pf-field">
                <span className="pf-label">신청 시 추가 정보</span>
                <div><button type="button" className="pf-btn-outline" onClick={() => setExtraOpen(true)}>추가 설정</button></div>
                <span className="pf-help">신청서 작성 시 추가로 수집할 정보를 설정합니다.</span>
              </div>

              {/* 만족도 조사 */}
              <div className="pf-field">
                <span className="pf-label">만족도 조사 <span className="pf-req">*</span></span>
                <div className="pf-radio-row">
                  <label className="pf-radio">
                    <input type="radio" name="satisfaction" checked={satisfaction} onChange={() => setSatisfaction(true)} /> 실시
                  </label>
                  <label className="pf-radio">
                    <input type="radio" name="satisfaction" checked={!satisfaction} onChange={() => setSatisfaction(false)} /> 미실시
                  </label>
                </div>

                {satisfaction && (
                  <div className="pf-survey-body">
                    <div className="pf-field" style={{ gap: 6 }}>
                      <span className="pf-sub">질문지 선택</span>
                      <select
                        className="pf-select"
                        style={{ maxWidth: 320 }}
                        value={satisfactionFormId}
                        onChange={e => setSatisfactionFormId(e.target.value)}
                      >
                        {SATISFACTION_FORMS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                    <span className="pf-attach-note">
                      <LuPaperclip />
                      {SATISFACTION_FORMS.find(f => f.id === satisfactionFormId)?.attachment}
                    </span>
                  </div>
                )}

                <span className="pf-help">
                  실시할 경우 관리자 모듈에서 사전에 설정한 질문지를 선택합니다.
                  현재는 질문지가 1개지만, 관리자 모듈에서 질문지 종류를 추가 등록할 수 있습니다.
                </span>
              </div>

              {/* 역량향상률 조사 */}
              <div className="pf-field">
                <span className="pf-label">역량향상률 조사 <span className="pf-req">*</span></span>
                <div className="pf-field" style={{ gap: 6 }}>
                  <span className="pf-sub">대분류</span>
                  <select
                    className="pf-select"
                    style={{ maxWidth: 200 }}
                    value={competency ? '실시' : '미실시'}
                    onChange={e => setCompetency(e.target.value === '실시')}
                  >
                    <option value="실시">실시</option>
                    <option value="미실시">미실시</option>
                  </select>
                </div>

                {competency && (
                  <div className="pf-survey-body">
                    <span className="pf-sub">중분류</span>
                    {COMPETENCY_SURVEY_GROUPS.map(g => (
                      <div className="pf-survey-group" key={g.code}>
                        <span className="pf-survey-group-head">
                          <b>{g.label}</b>
                          <small>{g.areas.length}개 영역 · 총 {g.itemCount}개 항목</small>
                        </span>
                        <div className="pf-inline">
                          {g.areas.map(a => (
                            <label key={a.key} className="pf-check">
                              <input
                                type="checkbox"
                                checked={competencyAreas.includes(a.key)}
                                onChange={() => toggleArea(a.key)}
                              />
                              {a.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <span className="pf-attach-note">
                      <LuPaperclip />
                      {COMPETENCY_SURVEY_ATTACHMENT}
                    </span>
                  </div>
                )}

                <span className="pf-help">
                  설문조사 할 영역만 중복 체크합니다. 체크에 따라 해당 영역 질문지만 활성화되고 조사됩니다.
                </span>
              </div>

              {/* 통계값 반영 유무 */}
              <div className="pf-field">
                <span className="pf-label">통계값 반영 유무 <span className="pf-req">*</span></span>
                <div className="pf-radio-row">
                  <label className="pf-radio">
                    <input type="radio" name="includeInStats" checked={includeInStats} onChange={() => setIncludeInStats(true)} /> 포함
                  </label>
                  <label className="pf-radio">
                    <input type="radio" name="includeInStats" checked={!includeInStats} onChange={() => setIncludeInStats(false)} /> 미포함
                  </label>
                </div>
                <span className="pf-help">
                  미포함을 선택하면 이 프로그램은 통계 요청의 참가/수료 인원에 포함되지 않습니다.
                </span>
              </div>

              {/* 썸네일 이미지 — 고르면 800px 로 줄여 담고, 학생 공고 배너에 쓰인다. */}
              <div className="pf-field">
                <span className="pf-label">썸네일 이미지</span>
                <div className="pf-attach-row">
                  <label className="pf-dropzone">
                    <span className="pf-dropzone-title"><LuUpload /> 파일 선택 또는 드래그하여 업로드</span>
                    <span className="pf-dropzone-hint">JPG, PNG 파일 지원 (권장 사이즈 800x450px, 최대 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="pf-dropzone-input"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        try {
                          setThumb(await toThumbDataUrl(file))
                          setThumbError('')
                        } catch (err) {
                          setThumbError(err instanceof Error ? err.message : '이미지를 등록하지 못했습니다.')
                        }
                      }}
                    />
                  </label>
                  <div className={`pf-thumb-preview${thumb ? ' has-img' : ''}`}>
                    {thumb ? <img src={thumb} alt="썸네일 미리보기" /> : <><LuImage /> 미리보기</>}
                  </div>
                </div>
                {thumb && (
                  <button type="button" className="pf-thumb-clear" onClick={() => setThumb('')}>
                    썸네일 제거
                  </button>
                )}
                {thumbError && <p className="pf-thumb-error">{thumbError}</p>}
              </div>

              {/* 상세 내용 */}
              <div className="pf-field">
                <span className="pf-label">상세 내용 <span className="pf-req">*</span></span>
                <RichEditor value={detail} onChange={setDetail} height={320} placeholder="프로그램의 상세 내용을 입력해주세요." />
              </div>
            </div>

            <div className="pf-form-actions">
              <button type="button" className="pf-btn pf-btn-ghost" onClick={() => navigate(editing ? '/programs/manage' : '/programs')}>취소</button>
              <button type="button" className="pf-btn pf-btn-primary" disabled={!canSave} onClick={handleSave}>{saved ? '저장됨' : '저장'}</button>
            </div>
          </section>

          {/* ── 썸네일 미리보기 ── */}
          <aside className="pf-aside">
            <section className="pf-card">
              <div className="pf-card-head" style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 16 }}>썸네일 미리보기 <LuCircleHelp style={{ width: 15, height: 15, color: 'var(--pf-muted)' }} /></h2>
              </div>
              <div className="pf-preview-img"><LuImage /></div>
              <div className="pf-preview-title">{title.trim() || '프로그램명이 표시됩니다'}</div>
              <div className="pf-badges">
                <span className="pf-badge">{majorCat}</span>
                <span className="pf-badge is-alt">{minorCat}</span>
              </div>
              <div className="pf-preview-meta">
                <div className="pf-meta-row"><LuCalendar /><span className="pf-meta-label">공고일시</span><span className="pf-meta-value">{fmtDate(noticeDate, noticeTime) || '—'}</span></div>
                <div className="pf-meta-row"><LuCalendarClock /><span className="pf-meta-label">접수기간</span><span className="pf-meta-value">{fmtDate(applyStartDate, applyStartTime)} ~ {fmtDate(applyEndDate, applyEndTime)}</span></div>
                <div className="pf-meta-row"><LuCalendarRange /><span className="pf-meta-label">운영기간</span><span className="pf-meta-value">{fmtDate(runStartDate, runStartTime)} ~ {fmtDate(runEndDate, runEndTime)}</span></div>
                <div className="pf-meta-row"><LuMapPin /><span className="pf-meta-label">장소</span><span className={`pf-meta-value${place.trim() ? '' : ' is-empty'}`}>{place.trim() || '장소가 표시됩니다'}</span></div>
                <div className="pf-meta-row"><LuUsers /><span className="pf-meta-label">대상</span><span className={`pf-meta-value${targetSummary ? '' : ' is-empty'}`}>{targetSummary || '대상 미선택'}</span></div>
                <div className="pf-meta-row"><LuSmile /><span className="pf-meta-label">인원</span><span className="pf-meta-value">{capacityLabel}</span></div>
                <div className="pf-meta-row"><LuClock /><span className="pf-meta-label">수료시간</span><span className="pf-meta-value">{completeHours || 0}시간</span></div>
                <div className="pf-meta-row"><LuUserRound /><span className="pf-meta-label">담당자</span><span className={`pf-meta-value${manager ? '' : ' is-empty'}`}>{manager ? `${manager.name} (${manager.role})` : '미지정'}</span></div>
              </div>
            </section>
            <p className="pf-preview-foot">* 미리보기는 실제 화면과 다를 수 있습니다.</p>
          </aside>
        </div>
      </div>

      {/* ── 신청 시 추가 정보 설정 modal ── */}
      {extraOpen && (
        <AdminModal title="신청 시 추가 정보 설정" size="lg" onClose={() => setExtraOpen(false)}>
          <div className="pf-modal">
            <p className="pf-modal-desc">신청서 작성 시 추가로 수집할 정보를 설정합니다.</p>
            <div className="pf-modal-add">
              <button type="button" className="pf-btn pf-btn-primary pf-btn-sm" onClick={addExtra}><LuPlus /> 항목 추가</button>
            </div>
            <div className="pf-extra-list">
              {extras.map(item => (
                <div key={item.id} className="pf-extra-row">
                  <span className="pf-extra-handle" aria-hidden="true"><LuGripVertical /></span>
                  <div className="pf-extra-col">
                    <span>유형 선택</span>
                    <select className="pf-select" value={item.type} onChange={e => patchExtra(item.id, { type: e.target.value })}>
                      {EXTRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {EXTRA_SUBLINK[item.type] && <span className="pf-extra-sublink">{EXTRA_SUBLINK[item.type]}</span>}
                  </div>
                  <div className="pf-extra-col">
                    <span>질문 내용</span>
                    <input className="pf-input" value={item.question} onChange={e => patchExtra(item.id, { question: e.target.value })} placeholder="질문 내용을 입력해주세요." />
                  </div>
                  <button type="button" className="pf-btn-danger-soft pf-extra-del" onClick={() => removeExtra(item.id)}><LuTrash2 style={{ width: 14, height: 14 }} /> 삭제</button>
                </div>
              ))}
            </div>
            <div className="pf-modal-foot">
              <button type="button" className="pf-btn pf-btn-ghost" onClick={() => setExtraOpen(false)}>취소</button>
              <button type="button" className="pf-btn pf-btn-primary" onClick={() => setExtraOpen(false)}>저장</button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
