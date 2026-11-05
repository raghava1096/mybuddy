import type { Balance, Expense, Member, Settlement, Transfer } from './types'

// net position of each member in a plan.
// paid  = what they paid for the group
// owes  = their share of all expenses
// payments already made (settlements) move money between the two sides.
export function computeBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[],
): Balance[] {
  const map = new Map<string, Balance>()
  for (const m of members) map.set(m.id, { memberId: m.id, paid: 0, owes: 0, net: 0 })

  for (const e of expenses) {
    const payer = map.get(e.paidBy)
    if (payer) payer.paid += e.amount
    for (const s of e.shares) {
      const b = map.get(s.memberId)
      if (b) b.owes += s.amount
    }
  }

  for (const b of map.values()) b.net = b.paid - b.owes

  // if A paid B back, A owes less and B is owed less
  for (const s of settlements) {
    const from = map.get(s.fromMember)
    const to = map.get(s.toMember)
    if (from) from.net += s.amount
    if (to) to.net -= s.amount
  }

  return [...map.values()]
}

// turn balances into the fewest payments that clear everything.
// greedy: biggest debtor pays biggest creditor, repeat. gives at most n - 1 payments.
export function simplifyDebts(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.memberId, amount: b.net }))
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.memberId, amount: -b.net }))

  // sort biggest first, then by id so the result is always the same
  const byAmount = (a: { id: string; amount: number }, b: { id: string; amount: number }) =>
    b.amount - a.amount || a.id.localeCompare(b.id)
  creditors.sort(byAmount)
  debtors.sort(byAmount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay })
    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount === 0) i++
    if (creditors[j].amount === 0) j++
  }

  return transfers
}
