import type { Program } from '../../../src_admin/data/schema/program'
import { categoryLabel } from '../../../src_admin/data/schema/program'
import { activeRound, programAudiences, programDdayLabel, programSelectionStatus } from '../../../src_admin/data/programs'
import './ProgramCardGrid.css'

interface Props {
  programs: Program[]
  onSelect: (id: string) => void
  wished?: Set<string>
  onToggleWish?: (id: string) => void
}

export default function ProgramCardGrid({ programs, onSelect, wished, onToggleWish }: Props) {
  return (
    <div className="pcg-grid">
      {programs.map(program => {
        const isWished = wished?.has(program.id) ?? false
        // 다회차 공고는 지금 열린(또는 다음) 회차의 기간을 카드에 보인다 — 지난 1차 마감으로 '마감'이 뜨지 않게.
        const round = activeRound(program)
        const dDay = programDdayLabel({ status: program.status, endDate: round.endDate, endTime: round.endTime })
        const isUrgent = dDay === 'D-day' || /^D-[1-5]$/.test(dDay)
        const audiences = programAudiences(program)

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
                <span className="pcg-tags">
                  {(program.sessions ?? 1) > 1 && <span className="pcg-rounds">다회차</span>}
                  {audiences.length > 0 && (
                    <span className="pcg-audiences">
                      {audiences.map(a => <span key={a.value} className="pcg-audience">{a.label}</span>)}
                    </span>
                  )}
                </span>
              </div>
              <div className="pcg-body">
                <div className="pcg-badges">
                  <span className="pcg-category">{categoryLabel(program.category)}</span>
                  <span className={`pcg-dday${isUrgent ? ' pcg-dday--urgent' : ''}`}>{dDay}</span>
                </div>
                <h2 className="pcg-title">{program.title}</h2>
                <p className="pcg-desc">{program.desc}</p>
                <div className="pcg-meta">
                  <span><i className="fa-regular fa-calendar" aria-hidden="true" /> 모집기간 {round.startDate} ~ {round.endDate}</span>
                  {round.runStartDate && round.runEndDate && (
                    <span><i className="fa-solid fa-calendar-check" aria-hidden="true" /> 진행기간 {round.runStartDate} ~ {round.runEndDate}</span>
                  )}
                  <span><i className="fa-solid fa-users" aria-hidden="true" /> 모집인원 : {programSelectionStatus(program)}</span>
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
