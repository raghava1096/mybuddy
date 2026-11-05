import { describe, expect, it } from 'vitest'
import {
  buildShares,
  computeBalances,
  limitStatus,
  monthlySavingNeeded,
  simplifyDebts,
  splitEqual,
  splitIncome,
  splitPercent,
  toPaise,
  whatsappLink,
  type Expense,
  type Member,
} from '../src/index'

const member = (id: string): Member => ({ id, planId: 'p', name: id, phone: null, email: null, isHost: false })

const expense = (paidBy: string, amount: number, shares: [string, number][]): Expense => ({
  id: Math.random().toString(),
  planId: 'p',
  title: 'x',
  category: 'food',
  amount,
  paidBy,
  spentOn: '2026-11-01',
  splitType: 'exact',
  shares: shares.map(([memberId, amt]) => ({ memberId, amount: amt })),
})

describe('toPaise', () => {
  it('parses rupees without float errors', () => {
    expect(toPaise('0.1')).toBe(10)
    expect(toPaise('1,250.5')).toBe(125050)
    expect(toPaise(99.99)).toBe(9999)
  })

  it('rejects bad input', () => {
    expect(() => toPaise('12.345')).toThrow()
    expect(() => toPaise('-5')).toThrow()
    expect(() => toPaise('abc')).toThrow()
  })
})

describe('split', () => {
  it('equal split always adds up, leftover goes to the first people', () => {
    const s = splitEqual(10000, ['a', 'b', 'c'])
    expect(s.map((x) => x.amount)).toEqual([3334, 3333, 3333])
    expect(s.reduce((t, x) => t + x.amount, 0)).toBe(10000)
  })

  it('percent split adds up exactly', () => {
    const s = splitPercent(1001, [
      { memberId: 'a', amount: 33.33 },
      { memberId: 'b', amount: 33.33 },
      { memberId: 'c', amount: 33.34 },
    ])
    expect(s.reduce((t, x) => t + x.amount, 0)).toBe(1001)
  })

  it('exact split must match the total', () => {
    expect(() =>
      buildShares('exact', 1000, [
        { memberId: 'a', amount: 400 },
        { memberId: 'b', amount: 500 },
      ]),
    ).toThrow()
  })

  it('percent must add to 100', () => {
    expect(() => splitPercent(1000, [{ memberId: 'a', amount: 60 }])).toThrow()
  })
})

describe('balances and settle up', () => {
  const members = ['a', 'b', 'c'].map(member)

  it('works out who is owed', () => {
    // a pays 300 for all three
    const b = computeBalances(members, [expense('a', 300, [['a', 100], ['b', 100], ['c', 100]])], [])
    expect(b.find((x) => x.memberId === 'a')!.net).toBe(200)
    expect(b.find((x) => x.memberId === 'b')!.net).toBe(-100)
  })

  it('a chain a -> b -> c becomes one payment a -> c', () => {
    const expenses = [
      expense('b', 500, [['a', 500]]), // a owes b 500
      expense('c', 500, [['b', 500]]), // b owes c 500
    ]
    const t = simplifyDebts(computeBalances(members, expenses, []))
    expect(t).toEqual([{ from: 'a', to: 'c', amount: 500 }])
  })

  it('settlements reduce what is owed', () => {
    const expenses = [expense('a', 300, [['a', 100], ['b', 100], ['c', 100]])]
    const settled = [{ id: 's', planId: 'p', fromMember: 'b', toMember: 'a', amount: 100, paidOn: '2026-11-02' }]
    const t = simplifyDebts(computeBalances(members, expenses, settled))
    expect(t).toEqual([{ from: 'c', to: 'a', amount: 100 }])
  })

  it('never needs more than n - 1 payments and clears everything', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map(member)
    const expenses = [
      expense('a', 1000, [['a', 200], ['b', 200], ['c', 200], ['d', 200], ['e', 200]]),
      expense('b', 700, [['c', 350], ['d', 350]]),
      expense('e', 90, [['a', 30], ['b', 30], ['e', 30]]),
    ]
    const balances = computeBalances(many, expenses, [])
    const t = simplifyDebts(balances)
    expect(t.length).toBeLessThanOrEqual(many.length - 1)

    // apply the transfers, everyone should end at zero
    const net = new Map(balances.map((b) => [b.memberId, b.net]))
    for (const x of t) {
      net.set(x.from, net.get(x.from)! + x.amount)
      net.set(x.to, net.get(x.to)! - x.amount)
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true)
  })
})

describe('planning', () => {
  it('monthly saving with no returns is a simple divide', () => {
    expect(monthlySavingNeeded(120000, 0, 12)).toBe(10000)
    expect(monthlySavingNeeded(120000, 120000, 12)).toBe(0)
  })

  it('returns lower the monthly amount', () => {
    const plain = monthlySavingNeeded(10000000, 0, 60)
    const withReturns = monthlySavingNeeded(10000000, 0, 60, 12)
    expect(withReturns).toBeLessThan(plain)
  })

  it('splits income and flags limits', () => {
    expect(splitIncome(100000, { expensesPct: 50, loansPct: 20, investPct: 20 })).toEqual({
      expenses: 50000,
      loans: 20000,
      invest: 20000,
      leftover: 10000,
    })
    expect(limitStatus(70, 100)).toBe('ok')
    expect(limitStatus(85, 100)).toBe('warn')
    expect(limitStatus(101, 100)).toBe('over')
  })
})

describe('share links', () => {
  it('builds a whatsapp link with only digits', () => {
    expect(whatsappLink('+91 91649 81654', 'hi')).toBe('https://wa.me/919164981654?text=hi')
  })
})
