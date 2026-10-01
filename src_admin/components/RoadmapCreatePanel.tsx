import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { LuTarget } from 'react-icons/lu'
import { typeLabel } from '../../src_v2/data/careerProcess'
import { getHeadlineCompetency, getStudentCounselRequests } from '../../src_v2/data/students'
import type { StudentData } from '../../src_v2/data/students'
import { fetchAcademic, type AcademicSnapshot } from '../../src_v2/data/academic/repository'
import { deriveSkillTree } from '../../src_v2/data/academic'
import type { CourseRow } from '../../src_v2/data/academic'
import { getActiveCounselorId } from '../data/counselors'
import { getRecordsByStudent } from '../data/counselRecords'
import { generateRoadmap } from '../data/roadmap'
import { isCare7 } from '../../src_v2/data/counselTrack'
import { roadmapEnvelope } from '../../shared/roadmapStore'
import { useStore } from '../../shared/useRoadmapStore'
import './RoadmapCreatePanel.css'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 생성 패널 (상담사 전용) — /v2/roadmap/skill-tree 「01 AI 현재역량현황」 이식.
//
// ⚠ 공용 컴포넌트가 아니다. 학생 화면(AiRoadmap)과 코드를 공유하지 않는다(사용자 확정).
//   그쪽은 「내 로드맵을 본다」라 생성 후 잠금·변경요청 동선이 붙지만, 이쪽은
//   「상담 중에 담당 학생의 로드맵을 만든다」는 작업 화면이다. 마크업·CSS를 복사해 왔다.
//
// 데이터는 공유한다 — 재료를 뽑는 것은 UI 가 아니라 데이터층이다(academic 리포지토리).
// 학생 화면은 useSkillTree 훅(활성 학생 고정)을 쓰지만 여기는 담당 학생 id 로 직접 부른다.
//
// 흐름: 생성 재료 확인 → 목표 직무 직접 입력 → LLM 생성 → DB 초안 저장.
// ─────────────────────────────────────────────────────────────────────────

/** 교과 구분 → 태그 색. 새 색을 만들지 않고 시안이 정한 4종에 매핑한다. */
function courseTagClass(courseCls: string): string {
  if (courseCls === '전공필수') return 'is-req'
  if (courseCls === '전공선택') return 'is-sel'
  if (courseCls === '타학과') return 'is-etc'
  return 'is-lib'
}

const ICON_PATHS: Record<string, ReactNode> = {
  spark: <><path d="M11 3l1.7 4.3L17 9l-4.3 1.7L11 15l-1.7-4.3L5 9l4.3-1.7z" /><path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  users: <><path d="M15.5 20v-1.8a3.7 3.7 0 00-3.7-3.7H6.2A3.7 3.7 0 002.5 18.2V20" /><circle cx="9" cy="7.5" r="3.6" /><path d="M21.5 20v-1.8a3.7 3.7 0 00-2.8-3.6M16.5 4.2a3.7 3.7 0 010 6.7" /></>,
  book: <><path d="M4 4.5h6.2a1.8 1.8 0 011.8 1.8v13a1.8 1.8 0 00-1.8-1.8H4z" /><path d="M20 4.5h-6.2a1.8 1.8 0 00-1.8 1.8v13a1.8 1.8 0 011.8-1.8H20z" /></>,
  user: <><path d="M19.5 20.5v-2a4 4 0 00-4-4h-7a4 4 0 00-4 4v2" /><circle cx="12" cy="7.5" r="4" /></>,
  lang: <><path d="M20.5 14.5a2 2 0 01-2 2H7.5l-4 3.5v-15a2 2 0 012-2h13a2 2 0 012 2z" /><path d="M8 9.5h8M8 12.8h5" /></>,
  cert: <><path d="M12 2.8l7.5 2.8v5.6c0 4.8-3.2 7.6-7.5 8.8-4.3-1.2-7.5-4-7.5-8.8V5.6z" /><path d="M9 11.8l2.1 2.1 4.1-4.2" /></>,
  trophy: <><path d="M8 3.5h8v5.2a4 4 0 01-8 0z" /><path d="M8 4.8H5v1.9a3 3 0 003 3M16 4.8h3v1.9a3 3 0 01-3 3" /><path d="M12 12.8v4M9.5 20.5h5" /></>,
  file: <><path d="M14 3v5h5" /><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M8.5 13h7M8.5 16.5h4.5" /></>,
  brain: <><path d="M11 4.2a2.6 2.6 0 00-4.6 1.5 2.6 2.6 0 00-1.6 4.5 2.7 2.7 0 00.8 4.6 2.6 2.6 0 004.5 2.2h.9z" /><path d="M13 4.2a2.6 2.6 0 014.6 1.5 2.6 2.6 0 011.6 4.5 2.7 2.7 0 01-.8 4.6 2.6 2.6 0 01-4.5 2.2H13z" /><path d="M12 4v14.5" /></>,
  'check-circle': <><circle cx="12" cy="12" r="9.2" /><path d="M8.2 12.2l2.6 2.6 5-5.2" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  alert: <><path d="M12 5.5v8.5" /><path d="M12 18.4h.01" /></>,
  check: <path d="M20 6.5L9.4 17.2 4 11.8" />,
  chev: <path d="M9 5.5l6.5 6.5L9 18.5" />,
}

