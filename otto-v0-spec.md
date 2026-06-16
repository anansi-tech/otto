# Otto — v0 Build Spec (for Claude Code)

> Working name: **Otto** (placeholder, kept swappable).
> Put the brand name in one constant (`BRAND` in `lib/config.ts`) — used in emails and the confirm page — so renaming later is a one-line change.
> Goal: a single-user agent that watches a recurring purchase (milk), predicts run-out, picks the cheapest source, and sends a one-tap reorder nudge. Owner is user zero. No auto-checkout in v0.

---

## Scope

**In scope (v0):**
- Daily scheduled check (Vercel Cron).
- An agent (Vercel AI SDK + OpenAI) that reasons over inventory state + store prices and decides whether/where to reorder.
- Email nudge with a one-tap confirm link.
- Confirm endpoint that resets the consumption clock.

**Explicitly OUT of scope (do not build):**
- No automated checkout / real ordering (nudge + confirm only).
- No live price scraping (prices are config for now).
- No auth, no multi-user, no UI beyond a single confirm page.
- No camera / vision. Consumption is modeled, not sensed.
- No Spice / CaribCoin / crypto / payments.

Follow CLAUDE.md discipline: simplest thing that works, no gold-plating, surgical changes.

---

## Stack

- **Next.js (App Router, TypeScript)** on Vercel.
- **Vercel AI SDK v5** with **OpenAI** (`gpt-4o-mini`). Use current v5 syntax for `generateText` / `tool` / structured output.
- **Upstash Redis** (`@upstash/redis`) for state — one JSON blob. (Any KV equivalent is fine.)
- **Resend** for the email nudge.
- **Vercel Cron** for the daily trigger.

---

## State model

Single Redis key `otto:state` holding one JSON object:

```ts
type State = {
  itemName: string;            // "milk"
  unit: string;                // "gallon"
  purchaseQty: number;         // gallons bought per purchase, e.g. 2
  gallonsPerWeek: number;      // consumption rate, e.g. 4
  leadTimeDays: number;        // reorder this many days before run-out, e.g. 1
  lastPurchasedAt: string;     // ISO date
  stores: { name: string; pricePerGallon: number; deliveryFee: number }[];
  notifyEmail: string;
  pendingNudge: { createdAt: string; store: string; total: number } | null;
};
```

Seed it with a `scripts/seed.ts` (owner's real numbers: 2 gal/purchase, ~4 gal/week, Publix + Walmart + Aldi placeholder prices, owner email).

---

## Inventory math (`lib/inventory.ts`)

Pure, testable functions:

- `gallonsPerDay = gallonsPerWeek / 7`
- `daysOfSupply = purchaseQty / gallonsPerDay`
- `runOutDate = lastPurchasedAt + daysOfSupply`
- `needsReorder(today) = (runOutDate - today) <= leadTimeDays`
- `cheapestStore(stores, purchaseQty) = min by (pricePerGallon * purchaseQty + deliveryFee)`

No LLM in this file. Unit-test it (Vitest).

---

## The agent (`lib/agent.ts`)

- Provider isolated in `lib/model.ts` (export a single `model` — swapping provider or moving to the Claude Agent SDK later is a one-file change).
- Tools, each a plain exported function wrapped as an AI SDK `tool` (keep the plain functions exported so they're reusable outside the SDK):
  - `getInventoryState()` → returns days-since-purchase, estimated gallons remaining, projected run-out date.
  - `getPrices()` → returns the configured stores with computed total cost for `purchaseQty`.
- The agent runs the read tools, then returns a **structured decision** (Zod schema):
  ```ts
  { reorder: boolean; store: string | null; total: number | null; reason: string; message: string }
  ```
  `message` is the human-friendly nudge text the agent writes.
- The agent does NOT send the email itself; the route does (keeps side effects testable).

System prompt (essence): "You manage a household's recurring {itemName} supply. Given inventory state and store prices, decide if a reorder is needed within the lead-time window. If so, choose the cheapest store by total cost and write a short, friendly nudge telling the owner what to buy, where, and the price. If not, set reorder=false."

---

## Routes

**`POST /api/cron/check`**
- Reject unless `Authorization: Bearer ${CRON_SECRET}`.
- Load state. Run the agent.
- If `decision.reorder` and no unexpired `pendingNudge`: send email via Resend with the message + a confirm link `${APP_URL}/api/confirm?token=...`; set `pendingNudge`.
- Return JSON `{ decision, notified: boolean }`.

**`GET /api/confirm?token=...`**
- Validate token (signed value of the pending nudge).
- Set `lastPurchasedAt = now`, clear `pendingNudge`.
- Render a tiny confirmation page ("Logged — clock reset.").

---

## Notify (`lib/notify.ts`)

- `sendNudge(email, subject, html)` via Resend. HTML contains the agent's `message` and a prominent confirm button linking to the confirm route.

---

## Cron config (`vercel.json`)

```json
{ "crons": [{ "path": "/api/cron/check", "schedule": "0 13 * * *" }] }
```

(Daily ~9am ET. Cron must send the `CRON_SECRET` bearer.)

---

## Files

```
app/api/cron/check/route.ts
app/api/confirm/route.ts
app/confirm/page.tsx        (optional simple confirmation render)
lib/model.ts                (provider — single export)
lib/state.ts                (Redis get/set of State)
lib/inventory.ts            (pure math)
lib/agent.ts                (tools + run + structured decision)
lib/notify.ts               (Resend)
scripts/seed.ts             (seed state)
lib/inventory.test.ts       (Vitest)
vercel.json
.env.example
README.md
```

## Env (`.env.example`)

```
OPENAI_API_KEY=
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
APP_URL=http://localhost:3000
NOTIFY_EMAIL=
CONFIRM_SIGNING_SECRET=
```

---

## Acceptance criteria (greppable)

1. `npm run build` and `npm run dev` succeed clean.
2. `vercel.json` defines a daily cron pointing at `/api/cron/check`.
3. `/api/cron/check` returns 401 without the `CRON_SECRET` bearer.
4. State persists in Upstash Redis under `otto:state`; `scripts/seed.ts` populates it.
5. `lib/inventory.ts` exposes `needsReorder` and `cheapestStore` as pure functions with passing Vitest tests.
6. `/api/cron/check` runs a Vercel AI SDK agent (OpenAI `gpt-4o-mini`) using `getInventoryState` and `getPrices` tools and returns a structured `{ reorder, store, total, reason, message }`.
7. When `reorder` is true and no pending nudge exists, an email is sent via Resend containing the message and a confirm link; a `pendingNudge` is recorded.
8. `GET /api/confirm` sets `lastPurchasedAt` to now and clears `pendingNudge`.
9. The model/provider is defined only in `lib/model.ts`; no provider import appears elsewhere.
10. No checkout, scraping, auth, multi-user, or payment code exists anywhere.

---

## Swap note (for later, not v0)

Because tools are plain exported functions and the provider lives only in `lib/model.ts`, moving the decision loop to the Claude Agent SDK later means: reuse the same tool functions, replace `lib/model.ts` + the `generateText` call in `lib/agent.ts`. Nothing else changes.
