import { NavLink } from 'react-router-dom'

export default function CounselTabs() {
  return (
    <nav className="cc-counsel-tabs" aria-label="상담 유형">
      <NavLink to="/counsel/career">진로·취업 상담</NavLink>
      <NavLink to="/counsel/psych">심리 상담</NavLink>
      <NavLink to="/counsel/professor">교수 상담</NavLink>
    </nav>
  )
}
