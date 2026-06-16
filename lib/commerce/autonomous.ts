import type { StoreConfig } from "@/lib/config";
import type { CommerceProvider, StorePrice, CheckoutResult } from "./types";

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`AutonomousProvider.${method} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}

// Stub. This is the ONLY change needed when an Instacart/Uber early-access door
// opens: implement getPrices to return live catalog prices and checkout to submit
// a real order, then flip the export in ./index.ts to this provider. Live pricing
// and autonomous buying light up together — nothing in the agent, state, cron, or
// notify layer changes.
export class AutonomousProvider implements CommerceProvider {
  name = "autonomous";

  async getPrices(
    _itemName: string,
    _qty: number,
    _stores: StoreConfig[],
  ): Promise<StorePrice[]> {
    throw new NotImplementedError("getPrices");
  }

  async checkout(
    _itemName: string,
    _qty: number,
    _store: StoreConfig,
  ): Promise<CheckoutResult> {
    throw new NotImplementedError("checkout");
  }
}
