import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  getProgramById, isProgramClosed, noticeStatusLabel, programDdayLabel,
} from '../../../src_admin/data/programs'
import type { Program } from '../../../src_admin/data/schema/program'
import { ROADMAP_ENTRY_LABEL } from '../../data/schema/roadmap'
import { categoryLabel, programStatusLabel } from '../../../src_admin/data/schema/program'
import { typeLabel } from '../../data/careerProcess'
import { isWished as isWishedStore, toggleWish as toggleWishStore } from '../../data/wishlist'
import { useStore } from '../../../shared/useRoadmapStore'
import { GROWTH_EVENT } from '../../../shared/growthStore'
// 채용공고 상세와 같은 껍데기를 쓴다 — 학생이 보는 두 공고가 서로 다른 화면일 이유가 없다.
// 클래스 접두사가 jd- 인 것은 그 파일이 먼저 생겼기 때문이고, 스타일은 공용이다.
import '../../components/JobDetailView.css'
import './ProgramDetail.css'

// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 공고 (공용) — 학생 /v2/growth/program/:id 와
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
}

interface Row { label: string; value: string; chip?: boolean }

/** 값이 있는 줄만 남긴다. */
function rows(list: (Row | false | null | undefined)[]): Row[] {
  return list.filter((r): r is Row => !!r && r.value.trim().length > 0)
}

function periodOf(start?: string, end?: string): string {
  if (!start && !end) return ''
  if (start && end) return `${start} ~ ${end}`
  return start || end || ''
}

export default function ProgramNotice({ programId, backTo, action, showWish = false }: Props) {
  const program = getProgramById(programId)
  // 찜은 서버가 정본이다 — 로컬 상태로 낙관적 표시를 하지 않는다.
  const wishRevision = useStore(GROWTH_EVENT)
  const wished = useMemo(() => isWishedStore(programId), [programId, wishRevision])

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

  // 마감 판정은 데이터층 한 곳에서 — 목록 카드와 같은 답을 낸다.
  const closed = isProgramClosed(program)
  const dday = programDdayLabel(program)
  // 상단 태그·상태 줄은 저장값이 아니라 보정된 상태를 쓴다 — 한 화면이 두 말을 하면 안 된다.
  const statusLabel = programStatusLabel(noticeStatusLabel(program))
  const categoryText = categoryLabel(program.category)
  const applied = program.applicants.length

  const chips = [
    categoryText,
    ...(program.careTypes ?? []).map(typeLabel),
  ]

  // 프로그램 정보
  const infoRows = rows([
    { label: '분류', value: categoryText, chip: true },
    { label: '상태', value: statusLabel },
    { label: '담당자', value: program.manager },
    { label: '장소', value: program.location },
    { label: '총 회차', value: program.sessions ? `${program.sessions}회` : '' },
    { label: '회계연도', value: program.fiscalYear ? `${program.fiscalYear}년` : '' },
  ])

  // 신청 안내
  const applyRows = rows([
    { label: '신청기간', value: periodOf(program.startDate, program.endDate) },
    { label: '운영기간', value: periodOf(program.runStartDate, program.runEndDate) },
    { label: '정원', value: `${program.capacity}명` },
    { label: '신청현황', value: `${applied}명 / ${program.capacity}명` },
    // 로드맵에 칸이 생기는 프로그램만 알린다 — 학생이 이행률에 잡히는지가 달라진다.
    program.roadmapEntry && program.roadmapEntry !== 'NONE'
      ? { label: '로드맵 편입', value: ROADMAP_ENTRY_LABEL[program.roadmapEntry], chip: true }
      : null,
  ])

  // 우측 요약 — 신청 판단에 필요한 것만 추린다(본문 표의 축약본).
  const summaryRows = rows([
    { label: '프로그램', value: program.title },
    { label: '분류', value: categoryText },
    { label: '신청마감', value: program.endDate },
    { label: '운영기간', value: periodOf(program.runStartDate, program.runEndDate) },
    { label: '장소', value: program.location },
    { label: '정원', value: `${applied} / ${program.capacity}명` },
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
                <dd>{program.endDate || '상시'}<em>{closed ? '마감' : dday}</em></dd>
              </div>
              <div>
                <dt><Icon name="users" />정원</dt>
                <dd>{program.capacity}명<em>신청 {applied}</em></dd>
              </div>
              <div>
                <dt><Icon name="pin" />장소</dt>
                <dd>{program.location || '미정'}</dd>
              </div>
            </dl>
          </header>

          <Section title="프로그램 정보"><KvTable rows={infoRows} /></Section>
          <Section title="신청 안내"><KvTable rows={applyRows} /></Section>

          <Section title="프로그램 내용" accent>
            {paragraphs.length === 0
              ? <p className="jd-empty">등록된 프로그램 내용이 없습니다.</p>
              : descIsHtml
                ? <div className="jd-content" dangerouslySetInnerHTML={{ __html: program.desc }} />
                : <div className="jd-content">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>}
          </Section>

          {/* 상세 내용 — 등록 화면 리치에디터의 HTML. 붙여넣은 이미지도 이 안에 들어 있다.
              썸네일(program.image)은 히어로 배너가 이미 쓰므로 여기서 또 그리지 않는다. */}
          {detail && (
            <Section title="상세 내용">
              <div className="jd-content" dangerouslySetInnerHTML={{ __html: detail }} />
            </Section>
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
