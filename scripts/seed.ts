import { setState } from "@/lib/state";
import type { State } from "@/lib/config";

const now = new Date().toISOString();

// Owner's real numbers for milk; diapers + coffee as additional examples.
// Prices are placeholders (no live fetching in v1).
const state: State = {
  notifyEmail: process.env.NOTIFY_EMAIL ?? "",
  items: [
    {
      id: "milk",
      name: "milk",
      unit: "gallon",
      purchaseQty: 2,
      consumePerWeek: 4,
      leadTimeDays: 1,
      lastPurchasedAt: now,
      stores: [
        {
          name: "Publix",
          pricePerUnit: 4.19,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.instacart.com/store/publix/search/{query}",
        },
        {
          name: "Walmart",
          pricePerUnit: 3.48,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.walmart.com/search?q={query}",
        },
        {
          name: "Aldi",
          pricePerUnit: 3.19,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.instacart.com/store/aldi/search/{query}",
        },
      ],
      pendingNudge: null,
    },
    {
      id: "diapers",
      name: "diapers",
      unit: "box",
      purchaseQty: 1,
      consumePerWeek: 1,
      leadTimeDays: 2,
      lastPurchasedAt: now,
      stores: [
        {
          name: "Target",
          pricePerUnit: 24.99,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.target.com/s?searchTerm={query}",
        },
        {
          name: "Walmart",
          pricePerUnit: 22.97,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.walmart.com/search?q={query}",
        },
      ],
      pendingNudge: null,
    },
    {
      id: "coffee",
      name: "coffee",
      unit: "bag",
      purchaseQty: 1,
      consumePerWeek: 0.5,
      leadTimeDays: 2,
      lastPurchasedAt: now,
      stores: [
        {
          name: "Publix",
          pricePerUnit: 9.99,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.instacart.com/store/publix/search/{query}",
        },
        {
          name: "Aldi",
          pricePerUnit: 6.49,
          deliveryFee: 0,
          buyUrlTemplate: "https://www.instacart.com/store/aldi/search/{query}",
        },
      ],
      pendingNudge: null,
    },
  ],
};

async function main() {
  if (!state.notifyEmail) {
    throw new Error("NOTIFY_EMAIL is not set — add it to .env before seeding");
  }
  await setState(state);
  console.log("Seeded otto:state:", JSON.stringify(state, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
