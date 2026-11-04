import { useState } from 'react'
import { formatProgramDate, noticeParts } from '../../../shared/programContent'
import { codeLabel } from '../../../shared/metadataStore'
import { downloadApiFile } from '../../../shared/api'
import { safeHtml } from '../../../shared/safeHtml'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  activeRound, getProgramById, isProgramClosed, noticeStatusLabel, programApplyStatus, programCapacity, programDdayLabel, programRounds,
} from '../../../src_admin/data/programs'
import type { Program, ProgramRound } from '../../../src_admin/data/schema/program'
import { ROADMAP_ENTRY_LABEL } from '../../data/schema/roadmap'
import { categoryLabel, programStatusLabel } from '../../../src_admin/data/schema/program'
import { typeLabel } from '../../data/careerProcess'
import { isWished as isWishedStore, toggleWish as toggleWishStore } from '../../data/wishlist'
import { useStore } from '../../../shared/useRoadmapStore'
import { GROWTH_EVENT } from '../../../shared/growthStore'
import { PROGRAM_EVENT } from '../../../shared/programStore'
// 채용공고 상세와 같은 껍데기를 쓴다 — 학생이 보는 두 공고가 서로 다른 화면일 이유가 없다.
// 클래스 접두사가 jd- 인 것은 그 파일이 먼저 생겼기 때문이고, 스타일은 공용이다.
import '../../components/JobDetailView.css'
import './ProgramDetail.css'

// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 공고 (공용) — 학생 /v2/program/:id 와
// 교직원 /admin/programs/:id/notice 가 같은 화면을 쓴다.
//
// 레이아웃·색은 채용공고 상세(JobDetailView)와 같은 것이다:
//   짙은 히어로 배너 → 섹션(키-값 표) → 우측 요약 카드 + CTA → 하단 안내바.
// 보라 강조는 쓰지 않는다 — 신청 버튼은 채용공고와 같은 --apply-cta 다.
//
// 값이 없는 항목은 줄을 만들지 않는다 — 빈 칸을 남기면 성겨 보이고 '-' 는 잡음이다.
// 포털마다 다른 것만 슬롯으로 받는다: action(학생=신청하기) / showWish
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  programId: string
  /** 목록으로 돌아갈 경로 — 포털마다 다르다. */
  backTo: string
  /** 우측 카드 하단 버튼 — 학생은 「신청하기」. 없으면 CTA 를 그리지 않는다. */
  action?: ReactNode
  /** 「관심 프로그램 담기」 노출 — 학생 전용. */
  showWish?: boolean
  /** 회차별 프로그램 표의 「진행」 칸 — 학생은 차수마다 신청하기. 없으면 칸을 그리지 않는다. */
  roundAction?: (round: ProgramRound) => ReactNode
}

interface Row { label: string; value: string; chip?: boolean }

/** 값이 있는 줄만 남긴다. */
function rows(list: (Row | false | null | undefined)[]): Row[] {
  return list.filter((r): r is Row => !!r && r.value.trim().length > 0)
}

function periodOf(start?: string, end?: string, startTime?: string | null, endTime?: string | null): string {
  if (!start && !end) return ''
  if (start && end) return `${formatProgramDate(start, startTime)} ~ ${formatProgramDate(end, endTime)}`
  return formatProgramDate(start || end, start ? startTime : endTime)
}

