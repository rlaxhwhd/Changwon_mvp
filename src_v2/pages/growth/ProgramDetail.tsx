import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ProgramApplyModal from '../../components/ProgramApplyModal'
import { isWished as isWishedStore, toggleWish as toggleWishStore } from '../../data/wishlist'
import { getPrograms } from '../../../src_admin/data/programs'
import ProgramNotice from './ProgramNotice'
import './ProgramDetail.css'
import { usePageHead } from '../../components/PageCrumb'

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const programId = id ?? ''
  const program = getPrograms().find(item => item.id === programId)
  usePageHead(program?.title, '프로그램 내용과 일정을 확인하고 신청합니다.')
  const [wished, setWished] = useState(() => isWishedStore(programId))
  const [applyOpen, setApplyOpen] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleToggleWish = () => {
    const wishedPrograms = toggleWishStore(programId)
    setWished(wishedPrograms.includes(programId))
  }

  const handleApplySubmit = () => {
    setApplyOpen(false)
    setApplied(true)
    window.setTimeout(() => setApplied(false), 3000)
  }

  return (
    <>
      <ProgramNotice
        programId={programId}
        onApply={() => setApplyOpen(true)}
        backTo="/growth/program"
      />

      {program && (
        <div className="pd-wish-area">
          <button
            className={`pd-wish-btn${wished ? ' wished' : ''}`}
            onClick={handleToggleWish}
          >
            <i className={`fa-${wished ? 'solid' : 'regular'} fa-heart`} />
            {wished ? '찜 완료' : '찜 프로그램에 담기'}
          </button>
          {wished && (
            <p className="pd-wish-saved" role="status">
              <i className="fa-solid fa-circle-check" /> 관심 프로그램에 저장했어요.
            </p>
          )}
          {applied && (
            <div className="pd-applied-toast" role="status">
              <i className="fa-solid fa-circle-check" /> 신청이 완료되었습니다.
            </div>
          )}
          <ProgramApplyModal
            open={applyOpen}
            onClose={() => setApplyOpen(false)}
            programTitle={program.title}
            onSubmit={handleApplySubmit}
          />
        </div>
      )}
    </>
  )
}
