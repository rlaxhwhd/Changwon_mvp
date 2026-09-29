import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgramApplyModal from '../../components/ProgramApplyModal'
import { applyToProgram, getProgramById, isProgramClosed } from '../../../src_admin/data/programs'
import ProgramNotice from './ProgramNotice'
import './ProgramDetail.css'
import { usePageHead } from '../../components/PageCrumb'
import { PROGRAM_EVENT, refreshProgram } from '../../../shared/programStore'
import { useStore } from '../../../shared/useRoadmapStore'
import { programParticipation } from '../../../shared/myPrograms'
import { getActiveStudentId } from '../../data/students'
import ProgramParticipationActions from '../../components/ProgramParticipationActions'

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const programId = id ?? ''
  useStore(PROGRAM_EVENT)
  const program = getProgramById(programId)
  const studentId = getActiveStudentId()
  usePageHead(program?.title, '프로그램 내용과 일정을 확인하고 신청합니다.')
  const [applyOpen, setApplyOpen] = useState(false)
  const [applied, setApplied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let controller: AbortController
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      const { signal } = controller
      setLoading(true); setLoadError('')
      refreshProgram(programId, signal)
        .catch((error: unknown) => {
          if (!signal.aborted) setLoadError(error instanceof Error ? error.message : '신청 상태를 불러오지 못했습니다.')
        })
        .finally(() => { if (!signal.aborted) setLoading(false) })
    }
    load()
    window.addEventListener('focus', load)
    return () => { controller.abort(); window.removeEventListener('focus', load) }
  }, [programId, studentId, revision])
  const participation = program ? programParticipation(program, studentId) : null

  // 마감 판정은 데이터층이 한다 — 목록·공고가 같은 답을 낸다.
  const closed = program ? isProgramClosed(program) : true

  // 서버에 저장된 뒤에만 완료로 표시한다. 마감·중복·정원은 서버가 판정하므로
  // 여기서 미리 성공을 알리면 저장되지 않은 신청이 완료로 보인다.
  const handleApplySubmit = (payload: {
    path: string; motive: string
    agree3rd: 'yes' | 'no'; agreeCollect: 'yes' | 'no'
    agreeIdent: 'yes' | 'no'; agreeNotice: 'yes' | 'no'
  }) => {
    if (saving) return
    setSaving(true)
    const { path, motive, ...consents } = payload
    applyToProgram(programId, { path, motive, consents })
      .then(() => {
        setApplyOpen(false)
        setApplied(true)
        window.setTimeout(() => setApplied(false), 3000)
      })
      .catch((error: unknown) =>
        window.alert(error instanceof Error ? error.message : '신청하지 못했습니다.'))
      .finally(() => setSaving(false))
  }

  return (
    <>
      <ProgramNotice
        programId={programId}
        backTo="/growth/program"
        showWish
        action={program && (
          <>
            {loadError ? <div role="alert"><p>{loadError}</p><button type="button" className="jd-apply-btn" onClick={() => setRevision(v => v + 1)}>다시 시도</button></div>
              : !loading && participation ? <ProgramParticipationActions participation={participation} notice />
              : <button
              type="button"
              className="jd-apply-btn"
              disabled={loading || closed || saving}
              onClick={() => setApplyOpen(true)}
            >
              {loading ? '신청 상태 확인 중…' : closed ? '신청 마감' : saving ? '신청 중…' : '신청하기'}
            </button>}
            {applied && (
              <p className="pn-applied-toast" role="status">신청이 완료되었습니다.</p>
            )}
          </>
        )}
      />

      {program && (
        <ProgramApplyModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          programTitle={program.title}
          onSubmit={handleApplySubmit}
        />
      )}
    </>
  )
}
