import { pageNumbers } from '../pagination'
import './PageNumbers.css'

export default function PageNumbers({ page, pages, onChange, disabled = false }: {
  page: number
  pages: number
  onChange: (page: number) => void
  disabled?: boolean
}) {
  const numbers = pageNumbers(page, pages)
  return <span className="page-number-group" role="group" aria-label="페이지 번호">
    {numbers.map(number => <button type="button" key={number}
      className="page-number-button" disabled={disabled}
      aria-label={`${number}페이지`} aria-current={number === page ? 'page' : undefined}
      onClick={() => onChange(number)}>{number}</button>)}
    {numbers[numbers.length - 1] < pages && <span className="page-number-ellipsis" aria-label="뒤에 페이지가 더 있습니다">…</span>}
  </span>
}
