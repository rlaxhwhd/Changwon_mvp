import { useState } from 'react'
import { LuBrain, LuEye, LuEyeOff, LuPlus, LuTrash2 } from 'react-icons/lu'
import AdminModal from '../components/AdminModal'
import EmptyState from '../components/EmptyState'
import { getActiveCounselor } from '../data/counselors'
import { getPsychTestRows, getPsychTestSummary, upsertPsychTest } from '../data/psychTests'
import type { PsychTestRow } from '../data/psychTests'
import { PSYCH_TEST_TYPES, psychTestLabel } from '../data/schema/psychTest'
import type { PsychTestResult, PsychTestScale, PsychTestStatus } from '../data/schema/psychTest'
import { enrollStatusClass } from '../data/studentRoster'

const today = () => new Date().toISOString().slice(0, 10)

/** 결과 작성 모달 — 척도 구성은 검사도구마다 달라 자유 배열로 받는다(우리가 채점하지 않는다). */
function ResultModal({ row, onClose }: { row: PsychTestRow; onClose: () => void }) {
  const counselor = getActiveCounselor()
  const prev = row.result
  const [testCode, setTestCode] = useState(prev?.testCode ?? PSYCH_TEST_TYPES[0].code)
  const [testNameEtc, setTestNameEtc] = useState(prev?.testNameEtc ?? '')
  const [testedAt, setTestedAt] = useState(prev?.testedAt ?? row.request.slot?.date ?? today())
  const [scales, setScales] = useState<PsychTestScale[]>(prev?.scales ?? [{ label: '', score: 0 }])
  const [interpretation, setInterpretation] = useState(prev?.interpretation ?? '')
  const [opinion, setOpinion] = useState(prev?.opinion ?? '')
  const [openToStudent, setOpenToStudent] = useState(prev?.openToStudent ?? false)

  const etcNeeded = testCode === 'ETC' && testNameEtc.trim() === ''
  const valid = testedAt !== '' && interpretation.trim() !== '' && opinion.trim() !== '' && !etcNeeded

  const updateScale = (index: number, patch: Partial<PsychTestScale>) =>
    setScales(list => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const save = (status: PsychTestStatus) => {
    if (status === '완료' && !valid) return
    const now = new Date().toISOString()
    const result: PsychTestResult = {
      id: prev?.id ?? `pst_${Date.now()}`,
      requestId: row.request.id,
      studentId: row.request.studentId,
      studentNo: row.request.studentNo,
      studentName: row.request.studentName,
      studentMajor: row.request.studentMajor,
      studentGrade: row.studentGrade,
      testCode,
      testNameEtc: testCode === 'ETC' ? testNameEtc.trim() : undefined,
      testedAt,
      scales: scales.filter(item => item.label.trim() !== ''),
      interpretation: interpretation.trim(),
      opinion: opinion.trim(),
      openToStudent,
      status,
      by: counselor.id,
      byName: counselor.name,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    }
    upsertPsychTest(result)
    window.location.reload()
  }

  return (
    <AdminModal title="심리검사 결과 작성" size="lg" onClose={onClose}>
      <div className="counsel-profile-heading">
        <div>
          <strong>{row.request.studentName}</strong>
          <span>{row.request.studentNo}</span>
        </div>
        <span className={enrollStatusClass(row.request.studentEnrollmentStatus)}>{row.request.studentEnrollmentStatus}</span>
      </div>
      <p className="admin-field-hint">
        {row.request.studentMajor} {row.studentGrade > 0 && `${row.studentGrade}학년`} · 상담 주제 “{row.request.topic}”
      </p>

      <div className="counsel-request-detail-grid">
        <label>
          <span>검사 종류</span>
          <select value={testCode} onChange={event => setTestCode(event.target.value)}>
            {PSYCH_TEST_TYPES.filter(item => item.active).map(item => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>실시일</span>
          <input type="date" value={testedAt} onChange={event => setTestedAt(event.target.value)} />
        </label>
        {testCode === 'ETC' && (
          <label>
            <span>검사명 <em className="counsel-required">필수</em></span>
            <input value={testNameEtc} onChange={event => setTestNameEtc(event.target.value)} placeholder="검사 도구명" />
          </label>
        )}
      </div>

      <section className="admin-scale-section">
        <div className="admin-scale-head">
          <h3>척도별 결과</h3>
          <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setScales(list => [...list, { label: '', score: 0 }])}>
            <LuPlus /> 척도 추가
          </button>
        </div>
        <p className="admin-field-hint">
          이 시스템은 채점하지 않습니다. 외부 검사도구의 결과를 그대로 옮겨 적습니다.
        </p>
        {scales.map((scale, index) => (
          <div className="admin-scale-row" key={index}>
            <input value={scale.label} onChange={event => updateScale(index, { label: event.target.value })} placeholder="척도명" />
            <input type="number" value={scale.score} onChange={event => updateScale(index, { score: Number(event.target.value) })} placeholder="점수" />
            <input value={scale.note ?? ''} onChange={event => updateScale(index, { note: event.target.value })} placeholder="해석 메모 (선택)" />
            <button type="button" className="admin-icon-btn danger" aria-label="척도 삭제" onClick={() => setScales(list => list.filter((_, i) => i !== index))}>
              <LuTrash2 />
            </button>
          </div>
        ))}
      </section>

      <label className="admin-field">
        <span>결과 해석 <em className="counsel-required">필수</em></span>
        <textarea rows={4} value={interpretation} onChange={event => setInterpretation(event.target.value)} placeholder="검사도구 기준의 결과 해석을 적습니다." />
      </label>
      <label className="admin-field">
        <span>상담사 소견 <em className="counsel-required">필수</em></span>
        <textarea rows={4} value={opinion} onChange={event => setOpinion(event.target.value)} placeholder="상담 맥락에서의 소견과 후속 권고를 적습니다." />
      </label>
      <label className="admin-check">
        <input type="checkbox" checked={openToStudent} onChange={event => setOpenToStudent(event.target.checked)} />
        <span>학생에게 결과 공개</span>
      </label>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>닫기</button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => save('작성중')}>임시 저장</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={!valid} onClick={() => save('완료')}>작성 완료</button>
      </div>
    </AdminModal>
  )
}

export default function PsychTests() {
  const counselor = getActiveCounselor()
  const rows = getPsychTestRows(counselor.id)
  const summary = getPsychTestSummary(counselor.id)
  const [target, setTarget] = useState<PsychTestRow | null>(null)

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">심리검사 결과</h1>
          <p className="admin-page-desc">확정·완료된 심리상담 건의 검사 결과를 작성하고 열람합니다.</p>
          <p className="admin-field-hint">
            심리검사는 <strong>상담 신청 절차 안에서만</strong> 이루어집니다. 학생이 단독 응시하는 진단 4종(C-2~C-CORE)은 <strong>검사 현황</strong> 화면에 있습니다.
          </p>
        </div>
      </header>

      <div className="admin-statsum">
        {([
          ['검사 대상', `${summary.target}건`, '확정·완료 심리상담'],
          ['작성 완료', `${summary.done}건`, ''],
          ['임시 저장', `${summary.draft}건`, ''],
          ['미작성', `${summary.none}건`, ''],
        ] as const).map(([label, value, hint]) => (
          <div className="admin-statsum-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            {hint && <small>{hint}</small>}
          </div>
        ))}
      </div>

      <div className="admin-card-head"><h2>검사 대상 목록</h2></div>
      <section className="admin-card">
        {rows.length === 0 ? (
          <EmptyState icon={LuBrain} message="확정된 심리상담이 없습니다. 신청 접수함에서 일정을 확정하면 여기에 나타납니다." />
        ) : (
          <div className="admin-roster admin-psych-roster">
            <div className="admin-roster-head">
              <span>학번</span><span>이름</span><span>학과</span><span>상담일</span>
              <span>검사 종류</span><span>실시일</span><span>상태</span><span>공개</span><span>작성</span>
            </div>
            {rows.map(row => (
              <div className="admin-roster-row" key={row.request.id}>
                <span className="admin-roster-cell">{row.request.studentNo}</span>
                <span className="admin-roster-cell"><strong>{row.request.studentName}</strong></span>
                <span className="admin-roster-cell">{row.request.studentMajor}</span>
                <span className="admin-roster-cell">{row.request.slot?.date ?? '—'}</span>
                <span className="admin-roster-cell">
                  {row.result ? (row.result.testNameEtc ?? psychTestLabel(row.result.testCode)) : '—'}
                </span>
                <span className="admin-roster-cell">{row.result?.testedAt ?? '—'}</span>
                <span className="admin-roster-cell">
                  <span className={`admin-chip ${row.result?.status === '완료' ? 'admin-chip-done' : row.result ? 'admin-chip-ok' : 'admin-chip-wait'}`}>
                    {row.result?.status ?? '미작성'}
                  </span>
                </span>
                <span className="admin-roster-cell">
                  {row.result ? (row.result.openToStudent ? <LuEye aria-label="공개" /> : <LuEyeOff aria-label="비공개" />) : '—'}
                </span>
                <span className="admin-roster-cell">
                  <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => setTarget(row)}>
                    {row.result ? '열람·수정' : '결과 작성'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {target && <ResultModal row={target} onClose={() => setTarget(null)} />}
    </div>
  )
}
