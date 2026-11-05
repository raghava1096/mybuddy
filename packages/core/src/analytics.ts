import type { Category, CategoryTotal, Expense } from './types'

export function totalsByCategory(expenses: Pick<Expense, 'category' | 'amount'>[]): CategoryTotal[] {
  const map = new Map<Category, number>()
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

// "2026-11-05" -> "2026-11"
export function monthKey(date: string): string {
  return date.slice(0, 7)
}

// last n month keys ending at the given month, oldest first
export function lastMonths(n: number, from = new Date()): string[] {
  const out: string[] = []
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(from.getFullYear(), from.getMonth() - k, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
}
