import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePageHead } from '../../components/PageCrumb'
import { getActiveStudent } from '../../data/students'
import { ROADMAP_AXIS_MAP } from '../../data/schema/roadmap'
import type { RoadmapAxis } from '../../data/schema/roadmap'
// 3축 렌더는 로드맵을 그리는 다른 화면과 같은 공용 컴포넌트다 — 여기서 다시 그리지 않는다.
import RoadmapAxisBoard from '../../components/RoadmapAxisBoard'
// 로드맵 정본은 교직원 포털의 읽기 모델이다(base ⊕ 상담사 override ⊕ 프로그램 편입분).
import { getStudentRoadmap } from '../../../src_admin/data/roadmap'
// 요청은 상담사 「변경 요청함」이 읽는 그 스토어에 그대로 쌓는다 — 새 저장소를 만들지 않는다.
import { addRoadmapRequest } from '../../../src_admin/data/roadmapRequests'
import './RoadmapRequest.css'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 수정요청 — 학생이 고친 안을 상담사에게 보내는 화면.
//
// ★ 여기서 고친다고 로드맵이 바뀌지 않는다. 로드맵의 정본은 상담사가 쥔다
//   (PROCESS.md — 로드맵은 상담 자리에서 만들어지고 상담사가 수정한다).
//   이 화면이 하는 일은 "무엇을 어떻게 바꾸고 싶은지"를 요청으로 남기는 것뿐이고,
//   상담사가 승인해 편집기에 반영해야 실제 로드맵이 바뀐다.
//   그래서 칸 체크는 화면 안에서만 살고 로드맵 스토어를 건드리지 않는다.
//
// 제출하면 dc_roadmap_requests 에 '대기'로 쌓인다 → 상담사 /admin/roadmap/requests.
// ─────────────────────────────────────────────────────────────────────────

const ALL_AXIS = '전체'

