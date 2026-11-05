// shared types used by the api and the web app.
// all money is in paise (integer) so we never hit floating point errors.

export type PlanKind = 'trip' | 'event' | 'personal'

export type Category =
  | 'food'
  | 'travel'
  | 'stay'
  | 'shopping'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'other'

export const CATEGORIES: Category[] = [
  'food',
  'travel',
  'stay',
  'shopping',
  'bills',
  'entertainment',
  'health',
  'other',
]

export type SplitType = 'equal' | 'exact' | 'percent'

export type ItemKind = 'travel' | 'food' | 'stay' | 'activity'

export type Member = {
  id: string
  planId: string
  name: string
  phone: string | null
  email: string | null
  isHost: boolean
}

export type Share = {
  memberId: string
  amount: number
}

export type Expense = {
  id: string
  planId: string
  title: string
  category: Category
  amount: number
  paidBy: string
  spentOn: string // yyyy-mm-dd
  splitType: SplitType
  shares: Share[]
}

export type Settlement = {
  id: string
  planId: string
  fromMember: string
  toMember: string
  amount: number
  paidOn: string
}

export type ItineraryItem = {
  id: string
  planId: string
  day: number
  time: string | null
  kind: ItemKind
  title: string
  place: string | null
  travelMode: string | null
  cost: number
  notes: string | null
}

export type Plan = {
  id: string
  kind: PlanKind
  name: string
  destination: string | null
  startDate: string | null
  endDate: string | null
  budget: number | null
  createdAt: string
}

export type PlanSummary = Plan & {
  memberCount: number
  spent: number
}

// what the api sends for one plan page
export type PlanDetail = Plan & {
  members: Member[]
  expenses: Expense[]
  settlements: Settlement[]
  itinerary: ItineraryItem[]
  balances: Balance[]
  transfers: Transfer[]
  byCategory: CategoryTotal[]
  spent: number
  plannedCost: number
}

export type Balance = {
  memberId: string
  paid: number
  owes: number
  net: number // + means others owe them, - means they owe
}

export type Transfer = {
  from: string
  to: string
  amount: number
}

export type CategoryTotal = {
  category: Category
  amount: number
}
