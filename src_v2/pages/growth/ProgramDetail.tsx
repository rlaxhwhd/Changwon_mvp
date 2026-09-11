import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgramApplyModal from '../../components/ProgramApplyModal'
import { applyToProgram, getProgramById, isProgramClosed } from '../../../src_admin/data/programs'
import ProgramNotice from './ProgramNotice'
import './ProgramDetail.css'
import { usePageHead } from '../../components/PageCrumb'

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const programId = id ?? ''
  const program = getProgramById(programId)
  usePageHead(program?.title, '프로그램 내용과 일정을 확인하고 신청합니다.')
  const [applyOpen, setApplyOpen] = useState(false)
  const [applied, setApplied] = useState(false)
  const [saving, setSaving] = useState(false)

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
            <button
              type="button"
              className="jd-apply-btn"
              disabled={closed || saving}
              onClick={() => setApplyOpen(true)}
            >
              {closed ? '신청 마감' : saving ? '신청 중…' : '신청하기'}
            </button>
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
