import { toPaise } from '@mybuddy/core'
import * as plans from './plans'
import { query } from './db'

// demo data so the live site isn't empty on first visit.
// only runs when there are no plans at all.

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const monthDay = (monthsBack: number, dayOfMonth: number) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsBack)
  d.setDate(Math.min(dayOfMonth, 28))
  return d.toISOString().slice(0, 10)
}

export async function seedIfEmpty() {
  const [{ count }] = await query('select count(*)::int as count from plans')
  if (count > 0) return

  console.log('seeding demo data')

  // a group trip
  const goa = await plans.createPlan({
    kind: 'trip',
    name: 'Goa long weekend',
    destination: 'Goa',
    startDate: day(-6),
    endDate: day(-3),
    budget: toPaise('60000'),
    members: [
      { name: 'Raghava', phone: '+919164981654', email: 'raghavashettysar@gmail.com' },
      { name: 'Anil', phone: null, email: null },
      { name: 'Priya', phone: null, email: null },
      { name: 'Kiran', phone: null, email: null },
    ],
  })
  const goaPlan = await plans.getPlan(goa)
  const [r, a, p, k] = goaPlan!.members.map((m) => m.id)
  const all = [r, a, p, k].map((memberId) => ({ memberId, amount: 0 }))

  const items: plans.NewItem[] = [
    { day: 1, time: '06:30', kind: 'travel', title: 'Bengaluru to Goa', place: 'KIA → GOI', travelMode: 'Flight', cost: toPaise('18000'), notes: null },
    { day: 1, time: '13:00', kind: 'stay', title: 'Check in', place: 'Candolim beach villa', travelMode: null, cost: toPaise('21000'), notes: '3 nights' },
    { day: 1, time: '20:00', kind: 'food', title: 'Dinner', place: 'Fisherman’s Wharf', travelMode: null, cost: toPaise('4000'), notes: null },
    { day: 2, time: '09:00', kind: 'food', title: 'Breakfast', place: 'Villa', travelMode: null, cost: 0, notes: 'included' },
    { day: 2, time: '11:00', kind: 'activity', title: 'Fort Aguada and Baga', place: 'North Goa', travelMode: 'Scooter', cost: toPaise('2400'), notes: null },
    { day: 3, time: '10:00', kind: 'activity', title: 'Dudhsagar falls', place: 'Mollem', travelMode: 'Jeep safari', cost: toPaise('6000'), notes: null },
    { day: 4, time: '17:00', kind: 'travel', title: 'Goa to Bengaluru', place: 'GOI → KIA', travelMode: 'Flight', cost: toPaise('17000'), notes: null },
  ]
  for (const it of items) await plans.addItem(goa, it)

  const goaExpenses: plans.NewExpense[] = [
    { title: 'Flights both ways', category: 'travel', amount: toPaise('35200'), paidBy: r, spentOn: day(-6), splitType: 'equal', split: all },
    { title: 'Villa, 3 nights', category: 'stay', amount: toPaise('21000'), paidBy: a, spentOn: day(-6), splitType: 'equal', split: all },
    { title: 'Seafood dinner', category: 'food', amount: toPaise('4380'), paidBy: p, spentOn: day(-6), splitType: 'equal', split: all },
    { title: 'Scooter rent', category: 'travel', amount: toPaise('2400'), paidBy: k, spentOn: day(-5), splitType: 'equal', split: all },
    {
      title: 'Jeep safari',
      category: 'entertainment',
      amount: toPaise('6000'),
      paidBy: r,
      spentOn: day(-4),
      splitType: 'exact',
      split: [
        { memberId: r, amount: toPaise('2000') },
        { memberId: a, amount: toPaise('2000') },
        { memberId: p, amount: toPaise('2000') },
      ],
    },
  ]
  for (const e of goaExpenses) await plans.addExpense(goa, e)

  // an event being planned
  const bday = await plans.createPlan({
    kind: 'event',
    name: 'Amma’s 60th birthday',
    destination: 'Mysuru',
    startDate: day(20),
    endDate: day(20),
    budget: toPaise('80000'),
    members: [
      { name: 'Raghava', phone: '+919164981654', email: null },
      { name: 'Deepa', phone: null, email: null },
    ],
  })
  const bdayPlan = await plans.getPlan(bday)
  const [r2, d2] = bdayPlan!.members.map((m) => m.id)
  await plans.addItem(bday, { day: 1, time: '11:00', kind: 'activity', title: 'Pooja', place: 'Home', travelMode: null, cost: toPaise('8000'), notes: null })
  await plans.addItem(bday, { day: 1, time: '13:00', kind: 'food', title: 'Lunch for 60', place: 'Hotel hall', travelMode: null, cost: toPaise('42000'), notes: null })
  await plans.addExpense(bday, {
    title: 'Hall advance',
    category: 'bills',
    amount: toPaise('15000'),
    paidBy: d2,
    spentOn: day(-1),
    splitType: 'percent',
    split: [
      { memberId: r2, amount: 60 },
      { memberId: d2, amount: 40 },
    ],
  })

  // personal spending over the last few months
  const me = await plans.createPlan({
    kind: 'personal',
    name: 'My expenses',
    members: [{ name: 'Raghava', phone: null, email: null }],
  })
  const mePlan = await plans.getPlan(me)
  const meId = mePlan!.members[0].id
  const solo = [{ memberId: meId, amount: 0 }]
  const monthly: [string, plans.NewExpense['category'], string][] = [
    ['Groceries', 'food', '8200'],
    ['Electricity and internet', 'bills', '3100'],
    ['Petrol', 'travel', '4200'],
    ['Eating out', 'food', '3600'],
    ['Movies', 'entertainment', '1200'],
  ]
  for (let back = 4; back >= 0; back--) {
    for (const [i, [title, category, amount]] of monthly.entries()) {
      // vary amounts a little month to month
      const varied = Math.round(Number(amount) * (0.85 + ((back * 7 + i * 3) % 10) / 30))
      await plans.addExpense(me, {
        title,
        category,
        amount: toPaise(String(varied)),
        paidBy: meId,
        spentOn: monthDay(back, 3 + i * 5),
        splitType: 'equal',
        split: solo,
      })
    }
  }
  await plans.addExpense(me, { title: 'Headphones', category: 'shopping', amount: toPaise('7999'), paidBy: meId, spentOn: monthDay(1, 18), splitType: 'equal', split: solo })
  await plans.addExpense(me, { title: 'Health check-up', category: 'health', amount: toPaise('2500'), paidBy: meId, spentOn: monthDay(2, 9), splitType: 'equal', split: solo })
}
