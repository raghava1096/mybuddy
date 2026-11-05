import type { Share, SplitType } from './types'

// split a total between members. the result always adds up to the total exactly.
// leftover paise (e.g. 100 / 3) go to the first members in the list, one each.

export function splitEqual(total: number, memberIds: string[]): Share[] {
  if (memberIds.length === 0) throw new Error('pick at least one person to split with')
  const base = Math.floor(total / memberIds.length)
  let left = total - base * memberIds.length
  return memberIds.map((memberId) => {
    const extra = left > 0 ? 1 : 0
    left -= extra
    return { memberId, amount: base + extra }
  })
}

export function splitExact(total: number, amounts: Share[]): Share[] {
  const sum = amounts.reduce((s, a) => s + a.amount, 0)
  if (sum !== total) throw new Error('exact amounts must add up to the total')
  return amounts.filter((a) => a.amount > 0)
}

// percents like [{memberId, amount: 50}, ...] where amount is the percent.
// round down each share, then hand out the leftover paise by biggest remainder.
export function splitPercent(total: number, percents: Share[]): Share[] {
  const sum = percents.reduce((s, p) => s + p.amount, 0)
  if (Math.abs(sum - 100) > 0.001) throw new Error('percentages must add up to 100')

  const raw = percents.map((p) => {
    const exact = (total * p.amount) / 100
    return { memberId: p.memberId, amount: Math.floor(exact), rest: exact - Math.floor(exact) }
  })

  let left = total - raw.reduce((s, r) => s + r.amount, 0)
  const order = [...raw].sort((a, b) => b.rest - a.rest)
  for (const r of order) {
    if (left === 0) break
    r.amount += 1
    left -= 1
  }

  return raw.filter((r) => r.amount > 0).map(({ memberId, amount }) => ({ memberId, amount }))
}

export function buildShares(type: SplitType, total: number, input: Share[]): Share[] {
  if (total <= 0) throw new Error('amount must be more than zero')
  if (type === 'equal') return splitEqual(total, input.map((i) => i.memberId))
  if (type === 'exact') return splitExact(total, input)
  return splitPercent(total, input)
}
