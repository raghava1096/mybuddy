import { Link } from 'react-router-dom'
import { formatINR, limitStatus, splitIncome, toPaise } from '@mybuddy/core'
import { api } from '../api'
import { useLoad, useStored } from '../hooks'
import { Bar, ErrorBox, KindBadge, Loading, dateRange } from '../ui'
import { BUDGET_KEY, defaultBudget, type BudgetSettings } from '../budget'

export default function Home() {
  const { data, error, slow, reload } = useLoad(() => Promise.all([api.plans(), api.analytics(1)]))
  const [budget] = useStored<BudgetSettings>(BUDGET_KEY, defaultBudget)

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return <Loading slow={slow} />

  const [plans, stats] = data
  const thisMonth = stats.thisMonthByKind.reduce((s, k) => s + k.amount, 0)

  // compare this month's spend with the limit from the money plan, if one is set
  let limit = 0
  try {
    if (budget.income) limit = splitIncome(toPaise(budget.income), budget).expenses
  } catch {
    limit = 0
  }
  const status = limitStatus(thisMonth, limit)

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Your plans</h1>
          <p className="muted">Trips, events and your everyday spending, in one place.</p>
        </div>
        <Link to="/new" className="btn btn-primary">
          + New plan
        </Link>
      </div>

      <div className={`month-card status-${status}`}>
        <div>
          <p className="label">Spent this month</p>
          <p className="big">{formatINR(thisMonth)}</p>
        </div>
        {limit > 0 ? (
          <div className="month-limit">
            <Bar value={thisMonth} max={limit} status={status} />
            <p className="small">
              {status === 'over' && '⚠ Over your monthly limit of '}
              {status === 'warn' && 'Close to your monthly limit of '}
              {status === 'ok' && 'Within your monthly limit of '}
              <strong>{formatINR(limit)}</strong>
            </p>
          </div>
        ) : (
          <Link to="/planner" className="small">
            Set a monthly limit →
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="empty">
          <p>No plans yet. Start with a trip, an event, or just your own expenses.</p>
          <Link to="/new" className="btn btn-primary">
            Create your first plan
          </Link>
        </div>
      ) : (
        <div className="plan-grid">
          {plans.map((p) => (
            <Link key={p.id} to={`/plan/${p.id}`} className="plan-card">
              <div className="plan-card-top">
                <KindBadge kind={p.kind} />
                <span className="small muted">{p.memberCount} {p.memberCount === 1 ? 'person' : 'people'}</span>
              </div>
              <h3>{p.name}</h3>
              <p className="small muted">
                {p.kind === 'personal' ? 'Everyday expenses' : [p.destination, dateRange(p.startDate, p.endDate)].filter(Boolean).join(' · ')}
              </p>
              <div className="plan-card-money">
                <span>{formatINR(p.spent)}</span>
                {p.budget ? <span className="muted small">of {formatINR(p.budget)}</span> : null}
              </div>
              {p.budget ? <Bar value={p.spent} max={p.budget} status={limitStatus(p.spent, p.budget)} /> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
