import type { ReactNode } from 'react'
import type { Category, PlanKind } from '@mybuddy/core'

// small shared bits of ui

export const categoryColor: Record<Category, string> = {
  food: '#2563eb',
  travel: '#0891b2',
  stay: '#7c3aed',
  shopping: '#db2777',
  bills: '#ea580c',
  entertainment: '#16a34a',
  health: '#dc2626',
  other: '#64748b',
}

export const kindLabel: Record<PlanKind, string> = {
  trip: 'Trip',
  event: 'Event',
  personal: 'Personal',
}

export function KindBadge({ kind }: { kind: PlanKind }) {
  return <span className={`badge badge-${kind}`}>{kindLabel[kind]}</span>
}

export function Loading({ slow }: { slow: boolean }) {
  return (
    <div className="loading">
      <span className="spinner" aria-hidden="true" />
      <p>{slow ? 'Waking up the server. Free hosting sleeps when idle, this takes up to 30 seconds…' : 'Loading…'}</p>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

// horizontal bar used for budget and category totals
export function Bar({ value, max, color, status }: { value: number; max: number; color?: string; status?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`bar ${status ? `bar-${status}` : ''}`}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function dateRange(start: string | null, end: string | null) {
  if (!start) return 'No dates yet'
  if (!end || end === start) return formatDate(start)
  return `${formatDate(start)} – ${formatDate(end)}`
}

export const today = () => new Date().toISOString().slice(0, 10)
