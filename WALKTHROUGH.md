# MyBuddy walkthrough

Notes to explain the project end to end: the problem, the data, the logic, the code, and the trade-offs.

## 1. The problem

When you travel or host something with friends, three things are scattered: the plan (where, when, what each day), the money (who paid what), and settling up at the end. Your own monthly spending sits somewhere else again. MyBuddy puts them in one place:

1. Make a **plan**: a trip, an event, or just "my expenses".
2. Add the **itinerary** (trips/events) and **expenses** as they happen.
3. See **who owes whom** and send a WhatsApp or email to settle.
4. Look at **analytics** and a **money plan** for the month.

## 2. Data model

```
plans            id, kind (trip | event | personal), name, destination, start_date, end_date, budget
members          id, plan_id, name, phone, email, is_host
expenses         id, plan_id, title, category, amount, paid_by -> members, spent_on, split_type
expense_shares   expense_id, member_id, amount        (who owes what for one expense)
settlements      id, plan_id, from_member, to_member, amount, paid_on
itinerary_items  id, plan_id, day, time, kind (travel | stay | food | activity), title, place, travel_mode, cost, notes
```

- A personal plan is just a plan with one member. No special case in the code.
- `expense_shares` is a separate table, not a JSON column, so "how much does Priya owe across everything" is a plain SQL sum, and every share is tied to a real member with a foreign key.
- Deleting a plan cascades to everything under it (`on delete cascade`).
- Indexes on `plan_id` and `spent_on` because every page filters by plan and analytics filters by date.

## 3. Money is stored in paise

Every amount is an integer number of paise (₹1 = 100 paise). Floats can't represent 0.1 exactly, so `0.1 + 0.2 !== 0.3`. With integers that problem can't happen.

- `toPaise("1,250.50")` parses the string by hand (rupees part × 100 + decimals), so it never goes through a float. It rejects more than 2 decimals and negatives.
- `formatINR` uses `Intl.NumberFormat('en-IN')`, which gives Indian grouping like ₹1,10,389.
- Columns are `integer` (up to about ₹2.1 crore per row). Sums are cast to `int` in SQL because the `pg` driver returns `bigint` as a string.

## 4. Splitting an expense (`packages/core/src/split.ts`)

Rule: **the shares always add up to the total, to the paisa.**

- **Equal**: ₹100 between 3 → 3334, 3333, 3333 paise. Divide, round down, then give the leftover paise one each to the first people in the list.
- **Exact**: the user types each amount. It must add up to the total, otherwise it's an error.
- **Percent**: percents must add up to 100. Round each share down, then hand out the leftover paise to whoever lost the most in rounding (largest remainder). This is the fair way to round.

The API calls `buildShares` before saving anything, so bad numbers never reach the database.

## 5. Balances and settle up (`packages/core/src/settle.ts`)

**Balance** of each person = what they paid − their share of everything.
Positive means people owe them; negative means they owe.

Payments already made (settlements) move money: if Kiran paid Raghava ₹500, Kiran's balance goes up by 500 and Raghava's goes down by 500.

**Fewest payments (`simplifyDebts`)**:
1. Split people into debtors (negative) and creditors (positive).
2. Sort both biggest first.
3. The biggest debtor pays the biggest creditor as much as possible (the smaller of the two amounts).
4. Whoever reaches zero drops out, repeat.

Each step clears at least one person, so with n people there are at most n − 1 payments. Example: A owes B ₹500 and B owes C ₹500 becomes a single payment, A pays C ₹500.

The sum of all balances is always zero, so the loop always finishes with everyone at zero. A test checks exactly that with 5 people.

Note: finding the absolute minimum number of payments in every case is an NP-hard problem. The greedy approach is what apps like Splitwise use; it's simple, fast and never worse than n − 1.

## 6. WhatsApp and email

No server-side messaging. The app builds links:
- `https://wa.me/<digits>?text=<message>` opens WhatsApp with the chat and message ready.
- `mailto:<email>?subject=…&body=…` opens the mail app.

The user just hits send. It needs no API keys or paid services, and it works on phones and desktop.

## 7. Money plan (`packages/core/src/planning.ts`)

