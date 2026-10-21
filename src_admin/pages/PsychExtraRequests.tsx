import { useEffect, useState } from 'react'
import AdminModal from '../components/AdminModal'
import StudentPicker from '../components/StudentPicker'
import PageNumbers from '../../shared/components/PageNumbers'
import PsychExtraWriterTable from '../../shared/components/PsychExtraWriterTable'
import { useAsyncAction } from '../../shared/useAsyncAction'
import { confirmPsychExtraRequest, createPsychExtraRequest, getPsychExtraRequest, loadPsychExtraWriter, queryPsychExtraRequests } from '../../shared/psychExtraRequests'
import type { PsychExtraQuery, PsychExtraRequest, PsychExtraWriter } from '../../shared/psychExtraRequests'
import type { RosterStudent } from '../data/studentRoster'
import { useListData } from '../hooks/useListData'
import './ProfessorCounsel.css'

const PAGE_SIZE = 10
const dateOf = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(iso)).replaceAll('-', '.')

/** 글 상세 — 학생 정보·내용을 보고 확인 처리한다. 확인은 심리상담사 누구나 한 번 한다. */
function DetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [post, setPost] = useState<PsychExtraRequest | null>(null)
  const [loadError, setLoadError] = useState('')
  const { run, saving, error } = useAsyncAction()
  useEffect(() => {
    let active = true
    getPsychExtraRequest(id).then(row => { if (active) setPost(row) }).catch(e => { if (active) setLoadError(e.message) })
    return () => { active = false }
  }, [id])
  return <AdminModal title="추가 심리상담신청" size="lg" onClose={onClose}>
    {loadError && <p role="alert" className="admin-form-hint-warn">{loadError}</p>}
    <h3 className="psych-extra-section">상담 정보</h3>
    <PsychExtraWriterTable writer={post?.student ?? null} />
    <h3 className="psych-extra-section">{post?.title ?? '불러오는 중…'}</h3>
    <p className="admin-field-hint">
      {post && `${dateOf(post.createdAt)} 작성${post.proxy ? ' · 상담사 대리 등록' : ''}`}
      {post?.confirmedAt && ` · ${post.confirmedBy} 확인(${dateOf(post.confirmedAt)})`}
    </p>
    <div className="psych-extra-body">{post?.body || (post ? '내용 없음' : '')}</div>
    {error && <p role="alert" className="admin-field-hint">{error}</p>}
    <div className="admin-form-actions">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>닫기</button>
      {post && !post.confirmed && <button type="button" className="admin-btn admin-btn-primary" disabled={saving}
        onClick={() => run(async () => { setPost(await confirmPsychExtraRequest(post.id)); onChanged() })}>
        {saving ? '처리 중…' : '확인 처리'}</button>}
    </div>
  </AdminModal>
}

/** 등록 — 전화 등으로 받은 요청을 상담사가 학생 대신 남긴다. */
function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [student, setStudent] = useState<RosterStudent | null>(null)
  const [picking, setPicking] = useState(true)
  const [writer, setWriter] = useState<PsychExtraWriter | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { run, saving, error } = useAsyncAction()
  useEffect(() => {
    if (!student) return
    let active = true
    setWriter(null)
    loadPsychExtraWriter(student.id).then(row => { if (active) setWriter(row) }).catch(() => {})
    return () => { active = false }
  }, [student])
  return <AdminModal title="추가상담신청 등록" size="lg" onClose={onClose}>
    <p className="admin-field-hint">학생 대신 등록합니다. 목록에는 학생 이름으로 표시되고 대리 등록으로 기록됩니다.</p>
    <div className="admin-field">
      <span>학생</span>
      <button type="button" className="admin-btn" onClick={() => setPicking(true)}>{student ? `${student.name} (${student.studentNo})` : '학생 검색'}</button>
    </div>
    {student && <><h3 className="psych-extra-section">상담 정보</h3><PsychExtraWriterTable writer={writer} /></>}
    <label className="admin-field"><span>제목 <em className="counsel-required">필수</em></span>
      <input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
    <label className="admin-field"><span>내용</span>
      <textarea rows={8} value={body} maxLength={20000} placeholder="원하는 날짜와 시간대를 적어 주세요." onChange={e => setBody(e.target.value)} /></label>
    {error && <p role="alert" className="admin-field-hint">{error}</p>}
    <div className="admin-form-actions">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>취소</button>
      <button type="button" className="admin-btn admin-btn-primary" disabled={!student || !title.trim() || saving}
        onClick={() => run(async () => { await createPsychExtraRequest({ studentId: student!.id, title: title.trim(), body }); onSaved() })}>
        {saving ? '저장 중…' : '등록'}</button>
    </div>
    {picking && <StudentPicker title="학생 검색" onPick={picked => { setStudent(picked); setPicking(false) }} onClose={() => setPicking(false)} />}
  </AdminModal>
}

