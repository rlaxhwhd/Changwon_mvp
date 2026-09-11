import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { loadMetadata } from '../../shared/metadataStore'
import './SystemManagement.css'
import NoticeManagement from '../components/NoticeManagement'
import type { Notice } from '../../src_v2/data/notices'

type Page<T> = { items: T[]; totalCount: number; page: number; pageSize: number }
type Group = { group_code: string; label: string; managed_by: string; fixed_codes: boolean }
type Item = { group_code: string; code: string; label: string; sort_order: number; is_active: boolean; payload: Record<string, unknown>; version: number }
type Assignment = { id: string; staff_uid: string; college_code: string; dept_code: string; role_code: string; valid_from: string; valid_to: string | null; is_active: boolean; version: number }
type Department = { college_code: string; dept_code: string; college_name: string; dept_name: string; course: string }
type Staff = { intg_uid: string; name: string; role_code: string }
type Menu = { menu_code: string; label: string; route: string; sort_order: number; is_active: boolean; version: number; roles: string[] }
const EMPTY_PAGE = { items: [], totalCount: 0, page: 1, pageSize: 20 }

export type SystemTab = 'codes' | 'assignments' | 'menus' | 'events' | 'issues' | 'notices'
/** 화면 제목·설명 — 어느 탭이 어느 상단바 항목 밑에 있는지는 navConfig 가 정한다. */
const HEAD: Record<SystemTab, [string, string]> = {
  codes: ['코드관리', '운영 코드의 명칭·정렬·사용 여부를 관리합니다. 변경 사유와 이전 값은 이력에 보관됩니다.'],
  menus: ['메뉴관리', '배포된 메뉴의 명칭·순서·노출을 수정합니다. 메뉴 노출과 별도로 API에서 데이터 접근 권한을 검사합니다.'],
  assignments: ['학과 담당 배정', '조교·교수·상담사의 학과 담당 기간을 관리합니다. 담당 학생 범위가 여기서 파생됩니다.'],
  events: ['변경 이력', '코드·메뉴·배정 변경의 이전/이후 값과 사유입니다.'],
  issues: ['이관 확인 사항', '시드 적재 중 자동으로 판정하지 못한 항목입니다.'],
  notices: ['공지 관리', '학생·교직원 포털에 게시할 공지를 관리합니다.'],
}

