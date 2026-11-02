import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { refreshProgram } from '../../shared/programStore'
import ProgramNotice from '../../src_v2/pages/growth/ProgramNotice'

export default function ProgramNoticeView() {
  const { id } = useParams<{ id: string }>()
  const programId = id ?? ''
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let controller: AbortController
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      const { signal } = controller
      setError('')
      refreshProgram(programId, signal).catch((error: unknown) => {
        if (!signal.aborted) setError(error instanceof Error ? error.message : '공고를 불러오지 못했습니다.')
      })
    }
    load()
    window.addEventListener('focus', load)
    return () => { controller.abort(); window.removeEventListener('focus', load) }
  }, [programId, retry])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">학생 공개 공고 미리보기</h1>
          <p className="admin-page-desc">학생에게 노출되는 프로그램 공고 화면입니다.</p>
        </div>
        <div className="admin-head-actions">
          <Link to={`/programs/${programId}`} className="admin-btn admin-btn-ghost">관리 상세로 이동</Link>
        </div>
      </header>
      {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(v => v + 1)}>다시 시도</button></div>
        : <ProgramNotice programId={programId} backTo="/programs" />}
    </div>
  )
}
