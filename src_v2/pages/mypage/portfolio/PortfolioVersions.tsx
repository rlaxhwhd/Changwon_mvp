import { useEffect, useState } from 'react'
import Modal from '../../../components/Modal'
import { createPortfolio, deletePortfolio, portfolioLimit, portfolioList, renamePortfolio } from '../../../../shared/portfolioStore'
import type { PortfolioNotImported, PortfolioSummary } from '../../../../shared/portfolioStore'
import { useAsyncAction } from '../../../../shared/useAsyncAction'
import { usePortfolios } from '../../../../shared/usePortfolioStore'
import PortfolioEditor from './PortfolioEditor'
import './PortfolioEditor.css'

interface Props {
  studentId: string
  /** 지원 모달의 편집 링크가 준 포트폴리오 id */
  initialId: string | null
}

type NameDialog = { mode: 'create' } | { mode: 'rename'; row: PortfolioSummary }

function formatDate(iso: string): string {
  const at = new Date(iso)
  const two = (value: number) => String(value).padStart(2, '0')
  return `${at.getFullYear()}.${two(at.getMonth() + 1)}.${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`
}

/** 「포트폴리오」 탭 — 회사별로 여러 벌을 만들고 고른 한 벌을 편집한다. */
export default function PortfolioVersions({ studentId, initialId }: Props) {
  const { revision, error: loadError } = usePortfolios(studentId)
  const rows = portfolioList(studentId)
  const limit = portfolioLimit(studentId)
  const { run, saving, error } = useAsyncAction()
  const [editingId, setEditingId] = useState<string | null>(initialId)
  const [notImported, setNotImported] = useState<PortfolioNotImported[]>([])
  const [dialog, setDialog] = useState<NameDialog | null>(null)
  const [name, setName] = useState('')
  useEffect(() => { setEditingId(initialId) }, [initialId])
  void revision

  if (editingId) {
    return (
      <PortfolioEditor
        studentId={studentId}
        portfolioId={editingId}
        notImported={notImported}
        onClose={() => { setEditingId(null); setNotImported([]) }}
      />
    )
  }

  const open = (next: NameDialog) => {
    setName(next.mode === 'rename' ? next.row.title : '')
    setDialog(next)
  }

  const submitName = () => {
    if (!dialog) return
    void run(async () => {
      if (dialog.mode === 'rename') {
        await renamePortfolio(studentId, dialog.row.id, name)
        setDialog(null)
        return
      }
      const created = await createPortfolio(studentId, name.trim() ? { title: name } : {})
      setDialog(null)
      setNotImported(created.notImported)
      setEditingId(created.id)
    })
  }

  const clone = (row: PortfolioSummary) => {
    void run(async () => { await createPortfolio(studentId, { sourcePortfolioId: row.id }) })
  }

  const remove = (row: PortfolioSummary) => {
    if (!window.confirm(`«${row.title}»을(를) 삭제합니다.\n이미 지원에 제출한 내용은 그대로 남습니다.`)) return
    void run(() => deletePortfolio(studentId, row))
  }

  const full = limit !== null && rows.length >= limit

  return (
    <section className="pf-section">
      {(error || loadError) && <p className="pfe-alert" role="alert">{error || loadError}</p>}
      <article className="pf-card">
        <header className="pf-card-head">
          <h3><i className="fa-solid fa-folder-open" /> 회사 제출용 포트폴리오</h3>
          <div className="pfe-head-actions">
            {limit !== null && <span className="pf-doc-count">{rows.length} / {limit}개</span>}
            <button type="button" className="pf-add-btn" disabled={saving || full} onClick={() => open({ mode: 'create' })}>
              <i className="fa-solid fa-plus" /> 새로 만들기
            </button>
          </div>
        </header>
        <p className="pfe-desc">기존 기록을 복사해 만들고, 회사마다 항목을 고쳐 여러 개로 관리합니다. 여기서 고친 내용은 원본 기록을 바꾸지 않습니다.</p>

        {rows.length === 0 ? (
          <div className="pf-empty">
            <i className="fa-solid fa-file-circle-plus" />
            <p>아직 만든 포트폴리오가 없습니다.</p>
          </div>
        ) : (
          <div className="pf-resume-grid pfe-grid">
            {rows.map(row => (
              <article key={row.id} className="pf-resume-card" onClick={() => setEditingId(row.id)}>
                <div className="pf-resume-top">
                  <span className="pf-cat-badge">{row.complete ? '제출 가능' : '작성 중'}</span>
                  <button
                    type="button"
                    className="pf-resume-del"
                    disabled={saving}
                    onClick={event => { event.stopPropagation(); remove(row) }}
                    aria-label={`${row.title} 삭제`}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
                <h4 className="pf-resume-title">{row.title}</h4>
                <div className="pf-resume-foot">
                  <span><i className="fa-regular fa-calendar" /> {formatDate(row.updatedAt)}</span>
                </div>
                <div className="pfe-card-actions" onClick={event => event.stopPropagation()}>
                  <button type="button" className="pf-edit-btn" onClick={() => setEditingId(row.id)}>
                    <i className="fa-solid fa-pen" /> 편집
                  </button>
                  <button type="button" className="pf-edit-btn" disabled={saving || full} onClick={() => clone(row)}>
                    <i className="fa-regular fa-copy" /> 복제
                  </button>
                  <button type="button" className="pf-edit-btn" disabled={saving} onClick={() => open({ mode: 'rename', row })}>
                    이름 변경
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'rename' ? '이름 변경' : '새 포트폴리오'}
        size="sm"
      >
        <form className="pf-form" onSubmit={event => { event.preventDefault(); submitName() }}>
          <label>
            <span>이름</span>
            <input
              type="text"
              maxLength={60}
              required={dialog?.mode === 'rename'}
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="비워 두면 포트폴리오_v1 처럼 번호를 붙입니다"
            />
          </label>
          {error && <p className="pfe-alert" role="alert">{error}</p>}
          <div className="pf-form-actions">
            <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setDialog(null)}>취소</button>
            <button type="submit" className="pf-btn pf-btn--primary" disabled={saving}>
              {dialog?.mode === 'rename' ? '변경' : '만들기'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