/** 탭은 라우트가 정한다(App.tsx) — 상단바 하위 메뉴가 곧 탭이라 화면 안에 탭 버튼을 두지 않는다. */
export default function SystemManagement({ tab }: { tab: SystemTab }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [group, setGroup] = useState('STUDENT_TYPE')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<Item | Assignment | Record<string, unknown>>>(EMPTY_PAGE)
  const [menus, setMenus] = useState<Menu[]>([])
  const [editing, setEditing] = useState<Item | null>(null)
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [order, setOrder] = useState(0)
  const [active, setActive] = useState(true)
  const [payload, setPayload] = useState('{}')
  const [reason, setReason] = useState('')
  const [history, setHistory] = useState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  const definition = groups.find(x => x.group_code === group)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setEditing(null); setHistory(null)
    const path = tab === 'notices' ? `/system/notices?page=${page}` : tab === 'codes' ? `/system/code-groups/${group}/items?page=${page}`
      : `/system/${tab === 'assignments' ? 'org-assignments' : tab === 'issues' ? 'import-issues' : 'events'}?page=${page}`
    Promise.all([api<Group[]>('/system/code-groups'), tab === 'menus' ? api<Menu[]>('/system/menus') : api<Page<Item | Assignment | Record<string, unknown>>>(path)])
      .then(([definitions, result]) => { if (!cancelled) { setGroups(definitions); if (Array.isArray(result)) setMenus(result); else setData(result) } })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, group, page, reload])

  async function run(action: () => Promise<void>) {
    if (saving) return
    setSaving(true); setError(''); setMessage('')
    try { await action(); await loadMetadata(); setMessage('DB에 저장했습니다.'); setReload(x => x + 1) }
    catch (e) { setError(e instanceof Error ? e.message : '저장에 실패했습니다.') }
    finally { setSaving(false) }
  }
  function edit(item: Item) {
    setEditing(item); setCode(item.code); setLabel(item.label); setOrder(item.sort_order)
    setActive(item.is_active); setPayload(JSON.stringify(item.payload, null, 2)); setReason('')
  }
  return <div className="admin-page system-management">
    <header className="admin-page-head"><div><h1 className="admin-page-title">{HEAD[tab][0]}</h1><p className="admin-page-desc">{HEAD[tab][1]}</p></div></header>
    {error && <p role="alert">{error} <button className="btn btn-secondary" onClick={() => setReload(x => x + 1)}>다시 조회</button></p>}
    {message && <p role="status">{message}</p>}
    {loading ? <p role="status">DB에서 조회 중입니다…</p> : <>
      {tab === 'notices' && <NoticeManagement rows={data.items as unknown as (Notice & { version: number })[]} saved={() => setReload(n => n + 1)} />}
      {tab === 'codes' && <>
        <label>코드 그룹 <select value={group} onChange={e => { setGroup(e.target.value); setPage(1) }}>{groups.map(g => <option key={g.group_code} value={g.group_code}>{g.label} ({g.group_code})</option>)}</select></label>
        <p>{definition?.managed_by === 'STRUCTURAL' ? '상태 전이에 사용하는 구조 코드입니다. 조회만 가능합니다.' : definition?.fixed_codes ? '코드값은 고정입니다. 명칭과 정렬을 수정할 수 있습니다.' : '항목을 추가하거나 수정할 수 있습니다. 폐지한 항목은 이력 보존을 위해 비활성 상태로 남습니다.'}</p>
        {definition?.managed_by === 'OPERATIONAL' && !definition.fixed_codes && <button className="btn btn-primary" onClick={() => edit({ group_code: group, code: '', label: '', sort_order: 0, is_active: true, payload: {type:'T1',goal:''}, version: 0 })}>항목 추가</button>}
        <table className="data-table"><thead><tr><th>코드</th><th>명칭</th><th>정렬</th><th>사용</th><th>관리</th></tr></thead><tbody>
          {(data.items as Item[]).map(item => <tr key={item.code}><td>{item.code}</td><td>{item.label}</td><td>{item.sort_order}</td><td>{item.is_active ? '사용' : '비활성'}</td><td>
            <button className="btn btn-secondary" disabled={definition?.managed_by === 'STRUCTURAL'} onClick={() => edit(item)}>수정</button>{' '}
            <button className="btn btn-secondary" onClick={() => { void api<Page<Record<string, unknown>>>(`/system/code-groups/${group}/items/${item.code}/events`).then(result => setHistory(result.items)).catch(e => setError(e.message)) }}>최근 변경 이력</button>
          </td></tr>)}
        </tbody></table>
        {editing && <form onSubmit={e => { e.preventDefault(); void run(async () => {
          await api(`/system/code-groups/${group}/items/${encodeURIComponent(code)}`, {method:'PUT',body:JSON.stringify({expectedVersion:editing.version,label,sortOrder:order,isActive:active,payload:JSON.parse(payload),reason})})
          await loadMetadata(); setEditing(null)
        }) }}>
          <fieldset disabled={saving}><legend>{editing.version ? '코드 항목 수정' : '코드 항목 추가'}</legend>
            <label>코드 <input required value={code} disabled={editing.version > 0} onChange={e => setCode(e.target.value)} pattern="[A-Z0-9_]+" maxLength={64} /></label>{' '}
            <label>명칭 <input required value={label} maxLength={200} onChange={e => setLabel(e.target.value)} /></label>{' '}
            <label>정렬 <input type="number" min={0} max={100000} value={order} onChange={e => setOrder(Number(e.target.value))} /></label>{' '}
            <label><input type="checkbox" checked={active} disabled={definition?.fixed_codes} onChange={e => setActive(e.target.checked)} /> 사용</label>
            {group === 'COUNSEL_TOPIC' && <>
              <label>학생 유형 <select value={String(JSON.parse(payload).type ?? 'T1')} onChange={e => setPayload(JSON.stringify({...JSON.parse(payload),type:e.target.value}))}>{['T1','T2','T3','T4','T5','T6'].map(type => <option key={type}>{type}</option>)}</select></label>
              <label>상담 목표 <input value={String(JSON.parse(payload).goal ?? '')} onChange={e => setPayload(JSON.stringify({...JSON.parse(payload),goal:e.target.value}))} /></label>
            </>}
            <label>변경 사유 <input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
            <button className="btn btn-primary" type="submit">{saving ? '저장 중…' : '저장'}</button> <button className="btn btn-secondary" type="button" onClick={() => setEditing(null)}>닫기</button>
          </fieldset>
        </form>}
        {history && <section><h2>최근 변경 이력 (최대 20건)</h2>{history.length ? history.map(row => <details key={String(row.id)}><summary>{String(row.changed_at)} · {String(row.changed_by)} · {String(row.reason)}</summary><pre>{JSON.stringify({before:row.before,after:row.after},null,2)}</pre></details>) : <p>변경 이력이 없습니다.</p>}</section>}
      </>}
      {tab === 'assignments' && <><AssignmentForm saving={saving} run={run} />
        <table className="data-table"><thead><tr><th>교직원 ID</th><th>단대 / 학과 코드</th><th>역할</th><th>기간</th><th>상태</th><th>관리</th></tr></thead><tbody>{(data.items as Assignment[]).map(row => <tr key={row.id}><td>{row.staff_uid}</td><td>{row.college_code} / {row.dept_code}</td><td>{row.role_code}</td><td>{row.valid_from} ~ {row.valid_to ?? '종료일 없음'}</td><td>{row.is_active ? '활성' : '비활성'}</td><td><AssignmentEnd row={row} saving={saving} run={run} /></td></tr>)}</tbody></table>
      </>}
      {tab === 'menus' && <>{menus.map(menu => <MenuForm key={`${menu.menu_code}-${menu.version}`} menu={menu} saving={saving} run={run} />)}</>}
      {(tab === 'events' || tab === 'issues') && (data.items as Record<string, unknown>[]).map((row, i) => <details key={String(row.id ?? i)}><summary>{String(row.changed_at ?? row.code)} · {String(row.reason ?? row.detail)}</summary><pre>{JSON.stringify(row,null,2)}</pre></details>)}
      {tab !== 'menus' && <div className="pagination"><button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</button> {page}페이지 · 총 {data.totalCount}건 <button className="btn btn-secondary" disabled={page * 20 >= data.totalCount} onClick={() => setPage(p => p + 1)}>다음</button></div>}
    </>}
  </div>
}

