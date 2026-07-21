import { Link } from 'react-router-dom'
import { getPrograms } from '../../../src_admin/data/programs'
import './ProgramDetail.css'

interface Props {
  programId: string
  onApply?: () => void
  backTo: string
}

const valueOrPending = (value: string | undefined) => value || '미정'

function EmptyState({ backTo }: Pick<Props, 'backTo'>) {
  return (
    <div className="pd-wrap">
      <div className="pd-empty" role="status">
        <i className="fa-regular fa-folder-open" />
        <p>공고를 찾을 수 없습니다.</p>
        <Link to={backTo} className="pd-back-btn">목록으로</Link>
      </div>
    </div>
  )
}

export default function ProgramNotice({ programId, onApply, backTo }: Props) {
  const program = getPrograms().find(item => item.id === programId)

  if (!program) return <EmptyState backTo={backTo} />

  const infoItems = [
    { icon: 'fa-regular fa-calendar', label: '모집기간', value: `${program.startDate} ~ ${program.endDate}` },
    { icon: 'fa-solid fa-calendar-days', label: '운영기간', value: `${valueOrPending(program.runStartDate)} ~ ${valueOrPending(program.runEndDate)}` },
    { icon: 'fa-solid fa-location-dot', label: '장소', value: valueOrPending(program.location) },
    { icon: 'fa-solid fa-users', label: '정원', value: `${program.capacity}명` },
    { icon: 'fa-regular fa-user', label: '담당자', value: valueOrPending(program.manager) },
    { icon: 'fa-solid fa-list-ol', label: '총회차', value: `${program.sessions}회` },
    { icon: 'fa-solid fa-circle-info', label: '상태', value: program.status },
  ]

  return (
    <div className="pd-wrap">
      <nav className="pd-breadcrumb" aria-label="현재 위치">
        <Link to={backTo}>비교과 프로그램</Link>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>프로그램 공고</span>
      </nav>

      <div className="pd-layout">
        <main className="pd-left">
          <div className="pd-title-area">
            <div className="pd-tags">
              <span className="pd-tag pd-tag--cat">{program.category}</span>
              <span className="pd-tag pd-tag--status">{program.status}</span>
            </div>
            <h1 className="pd-title">{program.title}</h1>
            <p className="pd-title-meta">
              <i className="fa-regular fa-calendar" aria-hidden="true" /> 모집기간 {program.startDate} ~ {program.endDate}
            </p>
          </div>

          <div className="pd-thumb">
            {program.image ? (
              <img src={program.image} alt={`${program.title} 프로그램 이미지`} />
            ) : (
              <div className="pd-image-empty">
                <i className="fa-regular fa-image" aria-hidden="true" />
                <span>등록된 프로그램 이미지가 없습니다.</span>
              </div>
            )}
          </div>

          <section className="pd-content pd-section">
            <h2 className="pd-section-title"><i className="fa-solid fa-circle-info" /> 프로그램 소개</h2>
            {program.desc.split('\n').filter(Boolean).map(paragraph => (
              <p key={paragraph} className="pd-para">{paragraph}</p>
            ))}
          </section>
        </main>

        <aside className="pd-right">
          <section className="pd-info-card">
            <h2 className="pd-info-title">공고 정보</h2>
            <dl className="pd-info-list">
              {infoItems.map(item => (
                <div key={item.label}>
                  <dt><i className={item.icon} aria-hidden="true" /> {item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {onApply ? (
            <button className="pd-apply-btn" onClick={onApply}>
              <i className="fa-solid fa-pen-to-square" /> 신청하기
            </button>
          ) : (
            <Link to={backTo} className="pd-back-btn">
              <i className="fa-solid fa-arrow-left" /> 목록으로
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}
