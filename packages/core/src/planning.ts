// money planning: savings goals and a monthly budget split.

// how much to put away every month to reach a target.
// with a return rate it uses the standard future value of a monthly SIP:
//   FV = saved * (1+r)^n + P * ((1+r)^n - 1) / r      ->  solve for P
export function monthlySavingNeeded(
  target: number,
  saved: number,
  months: number,
  annualReturnPct = 0,
): number {
  if (months <= 0) throw new Error('months must be more than zero')
  const r = annualReturnPct / 100 / 12
  // round up to the next whole rupee, nobody saves 9,443.15 a month
  const toRupee = (paise: number) => Math.max(0, Math.ceil(paise / 100) * 100)
  if (r === 0) return toRupee((target - saved) / months)

  const growth = Math.pow(1 + r, months)
  const stillNeeded = target - saved * growth
  if (stillNeeded <= 0) return 0
  return toRupee((stillNeeded * r) / (growth - 1))
}

export type BudgetRule = {
  expensesPct: number
  loansPct: number
  investPct: number
}

export type BudgetSplit = {
  expenses: number
  loans: number
  invest: number
  leftover: number
}

// split monthly income by the user's percentages
export function splitIncome(income: number, rule: BudgetRule): BudgetSplit {
  const total = rule.expensesPct + rule.loansPct + rule.investPct
  if (total > 100) throw new Error('percentages add up to more than 100')
  const expenses = Math.floor((income * rule.expensesPct) / 100)
  const loans = Math.floor((income * rule.loansPct) / 100)
  const invest = Math.floor((income * rule.investPct) / 100)
  return { expenses, loans, invest, leftover: income - expenses - loans - invest }
}

export type LimitStatus = 'ok' | 'warn' | 'over'

// warn at 80% of the limit, alert once it's crossed
export function limitStatus(spent: number, limit: number): LimitStatus {
  if (limit <= 0) return 'ok'
  if (spent > limit) return 'over'
  if (spent >= limit * 0.8) return 'warn'
  return 'ok'
}
