import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toPaise, type PlanKind } from '@mybuddy/core'
import { api } from '../api'
import { ErrorBox, kindLabel } from '../ui'

type Person = { name: string; phone: string; email: string }

export default function NewPlan() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<PlanKind>('trip')
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [people, setPeople] = useState<Person[]>([{ name: '', phone: '', email: '' }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const updatePerson = (i: number, field: keyof Person, value: string) =>
    setPeople(people.map((p, j) => (j === i ? { ...p, [field]: value } : p)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      setSaving(true)
      const members = people.filter((p) => p.name.trim())
      const { id } = await api.createPlan({
        kind,
        name,
        destination: kind === 'personal' ? null : destination || null,
        startDate: startDate || null,
        endDate: endDate || null,
        budget: budget ? toPaise(budget) : null,
        members,
      })
      navigate(`/plan/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form className="stack form-page" onSubmit={submit}>
      <h1>New plan</h1>

      <fieldset className="kind-pick">
        <legend>What are you planning?</legend>
        {(['trip', 'event', 'personal'] as PlanKind[]).map((k) => (
          <label key={k} className={kind === k ? 'picked' : ''}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            <strong>{kindLabel[k]}</strong>
            <span className="small muted">
              {k === 'trip' && 'Travel solo or with a group'}
              {k === 'event' && 'Birthday, wedding, party, offsite'}
              {k === 'personal' && 'Your own day to day expenses'}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid-2">
        <label className="field">
          <span>Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'personal' ? 'My expenses' : 'Goa long weekend'} />
        </label>
        {kind !== 'personal' && (
          <label className="field">
            <span>{kind === 'trip' ? 'Destination' : 'Venue / city'}</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Goa" />
          </label>
        )}
        {kind !== 'personal' && (
          <>
            <label className="field">
              <span>Start date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>End date</span>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </>
        )}
        <label className="field">
          <span>Budget (₹, optional)</span>
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="50000" />
        </label>
      </div>

      <div className="stack-sm">
        <h2>{kind === 'personal' ? 'You' : 'People'}</h2>
        <p className="small muted">The first person is the host. Phone and email are used for settle-up reminders.</p>
        {people.map((p, i) => (
          <div key={i} className="person-row">
            <input aria-label="Name" required={i === 0} value={p.name} onChange={(e) => updatePerson(i, 'name', e.target.value)} placeholder={i === 0 ? 'Your name' : 'Name'} />
            <input aria-label="Phone" value={p.phone} onChange={(e) => updatePerson(i, 'phone', e.target.value)} placeholder="Phone (with country code)" />
            <input aria-label="Email" type="email" value={p.email} onChange={(e) => updatePerson(i, 'email', e.target.value)} placeholder="Email" />
            {i > 0 && (
              <button type="button" className="icon-btn" aria-label="Remove person" onClick={() => setPeople(people.filter((_, j) => j !== i))}>
                ×
              </button>
            )}
          </div>
        ))}
        {kind !== 'personal' && (
          <button type="button" className="btn btn-ghost" onClick={() => setPeople([...people, { name: '', phone: '', email: '' }])}>
            + Add person
          </button>
        )}
      </div>

      {error && <ErrorBox message={error} />}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create plan'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