function AirIcon({ name, className = '' }: { name: keyof typeof ICON_PATHS; className?: string }) {
  return (
    <svg className={`air-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

function CourseLine({ row }: { row: CourseRow }) {
  return (
    <div className="air-course">
      <span className="air-course-code">{row.code}</span>
      <span className="air-course-name">{row.name}</span>
      <span className={`air-tag ${courseTagClass(row.courseCls)}`}>{row.courseCls}</span>
      <span className="air-course-cr">{row.credit}학점</span>
    </div>
  )
}

export interface RoadmapCreatePanelProps {
  student: StudentData
  /** 상담 진행 화면에서 선택한 신청. 생성과 완료가 같은 상담을 참조한다. */
  counselRequestId?: string
  /** 생성 상담사 이름 — 생성 이력에 남는다. */
  counselorName: string
  /** 생성이 끝났다. 부모가 로드맵을 다시 읽어 3축 보드를 그린다. */
  onGenerated: () => void
  /**
   * 이미 로드맵이 있는 학생을 다시 만드는 중인가(PROCESS.md §6-6).
   * 접힘 없이 바로 펼치고, 지금 로드맵이 어떻게 되는지 경고를 함께 띄운다.
   */
  regenerate?: boolean
  /** 재생성을 그만둘 때. regenerate 일 때만 쓴다. */
  onCancel?: () => void
}

type Phase = 'flow' | 'generating'

export default function RoadmapCreatePanel({
  student, counselorName, counselRequestId, onGenerated, regenerate = false, onCancel,
}: RoadmapCreatePanelProps) {
  const [open, setOpen] = useState(regenerate)
  const [phase, setPhase] = useState<Phase>('flow')
  const [snap, setSnap] = useState<AcademicSnapshot | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [targetRole, setTargetRole] = useState(roadmapEnvelope(student.id)?.roadmap?.targetRole ?? '')
  const generating = useRef(false)

  // 학사 스냅샷은 펼칠 때 한 번만 읽는다(리포지토리가 async 라 화면이 비동기 흐름이다).
  useEffect(() => {
    if (!open) return
    let alive = true
    fetchAcademic(student.id)
      .then(next => { if (alive) { setSnap(next); setLoaded(true) } })
      .catch(() => { if (alive) { setSnap(null); setLoaded(true) } })
    return () => { alive = false }
  }, [open, student.id])

  const data = useMemo(
    () => (snap ? deriveSkillTree(snap, student, getStudentCounselRequests(student.id)) : null),
    [snap, student])
  // 코멘트를 아직 안 쓴 회차가 섞이므로 '코멘트가 있는' 최신 1건을 고른다.
  const lastComment = useMemo(
    () => getRecordsByStudent(student.id).find(r => r.comment?.trim()),
    [student.id],
  )
  const capability = roadmapEnvelope(student.id)?.capabilities
  const canGenerate = regenerate ? capability?.canRegenerate : capability?.canGenerate
  // 로드맵은 CARE 7+ 진로·취업 상담 자리에서 난다(PROCESS.md §6-7). 서버는 그 상담을
  // 근거로 요구하므로 여기서 어느 상담인지 고른다 — 근거 없이는 생성할 수 없다.
  // 첫 로드맵은 **완료된** 상담에서만 난다(상담 완료 → 생성 → 확정). 재생성은 확정된
  // 재상담에서도 미리 만들 수 있고, 그 상담의 완료가 초안을 함께 확정한다.
  const counselRevision = useStore('dc:counsel-updated')
  const basisRequest = useMemo(
    () => getStudentCounselRequests(student.id)
      .filter(request => (counselRequestId ? request.id === counselRequestId : request.assignedCounselorId === getActiveCounselorId())
        && request.type === '진로취업' && isCare7(request.careTrack)
        && (request.status === '완료' || (regenerate && request.status === '확정')))
      .sort((a, b) => Number(b.status === '확정') - Number(a.status === '확정') || b.requestedAt.localeCompare(a.requestedAt))[0],
    // counselRevision 은 스토어 갱신 신호다 — 완료 처리 직후 같은 화면에서 근거가 생긴다.
    [student.id, counselRequestId, regenerate, counselRevision],
  )
  const [generateError, setGenerateError] = useState('')
  const temporary = roadmapEnvelope(student.id)?.capabilities.providerSource === 'development-template'

  const handleGenerate = async () => {
    if (generating.current) return
    const role = targetRole.trim()
    if (!role) { setGenerateError('목표 직무를 입력해 주세요.'); return }
    if (!basisRequest) { setGenerateError('완료된 CARE 7+ 상담을 확인해 주세요.'); return }
    generating.current = true
    setGenerateError('')
    setPhase('generating')
    try {
      await generateRoadmap(student.id, basisRequest.id, role, `상담 ${counselorName}`)
      onGenerated()
    } catch (cause) {
      setGenerateError(cause instanceof Error ? cause.message : '로드맵을 만들지 못했습니다. 다시 시도해 주세요.')
    } finally {
      generating.current = false
      setPhase('flow')
    }
  }

  // 재료 2 — 수강했거나 수강 중인 과목만 재료로 쓴다.
  const allCourses = data ? [...data.core.rows, ...data.expert.rows] : []
  const takenCourses = allCourses.filter(row => row.done || row.inProgress).slice(0, 5)
  const ownedCerts = data?.certification.rows.filter(cert => cert.owned) ?? []

  // ── 접힘 — 카드 가운데 생성 버튼 하나 ──────────────────────────────────
  if (!open) {
    return (
      <div className="rcp-empty">
        <span className="rcp-empty-ico"><LuTarget /></span>
        <strong>아직 로드맵이 없습니다</strong>
        <p>
          상담일지·수강 정보·학생 성장 데이터를 종합해 3축 15칸 로드맵 1개를 만듭니다.
          <br />{basisRequest
            ? '상담이 완료되었습니다. 이 자리에서 바로 생성하세요.'
            : '상담일지를 저장 후 완료 처리하면 여기서 생성할 수 있습니다.'}
        </p>
        {/* 잠긴 자리는 빈 화면이 아니다 — 비활성 버튼 + 위 안내(PROCESS.md §2 구현규칙 1). */}
        <button type="button" className="admin-btn admin-btn-primary" disabled={!basisRequest} onClick={() => setOpen(true)}>
          로드맵 생성
        </button>
      </div>
    )
  }

  return (
    <div className="rcp">
      {temporary && <p className="rcp-warn">현재는 <b>개발용 임시 로드맵</b>을 생성합니다. 선택한 직무의 예시이며 RAG·LLM 분석 결과가 아닙니다.</p>}
      {generateError && <p className="air-run-error" role="alert">{generateError}</p>}
      {/* 재생성은 지금 로드맵을 버리는 일이다 — 무엇이 어떻게 되는지 먼저 말한다. */}
      {regenerate && (
        <p className="rcp-warn">
          지금 로드맵은 <b>스냅샷으로 보관</b>되고 새 로드맵으로 바뀝니다.
          <b> 완료한 칸은 이월되지 않습니다</b> — 지난 이행 실적은 스냅샷에서 조회합니다.
        </p>
      )}

      <div className="air-sec-head">
        <span className="air-sec-no">01</span>
        <h2 className="air-sec-title">AI 현재역량현황</h2>
      </div>
      <p className="air-sec-desc">
        진단·상담 결과와 수강 정보, 학생 스펙을 종합하여 AI가 분석하고 목표 직무를 설정합니다.
      </p>

      <div className="air-sources">
        {/* 재료 1 — 진단유형 / 상담 */}
        <article className="air-src is-mint">
          <div className="air-src-head">
            <span className="air-src-ico"><AirIcon name="users" /></span>
            <h3 className="air-src-title">진단유형 / 상담</h3>
          </div>
          <div className="air-src-body">
            <dl className="air-kv">
              <div className="air-kv-row">
                <dt>확정 유형</dt>
                <dd>
                  <span className="air-badge is-mint">
                    {student.studentType ? `${student.studentType} ${typeLabel(student.studentType)}` : '유형 미정'}
                  </span>
                </dd>
              </div>
              <div className="air-kv-row">
                <dt>상담 코멘트</dt>
                <dd>
                  {lastComment
                    ? <p>{lastComment.comment}<em className="air-kv-by">{lastComment.counselorName} · {lastComment.date}</em></p>
                    : <p>아직 등록된 상담 코멘트가 없습니다.</p>}
                </dd>
              </div>
            </dl>
            <section className="air-analysis">
              <h4>AI 분석</h4>
              <p>{student.insight || '분석 코멘트가 아직 없습니다. 진단을 마치면 채워집니다.'}</p>
              {/* 대표 역량이 없으면(점수 0인 신입생) 줄을 긋지 않는다 — 빈 구분선만 남는다. */}
              {getHeadlineCompetency(student).length > 0 && (
              <ul className="air-checks">
                {getHeadlineCompetency(student).map(item => {
                  const strong = item.type === 'strength'
                  return (
                    <li key={item.label} className={strong ? 'is-strength' : 'is-weak'}>
                      <span className="air-check-mark">
                        <AirIcon name={strong ? 'check' : 'alert'} />
                      </span>
                      {item.label} {strong ? '강점' : '약점'} ({item.value}점)
                    </li>
                  )
                })}
              </ul>
              )}
            </section>
          </div>
        </article>

        {/* 재료 2 — 수강강의 / 학과 */}
        <article className="air-src is-blue">
          <div className="air-src-head">
            <span className="air-src-ico"><AirIcon name="book" /></span>
            <h3 className="air-src-title">수강강의 / 학과</h3>
          </div>
          <div className="air-src-body">
            <section className="air-courses">
              <h4>나의 수강 강의</h4>
              {takenCourses.map(row => <CourseLine key={row.code} row={row} />)}
              {takenCourses.length === 0 && (
                <p className="air-course-empty">
                  {loaded ? '수강 이력이 아직 연동되지 않았습니다.' : '수강 이력을 불러오는 중입니다.'}
                </p>
              )}
            </section>
          </div>
        </article>

        {/* 재료 3 — 학생 성장 */}
        <article className="air-src is-violet">
          <div className="air-src-head">
            <span className="air-src-ico"><AirIcon name="user" /></span>
            <h3 className="air-src-title">학생 성장</h3>
          </div>
          <div className="air-src-body">
            <dl className="air-specs">
              <div className="air-spec">
                <span className="air-spec-ico"><AirIcon name="lang" className="sm" /></span>
                <dt>어학 성적</dt>
                <dd><span>{student.language}</span></dd>
              </div>
              <div className="air-spec">
                <span className="air-spec-ico"><AirIcon name="cert" className="sm" /></span>
                <dt>자격증</dt>
                <dd>
                  {ownedCerts.map(cert => (
                    <span key={cert.certId}>{cert.label}{cert.acquiredDt ? ` (${cert.acquiredDt})` : ''}</span>
                  ))}
                  {ownedCerts.length === 0 && <span>보유한 자격증이 없습니다.</span>}
                </dd>
              </div>
              <div className="air-spec">
                <span className="air-spec-ico"><AirIcon name="trophy" className="sm" /></span>
                <dt>공모전</dt>
                <dd><span>{student.scoreInputs.contests}건 참여</span></dd>
              </div>
              <div className="air-spec">
                <span className="air-spec-ico"><AirIcon name="file" className="sm" /></span>
                <dt>프로젝트</dt>
                <dd><span>{student.scoreInputs.projects}건 수행</span></dd>
              </div>
            </dl>
          </div>
        </article>
      </div>

      {/* 재료 3종 → AI 오브 커넥터 */}
      <div className="air-connector" aria-hidden="true">
        <span className="air-drop" style={{ left: '16.3%' }} />
        <span className="air-drop" style={{ left: '50%' }} />
        <span className="air-drop" style={{ left: '83.7%' }} />
        <span className="air-bus" style={{ left: '16.3%', right: '16.3%' }} />
        <span className="air-tail" style={{ left: '36.8%' }} />
      </div>

      {phase === 'generating' ? (
        <div className="air-run" role="status" aria-live="polite" aria-busy="true">
          <h4>AI가 맞춤형 로드맵을 생성하고 있습니다</h4>
          <p>{targetRole.trim()} 기준으로 진단·상담·수강 정보와 내부 근거를 검토하고 있습니다.</p>
          <p>생성이 끝나면 3축 15칸 초안을 DB에 저장합니다. 잠시 기다려 주세요.</p>
        </div>
      ) : (
        <div className="air-flow-card rcp-target-input">
          <h4><AirIcon name="target" />목표 직무 직접 입력</h4>
          <label htmlFor={`rcp-target-${student.id}`}>목표 직무</label>
          <input id={`rcp-target-${student.id}`} value={targetRole} maxLength={200}
            placeholder="예: 자동차 부품 품질관리 엔지니어"
            onChange={event => { setTargetRole(event.target.value); setGenerateError('') }} />
          <p>직무명과 희망 업무를 자유롭게 입력하세요. 입력한 내용은 AI 로드맵 생성의 기준으로 사용됩니다.</p>
          <button type="button" className="admin-btn admin-btn-primary"
            disabled={!targetRole.trim() || !canGenerate || !basisRequest}
            onClick={() => { void handleGenerate() }}>AI 분석 · 로드맵 생성 및 저장</button>
          {!canGenerate && <p>로드맵 생성 서비스 설정을 확인해 주세요.</p>}
          {!basisRequest && <p>완료된 CARE 7+ 상담이 필요합니다.</p>}
        </div>
      )}

      {phase === 'flow' && (
        <div className="rcp-actions">
          <button
            type="button"
            className="admin-btn sm"
            onClick={() => (regenerate ? onCancel?.() : setOpen(false))}
          >
            {regenerate ? '재생성 취소' : '접기'}
          </button>
        </div>
      )}
    </div>
  )
}