export default function RoadmapRequest() {
  usePageHead('로드맵 수정요청', '생성된 로드맵에서 바꾸고 싶은 부분을 상담사에게 요청합니다.')
  const navigate = useNavigate()
  const student = getActiveStudent()
  const roadmap = useMemo(() => getStudentRoadmap(student.id), [student.id])

  const [axis, setAxis] = useState<RoadmapAxis | typeof ALL_AXIS>(ALL_AXIS)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)

  const togglePick = (cellId: string) =>
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(cellId)) next.delete(cellId)
      else next.add(cellId)
      return next
    })

  // 로드맵이 없으면 요청할 대상도 없다 — 빈 화면 대신 다음 단계를 준다(CLAUDE.md 13조).
  if (!roadmap) {
    return (
      <div className="rr-page">
        <div className="rr-locked">
          <i className="fa-solid fa-circle-info" />
          <h3>아직 로드맵이 생성되지 않았습니다</h3>
          <p>
            로드맵은 진단과 상담을 마친 뒤 상담 자리에서 함께 만들어집니다.<br />
            로드맵이 있어야 바꿀 부분을 고를 수 있습니다.
          </p>
          <Link to="/counsel/career">상담 신청하러 가기</Link>
        </div>
      </div>
    )
  }

  const axes = roadmap.axes
  const shown = axis === ALL_AXIS ? axes : axes.filter(a => a.axis === axis)
  const pickedCells = axes.flatMap(a => a.cells).filter(c => picked.has(c.id))
  const canSubmit = title.trim().length > 0 && reason.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    addRoadmapRequest({
      studentId: student.id,
      studentNo: student.studentNo,
      studentName: student.name,
      studentMajor: student.major,
      axis: axis === ALL_AXIS ? undefined : axis,
      title: title.trim(),
      // 고른 칸을 사유에 함께 남긴다 — 상담사가 어느 칸 얘기인지 알아야 편집기에서 찾는다.
      reason: pickedCells.length > 0
        ? `${reason.trim()}\n\n[대상 칸] ${pickedCells.map(c => c.title).join(' / ')}`
        : reason.trim(),
    })
    setDone(true)
  }

  if (done) {
    return (
      <div className="rr-page">
        <div className="rr-done" role="status">
          <span className="rr-done-mark"><i className="fa-solid fa-check" /></span>
          <h3>수정 요청을 보냈습니다</h3>
          <p>
            상담사가 요청을 확인하고 승인하면 로드맵에 반영됩니다.<br />
            진행 상태는 상담 현황에서 확인할 수 있습니다.
          </p>
          <div className="rr-done-actions">
            <button type="button" className="rr-btn-ghost" onClick={() => { setDone(false); setTitle(''); setReason(''); setPicked(new Set()) }}>
              다른 요청 작성
            </button>
            <button type="button" className="rr-btn-primary" onClick={() => navigate('/roadmap/skill-tree')}>
              로드맵으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rr-page">
      <div className="rr-note">
        <i className="fa-solid fa-circle-info" />
        <span>
          여기서 고른 내용은 <strong>요청</strong>으로만 전달됩니다. 상담사가 승인해야 로드맵이 실제로 바뀝니다.
        </span>
      </div>

      <div className="rr-body">
        <main className="rr-main">
          <section className="rr-sec">
            <div className="rr-sec-head">
              <h2>바꾸고 싶은 칸 고르기</h2>
              <p>선택은 선택사항입니다 — 특정 칸이 아니라 전반적인 방향이면 건너뛰어도 됩니다.</p>
            </div>

            <div className="rr-axis-tabs" role="tablist" aria-label="로드맵 축">
              {[ALL_AXIS, ...axes.map(a => a.axis)].map(key => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={axis === key}
                  className={`rr-axis-tab${axis === key ? ' is-on' : ''}`}
                  onClick={() => setAxis(key as RoadmapAxis | typeof ALL_AXIS)}
                >
                  {key === ALL_AXIS ? ALL_AXIS : ROADMAP_AXIS_MAP[key as RoadmapAxis].label}
                </button>
              ))}
            </div>

            {/* 로드맵은 로드맵처럼 보여야 한다 — 다른 화면과 같은 공용 3축 보드를 쓴다.
                칸을 누르면 골라지고 다시 누르면 풀린다(selectedIds 를 주면 고르기 모드). */}
            <RoadmapAxisBoard
              axes={shown}
              selectedIds={picked}
              onCellClick={cell => togglePick(cell.id)}
              showEntry={false}
            />
          </section>
        </main>

        <aside className="rr-side">
          <section className="rr-sec">
            <div className="rr-sec-head"><h2>요청 내용</h2></div>

            <label className="rr-field">
              <span>요청 제목 <em>*</em></span>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 인턴 목표를 하반기로 조정하고 싶어요"
                maxLength={60}
              />
            </label>

            <label className="rr-field">
              <span>상세 사유 <em>*</em></span>
              <textarea
                rows={7}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="어떤 부분을 왜 바꾸고 싶은지 적어 주세요. 상담사가 이 내용을 보고 판단합니다."
              />
            </label>

            <div className="rr-picked">
              <span className="rr-picked-label">선택한 칸 {pickedCells.length}개</span>
              {pickedCells.length === 0
                ? <p className="rr-picked-empty">고른 칸이 없습니다. 전반적인 요청으로 전달됩니다.</p>
                : (
                  <ul>
                    {pickedCells.map(c => (
                      <li key={c.id}>
                        {c.title}
                        <button type="button" aria-label={`${c.title} 선택 해제`} onClick={() => togglePick(c.id)}>×</button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            <div className="rr-actions">
              <Link to="/roadmap/skill-tree" className="rr-btn-ghost">취소</Link>
              <button
                type="button"
                className="rr-btn-primary"
                disabled={!canSubmit}
                title={canSubmit ? undefined : '제목과 사유를 모두 입력해 주세요'}
                onClick={submit}
              >
                수정 요청 보내기
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
