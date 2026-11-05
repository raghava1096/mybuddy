import type { PlanDetail, PlanSummary } from '@mybuddy/core'

// set at build time in the deploy workflow, defaults to the local api
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `request failed (${res.status})`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  const textBody = await res.text()
  return (textBody ? JSON.parse(textBody) : undefined) as T
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) })
const del = (path: string) => call<void>(path, { method: 'DELETE' })

export type Analytics = {
  byMonth: { month: string; category: string; amount: number }[]
  byPlan: { id: string; name: string; kind: string; amount: number }[]
  thisMonthByKind: { kind: string; amount: number }[]
}

export const api = {
  plans: () => call<PlanSummary[]>('/plans'),
  plan: (id: string) => call<PlanDetail>(`/plans/${id}`),
  createPlan: (body: unknown) => post<{ id: string }>('/plans', body),
  deletePlan: (id: string) => del(`/plans/${id}`),
  addMember: (planId: string, body: unknown) => post(`/plans/${planId}/members`, body),
  addExpense: (planId: string, body: unknown) => post(`/plans/${planId}/expenses`, body),
  deleteExpense: (id: string) => del(`/expenses/${id}`),
  addItem: (planId: string, body: unknown) => post(`/plans/${planId}/itinerary`, body),
  deleteItem: (id: string) => del(`/itinerary/${id}`),
  settle: (planId: string, body: unknown) => post(`/plans/${planId}/settlements`, body),
  analytics: (months = 6) => call<Analytics>(`/analytics?months=${months}`),
}