export default function ProgramNotice({ programId, backTo, action, showWish = false, roundAction }: Props) {
  useStore(PROGRAM_EVENT)
  const program = getProgramById(programId)
  const [fileError, setFileError] = useState('')
  // 찜은 서버가 정본이다 — 로컬 상태로 낙관적 표시를 하지 않는다.
  useStore(GROWTH_EVENT)
  const wished = isWishedStore(programId)

  if (!program) {
    return (
      <div className="jd-page">
        <div className="jd-topbar">
          <Link to={backTo} className="jd-back"><Icon name="back" /> 목록으로</Link>
        </div>
        <section className="jd-sec"><p className="jd-empty">공고를 찾을 수 없습니다.</p></section>
      </div>
    )
  }

  // 다회차 공고 — 위쪽 요약은 회차 전체를 말하고, 회차별 값은 맨 아래 표가 보여 준다.
  // 1회차뿐이면 전부 공고 칸(=1차) 그대로다.
  const rounds = programRounds(program)
  const multi = rounds.length > 1
  const current = activeRound(program)
  const sameOr = (values: string[], fallback: string) => (new Set(values).size === 1 ? values[0] : fallback)
  const byMoment = (date?: string | null, time?: string | null) => `${date ?? ''}T${time ?? ''}`
  const first = [...rounds].sort((a, b) => byMoment(a.startDate, a.startTime).localeCompare(byMoment(b.startDate, b.startTime)))[0]
  const last = [...rounds].sort((a, b) => byMoment(b.endDate, b.endTime).localeCompare(byMoment(a.endDate, a.endTime)))[0]
  const runs = rounds.filter(r => r.runStartDate || r.runEndDate)
  const runFirst = [...runs].sort((a, b) => byMoment(a.runStartDate, a.runStartTime).localeCompare(byMoment(b.runStartDate, b.runStartTime)))[0]
  const runLast = [...runs].sort((a, b) => byMoment(b.runEndDate, b.runEndTime).localeCompare(byMoment(a.runEndDate, a.runEndTime)))[0]
  const applyPeriod = periodOf(first.startDate, last.endDate, first.startTime, last.endTime)
  const runPeriod = runFirst ? periodOf(runFirst.runStartDate ?? undefined, runLast.runEndDate ?? undefined, runFirst.runStartTime, runLast.runEndTime) : ''
  const capacity = programCapacity(program)
  const selection = rounds.reduce((sum, r) => sum + (r.selectionCapacity ?? r.capacity), 0)
  const location = sameOr(rounds.map(r => r.location), '회차별 상이')
  const method = sameOr(rounds.map(r => (r.selectionMethod === 'FIRST_COME' ? '선착순 선발' : '심사 후 선발')), '회차별 상이')

  // 마감 판정은 데이터층 한 곳에서 — 목록 카드와 같은 답을 낸다. 마감일은 지금 열린(또는 다음) 회차의 것이다.
  const closed = isProgramClosed(program)
  const dday = programDdayLabel({ status: program.status, endDate: current.endDate, endTime: current.endTime })
  // 상단 태그·상태 줄은 저장값이 아니라 보정된 상태를 쓴다 — 한 화면이 두 말을 하면 안 된다.
  const statusLabel = programStatusLabel(noticeStatusLabel(program))
  const categoryText = categoryLabel(program.category)
  const applied = program.applyCount

  const chips = [
    categoryText,
    ...(program.careTypes ?? []).map(typeLabel),
  ]

  // 참가대상 — 등록 화면 요약과 같은 꼴: 「재학생, 휴학생 (1학년, 2학년)」
  const grades = (program.targetGrades ?? []).map(code => codeLabel('PROGRAM_TARGET_GRADE', code))
  const target = (program.targetStatuses ?? []).map(code => codeLabel('PROGRAM_TARGET_STATUS', code)).join(', ')
    + (grades.length ? ` (${grades.join(', ')})` : '')
  // 담당자명·연락처 — 지정된 담당자가 없는 옛 공고는 저장된 이름 문자열로 대신한다.
  const managers = program.managers ?? []
  const phones = managers.filter(m => m.phone)
    .map(m => (managers.length > 1 ? `${m.name} ${m.phone}` : m.phone ?? '')).join(', ')

  // 프로그램 정보
  const infoRows = rows([
    { label: '분류', value: categoryText, chip: true },
    { label: '상태', value: statusLabel },
    { label: '참가대상', value: target },
    { label: '신청인원 / 선발인원', value: `${applied}명 / ${selection}명` },
    { label: '담당자', value: managers.length ? managers.map(m => m.name).join(', ') : program.manager },
    { label: '담당자 연락처', value: phones },
    { label: '장소', value: location },
    { label: '총 회차', value: program.sessions ? `${program.sessions}회` : '' },
    { label: '회계연도', value: program.fiscalYear ? `${program.fiscalYear}년` : '' },
  ])

  // 신청 안내
  const applyRows = rows([
    { label: '공고일시', value: formatProgramDate(noticeParts(program.noticeAt).date, noticeParts(program.noticeAt).time) },
    { label: '접수기간', value: applyPeriod },
    { label: '운영기간', value: runPeriod },
    { label: '선발 방식', value: method },
    { label: '신청현황', value: programApplyStatus(program) },
    // 로드맵에 칸이 생기는 프로그램만 알린다 — 학생이 이행률에 잡히는지가 달라진다.
    program.roadmapEntry && program.roadmapEntry !== 'NONE'
      ? { label: '로드맵 편입', value: ROADMAP_ENTRY_LABEL[program.roadmapEntry], chip: true }
      : null,
  ])

  // 우측 요약 — 신청 판단에 필요한 것만 추린다(본문 표의 축약본).
  const summaryRows = rows([
    { label: '프로그램', value: program.title },
    { label: '분류', value: categoryText },
    { label: multi ? `신청마감(${current.round}회차)` : '신청마감', value: formatProgramDate(current.endDate, current.endTime) },
    { label: '운영기간', value: runPeriod },
    { label: '장소', value: location },
    { label: '정원', value: `${applied} / ${capacity}명` },
  ])

  // 프로그램 내용 = 평문 입력칸(desc). 상세 내용 = 리치에디터 HTML(detail).
  //
  // desc 에도 HTML 판정을 두는 이유는 옛 데이터 때문이다 — 두 칸이 분리되기 전에는
  // 등록 화면이 `desc: (detail || purpose)` 로 저장해서, 그때 등록된 프로그램의
  // desc 안에 에디터 HTML 이 들어 있다. 그걸 텍스트로 그리면 <img src="data:...">
  // 원문이 그대로 나오고, 줄바꿈 없는 base64 가 한 단어로 취급돼 페이지 폭이 터진다.
  const descIsHtml = /<[a-z][\s\S]*>/i.test(program.desc)
  const paragraphs = program.desc.split('\n').map(p => p.trim()).filter(Boolean)
  const detail = program.detail?.trim() ?? ''

  return (
    <div className="jd-page pn-page">
      <div className="jd-topbar">
        <Link to={backTo} className="jd-back"><Icon name="back" /> 비교과 프로그램</Link>
        <span className="jd-recruit-tag">{statusLabel}</span>
      </div>

      <div className="jd-body">
        <main className="jd-main">
          {/* ── 히어로 배너 ── */}
          <header className="jd-hero">
            {/* 썸네일이 있으면 로고 자리에 담는다 — 없으면 분류 두 글자로 자리를 만든다. */}
            <span className={`jd-logo${program.image ? ' has-img' : ''}`} aria-hidden="true">
              {program.image ? <img src={program.image} alt="" /> : categoryText.slice(0, 2)}
            </span>

            <div className="jd-hero-main">
              <p className="jd-hero-company">비교과 프로그램</p>
              <h1 className="jd-hero-title">{program.title}</h1>
              <p className="jd-hero-desc">
                {closed ? '신청이 마감된 프로그램입니다. 내용은 열람할 수 있습니다.' : '내용과 일정을 확인하고 신청하세요.'}
              </p>
              <ul className="jd-hero-chips">
                {chips.map(c => <li key={c} className="jd-hero-chip">{c}</li>)}
                {program.roadmapEntry === 'REQUIRED' && <li className="jd-hero-chip is-rec">로드맵 필수</li>}
                {!closed && dday === 'D-day' && <li className="jd-hero-chip is-urgent">오늘마감</li>}
              </ul>
            </div>

            <dl className="jd-hero-stats">
              <div>
                <dt><Icon name="calendar" />신청마감일</dt>
                <dd>{formatProgramDate(current.endDate, current.endTime) || '상시'}<em>{closed ? '마감' : dday}</em></dd>
              </div>
              <div>
                <dt><Icon name="users" />정원</dt>
                <dd>{capacity}명<em>신청 {applied}</em></dd>
              </div>
              <div>
                <dt><Icon name="pin" />장소</dt>
                <dd>{location || '미정'}</dd>
              </div>
            </dl>
          </header>

          <Section title="프로그램 정보"><KvTable rows={infoRows} /></Section>
          <Section title="신청 안내"><KvTable rows={applyRows} /></Section>
          {!!program.attachments?.length && <Section title="첨부파일">
            {program.attachments.map(file => <p key={file.id}><button type="button" className="pn-file-download" onClick={() => {
              setFileError(''); void downloadApiFile(`/program-files/${encodeURIComponent(file.id)}`, file.name).catch((error: unknown) => setFileError(error instanceof Error ? error.message : '파일을 내려받지 못했습니다.'))
            }}>{file.name} · {Math.ceil(file.size / 1024)}KB</button></p>)}
            {fileError && <p role="alert">{fileError}</p>}
          </Section>}

          <Section title="프로그램 내용" accent>
            {paragraphs.length === 0
              ? <p className="jd-empty">등록된 프로그램 내용이 없습니다.</p>
              : descIsHtml
                ? <div className="jd-content" dangerouslySetInnerHTML={{ __html: safeHtml(program.desc) }} />
                : <div className="jd-content">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>}
          </Section>

          {/* 상세 내용 — 등록 화면 리치에디터의 HTML. 붙여넣은 이미지도 이 안에 들어 있다.
              썸네일(program.image)은 히어로 배너가 이미 쓰므로 여기서 또 그리지 않는다. */}
          {detail && (
            <Section title="상세 내용">
              <div className="jd-content" dangerouslySetInnerHTML={{ __html: safeHtml(detail) }} />
            </Section>
          )}

          {multi && (
            <section className="jd-sec pn-rounds" id="program-rounds">
              <h2 className="jd-sec-head"><span>회차별 프로그램</span></h2>
              <div className="pn-rounds-scroll">
                <table className="pn-rounds-table">
                  <thead><tr>
                    <th scope="col">회차</th><th scope="col">모집인원<br />/정원</th><th scope="col">모집기간</th>
                    <th scope="col">진행기간</th><th scope="col">운영장소</th>
                    {roundAction && <th scope="col">진행</th>}
                  </tr></thead>
                  <tbody>
                    {rounds.map(r => (
                      <tr key={r.round}>
                        <td>{r.round}</td>
                        <td>{r.applyCount ?? 0}/{r.capacity}명</td>
                        <td>{periodOf(r.startDate, r.endDate, r.startTime, r.endTime) || '—'}</td>
                        <td>{periodOf(r.runStartDate ?? undefined, r.runEndDate ?? undefined, r.runStartTime, r.runEndTime) || '—'}</td>
                        <td>{r.location || '—'}</td>
                        {roundAction && <td>{roundAction(r)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        <aside className="jd-side">
          <section className="jd-sec jd-summary">
            <h2 className="jd-sec-head"><span>신청 정보 요약</span></h2>
            <dl className="jd-kv is-stack">
              {summaryRows.map(r => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>

            {(showWish || action) && (
              <div className="jd-cta">
                {showWish && (
                  <button
                    type="button"
                    className={`jd-wish${wished ? ' is-on' : ''}`}
                    aria-pressed={wished}
                    onClick={() => { void toggleWishStore(programId) }}
                  >
                    <Icon name={wished ? 'heart-fill' : 'heart'} />
                    {wished ? '관심 프로그램 담김' : '관심 프로그램 담기'}
                  </button>
                )}
                {action}
              </div>
            )}
          </section>
        </aside>
      </div>

      <p className="jd-note">
        <Icon name="info" />
        신청 후 선발 결과는 마이페이지 「비교과 프로그램 현황」에서 확인할 수 있습니다.
      </p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

/** accent — 「프로그램 내용」처럼 먼저 읽혀야 하는 칸에 테두리를 준다. */
function Section({ title, children, accent = false }: { title: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className={`jd-sec${accent ? ' is-accent' : ''}`}>
      <h2 className="jd-sec-head"><span>{title}</span></h2>
      {children}
    </section>
  )
}

/** 채용공고 상세와 같은 라벨/값 표 — 두 공고가 같은 표를 쓴다. */
function KvTable({ rows: list }: { rows: Row[] }) {
  return (
    <dl className="jd-kv">
      {list.map(r => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.chip ? <span className="jd-kv-chip">{r.value}</span> : r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// 아이콘은 인라인 SVG — 두 SPA 의 아이콘 스택이 달라(FA vs react-icons) 어느 쪽에도 기대지 않는다.
const ICONS: Record<string, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 2.5V6M16 2.5V6M3.5 10h17" /></>,
  users: <><path d="M16 20v-1.8a3.7 3.7 0 00-3.7-3.7H6.7A3.7 3.7 0 003 18.2V20" /><circle cx="9.5" cy="7.5" r="3.6" /><path d="M21 20v-1.8a3.7 3.7 0 00-2.8-3.6M17 4.2a3.7 3.7 0 010 6.7" /></>,
  pin: <><path d="M19 10.5c0 5.2-7 10.5-7 10.5s-7-5.3-7-10.5a7 7 0 1114 0z" /><circle cx="12" cy="10.3" r="2.6" /></>,
  heart: <path d="M12 20.3l-1.4-1.3C5.9 14.8 3 12.2 3 8.9 3 6.4 5 4.5 7.5 4.5c1.5 0 2.9.7 3.7 1.8l.8 1 .8-1c.8-1.1 2.2-1.8 3.7-1.8C19 4.5 21 6.4 21 8.9c0 3.3-2.9 5.9-7.6 10.1z" />,
  'heart-fill': <path d="M12 20.3l-1.4-1.3C5.9 14.8 3 12.2 3 8.9 3 6.4 5 4.5 7.5 4.5c1.5 0 2.9.7 3.7 1.8l.8 1 .8-1c.8-1.1 2.2-1.8 3.7-1.8C19 4.5 21 6.4 21 8.9c0 3.3-2.9 5.9-7.6 10.1z" fill="currentColor" stroke="none" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16.5v-5M12 8h.01" /></>,
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg className="jd-icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>
}

export type { Program }
