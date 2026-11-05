import { useState } from 'react'
import { formatINR, limitStatus, monthlySavingNeeded, splitIncome, toPaise } from '@mybuddy/core'
import { api } from '../api'
import { useLoad, useStored } from '../hooks'
import { Bar, Card } from '../ui'
import { BUDGET_KEY, defaultBudget, type BudgetSettings } from '../budget'

// parse a rupee string, or 0 if it's empty or invalid
const safePaise = (v: string) => {
  try {
    return v ? toPaise(v) : 0
  } catch {
    return 0
  }
}

export default function Planner() {
  const [budget, setBudget] = useStored<BudgetSettings>(BUDGET_KEY, defaultBudget)
  const { data } = useLoad(() => api.analytics(1))
  const spentThisMonth = data?.thisMonthByKind.reduce((s, k) => s + k.amount, 0) ?? 0

  const income = safePaise(budget.income)
  const pctTotal = budget.expensesPct + budget.loansPct + budget.investPct
  const split = pctTotal <= 100 ? splitIncome(income, budget) : null
  const status = split ? limitStatus(spentThisMonth, split.expenses) : 'ok'

  // goal calculator
  const [goal, setGoal] = useState({ name: 'Emergency fund', target: '300000', saved: '50000', months: '24', rate: '7' })
  const target = safePaise(goal.target)
  const saved = safePaise(goal.saved)
  const months = Number(goal.months) || 0
  const rate = Number(goal.rate) || 0
  let monthly = 0
  let goalError = ''
  try {
    monthly = months > 0 ? monthlySavingNeeded(target, saved, months, rate) : 0
  } catch (e) {
    goalError = (e as Error).message
  }
  const plainMonthly = months > 0 ? monthlySavingNeeded(target, saved, months, 0) : 0

  const setPct = (key: 'expensesPct' | 'loansPct' | 'investPct', value: string) =>
    setBudget({ ...budget, [key]: Math.max(0, Math.min(100, Number(value) || 0)) })

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Money plan</h1>
          <p className="muted">Split your income, set limits, and work out what to save for a goal.</p>
        </div>
      </div>

      <div className="two-col">
        <Card title="Monthly budget">
          <div className="stack-sm">
            <label className="field">
              <span>Monthly income (₹)</span>
              <input inputMode="decimal" value={budget.income} onChange={(e) => setBudget({ ...budget, income: e.target.value })} placeholder="150000" />
            </label>
            <div className="grid-3">
              <label className="field">
                <span>Expenses %</span>
                <input type="number" min={0} max={100} value={budget.expensesPct} onChange={(e) => setPct('expensesPct', e.target.value)} />
              </label>
              <label className="field">
                <span>Loans / EMI %</span>
                <input type="number" min={0} max={100} value={budget.loansPct} onChange={(e) => setPct('loansPct', e.target.value)} />
              </label>
              <label className="field">
                <span>Invest %</span>
                <input type="number" min={0} max={100} value={budget.investPct} onChange={(e) => setPct('investPct', e.target.value)} />
              </label>
            </div>
            {pctTotal > 100 && <p className="error-text">The percentages add up to {pctTotal}%. Bring them to 100% or less.</p>}

            {split && income > 0 && (
              <>
                <div className="split-bar" aria-hidden="true">
                  <span style={{ flexGrow: split.expenses, background: '#2563eb' }} />
                  <span style={{ flexGrow: split.loans, background: '#ea580c' }} />
                  <span style={{ flexGrow: split.invest, background: '#16a34a' }} />
                  <span style={{ flexGrow: split.leftover, background: '#cbd5e1' }} />
                </div>
                <ul className="list">
                  <li className="list-row"><span className="grow"><i className="dot" style={{ background: '#2563eb' }} /> Expenses limit</span><span className="amount">{formatINR(split.expenses)}</span></li>
                  <li className="list-row"><span className="grow"><i className="dot" style={{ background: '#ea580c' }} /> Loans / EMI</span><span className="amount">{formatINR(split.loans)}</span></li>
                  <li className="list-row"><span className="grow"><i className="dot" style={{ background: '#16a34a' }} /> Invest</span><span className="amount">{formatINR(split.invest)}</span></li>
                  <li className="list-row"><span className="grow"><i className="dot" style={{ background: '#cbd5e1' }} /> Unplanned</span><span className="amount">{formatINR(split.leftover)}</span></li>
                </ul>
                <p className="small muted">Saved in this browser. Yearly: invest {formatINR(split.invest * 12)}, spend up to {formatINR(split.expenses * 12)}.</p>
              </>
            )}
          </div>
        </Card>

        <Card title="This month vs limit">
          {split && split.expenses > 0 ? (
            <div className={`stack-sm status-${status}`}>
              <p className="big">{formatINR(spentThisMonth)}</p>
              <Bar value={spentThisMonth} max={split.expenses} status={status} />
              <p className="small">
                {status === 'over' && `⚠ Over the limit by ${formatINR(spentThisMonth - split.expenses)}. Time to slow down.`}
                {status === 'warn' && `Heads up: ${Math.round((spentThisMonth / split.expenses) * 100)}% of your limit is used.`}
                {status === 'ok' && `${formatINR(split.expenses - spentThisMonth)} left to spend this month.`}
              </p>
              <p className="small muted">You get a warning at 80% and an alert once you cross the limit.</p>
            </div>
          ) : (
            <p className="muted">Enter your income to see how this month is going.</p>
          )}
        </Card>
      </div>

      <Card title="Savings goal">
        <div className="two-col">
          <div className="stack-sm">
            <label className="field">
              <span>Goal</span>
              <input value={goal.name} onChange={(e) => setGoal({ ...goal, name: e.target.value })} />
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Target (₹)</span>
                <input inputMode="decimal" value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} />
              </label>
              <label className="field">
                <span>Already saved (₹)</span>
                <input inputMode="decimal" value={goal.saved} onChange={(e) => setGoal({ ...goal, saved: e.target.value })} />
              </label>
              <label className="field">
                <span>In months</span>
                <input type="number" min={1} value={goal.months} onChange={(e) => setGoal({ ...goal, months: e.target.value })} />
              </label>
              <label className="field">
                <span>Expected return % / year</span>
                <input type="number" min={0} step="0.5" value={goal.rate} onChange={(e) => setGoal({ ...goal, rate: e.target.value })} />
              </label>
            </div>
          </div>
          <div className="goal-result">
            <p className="label">Put away every month</p>
            <p className="huge">{goalError ? '—' : formatINR(monthly)}</p>
            <p className="small muted">
              to reach {formatINR(target)} for “{goal.name}” in {months} months
              {rate > 0 && `, assuming ${rate}% a year`}.
            </p>
            {rate > 0 && plainMonthly > monthly && (
              <p className="small">Investing instead of keeping it as cash saves you {formatINR(plainMonthly - monthly)} a month.</p>
            )}
            {split && split.invest > 0 && monthly > 0 && (
              <p className="small">That’s {Math.round((monthly / split.invest) * 100)}% of your monthly invest budget.</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
