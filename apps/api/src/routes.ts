import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { CATEGORIES } from '@mybuddy/core'
import * as plans from './plans'

// every request body is checked with zod before it reaches the db

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be yyyy-mm-dd')
const paise = z.number().int().positive()
const text = (max = 120) => z.string().trim().min(1).max(max)
const optional = (max = 120) => z.string().trim().max(max).nullish()

const planBody = z.object({
  kind: z.enum(['trip', 'event', 'personal']),
  name: text(),
  destination: optional(),
  startDate: date.nullish().or(z.literal('')),
  endDate: date.nullish().or(z.literal('')),
  budget: paise.nullish(),
  members: z
    .array(z.object({ name: text(60), phone: optional(20), email: z.string().email().nullish().or(z.literal('')) }))
    .min(1, 'add at least one person')
    .max(30),
})

const memberBody = z.object({
  name: text(60),
  phone: optional(20),
  email: z.string().email().nullish().or(z.literal('')),
})

const expenseBody = z.object({
  title: text(),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  amount: paise,
  paidBy: z.string(),
  spentOn: date,
  splitType: z.enum(['equal', 'exact', 'percent']),
  split: z.array(z.object({ memberId: z.string(), amount: z.number().nonnegative() })).min(1),
})

const itemBody = z.object({
  day: z.number().int().min(1).max(60),
  time: optional(10),
  kind: z.enum(['travel', 'food', 'stay', 'activity']),
  title: text(),
  place: optional(),
  travelMode: optional(40),
  cost: z.number().int().nonnegative(),
  notes: optional(300),
})

const settleBody = z.object({ from: z.string(), to: z.string(), amount: paise })

// small wrapper so async errors reach the error handler
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next)

export const router = Router()

router.get('/plans', wrap(async (_req, res) => {
  res.json(await plans.listPlans())
}))

router.post('/plans', wrap(async (req, res) => {
  const body = planBody.parse(req.body)
  if (body.startDate && body.endDate && body.endDate < body.startDate) {
    return res.status(400).json({ error: 'end date is before start date' })
  }
  const planId = await plans.createPlan(body as plans.NewPlan)
  res.status(201).json({ id: planId })
}))

router.get('/plans/:id', wrap(async (req, res) => {
  const plan = await plans.getPlan(req.params.id)
  if (!plan) return res.status(404).json({ error: 'plan not found' })
  res.json(plan)
}))

router.delete('/plans/:id', wrap(async (req, res) => {
  await plans.deletePlan(req.params.id)
  res.status(204).end()
}))

router.post('/plans/:id/members', wrap(async (req, res) => {
  const memberId = await plans.addMember(req.params.id, memberBody.parse(req.body))
  res.status(201).json({ id: memberId })
}))

router.post('/plans/:id/expenses', wrap(async (req, res) => {
  const body = expenseBody.parse(req.body)
  const expenseId = await plans.addExpense(req.params.id, body as plans.NewExpense)
  res.status(201).json({ id: expenseId })
}))

router.delete('/expenses/:id', wrap(async (req, res) => {
  await plans.deleteExpense(req.params.id)
  res.status(204).end()
}))

router.post('/plans/:id/itinerary', wrap(async (req, res) => {
  await plans.addItem(req.params.id, itemBody.parse(req.body) as plans.NewItem)
  res.status(201).end()
}))

router.delete('/itinerary/:id', wrap(async (req, res) => {
  await plans.deleteItem(req.params.id)
  res.status(204).end()
}))

router.post('/plans/:id/settlements', wrap(async (req, res) => {
  const body = settleBody.parse(req.body)
  if (body.from === body.to) return res.status(400).json({ error: 'cannot pay yourself' })
  await plans.addSettlement(req.params.id, body.from, body.to, body.amount)
  res.status(201).end()
}))

router.get('/analytics', wrap(async (req, res) => {
  const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24)
  res.json(await plans.analytics(months))
}))
