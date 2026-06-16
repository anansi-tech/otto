import type { StoreConfig } from "@/lib/config";

export type StorePrice = {
  store: string;
  pricePerUnit: number;
  deliveryFee: number;
  total: number; // pricePerUnit * qty + deliveryFee
  buyUrl: string;
};

export type CheckoutResult =
  | { type: "handoff"; store: string; url: string }
  | { type: "placed"; store: string; orderId: string }; // future (autonomous)

// A commerce provider owns BOTH price lookup and checkout. This single interface
// is the keystone: implementing it differently (live prices + real ordering) is
// the only change needed to go autonomous later.
export interface CommerceProvider {
  name: string;
  getPrices(itemName: string, qty: number, stores: StoreConfig[]): Promise<StorePrice[]>;
  checkout(itemName: string, qty: number, store: StoreConfig): Promise<CheckoutResult>;
}
