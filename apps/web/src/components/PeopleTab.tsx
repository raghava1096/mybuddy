import { useState, type FormEvent } from 'react'
import { mailLink, whatsappLink, type PlanDetail } from '@mybuddy/core'
import { api } from '../api'
import { Card, ErrorBox, dateRange } from '../ui'

type Props = { plan: PlanDetail; onChange: () => void }

export default function PeopleTab({ plan, onChange }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.addMember(plan.id, { name, phone: phone || null, email: email || null })
      setName('')
      setPhone('')
      setEmail('')
      onChange()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // invite text includes the plan link so they can open it
  const invite = `You're invited to "${plan.name}"${plan.destination ? ` in ${plan.destination}` : ''} (${dateRange(plan.startDate, plan.endDate)}). See the plan and add expenses here: ${window.location.href}`

  return (
    <div className="two-col">
      <Card title="Add person">
        <form className="stack-sm" onSubmit={submit}>
          <label className="field">
            <span>Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <ErrorBox message={error} />}
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
      </Card>

      <Card title={`People (${plan.members.length})`}>
        <ul className="list">
          {plan.members.map((m) => (
            <li key={m.id} className="list-row">
              <span className="avatar" aria-hidden="true">
                {m.name[0]?.toUpperCase()}
              </span>
              <div className="grow">
                <p className="strong">
                  {m.name} {m.isHost && <span className="badge badge-trip">Host</span>}
                </p>
                <p className="small muted">{[m.phone, m.email].filter(Boolean).join(' · ') || 'no contact added'}</p>
              </div>
              {!m.isHost && (
                <div className="row-sm">
                  <a className="btn btn-small btn-wa" href={whatsappLink(m.phone, invite)} target="_blank" rel="noreferrer">
                    Invite
                  </a>
                  {m.email && (
                    <a className="btn btn-small btn-ghost" href={mailLink(m.email, `Join "${plan.name}" on MyBuddy`, invite)}>
                      Email
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
