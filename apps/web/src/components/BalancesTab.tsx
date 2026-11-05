import { formatINR, mailLink, settleMessage, whatsappLink, type PlanDetail } from '@mybuddy/core'
import { api } from '../api'
import { Card, formatDate } from '../ui'

type Props = { plan: PlanDetail; onChange: () => void }

export default function BalancesTab({ plan, onChange }: Props) {
  const byId = Object.fromEntries(plan.members.map((m) => [m.id, m]))

  const markPaid = async (from: string, to: string, amount: number) => {
    await api.settle(plan.id, { from, to, amount })
    onChange()
  }

  return (
    <div className="two-col">
      <Card title="Who pays whom">
        {plan.transfers.length === 0 ? (
          <p className="muted">All settled. Nobody owes anything.</p>
        ) : (
          <>
            <p className="small muted">
              The fewest payments that clear everything ({plan.transfers.length} instead of every person paying every other).
            </p>
            <ul className="list">
              {plan.transfers.map((t) => {
                const from = byId[t.from]
                const to = byId[t.to]
                const message = settleMessage(to.name, from.name, t.amount, plan.name)
                return (
                  <li key={`${t.from}-${t.to}`} className="transfer">
                    <p>
                      <strong>{from.name}</strong> pays <strong>{to.name}</strong>
                    </p>
                    <p className="amount big-amount">{formatINR(t.amount)}</p>
                    <div className="row-sm wrap">
                      <a className="btn btn-small btn-wa" href={whatsappLink(from.phone, message)} target="_blank" rel="noreferrer">
                        WhatsApp {from.name}
                      </a>
                      <a className="btn btn-small btn-ghost" href={mailLink(from.email, `${plan.name}: settle up`, message)}>
                        Email
                      </a>
                      <button type="button" className="btn btn-small btn-ghost" onClick={() => markPaid(t.from, t.to, t.amount)}>
                        Mark paid
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <div className="stack-sm">
        <Card title="Balances">
          <ul className="list">
            {plan.balances.map((b) => (
              <li key={b.memberId} className="list-row">
                <div className="grow">
                  <p className="strong">{byId[b.memberId].name}</p>
                  <p className="small muted">
                    paid {formatINR(b.paid)} · share {formatINR(b.owes)}
                  </p>
                </div>
                <p className={`amount ${b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : ''}`}>
                  {b.net > 0 ? 'gets ' : b.net < 0 ? 'owes ' : ''}
                  {formatINR(Math.abs(b.net))}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        {plan.settlements.length > 0 && (
          <Card title="Payments made">
            <ul className="list">
              {plan.settlements.map((s) => (
                <li key={s.id} className="list-row">
                  <div className="grow">
                    <p>
                      {byId[s.fromMember]?.name} → {byId[s.toMember]?.name}
                    </p>
                    <p className="small muted">{formatDate(s.paidOn)}</p>
                  </div>
                  <p className="amount">{formatINR(s.amount)}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}
