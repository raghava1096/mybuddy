import { randomUUID } from 'node:crypto'
import {
  buildShares,
  computeBalances,
  simplifyDebts,
  totalsByCategory,
  type Category,
  type Expense,
  type ItineraryItem,
  type Member,
  type Plan,
  type PlanDetail,
  type PlanKind,
  type PlanSummary,
  type Settlement,
  type Share,
  type SplitType,
} from '@mybuddy/core'
import { query } from './db'

// all sql lives here. routes call these functions.
// dates come back as text ('yyyy-mm-dd') and sums are cast to int so pg doesn't return strings.

const id = () => randomUUID()

const planCols = `id, kind, name, destination, start_date::text as "startDate", end_date::text as "endDate",
  budget, created_at::text as "createdAt"`

export async function listPlans(): Promise<PlanSummary[]> {
  return (await query(`
    select ${planCols},
      (select count(*)::int from members m where m.plan_id = p.id) as "memberCount",
      (select coalesce(sum(amount), 0)::int from expenses e where e.plan_id = p.id) as spent
    from plans p
    order by coalesce(start_date, created_at::date) desc
  `)) as PlanSummary[]
}

export type NewPlan = {
  kind: PlanKind
  name: string
  destination?: string | null
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  members: { name: string; phone?: string | null; email?: string | null }[]
}

export async function createPlan(input: NewPlan): Promise<string> {
  const planId = id()
  await query(
    `insert into plans (id, kind, name, destination, start_date, end_date, budget)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [planId, input.kind, input.name, input.destination ?? null, input.startDate || null, input.endDate || null, input.budget ?? null],
  )
  // first member is the host
  for (const [i, m] of input.members.entries()) {
    await addMember(planId, { ...m, isHost: i === 0 })
  }
  return planId
}

export async function deletePlan(planId: string) {
  await query('delete from plans where id = $1', [planId])
}

export async function addMember(
  planId: string,
  m: { name: string; phone?: string | null; email?: string | null; isHost?: boolean },
) {
  const memberId = id()
  await query(
    'insert into members (id, plan_id, name, phone, email, is_host) values ($1, $2, $3, $4, $5, $6)',
    [memberId, planId, m.name, m.phone || null, m.email || null, m.isHost ?? false],
  )
  return memberId
}

export type NewExpense = {
  title: string
  category: Category
  amount: number
  paidBy: string
  spentOn: string
  splitType: SplitType
  split: Share[] // member ids, plus amount or percent depending on splitType
}

export async function addExpense(planId: string, input: NewExpense) {
  const members = await getMembers(planId)
  const ids = new Set(members.map((m) => m.id))
  if (!ids.has(input.paidBy)) throw new Error('payer is not part of this plan')
  if (input.split.some((s) => !ids.has(s.memberId))) throw new Error('split has someone not in this plan')

  // core does the maths and throws if the numbers don't add up
  const shares = buildShares(input.splitType, input.amount, input.split)

  const expenseId = id()
  await query(
    `insert into expenses (id, plan_id, title, category, amount, paid_by, spent_on, split_type)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [expenseId, planId, input.title, input.category, input.amount, input.paidBy, input.spentOn, input.splitType],
  )
  for (const s of shares) {
    await query('insert into expense_shares (expense_id, member_id, amount) values ($1, $2, $3)', [
      expenseId,
      s.memberId,
      s.amount,
    ])
  }
  return expenseId
}

export async function deleteExpense(expenseId: string) {
  await query('delete from expenses where id = $1', [expenseId])
}

export async function addSettlement(planId: string, from: string, to: string, amount: number) {
  await query(
    'insert into settlements (id, plan_id, from_member, to_member, amount) values ($1, $2, $3, $4, $5)',
    [id(), planId, from, to, amount],
  )
}

export type NewItem = Omit<ItineraryItem, 'id' | 'planId'>

export async function addItem(planId: string, item: NewItem) {
  await query(
    `insert into itinerary_items (id, plan_id, day, time, kind, title, place, travel_mode, cost, notes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id(), planId, item.day, item.time || null, item.kind, item.title, item.place || null, item.travelMode || null, item.cost, item.notes || null],
  )
}

export async function deleteItem(itemId: string) {
  await query('delete from itinerary_items where id = $1', [itemId])
}

async function getMembers(planId: string): Promise<Member[]> {
  return (await query(
    `select id, plan_id as "planId", name, phone, email, is_host as "isHost"
     from members where plan_id = $1 order by is_host desc, name`,
    [planId],
  )) as Member[]
}

export async function getPlan(planId: string): Promise<PlanDetail | null> {
  const [plan] = (await query(`select ${planCols} from plans where id = $1`, [planId])) as Plan[]
  if (!plan) return null

  const members = await getMembers(planId)

  const expenseRows = await query(
    `select id, plan_id as "planId", title, category, amount, paid_by as "paidBy",
       spent_on::text as "spentOn", split_type as "splitType"
     from expenses where plan_id = $1 order by spent_on desc, created_at desc`,
    [planId],
  )
  const shareRows = await query(
    `select s.expense_id as "expenseId", s.member_id as "memberId", s.amount
     from expense_shares s join expenses e on e.id = s.expense_id
     where e.plan_id = $1`,
    [planId],
  )
  const expenses = expenseRows.map((e) => ({
    ...e,
    shares: shareRows.filter((s) => s.expenseId === e.id).map((s) => ({ memberId: s.memberId, amount: s.amount })),
  })) as Expense[]

  const settlements = (await query(
    `select id, plan_id as "planId", from_member as "fromMember", to_member as "toMember",
       amount, paid_on::text as "paidOn"
     from settlements where plan_id = $1 order by paid_on desc`,
    [planId],
  )) as Settlement[]

  const itinerary = (await query(
    `select id, plan_id as "planId", day, time, kind, title, place, travel_mode as "travelMode", cost, notes
     from itinerary_items where plan_id = $1 order by day, time nulls last`,
    [planId],
  )) as ItineraryItem[]

  const balances = computeBalances(members, expenses, settlements)

  return {
    ...plan,
    members,
    expenses,
    settlements,
    itinerary,
    balances,
    transfers: simplifyDebts(balances),
    byCategory: totalsByCategory(expenses),
    spent: expenses.reduce((s, e) => s + e.amount, 0),
    plannedCost: itinerary.reduce((s, i) => s + i.cost, 0),
  }
}

// spending across all plans, grouped by month and category, for the analytics page
export async function analytics(months: number) {
  const byMonth = await query(
    `select to_char(spent_on, 'YYYY-MM') as month, category, sum(amount)::int as amount
     from expenses
     where spent_on >= date_trunc('month', current_date) - make_interval(months => $1::int - 1)
     group by 1, 2 order by 1`,
    [months],
  )
  const byPlan = await query(
    `select p.id, p.name, p.kind, coalesce(sum(e.amount), 0)::int as amount
     from plans p left join expenses e on e.plan_id = p.id
     group by p.id, p.name, p.kind order by amount desc`,
  )
  const byKind = await query(
    `select p.kind, coalesce(sum(e.amount), 0)::int as amount
     from plans p join expenses e on e.plan_id = p.id
     where to_char(e.spent_on, 'YYYY-MM') = to_char(current_date, 'YYYY-MM')
     group by p.kind`,
  )
  return { byMonth, byPlan, thisMonthByKind: byKind }
}
