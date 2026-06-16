import { setState } from "@/lib/state";
import type { State } from "@/lib/config";

// Owner's real numbers. Prices are placeholders (no live scraping in v0).
const state: State = {
  itemName: "milk",
  unit: "gallon",
  purchaseQty: 2,
  gallonsPerWeek: 4,
  leadTimeDays: 1,
  lastPurchasedAt: new Date().toISOString(),
  stores: [
    { name: "Publix", pricePerGallon: 4.19, deliveryFee: 0 },
    { name: "Walmart", pricePerGallon: 3.48, deliveryFee: 0 },
    { name: "Aldi", pricePerGallon: 3.19, deliveryFee: 0 },
  ],
  notifyEmail: process.env.NOTIFY_EMAIL ?? "",
  pendingNudge: null,
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
