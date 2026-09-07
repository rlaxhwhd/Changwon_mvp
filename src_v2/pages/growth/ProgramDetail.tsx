import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgramApplyModal from '../../components/ProgramApplyModal'
import { getProgramById, isProgramClosed } from '../../../src_admin/data/programs'
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

  // 마감 판정은 데이터층이 한다 — 목록·공고가 같은 답을 낸다.
  const closed = program ? isProgramClosed(program) : true

  const handleApplySubmit = () => {
    setApplyOpen(false)
    setApplied(true)
    window.setTimeout(() => setApplied(false), 3000)
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
              disabled={closed}
              onClick={() => setApplyOpen(true)}
            >
              {closed ? '신청 마감' : '신청하기'}
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