- **Income split**: income × each percentage (expenses, loans, invest), rounded down. What's left over shows as "unplanned". It errors if the percentages add up to more than 100.
- **Limit status**: under 80% is ok, 80–100% is a warning, over 100% is an alert. Home and Money plan both show it.
- **Savings goal**: with no returns it's (target − saved) / months. With returns it uses the standard SIP future value formula:

  FV = saved × (1+r)^n + P × ((1+r)^n − 1) / r, where r is the monthly rate. Solve it for P, the monthly amount.

  The result is rounded up to the next rupee.

## 8. API (`apps/api`)

- **Express** with one router. Each route validates the body with **zod** first (types, lengths, dates as yyyy-mm-dd, amounts as positive whole paise).
- All SQL is in `plans.ts`, written by hand with **parameterised queries** (`$1, $2`), so there's no SQL injection. There's no ORM, so the queries are easy to read and explain.
- `GET /plans/:id` loads the plan, members, expenses, shares, settlements and itinerary, then uses `core` to work out balances, transfers and category totals. The web app gets everything in one call.
- **Error handler**: a zod error or business error becomes a 400 with a readable message; anything unexpected becomes a 500 and is logged.
- **CORS** only allows the GitHub Pages site and localhost.
- **Database**: with `DATABASE_URL` set it uses Postgres (Neon) through `pg` with a small pool. Without it, it uses **PGlite**, a real Postgres compiled to WebAssembly running inside Node, so local dev needs no installs and runs the same SQL.
- On start-up it creates the tables if they don't exist, and adds demo data once if the database is empty.

## 9. Web app (`apps/web`)

- React 18 + Vite + TypeScript. Plain CSS, no UI library.
- **Hash routes** (`/#/plan/123`) so links work on GitHub Pages, which can't rewrite URLs to `index.html`.
- `api.ts` is a small typed `fetch` wrapper that turns API errors into messages shown in the form.
- `useLoad` loads data, exposes `reload`, and after 2.5 seconds shows "Waking up the server…", because Render's free tier sleeps.
- After any add or delete the page just reloads the plan from the API. It's simple, and balances are always worked out by one piece of code in one place.
- Pages: Home (plans and this month vs limit), New plan, Plan (Expenses / Itinerary / Settle up / People tabs), Analytics (stacked month chart built with CSS, by category, by plan), Money plan.
- The charts are plain CSS flexbox: each bar is a column whose segments use `flex-grow: amount`, so there's no chart library.
- Accessible basics: real buttons and labels, focus outlines, works at phone width, respects reduced motion.

## 10. Monorepo

npm workspaces: `packages/core`, `apps/api`, `apps/web`.

- The API and the web app import the same `@mybuddy/core`, so the types and the maths can't drift apart. The web app can preview the same numbers the API saves.
- `core` is plain TypeScript with no build step: Vite and tsx both compile it directly.
- A mobile app (Expo / React Native) can be added as `apps/mobile` and reuse `core` as it is. That's why I'd pick React Native over Flutter here: Flutter is Dart and would need all of this logic rewritten.

## 11. Testing

`npm test` runs Vitest on `core`: paise parsing, all three split types, balances, settle-up chains, the "everyone ends at zero" check, settlements, savings maths, income split, limit status, WhatsApp links.

The money logic is where bugs would hurt, so that's where the tests are. I also clicked through the full app in a headless browser (Playwright) on desktop and phone widths.

## 12. Hosting

| Part | Where | How |
|---|---|---|
| Web | GitHub Pages | `.github/workflows/web.yml`: test, typecheck, build with `VITE_API_URL`, deploy |
| API | Render free web service | `render.yaml`: `npm ci`, `npm run start:api`, health check on `/health` |
| DB | Neon free Postgres | connection string in Render's `DATABASE_URL` |

## 13. Trade-offs and what's next

- **No login yet.** Anyone with a plan link can view and edit it. Next would be auth (magic link or Google), a `users` table, plan membership, and row checks on every query.
- **Free hosting sleeps**, hence the ~30s first load.
- **Reload after every change** is simple but makes more requests. Next: React Query with cache updates.
- **Money plan is stored in localStorage.** It would move to the DB once there are users.
- **Notifications are links**, not push. Next: email via a provider, web push, or WhatsApp Business API.
- **Integer paise columns** cap one amount at about ₹2.1 crore. Switch to `bigint` with a type parser if needed.
- **Currency is INR only.** Multi-currency would need an amount + currency on each expense and conversion rates.
