import type { StoreConfig } from "@/lib/config";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function ratePerDay(consumePerWeek: number): number {
  return consumePerWeek / 7;
}

export function daysOfSupply(purchaseQty: number, consumePerWeek: number): number {
  return purchaseQty / ratePerDay(consumePerWeek);
}

export function runOutDate(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  consumePerWeek: number,
): Date {
  const start = new Date(lastPurchasedAt).getTime();
  return new Date(start + daysOfSupply(purchaseQty, consumePerWeek) * MS_PER_DAY);
}

export function daysUntilRunOut(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  consumePerWeek: number,
  today: string | Date,
): number {
  const runOut = runOutDate(lastPurchasedAt, purchaseQty, consumePerWeek).getTime();
  return (runOut - new Date(today).getTime()) / MS_PER_DAY;
}

export function unitsRemaining(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  consumePerWeek: number,
  today: string | Date,
): number {
  const daysSince =
    (new Date(today).getTime() - new Date(lastPurchasedAt).getTime()) / MS_PER_DAY;
  const consumed = daysSince * ratePerDay(consumePerWeek);
  return Math.max(0, purchaseQty - consumed);
}

export function needsReorder(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  consumePerWeek: number,
  leadTimeDays: number,
  today: string | Date,
): boolean {
  return daysUntilRunOut(lastPurchasedAt, purchaseQty, consumePerWeek, today) <= leadTimeDays;
}

export type StoreCost = StoreConfig & { total: number };

export function storeCost(store: StoreConfig, purchaseQty: number): number {
  return store.pricePerUnit * purchaseQty + store.deliveryFee;
}

export function cheapestStore(stores: StoreConfig[], purchaseQty: number): StoreCost {
  if (stores.length === 0) {
    throw new Error("cheapestStore: no stores configured");
  }
  return stores
    .map((s) => ({ ...s, total: storeCost(s, purchaseQty) }))
    .reduce((cheapest, s) => (s.total < cheapest.total ? s : cheapest));
}