/** 추가 심리상담신청 게시판 — 상담 자리가 없어 신청하지 못한 학생이 남긴 글. 심리상담사 전원이 함께 본다. */
export default function PsychExtraRequests() {
  const [draft, setDraft] = useState<Pick<PsychExtraQuery, 'field' | 'q'>>({ field: 'title', q: '' })
  const [search, setSearch] = useState(draft)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState('')
  const [creating, setCreating] = useState(false)
  const { data, isLoading, error, refetch } = useListData(queryPsychExtraRequests, { ...search, page, pageSize: PAGE_SIZE })
  const pages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE))
  return <div className="admin-page professor-counsel-page">
    <header className="admin-page-head"><div>
      <h1 className="admin-page-title">추가 심리상담신청</h1>
      <p className="admin-page-desc">심리상담 자리가 마감되어 신청하지 못한 학생이 남긴 희망 날짜·시간대입니다. 연락한 뒤 확인 처리합니다.</p>
    </div></header>

    <form className="professor-report-filters" onSubmit={e => { e.preventDefault(); setSearch({ ...draft }); setPage(1) }}>
      <div className="admin-filterbar">
        <label className="admin-select"><span>검색 구분</span>
          <select value={draft.field} onChange={e => setDraft(old => ({ ...old, field: e.target.value as PsychExtraQuery['field'] }))}>
            <option value="title">제목</option><option value="writer">작성자</option>
          </select>
        </label>
        <div className="admin-search"><input aria-label="검색어" placeholder="검색어 입력" value={draft.q} onChange={e => setDraft(old => ({ ...old, q: e.target.value }))} /></div>
        <button className="admin-btn admin-btn-primary" type="submit">검색</button>
      </div>
    </form>
    {error && <p role="alert" className="admin-form-hint-warn">{error.message}</p>}

    <div className="admin-toolbar">
      <span className="admin-toolbar-count" aria-live="polite">총 {data.totalCount}건{isLoading && ' · 불러오는 중…'}</span>
      <button type="button" className="admin-btn psych-extra-create" onClick={() => setCreating(true)}>등록</button>
    </div>
    <section className="admin-card">
      <div className="professor-report-table-wrap"><table className="professor-report-table psych-extra-table">
        <thead><tr>{['번호', '제목', '작성자', '작성일', '확인유무'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
        <tbody>{!data.items.length ? <tr><td colSpan={5} className="professor-home-empty">{isLoading ? '불러오는 중…' : '등록된 추가 심리상담신청이 없습니다.'}</td></tr>
          : data.items.map((row, index) => <tr key={row.id}>
            <td>{data.totalCount - (data.page - 1) * PAGE_SIZE - index}</td>
            <td className="psych-extra-title"><button type="button" className="professor-link-btn" onClick={() => setOpenId(row.id)}>{row.title}</button></td>
            <td>{row.writer}</td>
            <td>{dateOf(row.createdAt)}</td>
            <td className={row.confirmed ? 'psych-extra-done' : 'psych-extra-wait'}>{row.confirmed ? '확인' : '미확인'}</td>
          </tr>)}</tbody>
      </table></div>
      {pages > 1 && <div className="admin-pagination">
        <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</button>
        <PageNumbers page={page} pages={pages} onChange={setPage} />
        <span className="admin-page-info">{page} / {pages} 페이지</span>
        <button className="admin-page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>다음</button>
      </div>}
    </section>

    {openId && <DetailModal id={openId} onClose={() => setOpenId('')} onChanged={refetch} />}
    {creating && <CreateModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); setPage(1); refetch() }} />}
  </div>
}
