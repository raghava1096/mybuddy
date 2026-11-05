# MyBuddy

Plan trips and events, track your own and shared expenses, split them with friends and settle up, and plan your monthly money.

- Web: https://raghava1096.github.io/mybuddy/
- API: hosted on Render (free tier, first request after a while takes ~30s to wake up)

## What it does

- **Plans**: a trip, an event or just personal spending. Trips and events have people, dates, a budget and a day by day itinerary (travel, stay, food, activities with estimated cost).
- **Expenses**: who paid, category, date, and how it's split: equally, exact amounts, or by percentage.
- **Settle up**: balances for everyone and the fewest payments that clear all debts. One tap opens WhatsApp or email with the message filled in. "Mark paid" records the payment.
- **Analytics**: spend per month stacked by category, totals by category and by plan.
- **Money plan**: split monthly income into expenses / loans / investing by %, warning at 80% of the expense limit and an alert when it's crossed. Savings goal calculator with expected return.

## Stack

| | |
|---|---|
| Monorepo | npm workspaces |
| `packages/core` | TypeScript. Shared types and all the money logic: parsing, splitting, balances, settle up, goals. Unit tested with Vitest. |
| `apps/api` | Node, Express, TypeScript (run with tsx), zod for validation, Postgres |
| `apps/web` | React 18, Vite, React Router (hash routes), plain CSS |
| Database | Postgres on Neon. Locally it uses PGlite (Postgres in-process) so there is nothing to install. |
| Hosting | Web on GitHub Pages (GitHub Actions), API on Render |

```
packages/core/src
  types.ts      shared types (Plan, Expense, Share, Balance, Transfer…)
  money.ts      rupees <-> paise, INR formatting
  split.ts      equal / exact / percent splits that always add up
  settle.ts     balances and simplifyDebts (fewest payments)
  analytics.ts  category totals, month helpers
  planning.ts   savings goal maths, income split, limit status
  share.ts      whatsapp / email links
apps/api/src
  index.ts      express app, cors, error handler
  routes.ts     endpoints + zod validation
  plans.ts      all sql
  db.ts         postgres or pglite, schema
  seed.ts       demo data on first run
apps/web/src
  pages/        Home, NewPlan, PlanPage, Analytics, Planner
  components/   Expenses, Itinerary, Settle up, People tabs
```

## Run locally

```
npm install
npm run dev:api   # http://localhost:4000, uses pglite in ./apps/api/.pgdata
npm run dev:web   # http://localhost:5173
npm test          # core unit tests
```

## API

| Method | Path | |
|---|---|---|
| GET | /api/plans | all plans with member count and total spent |
| POST | /api/plans | create a plan with its people |
| GET | /api/plans/:id | plan with people, expenses, itinerary, balances, transfers |
| DELETE | /api/plans/:id | |
| POST | /api/plans/:id/members | |
| POST | /api/plans/:id/expenses | `splitType` equal / exact / percent |
| DELETE | /api/expenses/:id | |
| POST | /api/plans/:id/itinerary | |
| DELETE | /api/itinerary/:id | |
| POST | /api/plans/:id/settlements | record a payment between two people |
| GET | /api/analytics?months=6 | month x category totals, totals per plan |

## Not done yet

- Login and per-user data. Right now anyone with a plan link can see and edit it.
- Real push notifications and invite acceptance.
- Mobile app. The plan is Expo (React Native) in `apps/mobile`, reusing `packages/core`.
- The money plan is saved in the browser, not the database.
