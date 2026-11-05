import type { BudgetRule } from '@mybuddy/core'

// the monthly money plan is kept in the browser for now (no login yet)
export type BudgetSettings = BudgetRule & { income: string }

export const BUDGET_KEY = 'mybuddy.budget'

export const defaultBudget: BudgetSettings = {
  income: '',
  expensesPct: 50,
  loansPct: 20,
  investPct: 20,
}
