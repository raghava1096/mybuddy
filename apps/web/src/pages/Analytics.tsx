import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, formatINR, lastMonths, monthLabel, totalsByCategory, type Category, type PlanKind } from '@mybuddy/core'
import { api } from '../api'
import { useLoad } from '../hooks'
import { Bar, Card, ErrorBox, KindBadge, Loading, categoryColor } from '../ui'

export default function Analytics() {
  const [months, setMonths] = useState(6)
  const { data, error, slow, reload } = useLoad(() => api.analytics(months), [months])

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return <Loading slow={slow} />

  // fill in empty months so the chart has no gaps
  const keys = lastMonths(months)
  const rows = keys.map((key) => {
    const cats = data.byMonth.filter((r) => r.month === key)
    return {
      key,
      total: cats.reduce((s, c) => s + c.amount, 0),
      parts: CATEGORIES.map((c) => ({ category: c, amount: cats.find((x) => x.category === c)?.amount ?? 0 })).filter((p) => p.amount > 0),
    }
  })
  const peak = Math.max(...rows.map((r) => r.total), 1)
  const overall = totalsByCategory(data.byMonth.map((r) => ({ category: r.category as Category, amount: r.amount })))
  const grand = overall.reduce((s, c) => s + c.amount, 0)
  const avg = Math.round(grand / months / 100) * 100
  const topPlan = Math.max(...data.byPlan.map((p) => p.amount), 1)

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Where the money went, across every plan.</p>
        </div>
        <div className="seg">
          {[3, 6, 12].map((m) => (
            <button key={m} type="button" className={months === m ? 'on' : ''} onClick={() => setMonths(m)}>
              {m} months
            </button>
          ))}
        </div>
      </div>

      <div className="summary">
        <div>
          <p className="label">Total, last {months} months</p>
          <p className="big">{formatINR(grand)}</p>
        </div>
        <div>
          <p className="label">Monthly average</p>
          <p className="big">{formatINR(avg)}</p>
        </div>
        <div>
          <p className="label">Biggest category</p>
          <p className="big cap">{overall[0]?.category ?? '—'}</p>
        </div>
      </div>

      <Card title="Month by month">
        <div className="chart" role="img" aria-label="Spending per month, stacked by category">
          {rows.map((r) => (
            <div key={r.key} className="chart-col">
              <span className="chart-total">{r.total ? formatINR(r.total) : ''}</span>
              <div className="chart-bar" style={{ height: `${(r.total / peak) * 100}%` }}>
                {r.parts.map((p) => (
                  <span
                    key={p.category}
                    title={`${p.category}: ${formatINR(p.amount)}`}
                    style={{ flexGrow: p.amount, background: categoryColor[p.category] }}
                  />
                ))}
              </div>
              <span className="chart-label">{monthLabel(r.key)}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          {overall.map((c) => (
            <span key={c.category}>
              <i style={{ background: categoryColor[c.category] }} />
              {c.category}
            </span>
          ))}
        </div>
      </Card>

      <div className="two-col">
        <Card title="By category">
          <ul className="list">
            {overall.map((c) => (
              <li key={c.category} className="list-row col">
                <div className="row-between">
                  <span className="cap">{c.category}</span>
                  <span className="amount">
                    {formatINR(c.amount)} <span className="muted small">{Math.round((c.amount / grand) * 100)}%</span>
                  </span>
                </div>
                <Bar value={c.amount} max={overall[0].amount} color={categoryColor[c.category]} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="By plan (all time)">
          <ul className="list">
            {data.byPlan.map((p) => (
              <li key={p.id} className="list-row col">
                <div className="row-between">
                  <Link to={`/plan/${p.id}`}>{p.name}</Link>
                  <span className="row-sm">
                    <KindBadge kind={p.kind as PlanKind} />
                    <span className="amount">{formatINR(p.amount)}</span>
                  </span>
                </div>
                <Bar value={p.amount} max={topPlan} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
