# Otto — v1 Build Spec (Phases 1–2, for Claude Code)

> Builds on v0. Two changes: (1) a commerce-provider abstraction with a handoff buy step, (2) multi-item support.
> Discipline (CLAUDE.md): smallest delta from v0, no gold-plating. The provider abstraction is the keystone — it's why autonomous buy **and** live prices later become a one-file swap, not a rewrite.

---

## Scope

**In:**
- `CommerceProvider` interface that owns **both** price lookup and checkout.
- `ConfigHandoffProvider` — config prices + deep-link buy (works today, no API).
- `AutonomousProvider` stub — where live prices + real ordering land when a door opens.
- Nudge becomes an actionable "Buy at {store}" link.
- Multi-item state + per-item decisions + a single digest nudge email.

**Out (do not build):**
- Autonomous/real purchasing (stub only — externally gated).
- Live price fetching or scraping (config prices only).
- Multi-user, auth, or UI beyond the existing confirm page.

---

## Part 1 — Commerce provider + handoff

`lib/commerce/types.ts`:

```ts
export type StorePrice = {
  store: string;
  pricePerUnit: number;
  deliveryFee: number;
  total: number;     // pricePerUnit * qty + deliveryFee
  buyUrl: string;
};

export type CheckoutResult =
  | { type: "handoff"; store: string; url: string }
  | { type: "placed"; store: string; orderId: string }; // future (autonomous)

export interface CommerceProvider {
  name: string;
  getPrices(itemName: string, qty: number, stores: StoreConfig[]): Promise<StorePrice[]>;
  checkout(itemName: string, qty: number, store: StoreConfig): Promise<CheckoutResult>;
}
```

- `lib/commerce/configHandoff.ts` — `ConfigHandoffProvider`:
  - `getPrices`: for each configured store, compute `total` and build `buyUrl` from the store's `buyUrlTemplate` (substitute `{query}` with the item name, URL-encoded).
  - `checkout`: return `{ type: "handoff", store, url }` using the chosen store's `buyUrl`.
- `lib/commerce/autonomous.ts` — `AutonomousProvider` stub implementing the interface, throwing `NotImplementedError`. Add a comment: this is where an Instacart/Uber integration supplies live prices **and** real ordering once early-access is granted.
- `lib/commerce/index.ts` — exports a single active `provider` (default `ConfigHandoffProvider`). The ONLY place a concrete provider is referenced. Mirrors the `lib/model.ts` discipline.
- `lib/agent.ts`: the `getPrices` tool now calls `provider.getPrices(...)` instead of reading config directly. Decision logic unchanged (cheapest by `total`).

New route `GET /api/buy`:
- Query: `item={id}&token=...`.
- Validate the token (HMAC over the item's pending-nudge `createdAt`, as in v0).
- Call `provider.checkout(...)` for the chosen store → get the handoff `url`.
- Mark that item handled: set its `lastPurchasedAt = now`, clear its `pendingNudge`. (v1 assumption: tapping "Buy" = intent to purchase = clock reset. Note this in README; it's a deliberate simplification until a real ordering API confirms purchase.)
- `302` redirect to `url`.

Keep `/api/confirm` as an alias that resets a given item without redirecting (manual "I bought it" path).

---

## Part 2 — Multi-item

State model (`lib/state.ts` / `lib/config.ts`):

```ts
type StoreConfig = {
  name: string;
  pricePerUnit: number;
  deliveryFee: number;
  buyUrlTemplate: string;  // e.g. "https://www.instacart.com/store/aldi/search/{query}"
};

type ItemConfig = {
  id: string;              // slug, e.g. "milk"
  name: string;            // "milk"
  unit: string;            // "gallon"
  purchaseQty: number;     // per purchase
  consumePerWeek: number;  // consumption rate (renames v0 gallonsPerWeek, now generic)
  leadTimeDays: number;
  lastPurchasedAt: string; // ISO
  stores: StoreConfig[];
  pendingNudge: { createdAt: string; store: string; total: number } | null;
};

type State = {
  notifyEmail: string;
  items: ItemConfig[];
};
```

- `lib/inventory.ts`: same pure functions, applied per item (`consumePerWeek` replaces `gallonsPerWeek`; keep generic). Tests stay, updated to per-item inputs.
- `app/api/cron/check/route.ts`:
  - Loop over `state.items`.
  - For each item, run the agent decision (`runAgent(item, now)`).
  - Collect items where `reorder === true` AND no live (unexpired) `pendingNudge`.
  - Send ONE digest email listing each due item with its chosen store, total, and a "Buy at {store}" button → `/api/buy?item={id}&token=...`.
  - Set each due item's `pendingNudge` (with the v0 expiry guard).
  - Return `{ evaluated: n, due: [...] }`.
- `app/api/buy` / `app/api/confirm`: operate on a single `item` id.
- `scripts/seed.ts`: seed `items: []` with milk (your real numbers: 2 gal/purchase, ~4/week, 1-day lead) plus 1–2 examples (diapers, coffee), each with `stores[]` including `buyUrlTemplate`.
- `lib/notify.ts`: `digestHtml(items)` renders one row per due item with the buy button; brand from `BRAND`.

---

## Files

```
new:     lib/commerce/types.ts
         lib/commerce/configHandoff.ts
         lib/commerce/autonomous.ts
         lib/commerce/index.ts
         app/api/buy/route.ts
changed: lib/config.ts           (State / ItemConfig / StoreConfig)
         lib/state.ts            (new State shape)
         lib/inventory.ts        (generic per-item)
         lib/inventory.test.ts   (per-item inputs)
         lib/agent.ts            (getPrices via provider)
         app/api/cron/check/route.ts  (multi-item digest)
         app/api/confirm/route.ts     (per-item)
         lib/notify.ts           (digest html + buy buttons)
         scripts/seed.ts         (items[])
```

No new env vars required.

---

## Acceptance criteria (greppable)

1. `npm run build` and `npm test` pass.
2. `lib/commerce/index.ts` exports one active `provider`; no other file imports a concrete provider class.
3. `CommerceProvider` declares both `getPrices` and `checkout`; `ConfigHandoffProvider` implements both; `AutonomousProvider` exists as a stub throwing `NotImplementedError`.
4. `lib/agent.ts`'s price tool calls `provider.getPrices(...)` — no direct store-price read remains in the agent.
5. `State` holds `items: ItemConfig[]`; `scripts/seed.ts` populates at least 2 items.
6. `/api/cron/check` evaluates every item and sends a single digest email listing each due item with a "Buy at {store}" link and total; sets a per-item `pendingNudge` with an expiry guard.
7. `/api/buy?item={id}` validates the token, resets that item's `lastPurchasedAt`, clears its `pendingNudge`, and `302`-redirects to the store URL.
8. Each `StoreConfig` has a `buyUrlTemplate`; the handoff URL substitutes the URL-encoded item name for `{query}`.
9. No autonomous ordering, price scraping, auth, or new UI exists.
10. A code comment in `lib/commerce/autonomous.ts` documents that implementing it (live prices + real checkout together) is the only change needed when an early-access door opens.

---

## Swap note

When Instacart/Uber access is granted: implement `AutonomousProvider` (its `getPrices` returns live catalog prices, its `checkout` submits a real order), flip the export in `lib/commerce/index.ts`. Live pricing and autonomous buy light up together. Nothing in the agent, state, cron, or notify layer changes.
