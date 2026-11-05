import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatINR, limitStatus } from '@mybuddy/core'
import { api } from '../api'
import { useLoad } from '../hooks'
import { Bar, ErrorBox, KindBadge, Loading, categoryColor, dateRange } from '../ui'
import ExpensesTab from '../components/ExpensesTab'
import ItineraryTab from '../components/ItineraryTab'
import BalancesTab from '../components/BalancesTab'
import PeopleTab from '../components/PeopleTab'

type Tab = 'expenses' | 'itinerary' | 'balances' | 'people'

export default function PlanPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: plan, error, slow, reload } = useLoad(() => api.plan(id), [id])
  const [tab, setTab] = useState<Tab | null>(null)

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!plan) return <Loading slow={slow} />

  const personal = plan.kind === 'personal'
  const tabs: Tab[] = personal ? ['expenses'] : ['expenses', 'itinerary', 'balances', 'people']
  // trips open on the itinerary, everything else on expenses
  const current = tab ?? (plan.kind === 'trip' && plan.itinerary.length ? 'itinerary' : 'expenses')

  const remove = async () => {
    if (!window.confirm(`Delete "${plan.name}" and everything in it?`)) return
    await api.deletePlan(plan.id)
    navigate('/')
  }

  const share = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      window.alert('Link copied. Anyone with the link can view and add to this plan.')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="row-sm">
            <KindBadge kind={plan.kind} />
            {!personal && <span className="small muted">{plan.members.length} people</span>}
          </div>
          <h1>{plan.name}</h1>
          {!personal && <p className="muted">{[plan.destination, dateRange(plan.startDate, plan.endDate)].filter(Boolean).join(' · ')}</p>}
        </div>
        <div className="row-sm">
          {!personal && (
            <button type="button" className="btn btn-ghost" onClick={share}>
              Share link
            </button>
          )}
          <button type="button" className="btn btn-ghost danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>

      <div className="summary">
        <div>
          <p className="label">Spent</p>
          <p className="big">{formatINR(plan.spent)}</p>
        </div>
        {plan.budget ? (
          <div>
            <p className="label">Budget</p>
            <p className="big">{formatINR(plan.budget)}</p>
          </div>
        ) : null}
        {!personal && (
          <div>
            <p className="label">Planned in itinerary</p>
            <p className="big">{formatINR(plan.plannedCost)}</p>
          </div>
        )}
        {plan.budget ? (
          <div className="summary-bar">
            <Bar value={plan.spent} max={plan.budget} status={limitStatus(plan.spent, plan.budget)} />
            <p className="small muted">
              {plan.spent > plan.budget
                ? `${formatINR(plan.spent - plan.budget)} over budget`
                : `${formatINR(plan.budget - plan.spent)} left`}
            </p>
          </div>
        ) : null}
      </div>

      {plan.byCategory.length > 0 && (
        <div className="cat-strip" aria-label="Spend by category">
          {plan.byCategory.map((c) => (
            <span
              key={c.category}
              title={`${c.category}: ${formatINR(c.amount)}`}
              style={{ flexGrow: c.amount, background: categoryColor[c.category] }}
            />
          ))}
        </div>
      )}
      {plan.byCategory.length > 0 && (
        <div className="legend">
          {plan.byCategory.map((c) => (
            <span key={c.category}>
              <i style={{ background: categoryColor[c.category] }} />
              {c.category} {formatINR(c.amount)}
            </span>
          ))}
        </div>
      )}

      {tabs.length > 1 && (
        <div className="tab-row" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={current === t}
              className={current === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t === 'balances' ? 'Settle up' : t[0].toUpperCase() + t.slice(1)}
              {t === 'balances' && plan.transfers.length > 0 && <span className="count">{plan.transfers.length}</span>}
            </button>
          ))}
        </div>
      )}

      {current === 'expenses' && <ExpensesTab plan={plan} onChange={reload} />}
      {current === 'itinerary' && <ItineraryTab plan={plan} onChange={reload} />}
      {current === 'balances' && <BalancesTab plan={plan} onChange={reload} />}
      {current === 'people' && <PeopleTab plan={plan} onChange={reload} />}
    </div>
  )
}