type Runner = {saving: boolean; run: (action: () => Promise<void>) => Promise<void>}
function AssignmentForm({saving,run}: Runner) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [staffQuery, setStaffQuery] = useState('')
  const [deptQuery, setDeptQuery] = useState('')
  const [staffUid, setStaffUid] = useState('')
  const [deptKey, setDeptKey] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  async function search() {
    setError('')
    try {
      const [people,orgs] = await Promise.all([api<Page<Staff>>(`/system/staff?q=${encodeURIComponent(staffQuery)}`),api<Page<Department>>(`/system/organizations?q=${encodeURIComponent(deptQuery)}`)])
      setStaff(people.items); setDepartments(orgs.items); setStaffUid(''); setDeptKey('')
    } catch(e) { setError(e instanceof Error ? e.message : '조회 실패') }
  }
  return <fieldset disabled={saving}><legend>학과 담당 배정 등록</legend>
    <p>학과명은 검색에만 사용합니다. 저장 시 단대·학과 코드 쌍을 확인하세요. 검색 결과는 최대 20건이며 검색어로 좁힐 수 있습니다.</p>
    <label>교직원 검색 <input value={staffQuery} onChange={e => setStaffQuery(e.target.value)} /></label>{' '}
    <label>학과 검색 <input value={deptQuery} onChange={e => setDeptQuery(e.target.value)} /></label>{' '}
    <button className="btn btn-secondary" onClick={() => void search()}>검색</button>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); void run(async () => {
      const person = staff.find(x => x.intg_uid === staffUid)!
      const dept = departments.find(x => JSON.stringify([x.college_code,x.dept_code]) === deptKey)!
      await api(`/system/org-assignments/${crypto.randomUUID()}`,{method:'PUT',body:JSON.stringify({expectedVersion:0,staffUid,collegeCode:dept.college_code,deptCode:dept.dept_code,roleCode:['career','psych'].includes(person.role_code) ? 'counselor' : person.role_code,validFrom:start,validTo:end || null,reason,isActive:true})})
      setReason('')
    }) }}>
      <label>교직원 <select required value={staffUid} onChange={e => setStaffUid(e.target.value)}><option value="">선택</option>{staff.filter(x => x.role_code !== 'admin').map(x => <option key={x.intg_uid} value={x.intg_uid}>{x.name} · {x.intg_uid} · {x.role_code}</option>)}</select></label>{' '}
      <label>학과 <select required value={deptKey} onChange={e => setDeptKey(e.target.value)}><option value="">선택</option>{departments.map(x => <option key={JSON.stringify([x.college_code,x.dept_code])} value={JSON.stringify([x.college_code,x.dept_code])}>{x.college_name} / {x.dept_name} · {x.course} ({x.college_code}/{x.dept_code})</option>)}</select></label>{' '}
      <label>시작일 <input required type="date" value={start} onChange={e => setStart(e.target.value)} /></label>{' '}
      <label>종료일 <input type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>{' '}
      <label>배정 사유 <input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>{' '}
      <button className="btn btn-primary" type="submit">배정 저장</button>
    </form>
  </fieldset>
}
function AssignmentEnd({row,saving,run}: Runner & {row: Assignment}) {
  const [reason,setReason] = useState('')
  const [end,setEnd] = useState(row.valid_to ?? '')
  return <form onSubmit={e => { e.preventDefault(); void run(async () => { await api(`/system/org-assignments/${row.id}`,{method:'PUT',body:JSON.stringify({expectedVersion:row.version,staffUid:row.staff_uid,collegeCode:row.college_code,deptCode:row.dept_code,roleCode:row.role_code,validFrom:row.valid_from,validTo:end || null,isActive:row.is_active,reason})}) }) }}>
    <label>종료일 <input type="date" required min={row.valid_from} value={end} onChange={e => setEnd(e.target.value)} /></label>{' '}
    <label>변경 사유 <input required value={reason} onChange={e => setReason(e.target.value)} /></label>{' '}
    <button className="btn btn-secondary" disabled={saving}>종료일 저장</button>
  </form>
}
function MenuForm({menu,saving,run}: Runner & {menu: Menu}) {
  const [label,setLabel] = useState(menu.label)
  const [order,setOrder] = useState(menu.sort_order)
  const [active,setActive] = useState(menu.is_active)
  const [reason,setReason] = useState('')
  return <form onSubmit={e => { e.preventDefault(); void run(async () => { await api(`/system/menus/${encodeURIComponent(menu.menu_code)}`,{method:'PUT',body:JSON.stringify({expectedVersion:menu.version,label,sortOrder:order,isActive:active,reason})}) }) }}>
    <fieldset disabled={saving}><legend>{menu.menu_code} · {menu.route}</legend>
      <label>명칭 <input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} /></label>{' '}
      <label>정렬 <input type="number" min={0} max={100000} value={order} onChange={e => setOrder(Number(e.target.value))} /></label>{' '}
      <label><input type="checkbox" checked={active} disabled={menu.menu_code === 'system'} onChange={e => setActive(e.target.checked)} /> 노출</label>{' '}
      <span>허용 역할: {menu.roles.join(', ')}</span>{' '}
      <label>변경 사유 <input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>{' '}
      <button className="btn btn-primary">저장</button>
    </fieldset>
  </form>
}
