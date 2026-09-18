import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../../shared/api'
import { loadMetadata } from '../../shared/metadataStore'

// ─────────────────────────────────────────────────────────────────────────
// 메뉴관리 — 역할별 노출 설정.
// 정본은 dc.menu(트리) + dc.menu_auth(역할↔메뉴). 역할 하나를 고르면 그 역할의 포털 메뉴 트리가 뜨고,
// 체크 상태를 바꾼 뒤 사유와 함께 저장하면 PUT /system/auth-roles/{role}/menus 가 집합을 통째로 치환한다.
// 메뉴 노출은 데이터 접근 권한이 아니다 — API 가 따로 검사한다(administration.py 머리말).
// ─────────────────────────────────────────────────────────────────────────

type Role = { role_code: string; label: string; portal: 'admin' | 'student' | null; base_group: boolean; version: number; description: string | null }
type Menu = { menu_code: string; parent_code: string | null; portal: 'admin' | 'student'; label: string; route: string; sort_order: number; is_active: boolean; version: number; roles: string[] }
type Row = { menu: Menu; depth: number }

const PORTAL_LABEL: Record<'admin' | 'student', string> = { admin: '교직원 포털(/admin)', student: '학생 포털(/v2)' }

/** 포털의 메뉴를 트리 순서(상위 정렬 → 하위 정렬)로 편다. */
function flatten(menus: Menu[], portal: string): Row[] {
  const byParent = new Map<string | null, Menu[]>()
  for (const menu of menus) {
    if (menu.portal !== portal) continue
    const list = byParent.get(menu.parent_code) ?? []
    list.push(menu); byParent.set(menu.parent_code, list)
  }
  const rows: Row[] = []
  const walk = (parent: string | null, depth: number) => {
    for (const menu of (byParent.get(parent) ?? []).sort((a, b) => a.sort_order - b.sort_order || a.menu_code.localeCompare(b.menu_code))) {
      rows.push({ menu, depth }); walk(menu.menu_code, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

export default function MenuVisibility() {
  const [roles, setRoles] = useState<Role[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [roleCode, setRoleCode] = useState('')
  const [granted, setGranted] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [onlyGranted, setOnlyGranted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    Promise.all([api<Role[]>('/system/auth-roles'), api<Menu[]>('/system/menus')])
      .then(([roleRows, menuRows]) => {
        if (cancelled) return
        setRoles(roleRows); setMenus(menuRows)
        setRoleCode(current => current && roleRows.some(r => r.role_code === current) ? current : (roleRows[0]?.role_code ?? ''))
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reload])

  const role = roles.find(r => r.role_code === roleCode)
  const rows = useMemo(() => role?.portal ? flatten(menus, role.portal) : [], [menus, role])
  const original = useMemo(() => new Set(menus.filter(m => m.roles.includes(roleCode)).map(m => m.menu_code)), [menus, roleCode])
  // 역할을 바꾸거나 다시 조회하면 체크 상태를 DB 값으로 되돌린다.
  useEffect(() => { setGranted(new Set(original)); setReason(''); setEditing(null) }, [original])

  const parentOf = useMemo(() => new Map(menus.map(m => [m.menu_code, m.parent_code])), [menus])
  const added = [...granted].filter(code => !original.has(code))
  const removed = [...original].filter(code => !granted.has(code))
  const dirty = added.length + removed.length

  function toggle(code: string, on: boolean) {
    setGranted(current => {
      const next = new Set(current)
      if (on) {
        // 하위를 켜면 상위도 켠다 — 상위가 꺼져 있으면 GNB 에 나올 수 없다.
        for (let cursor: string | null = code; cursor; cursor = parentOf.get(cursor) ?? null) next.add(cursor)
      } else {
        // 상위를 끄면 그 아래 전부 끈다.
        const prefix = `${code}.`
        for (const item of current) if (item === code || item.startsWith(prefix)) next.delete(item)
      }
      return next
    })
  }
  function changeRole(next: string) {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 버리고 다른 역할로 이동할까요?')) return
    setRoleCode(next); setMessage('')
  }
  async function save() {
    if (!role || saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      await api(`/system/auth-roles/${encodeURIComponent(role.role_code)}/menus`, { method: 'PUT', body: JSON.stringify({ expectedVersion: role.version, menuCodes: [...granted], reason }) })
      await loadMetadata()
      setMessage(`${role.label} 역할의 메뉴 노출을 DB에 저장했습니다. (허용 ${added.length}건 · 해제 ${removed.length}건)`)
      setReload(n => n + 1)
    } catch (e) { setError(e instanceof Error ? e.message : '저장에 실패했습니다.') }
    finally { setSaving(false) }
  }

  if (loading) return <p role="status">DB에서 조회 중입니다…</p>
  return <section className="menu-visibility">
    {error && <p role="alert">{error} <button className="btn btn-secondary" onClick={() => setReload(n => n + 1)}>다시 조회</button></p>}
    {message && <p role="status">{message}</p>}

    <div className="mv-toolbar">
      <label>역할
        <select value={roleCode} onChange={e => changeRole(e.target.value)} disabled={saving}>
          {roles.map(r => <option key={r.role_code} value={r.role_code}>{r.label}</option>)}
        </select>
      </label>
      {role && <span className="mv-portal">{role.portal ? PORTAL_LABEL[role.portal] : '포털 없음'}{role.base_group ? ' · 신분으로 자동 부여' : ''}</span>}
      {role?.portal && <span className="mv-count">허용 <b>{granted.size}</b> / {rows.length}개</span>}
      {role?.portal && <label className="mv-filter"><input type="checkbox" checked={onlyGranted} onChange={e => setOnlyGranted(e.target.checked)} /> 허용된 메뉴만 보기</label>}
      {role?.portal && <span className="mv-bulk">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setGranted(new Set(rows.map(r => r.menu.menu_code)))}>모두 허용</button>
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setGranted(new Set())}>모두 해제</button>
      </span>}
    </div>

    {role && !role.portal && <p className="mv-empty">{role.description || `${role.label} 역할이 로그인하는 포털이 아직 없습니다.`} 포털이 생기면 그 메뉴가 여기에 나타납니다.</p>}

    {role?.portal && <>
      <table className="data-table mv-table">
        <thead><tr><th className="mv-col-allow">노출</th><th>메뉴</th><th>경로</th><th>상태</th><th>관리</th></tr></thead>
        <tbody>
          {rows.map(({ menu, depth }) => {
            const on = granted.has(menu.menu_code)
            const changed = on !== original.has(menu.menu_code)
            // 필터 중에도 방금 바꾼 행은 남긴다 — 해제한 행이 사라지면 되돌릴 수 없다.
            if (onlyGranted && !on && !changed) return null
            const id = `mv-${menu.menu_code}`
            return <Fragment key={menu.menu_code}>
              <tr className={`mv-row depth-${depth}${changed ? ' is-changed' : ''}${menu.is_active ? '' : ' is-inactive'}`}>
                <td className="mv-col-allow"><input id={id} type="checkbox" checked={on} disabled={saving} onChange={e => toggle(menu.menu_code, e.target.checked)} aria-label={`${menu.label} 노출 허용`} /></td>
                <td><label htmlFor={id} className="mv-label" style={{ paddingLeft: depth * 24 }}>{depth > 0 && <span className="mv-branch" aria-hidden>└</span>}{menu.label}<small>{menu.menu_code}</small></label></td>
                <td className="mv-route">{menu.route}</td>
                <td>
                  {!menu.is_active && <span className="badge mv-badge-off">전체 비노출</span>}
                  {changed && <span className="badge mv-badge-changed">{on ? '허용 예정' : '해제 예정'}</span>}
                </td>
                <td><button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => setEditing(editing === menu.menu_code ? null : menu.menu_code)}>{editing === menu.menu_code ? '닫기' : '명칭·순서'}</button></td>
              </tr>
              {editing === menu.menu_code && <tr className="mv-edit-row"><td colSpan={5}>
                <MenuForm menu={menu} onSaved={() => { setEditing(null); setMessage('메뉴 명칭·순서를 DB에 저장했습니다.'); setReload(n => n + 1) }} onError={setError} />
              </td></tr>}
            </Fragment>
          })}
        </tbody>
      </table>

      <form className="mv-save" onSubmit={e => { e.preventDefault(); void save() }}>
        <span className="mv-dirty">{dirty ? <>변경 <b>{dirty}</b>건 — 허용 {added.length} · 해제 {removed.length}</> : '변경 없음'}</span>
        <label>변경 사유 <input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={!dirty || saving} placeholder="예: 교수에게 채용공고 열람 허용" /></label>
        <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => { setGranted(new Set(original)); setReason('') }}>되돌리기</button>
        <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>{saving ? '저장 중…' : `${role.label} 노출 저장`}</button>
      </form>
    </>}
  </section>
}

/** 메뉴 한 건의 명칭·정렬·전체 노출(모든 역할 공통) — 기존 PUT /system/menus/{code} 그대로. */
function MenuForm({ menu, onSaved, onError }: { menu: Menu; onSaved: () => void; onError: (message: string) => void }) {
  const [label, setLabel] = useState(menu.label)
  const [order, setOrder] = useState(menu.sort_order)
  const [active, setActive] = useState(menu.is_active)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  return <form onSubmit={e => {
    e.preventDefault(); setSaving(true)
    api(`/system/menus/${encodeURIComponent(menu.menu_code)}`, { method: 'PUT', body: JSON.stringify({ expectedVersion: menu.version, label, sortOrder: order, isActive: active, reason }) })
      .then(() => loadMetadata()).then(onSaved)
      .catch(err => onError(err instanceof Error ? err.message : '저장에 실패했습니다.'))
      .finally(() => setSaving(false))
  }}>
    <fieldset disabled={saving}><legend>{menu.menu_code} · {menu.route}</legend>
      <label>명칭 <input required maxLength={200} value={label} onChange={e => setLabel(e.target.value)} /></label>{' '}
      <label>정렬 <input type="number" min={0} max={100000} value={order} onChange={e => setOrder(Number(e.target.value))} /></label>{' '}
      <label><input type="checkbox" checked={active} disabled={menu.menu_code === 'system'} onChange={e => setActive(e.target.checked)} /> 전체 노출(모든 역할)</label>{' '}
      <label>변경 사유 <input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>{' '}
      <button className="btn btn-primary">{saving ? '저장 중…' : '저장'}</button>
    </fieldset>
  </form>
}
