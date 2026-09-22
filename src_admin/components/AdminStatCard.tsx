import type { ReactNode } from 'react'

export default function AdminStatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return <div className="admin-statsum-card">
    <span className="admin-stat-label">{icon}{label}</span>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </div>
}
