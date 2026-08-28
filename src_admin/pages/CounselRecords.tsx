import { LuCalendarCheck, LuDownload, LuFolderOpen, LuMessageSquareMore, LuPen, LuPrinter, LuQuote, LuSearch } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import { handledRequestTypes } from '../data/schema/counselor'
import { getRecordsByType, upsertRecord } from '../data/counselRecords'
import { toRecordCsv } from '../data/counselExport'
import type { CounselRecord } from '../data/counselRecords'
import EmptyState from '../components/EmptyState'

/** 완료 기록 1건 카드 — 코멘트 열람 + 인라인 편집 */
function RecordItem({
  record,
  checked,
  onToggle,
}: {
  record: CounselRecord
  checked: boolean
  onToggle: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState(record.comment)
  const [followUp, setFollowUp] = useState(record.followUp ?? '')

  const dirty = comment.trim() !== record.comment || (followUp.trim() || '') !== (record.followUp ?? '')

  const handleSave = () => {
    upsertRecord({
      ...record,
      comment: comment.trim(),
      followUp: followUp.trim() || undefined,
    })
    window.location.reload()
  }

  return (
    <li className={`admin-record-item${checked ? ' is-checked' : ''}`}>
      <div className="admin-record-item-head">
        <div className="admin-record-item-student">
          <span className="admin-check-cell">
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              aria-label={`${record.studentName} 상담일지 선택`}
            />
          </span>
          <div>
            <strong>{record.studentName}</strong>
            <small>
              {record.studentMajor} · {record.date}
            </small>
          </div>
        </div>
        <div className="admin-record-item-meta">
          <span className="admin-tag admin-tag-soft">{record.type}</span>
          <span className="admin-tag">{record.method}</span>
          <span className="admin-chip admin-chip-done">완료</span>
        </div>
      </div>

      <div className="admin-record-item-topic">
        <LuQuote /> {record.topic}
      </div>

      <div className="admin-record-item-summary">
        <span className="admin-record-label">상담 소견</span>
        <p>{record.summary}</p>
      </div>

      {!editing ? (
        <>
          <div className="admin-record-item-comment">
            <span className="admin-record-label">
              <LuMessageSquareMore /> 학생 공개 코멘트
            </span>
            <p>{record.comment}</p>
          </div>
          {record.followUp && (
            <div className="admin-record-item-followup">
              <span className="admin-record-label">후속 조치</span>
              <p>{record.followUp}</p>
            </div>
          )}
          <div className="admin-form-actions">
            <Link to={`/counsel/records/${record.id}/print`} className="admin-btn admin-btn-ghost sm" target="_blank" rel="noreferrer">
              <LuPrinter /> 상담일지 인쇄
            </Link>
            <button className="admin-btn admin-btn-ghost sm" onClick={() => setEditing(true)}>
              <LuPen /> 코멘트 편집
            </button>
          </div>
        </>
      ) : (
        <div className="admin-record-edit">
          <label className="admin-field">
            <span>학생 공개 코멘트</span>
            <textarea rows={4} value={comment} onChange={e => setComment(e.target.value)} />
            <small className="admin-field-hint">학생 화면 '상담 현황'에 노출됩니다.</small>
          </label>
          <label className="admin-field">
            <span>후속 조치 (선택)</span>
            <input type="text" value={followUp} onChange={e => setFollowUp(e.target.value)} />
          </label>
          <div className="admin-form-actions">
            <button
              className="admin-btn admin-btn-ghost sm"
              onClick={() => {
                setComment(record.comment)
                setFollowUp(record.followUp ?? '')
                setEditing(false)
              }}
            >
              취소
            </button>
            <button
              className="admin-btn admin-btn-primary sm"
              disabled={!dirty || comment.trim() === ''}
              onClick={handleSave}
            >
              저장
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export default function CounselRecords() {
  const counselor = getActiveCounselor()
  const myType = handledRequestTypes(counselor.role)[0]
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const completed = useMemo(
    () =>
      getRecordsByType(myType)
        .filter(r => r.status === '완료')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [myType],
  )

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return completed
    return completed.filter(
      r =>
        r.studentName.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        r.studentMajor.toLowerCase().includes(q),
    )
  }, [completed, query])

  const allChecked = list.length > 0 && list.every(r => checked.has(r.id))

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setChecked(prev => {
      const next = new Set(prev)
      list.forEach(r => (allChecked ? next.delete(r.id) : next.add(r.id)))
      return next
    })
  }

  // 대상 = 선택분, 선택이 없으면 화면에 보이는 목록 전체.
  // 검색으로 가려진 선택은 제외한다 — 버튼에 적힌 건수와 실제 대상이 어긋나면 안 된다.
  const targetIds = (checked.size > 0 ? list.filter(r => checked.has(r.id)) : list).map(r => r.id)

  const downloadCsv = () => {
    if (targetIds.length === 0) return
    const url = URL.createObjectURL(
      new Blob([`﻿${toRecordCsv(targetIds)}`], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `상담기록_${myType}_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">완료 상담 내역</h1>
          <p className="admin-page-desc">
            완료된 {myType} 상담 기록과 학생 공개 코멘트를 열람·편집합니다.
          </p>
        </div>
        <Link to="/counsel/schedule" className="admin-btn admin-btn-ghost">
          <LuCalendarCheck /> 일정 보기
        </Link>
      </header>

      <div className="admin-toolbar">
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="학생 이름·학과·주제 검색"
          />
        </div>
        <span className="admin-toolbar-count">총 {completed.length}건</span>
        {list.length > 0 && (
          <div className="admin-toolbar-actions">
            <label className="admin-check-all">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              전체선택
            </label>
            <Link
              to={`/counsel/records/print?ids=${targetIds.join(',')}`}
              className="admin-btn admin-btn-ghost sm"
              target="_blank"
              rel="noreferrer"
            >
              <LuPrinter /> 선택 인쇄 ({targetIds.length})
            </Link>
            <button type="button" className="admin-btn admin-btn-primary sm" onClick={downloadCsv}>
              <LuDownload /> 엑셀 다운로드 ({targetIds.length})
            </button>
          </div>
        )}
      </div>

      <section className="admin-card">
        {list.length === 0 ? (
          <EmptyState
            icon={LuFolderOpen}
            message={
              completed.length === 0
                ? '완료된 상담 기록이 없습니다.'
                : '검색 결과가 없습니다.'
            }
          />
        ) : (
          <ul className="admin-record-item-list">
            {list.map(r => (
              <RecordItem
                key={r.id}
                record={r}
                checked={checked.has(r.id)}
                onToggle={() => toggle(r.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
