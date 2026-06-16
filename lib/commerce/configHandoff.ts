import type { StoreConfig } from "@/lib/config";
import { storeCost } from "@/lib/inventory";
import type { CommerceProvider, StorePrice, CheckoutResult } from "./types";

// Substitute the URL-encoded item name for {query} in a store's buy template.
function buildBuyUrl(template: string, itemName: string): string {
  return template.replace("{query}", encodeURIComponent(itemName));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Works today, no API: config prices + a deep link the owner taps to buy.
export class ConfigHandoffProvider implements CommerceProvider {
  name = "config-handoff";

  async getPrices(
    itemName: string,
    qty: number,
    stores: StoreConfig[],
  ): Promise<StorePrice[]> {
    return stores.map((s) => ({
      store: s.name,
      pricePerUnit: s.pricePerUnit,
      deliveryFee: s.deliveryFee,
      total: round(storeCost(s, qty)),
      buyUrl: buildBuyUrl(s.buyUrlTemplate, itemName),
    }));
  }

  async checkout(
    itemName: string,
    _qty: number,
    store: StoreConfig,
  ): Promise<CheckoutResult> {
    return {
      type: "handoff",
      store: store.name,
      url: buildBuyUrl(store.buyUrlTemplate, itemName),
    };
  }
}
