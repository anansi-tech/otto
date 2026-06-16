# Otto

A single-user agent that watches a recurring purchase (milk), predicts run-out,
picks the cheapest source, and sends a one-tap reorder nudge. No auto-checkout —
nudge + confirm only.

> Brand name lives in `BRAND` (`lib/config.ts`). Rename Otto in one place.

## Stack

- Next.js (App Router, TypeScript) on Vercel
- Vercel AI SDK v5 + OpenAI (`gpt-4o-mini`)
- Upstash Redis (one JSON blob under `otto:state`)
- Resend (email nudge)
- Vercel Cron (daily trigger)

## How it works

1. A daily cron `POST`s `/api/cron/check` with a `Bearer ${CRON_SECRET}` header.
2. The agent (`lib/agent.ts`) calls two read tools — `getInventoryState` and
   `getPrices` — then returns a structured decision
   `{ reorder, store, total, reason, message }`.
3. If `reorder` is true and there's no live pending nudge, the route emails the
   owner via Resend with the agent's message and a one-tap confirm link, and
   records a `pendingNudge`.
4. Tapping the link hits `GET /api/confirm?token=...`, which validates the
   HMAC-signed token, resets `lastPurchasedAt` to now, clears the pending nudge,
   and shows a small confirmation page.

Inventory math (`lib/inventory.ts`) is pure and unit-tested (Vitest). No LLM,
no side effects.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values
npm run seed           # writes otto:state to Upstash (uses NOTIFY_EMAIL)
npm run dev
```

### Environment

| Var | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Agent model (gpt-4o-mini) |
| `RESEND_API_KEY` | Email delivery |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | State store |
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
