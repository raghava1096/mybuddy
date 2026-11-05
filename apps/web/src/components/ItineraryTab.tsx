import { useState, type FormEvent } from 'react'
import { formatINR, toPaise, type ItemKind, type PlanDetail } from '@mybuddy/core'
import { api } from '../api'
import { Card, ErrorBox } from '../ui'

type Props = { plan: PlanDetail; onChange: () => void }

const kindIcon: Record<ItemKind, string> = { travel: '✈', food: '🍽', stay: '🏨', activity: '★' }

// date of day n, if the plan has a start date
function dayDate(start: string | null, day: number) {
  if (!start) return ''
  const d = new Date(`${start}T00:00:00`)
  d.setDate(d.getDate() + day - 1)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function tripDays(start: string | null, end: string | null) {
  if (!start || !end) return 1
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1)
}

export default function ItineraryTab({ plan, onChange }: Props) {
  const totalDays = Math.max(tripDays(plan.startDate, plan.endDate), ...plan.itinerary.map((i) => i.day), 1)

  const [day, setDay] = useState(1)
  const [time, setTime] = useState('')
  const [kind, setKind] = useState<ItemKind>('activity')
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [travelMode, setTravelMode] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.addItem(plan.id, {
        day,
        time: time || null,
        kind,
        title,
        place: place || null,
        travelMode: kind === 'travel' || travelMode ? travelMode || null : null,
        cost: cost ? toPaise(cost) : 0,
        notes: notes || null,
      })
      setTitle('')
      setPlace('')
      setTravelMode('')
      setCost('')
      setNotes('')
      setTime('')
      onChange()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const remove = async (id: string) => {
    await api.deleteItem(id)
    onChange()
  }

  const days = Array.from({ length: totalDays }, (_, i) => i + 1)

  return (
    <div className="two-col">
      <Card title="Add to plan">
        <form className="stack-sm" onSubmit={submit}>
          <div className="grid-2">
            <label className="field">
              <span>Day</span>
              <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {[...days, totalDays + 1].map((d) => (
                  <option key={d} value={d}>
                    Day {d} {dayDate(plan.startDate, d) && `· ${dayDate(plan.startDate, d)}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <div className="seg">
            {(['travel', 'stay', 'food', 'activity'] as ItemKind[]).map((k) => (
              <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                {kindIcon[k]} {k}
              </button>
            ))}
          </div>
          <label className="field">
            <span>What</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'travel' ? 'Bengaluru to Goa' : kind === 'stay' ? 'Check in' : kind === 'food' ? 'Lunch' : 'Beach walk'}
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Place</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Candolim" />
            </label>
            {kind === 'travel' ? (
              <label className="field">
                <span>Mode</span>
                <input value={travelMode} onChange={(e) => setTravelMode(e.target.value)} placeholder="Flight / train / cab" list="modes" />
                <datalist id="modes">
                  <option value="Flight" />
                  <option value="Train" />
                  <option value="Bus" />
                  <option value="Cab" />
                  <option value="Own car" />
                  <option value="Scooter" />
                </datalist>
              </label>
            ) : (
              <label className="field">
                <span>Est. cost (₹)</span>
                <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </label>
            )}
          </div>
          {kind === 'travel' && (
            <label className="field">
              <span>Est. cost (₹)</span>
              <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
            </label>
          )}
          <label className="field">
            <span>Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="PNR, booking id, tips" />
          </label>
          {error && <ErrorBox message={error} />}
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </Card>

      <div className="stack-sm">
        {days.map((d) => {
          const items = plan.itinerary.filter((i) => i.day === d)
          const dayCost = items.reduce((s, i) => s + i.cost, 0)
          return (
            <Card
              key={d}
              title={`Day ${d}${dayDate(plan.startDate, d) ? ` · ${dayDate(plan.startDate, d)}` : ''}`}
              action={dayCost > 0 ? <span className="small muted">{formatINR(dayCost)}</span> : undefined}
            >
              {items.length === 0 ? (
                <p className="small muted">Nothing planned yet.</p>
              ) : (
                <ol className="timeline">
                  {items.map((i) => (
                    <li key={i.id} className={`tl-item tl-${i.kind}`}>
                      <span className="tl-icon" aria-hidden="true">
                        {kindIcon[i.kind]}
                      </span>
                      <div className="grow">
                        <p className="strong">
                          {i.time && <span className="mono muted">{i.time} </span>}
                          {i.title}
                        </p>
                        <p className="small muted">{[i.place, i.travelMode, i.notes].filter(Boolean).join(' · ')}</p>
                      </div>
                      {i.cost > 0 && <span className="amount small">{formatINR(i.cost)}</span>}
                      <button type="button" className="icon-btn" aria-label={`Remove ${i.title}`} onClick={() => remove(i.id)}>
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
