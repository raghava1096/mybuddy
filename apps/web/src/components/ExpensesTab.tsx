import { useState, type FormEvent } from 'react'
import { CATEGORIES, formatINR, toPaise, type Category, type PlanDetail, type SplitType } from '@mybuddy/core'
import { api } from '../api'
import { Card, ErrorBox, categoryColor, formatDate, today } from '../ui'

type Props = { plan: PlanDetail; onChange: () => void }

export default function ExpensesTab({ plan, onChange }: Props) {
  const personal = plan.kind === 'personal'
  const host = plan.members[0]
  const names = Object.fromEntries(plan.members.map((m) => [m.id, m.name]))

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [spentOn, setSpentOn] = useState(today())
  const [paidBy, setPaidBy] = useState(host?.id ?? '')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [picked, setPicked] = useState<string[]>(plan.members.map((m) => m.id))
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      setSaving(true)
      const total = toPaise(amount)
      // equal: just the ids. exact: rupees -> paise. percent: plain numbers.
      const split = (personal ? [host.id] : picked).map((memberId) => ({
        memberId,
        amount:
          splitType === 'equal' ? 0 : splitType === 'exact' ? toPaise(values[memberId] || '0') : Number(values[memberId] || 0),
      }))
      await api.addExpense(plan.id, { title, category, amount: total, paidBy: personal ? host.id : paidBy, spentOn, splitType: personal ? 'equal' : splitType, split })
      setTitle('')
      setAmount('')
      setValues({})
      onChange()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    await api.deleteExpense(id)
    onChange()
  }

  return (
    <div className="two-col">
      <Card title="Add expense">
        <form className="stack-sm" onSubmit={submit}>
          <label className="field">
            <span>What for</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner at the beach" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Amount (₹)</span>
              <input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2400" />
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" required value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {!personal && (
            <>
              <label className="field">
                <span>Paid by</span>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  {plan.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span>Split</span>
                <div className="seg">
                  {(['equal', 'exact', 'percent'] as SplitType[]).map((t) => (
                    <button key={t} type="button" className={splitType === t ? 'on' : ''} onClick={() => setSplitType(t)}>
                      {t === 'equal' ? 'Equally' : t === 'exact' ? 'Exact ₹' : 'By %'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="split-list">
                {plan.members.map((m) => (
                  <label key={m.id} className="split-row">
                    <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                    <span>{m.name}</span>
                    {splitType !== 'equal' && picked.includes(m.id) && (
                      <input
                        className="split-value"
                        inputMode="decimal"
                        aria-label={`${m.name} ${splitType === 'exact' ? 'amount' : 'percent'}`}
                        placeholder={splitType === 'exact' ? '₹' : '%'}
                        value={values[m.id] ?? ''}
                        onChange={(e) => setValues({ ...values, [m.id]: e.target.value })}
                      />
                    )}
                  </label>
                ))}
              </div>
            </>
          )}

          {error && <ErrorBox message={error} />}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add expense'}
          </button>
        </form>
      </Card>

      <Card title={`Expenses (${plan.expenses.length})`}>
        {plan.expenses.length === 0 ? (
          <p className="muted">Nothing yet. Add the first expense.</p>
        ) : (
          <ul className="list">
            {plan.expenses.map((e) => (
              <li key={e.id} className="list-row">
                <i className="dot" style={{ background: categoryColor[e.category] }} aria-hidden="true" />
                <div className="grow">
                  <p className="strong">{e.title}</p>
                  <p className="small muted">
                    {formatDate(e.spentOn)} · {e.category}
                    {!personal && ` · paid by ${names[e.paidBy]} · split ${e.splitType} between ${e.shares.length}`}
                  </p>
                </div>
                <p className="amount">{formatINR(e.amount)}</p>
                <button type="button" className="icon-btn" aria-label={`Delete ${e.title}`} onClick={() => remove(e.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
