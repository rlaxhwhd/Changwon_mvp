import { useEffect, useState } from 'react'
import Modal from '../../../components/Modal'
import PortfolioSheet from '../../../../shared/PortfolioSheet'
import { personalOf } from '../../../../shared/portfolioSections'
import {
  createPortfolio, deletePortfolio, loadRepresentativePortfolio, portfolioLimit, portfolioList, renamePortfolio,
  setRepresentative,
} from '../../../../shared/portfolioStore'
import type { PortfolioDetail, PortfolioNotImported, PortfolioSummary } from '../../../../shared/portfolioStore'
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
  // 대표 포트폴리오 본문 — 목록이 바뀔 때(지정·저장·삭제 뒤) 다시 읽는다. 편집 중에는 읽지 않는다.
  const representativeId = rows.find(row => row.representative)?.id ?? null
  const representativeVersion = rows.find(row => row.representative)?.version ?? 0
  const [representative, setRepresentativeDoc] = useState<PortfolioDetail | null>(null)
  const [photoReady, setPhotoReady] = useState(false)
  useEffect(() => {
    if (editingId || !representativeId) { setRepresentativeDoc(null); return }
    let live = true
    setPhotoReady(false)
    loadRepresentativePortfolio(studentId)
      .then(next => { if (live) setRepresentativeDoc(next) })
      .catch(() => { if (live) setRepresentativeDoc(null) })
    return () => { live = false }
  }, [studentId, representativeId, representativeVersion, editingId])

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
  const toggleRepresentative = (row: PortfolioSummary) => {
    void run(() => setRepresentative(studentId, row.id, !row.representative))
  }
  // 사진이 있으면 다 그려진 뒤에 인쇄한다 — 빈 칸으로 PDF 가 나가지 않게.
  const needsPhoto = !!representative && !!representative.files[personalOf(representative.document).photoFileId] && !photoReady

  return (
    <div className="pf-stack">
      {(error || loadError) && <p className="pf-alert pfs-no-print" role="alert">{error || loadError}</p>}

      {/* 대표 포트폴리오 — 예전 「이력서」 탭 자리. 교직원 학생 상세도 이 한 벌을 본다. */}
      <article className="pf-panel pf-tone-blue pfv-representative">
        <header className="pf-panel-head pfs-no-print">
          <div>
            <h2>대표 포트폴리오 {representative && <span className="pf-badge">{representative.title}</span>}</h2>
            <p>목록에서 한 벌을 대표로 지정하면 여기서 미리 보고 PDF로 저장할 수 있습니다. 상담 선생님도 학생 상세에서 이 포트폴리오를 봅니다.</p>
          </div>
          {representative && (
            <div className="pf-panel-actions">
              <button type="button" className="pf-action pf-action--sm" onClick={() => setEditingId(representative.id)}>
                <i className="fa-solid fa-pen" aria-hidden="true" /> 편집
              </button>
              <button type="button" className="pf-action pf-action--primary pf-action--sm" disabled={needsPhoto} onClick={() => window.print()}>
                <i className="fa-solid fa-file-pdf" aria-hidden="true" /> PDF 저장
              </button>
            </div>
          )}
        </header>
        {representative
          ? <PortfolioSheet document={representative.document} files={representative.files} onPhotoSettled={() => setPhotoReady(true)} />
          : (
            <div className="pf-empty pfs-no-print">
              <strong>대표 포트폴리오가 없습니다</strong>
              <span>{rows.length ? '아래 목록에서 「대표로 지정」을 눌러 주세요.' : '먼저 포트폴리오를 하나 만들어 주세요.'}</span>
            </div>
          )}
      </article>

      <article className="pf-panel pfs-no-print">
        <header className="pf-panel-head">
          <div>
            <h2>회사 제출용 포트폴리오</h2>
            <p>기존 기록을 복사해 만들고, 회사마다 항목을 고쳐 여러 개로 관리합니다. 여기서 고친 내용은 원본 기록을 바꾸지 않습니다.</p>
          </div>
          <div className="pf-panel-actions">
            {limit !== null && <span className="pf-badge">{rows.length} / {limit}개</span>}
            <button type="button" className="pf-action pf-action--primary pf-action--sm" disabled={saving || full} onClick={() => open({ mode: 'create' })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> 새로 만들기
            </button>
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="pf-empty">
            <strong>아직 만든 포트폴리오가 없습니다</strong>
            <span>「새로 만들기」를 누르면 지금까지의 기록이 자동으로 채워집니다. 회사에 맞게 고친 뒤 지원할 때 고르면 됩니다.</span>
          </div>
        ) : (
          <ul className="pfv-list">
            {rows.map(row => (
              <li key={row.id} className="pfv-row">
                <button type="button" className="pfv-open" onClick={() => setEditingId(row.id)}>
                  <strong>{row.title}</strong>
                  <span>
                    {row.representative && <span className="pf-badge"><i className="fa-solid fa-star" aria-hidden="true" /> 대표</span>}
                    <span className={`pf-badge ${row.complete ? 'pf-badge--ok' : 'pf-badge--warn'}`}>{row.complete ? '제출 가능' : '작성 중'}</span>
                    <time dateTime={row.updatedAt}>수정 {formatDate(row.updatedAt)}</time>
                  </span>
                </button>
                <div className="pfv-actions">
                  <button
                    type="button"
                    className={`pf-action pf-action--sm${row.representative ? ' is-on' : ''}`}
                    disabled={saving}
                    aria-pressed={row.representative}
                    onClick={() => toggleRepresentative(row)}
                  >
                    <i className={`fa-${row.representative ? 'solid' : 'regular'} fa-star`} aria-hidden="true" /> {row.representative ? '대표 해제' : '대표로 지정'}
                  </button>
                  <button type="button" className="pf-action pf-action--sm" onClick={() => setEditingId(row.id)}>편집</button>
                  <button type="button" className="pf-action pf-action--sm" disabled={saving || full} onClick={() => clone(row)}>복제</button>
                  <button type="button" className="pf-action pf-action--sm" disabled={saving} onClick={() => open({ mode: 'rename', row })}>이름 변경</button>
                  <button type="button" className="pf-icon-btn" disabled={saving} onClick={() => remove(row)} aria-label={`${row.title} 삭제`}>
                    <i className="fa-regular fa-trash-can" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
          {error && <p className="pf-alert" role="alert">{error}</p>}
          <div className="pf-form-actions">
            <button type="button" className="pf-action" onClick={() => setDialog(null)}>취소</button>
            <button type="submit" className="pf-action pf-action--primary" disabled={saving}>
              {dialog?.mode === 'rename' ? '변경' : '만들기'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
