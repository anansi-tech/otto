# Otto

A single-user agent that watches recurring purchases (milk, diapers, coffee, …),
predicts run-out per item, picks the cheapest source, and sends a one-tap
"Buy at {store}" nudge. The Buy link hands you off to the store — no autonomous
checkout in v1.

> Brand name lives in `BRAND` (`lib/config.ts`). Rename Otto in one place.

## Stack

- Next.js (App Router, TypeScript) on Vercel
- Vercel AI SDK v6 + OpenAI (`gpt-5-nano`)
- MongoDB (one JSON document under `otto:state`)
- Resend (digest email)
- Vercel Cron (daily trigger)

## How it works

1. A daily cron `POST`s `/api/cron/check` with a `Bearer ${CRON_SECRET}` header.
2. For **each item** in state, the agent (`lib/agent.ts`) calls two read tools —
   `getInventoryState` and `getPrices` (the latter via the commerce provider) —
   then returns a structured decision `{ reorder, store, total, reason, message }`.
3. Items that are due (and have no live pending nudge) are collected into **one
   digest email** via Resend, each row showing the chosen store, total, and a
   "Buy at {store}" button. A per-item `pendingNudge` is recorded with an
   expiry guard so the daily cron doesn't re-nudge.
4. Tapping a button hits `GET /api/buy?item={id}&token=...`, which validates the
   HMAC-signed token, asks the provider to `checkout` (a deep link in v1), resets
   that item's `lastPurchasedAt`, clears its pending nudge, and `302`-redirects to
   the store.
5. `GET /api/confirm?item={id}&token=...` is the manual "I bought it" alias — it
   resets one item without redirecting to a store.

> **v1 assumption:** tapping Buy = intent to purchase = clock reset. This is a
> deliberate simplification until a real ordering API can confirm the purchase.

Inventory math (`lib/inventory.ts`) is pure and unit-tested (Vitest). No LLM,
no side effects.

## Commerce provider (the keystone)

`lib/commerce/` owns **both** price lookup and checkout behind one
`CommerceProvider` interface:

- `ConfigHandoffProvider` (active) — config prices + deep-link buy. Works today,
  no API.
- `AutonomousProvider` (stub) — where live prices + real ordering land once an
  Instacart/Uber early-access door opens.

`lib/commerce/index.ts` exports the single active `provider` — the only place a
concrete provider is referenced (mirrors `lib/model.ts`). When access is granted,
implement `AutonomousProvider` and flip that one export: live pricing and
autonomous buying light up together, and nothing in the agent, state, cron, or
notify layer changes.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values
npm run seed           # writes otto:state to MongoDB (uses NOTIFY_EMAIL)
npm run dev
```

### Environment

| Var | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Agent model (gpt-5-nano) |
| `RESEND_API_KEY` | Email delivery |
| `MONGODB_URI` | State store connection string |
| `MONGODB_DB` | Database name (optional, defaults to `otto`) |
| `CRON_SECRET` | Bearer token the cron must send |
| `APP_URL` | Base URL for confirm links |
| `NOTIFY_EMAIL` | Owner's email (used by the seed) |
| `CONFIRM_SIGNING_SECRET` | HMAC key for confirm tokens |
| `FROM_EMAIL` | Optional verified Resend sender |

## Commands

```bash
npm run dev     # local dev
npm run build   # production build
npm test        # Vitest (inventory math)
npm run seed    # seed otto:state
```

## Trigger the check manually

```bash
curl -X POST http://localhost:3000/api/cron/check \
  -H "Authorization: Bearer $CRON_SECRET"
```

Without the bearer the route returns `401`.

## Deploy

Deploy to Vercel and set the env vars in the project settings. `vercel.json`
schedules the daily run:

```json
{ "crons": [{ "path": "/api/cron/check", "schedule": "0 13 * * *" }] }
```

That's ~9am ET daily. The check route expects a `POST` with the `CRON_SECRET`
bearer. Vercel Cron issues a `GET` with the bearer attached automatically, so
wire the schedule to an invocation that sends `POST` (e.g. an external
scheduler) or add a `GET` handler if you rely on Vercel Cron directly.

## Swapping the provider later

Tools are plain exported functions and the provider lives only in `lib/model.ts`.
Moving the decision loop to the Claude Agent SDK means reusing the same tool
functions and replacing `lib/model.ts` + the `generateText` call in
`lib/agent.ts`. Nothing else changes.
