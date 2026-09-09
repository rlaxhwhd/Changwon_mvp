import type { ProgramCategory } from '../../../src_admin/data/schema/program'
import { Icon } from '../../components/Icon'
import './ProgramCardGrid.css'

export interface ProgramCardVM {
  id: string
  title: string
  desc: string
  category: ProgramCategory
  startDate: string
  endDate: string
  runStartDate?: string
  runEndDate?: string
  capacity: number
  image?: string
}

interface Props {
  programs: ProgramCardVM[]
  onSelect: (id: string) => void
  wished?: Set<string>
  onToggleWish?: (id: string) => void
}

function getDDay(endDate: string): string {
  const end = new Date(`${endDate.replaceAll('.', '-')}T23:59:59`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000)

  if (Number.isNaN(days)) return '일정 확인'
  if (days < 0) return '마감'
  if (days === 0) return 'D-Day'
  return `D-${days}`
}

export default function ProgramCardGrid({ programs, onSelect, wished, onToggleWish }: Props) {
  return (
    <div className="pcg-grid">
      {programs.map(program => {
        const isWished = wished?.has(program.id) ?? false
        const dDay = getDDay(program.endDate)
        const isUrgent = dDay === 'D-Day' || /^D-[1-5]$/.test(dDay)

        return (
          <article key={program.id} className="pcg-card" data-cat={program.category}>
            <button
              type="button"
              className="pcg-select"
              onClick={() => onSelect(program.id)}
              aria-label={`${program.title} 상세 보기`}
            >
              <div className="pcg-thumb">
                {program.image ? <img src={program.image} alt="" /> : <i className="fa-solid fa-image" aria-hidden="true" />}
              </div>
              <div className="pcg-body">
                <div className="pcg-badges">
                  <span className="pcg-category">{program.category}</span>
                  <span className={`pcg-dday${isUrgent ? ' pcg-dday--urgent' : ''}`}>{dDay}</span>
                </div>
                <h2 className="pcg-title">{program.title}</h2>
                <p className="pcg-desc">{program.desc}</p>
                <div className="pcg-meta">
                  <span><Icon name="calendar" />모집기간 {program.startDate} ~ {program.endDate}</span>
                  {program.runStartDate && program.runEndDate && (
                    <span><Icon name="calendar-check" />진행기간 {program.runStartDate} ~ {program.runEndDate}</span>
                  )}
                  <span><Icon name="users" />정원 {program.capacity}명</span>
                </div>
              </div>
            </button>
            {onToggleWish && (
              <button
                type="button"
                className={`pcg-wish${isWished ? ' active' : ''}`}
                onClick={() => onToggleWish(program.id)}
                title={isWished ? '찜 해제' : '찜하기'}
                aria-label={isWished ? '찜 해제' : '찜하기'}
                aria-pressed={isWished}
              >
                <i className={isWished ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}
