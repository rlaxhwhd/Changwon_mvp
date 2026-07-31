import { useState } from 'react'
import { LuCalendarPlus, LuUsersRound, LuUserPlus, LuX } from 'react-icons/lu'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import StudentPicker from '../components/StudentPicker'
import { getActiveCounselor } from '../data/counselors'
import {
  addGroupMember,
  cancelGroupCounsel,
  completeGroupCounsel,
  getGroupCounselsByCounselor,
  getGroupSummary,
  groupKindOf,
  removeGroupMember,
  upsertGroupCounsel,
} from '../data/groupCounsels'
import type { GroupCounsel, GroupCounselStatus } from '../data/groupCounsels'
import { PSYCH_TEST_TYPES, psychTestLabel } from '../data/schema/psychTest'

const TABS: (GroupCounselStatus | '전체')[] = ['전체', '예정', '완료', '취소']
const today = () => new Date().toISOString().slice(0, 10)

function statusClass(status: GroupCounselStatus) {
  return status === '완료' ? 'admin-chip admin-chip-done' : status === '취소' ? 'admin-chip admin-chip-cancel' : 'admin-chip admin-chip-ok'
}

/** 회차 개설 — 유형은 로그인 역할이 결정한다(진로=집단상담 / 심리=집단심리검사). */
function CreateModal({ onClose }: { onClose: () => void }) {
  const counselor = getActiveCounselor()
  const kind = groupKindOf(counselor.role)
  const [form, setForm] = useState({ title: '', topic: '', date: today(), start: '14:00', end: '16:00', place: '', capacity: 8, testCode: PSYCH_TEST_TYPES[0].code })
  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }))
  const valid = form.title.trim() !== '' && form.topic.trim() !== '' && form.place.trim() !== '' && form.start < form.end && form.capacity > 0

  const save = () => {
    if (!valid) return
    const now = new Date().toISOString()
    upsertGroupCounsel({
      id: `grp_${Date.now()}`,
      kind,
      title: form.title.trim(),
      topic: form.topic.trim(),
      date: form.date,
      start: form.start,
      end: form.end,
      place: form.place.trim(),
      capacity: form.capacity,
      counselorId: counselor.id,
      counselorName: counselor.name,
      status: '예정',
      members: [],
      testCode: kind === '집단심리검사' ? form.testCode : undefined,
      createdAt: now,
      updatedAt: now,
    })
    window.location.reload()
  }

  return (
    <AdminModal title={`${kind} 회차 개설`} size="md" onClose={onClose}>
      <div className="counsel-request-detail-grid">
        <label className="is-wide"><span>회차명</span><input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="예) 3학년 진로설계 집단상담 1회차" /></label>
        <label className="is-wide"><span>주제 · 목표</span><textarea rows={2} value={form.topic} onChange={e => set({ topic: e.target.value })} /></label>
        <label><span>실시일</span><input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></label>
        <label><span>시작</span><input type="time" value={form.start} onChange={e => set({ start: e.target.value })} /></label>
        <label><span>종료</span><input type="time" value={form.end} onChange={e => set({ end: e.target.value })} /></label>
        <label className="is-wide"><span>장소</span><input value={form.place} onChange={e => set({ place: e.target.value })} /></label>
        <label><span>정원</span><input type="number" min={1} value={form.capacity} onChange={e => set({ capacity: Number(e.target.value) })} /></label>
        {kind === '집단심리검사' && (
          <label className="is-wide">
            <span>검사 종류</span>
            <select value={form.testCode} onChange={e => set({ testCode: e.target.value })}>
              {PSYCH_TEST_TYPES.filter(item => item.active).map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>닫기</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={!valid} onClick={save}>개설</button>
      </div>
    </AdminModal>
  )
}

/** 회차 상세 — 예정이면 참여자 관리, 완료 처리·취소. 완료면 기록 열람. */
function DetailModal({ session, onClose }: { session: GroupCounsel; onClose: () => void }) {
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const [attended, setAttended] = useState<Set<string>>(() => new Set(session.members.filter(m => m.attended !== false).map(m => m.studentId)))
  const [summary, setSummary] = useState(session.summary ?? '')
  const [comment, setComment] = useState(session.comment ?? '')
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const editable = session.status === '예정'
  const run = (action: () => void) => { try { action(); window.location.reload() } catch (e) { setError((e as Error).message) } }

  return (
    <>
      <AdminModal title={session.title} size="lg" onClose={onClose}>
        <dl className="admin-detail-grid">
          <div><dt>유형</dt><dd>{session.kind}{session.testCode && ` · ${psychTestLabel(session.testCode)}`}</dd></div>
          <div><dt>상태</dt><dd><span className={statusClass(session.status)}>{session.status}</span></dd></div>
          <div><dt>일시</dt><dd>{session.date} {session.start}–{session.end}</dd></div>
          <div><dt>장소</dt><dd>{session.place}</dd></div>
          <div className="is-wide"><dt>주제 · 목표</dt><dd>{session.topic}</dd></div>
          <div><dt>인원</dt><dd>{session.members.length} / {session.capacity}명</dd></div>
          <div><dt>진행</dt><dd>{session.counselorName}</dd></div>
          {session.cancelReason && <div className="is-wide"><dt>취소 사유</dt><dd>{session.cancelReason}</dd></div>}
        </dl>

        <section className="admin-scale-section">
          <div className="admin-scale-head">
            <h3>참여 학생 {session.members.length}명</h3>
            {editable && (
              <button type="button" className="admin-btn admin-btn-ghost sm" disabled={session.members.length >= session.capacity} onClick={() => { setError(''); setPicking(true) }}>
                <LuUserPlus /> 학생 추가
              </button>
            )}
          </div>
          {error && <p className="admin-field-hint admin-form-hint-warn">{error}</p>}
          {session.members.length === 0 ? (
            <p className="admin-field-hint">아직 참여 학생이 없습니다.</p>
          ) : (
            <ul className="admin-member-list">
              {session.members.map(member => (
                <li key={member.studentId}>
                  {session.status === '완료' && (
                    <span className={`admin-chip ${member.attended ? 'admin-chip-done' : 'admin-chip-cancel'}`}>{member.attended ? '출석' : '불참'}</span>
                  )}
                  {editable && (
                    <input
                      type="checkbox"
                      className="admin-member-check"
                      aria-label={`${member.name} 출석`}
                      checked={attended.has(member.studentId)}
                      onChange={event => setAttended(prev => { const next = new Set(prev); if (event.target.checked) next.add(member.studentId); else next.delete(member.studentId); return next })}
                    />
                  )}
                  <strong>{member.name}</strong>
                  <small>{member.studentNo} · {member.major} {member.grade}학년</small>
                  {editable && (
                    <button type="button" className="admin-icon-btn danger" aria-label={`${member.name} 제외`} onClick={() => run(() => removeGroupMember(session.id, member.studentId))}>
                      <LuX />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {editable ? (
          <>
            <label className="admin-field">
              <span>진행 요약</span>
              <textarea rows={3} value={summary} onChange={event => setSummary(event.target.value)} placeholder="완료 처리 시 기록됩니다." />
            </label>
            <label className="admin-field">
              <span>참여 학생 공개 코멘트</span>
              <textarea rows={3} value={comment} onChange={event => setComment(event.target.value)} />
            </label>
            {cancelling && (
              <label className="admin-field">
                <span>취소 사유 <em className="counsel-required">필수</em></span>
                <textarea rows={2} value={cancelReason} onChange={event => setCancelReason(event.target.value)} />
              </label>
            )}
            <div className="admin-form-actions">
              {cancelling ? (
                <>
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setCancelling(false); setCancelReason('') }}>취소 중단</button>
                  <button type="button" className="admin-btn admin-btn-danger-ghost" disabled={!cancelReason.trim()} onClick={() => run(() => cancelGroupCounsel(session.id, cancelReason))}>회차 취소 확정</button>
                </>
              ) : (
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setCancelling(true)}>회차 취소</button>
              )}
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={session.members.length === 0 || summary.trim() === '' || comment.trim() === ''}
                onClick={() => run(() => completeGroupCounsel(session.id, { attendedIds: [...attended], summary, comment }))}
              >
                완료 처리
              </button>
            </div>
          </>
        ) : (
          <>
            {session.summary && <div className="admin-record-item-summary"><span className="admin-record-label">진행 요약</span><p>{session.summary}</p></div>}
            {session.comment && <div className="admin-record-item-comment"><span className="admin-record-label">공개 코멘트</span><p>{session.comment}</p></div>}
          </>
        )}
      </AdminModal>

      {picking && (
        <StudentPicker
          title="참여 학생 추가"
          departments={getActiveCounselor().departments}
          excludeIds={session.members.map(member => member.studentId)}
          onClose={() => setPicking(false)}
          onPick={student => run(() => addGroupMember(session.id, {
            studentId: student.id,
            studentNo: student.studentNo,
            name: student.name,
            major: student.major,
            grade: student.grade,
          }))}
        />
      )}
    </>
  )
}

export default function GroupCounsels() {
  const counselor = getActiveCounselor()
  const kind = groupKindOf(counselor.role)
  const all = getGroupCounselsByCounselor(counselor.id)
  const summary = getGroupSummary(counselor.id)
  const [tab, setTab] = useState<GroupCounselStatus | '전체'>('전체')
  const [creating, setCreating] = useState(false)
  const [target, setTarget] = useState<GroupCounsel | null>(null)

  const list = tab === '전체' ? all : all.filter(item => item.status === tab)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">{kind}</h1>
          <p className="admin-page-desc">여러 학생을 한 회차로 묶어 진행하는 상담을 개설·관리합니다.</p>
          <p className="admin-field-hint">1:1 상담과 별도 도메인입니다 — 신청 접수함과 상담 통계에는 집계되지 않습니다.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
          <LuCalendarPlus /> 회차 개설
        </button>
      </header>

      <div className="admin-tabs" role="tablist">
        {TABS.map(item => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={`admin-tab${tab === item ? ' active' : ''}`} onClick={() => setTab(item)}>
            {item}<span className="admin-tab-count">{summary[item]}</span>
          </button>
        ))}
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState icon={LuUsersRound} message={all.length === 0 ? `개설된 ${kind} 회차가 없습니다.` : '해당 상태의 회차가 없습니다.'} />
        ) : (
          <div className="admin-roster admin-group-roster">
            <div className="admin-roster-head">
              <span>실시일</span><span>시간</span><span>회차명</span><span>장소</span>
              <span>인원</span><span>상태</span><span>관리</span>
            </div>
            {list.map(session => (
              <div className="admin-roster-row" key={session.id}>
                <span className="admin-roster-cell">{session.date}</span>
                <span className="admin-roster-cell">{session.start}–{session.end}</span>
                <span className="admin-roster-cell admin-group-title">
                  <strong>{session.title}</strong>
                  <small>{session.topic}</small>
                </span>
                <span className="admin-roster-cell">{session.place}</span>
                <span className="admin-roster-cell">{session.members.length} / {session.capacity}</span>
                <span className="admin-roster-cell"><span className={statusClass(session.status)}>{session.status}</span></span>
                <span className="admin-roster-cell">
                  <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setTarget(session)}>
                    {session.status === '예정' ? '참여자·완료' : '기록 보기'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {target && <DetailModal session={target} onClose={() => setTarget(null)} />}
    </div>
  )
}
