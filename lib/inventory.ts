import type { Store } from "@/lib/config";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function gallonsPerDay(gallonsPerWeek: number): number {
  return gallonsPerWeek / 7;
}

export function daysOfSupply(purchaseQty: number, gallonsPerWeek: number): number {
  return purchaseQty / gallonsPerDay(gallonsPerWeek);
}

export function runOutDate(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  gallonsPerWeek: number,
): Date {
  const start = new Date(lastPurchasedAt).getTime();
  return new Date(start + daysOfSupply(purchaseQty, gallonsPerWeek) * MS_PER_DAY);
}

export function daysUntilRunOut(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  gallonsPerWeek: number,
  today: string | Date,
): number {
  const runOut = runOutDate(lastPurchasedAt, purchaseQty, gallonsPerWeek).getTime();
  return (runOut - new Date(today).getTime()) / MS_PER_DAY;
}

export function gallonsRemaining(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  gallonsPerWeek: number,
  today: string | Date,
): number {
  const daysSince =
    (new Date(today).getTime() - new Date(lastPurchasedAt).getTime()) / MS_PER_DAY;
  const consumed = daysSince * gallonsPerDay(gallonsPerWeek);
  return Math.max(0, purchaseQty - consumed);
}

export function needsReorder(
  lastPurchasedAt: string | Date,
  purchaseQty: number,
  gallonsPerWeek: number,
  leadTimeDays: number,
  today: string | Date,
): boolean {
  return daysUntilRunOut(lastPurchasedAt, purchaseQty, gallonsPerWeek, today) <= leadTimeDays;
}

export type StoreCost = Store & { total: number };

export function storeCost(store: Store, purchaseQty: number): number {
  return store.pricePerGallon * purchaseQty + store.deliveryFee;
}

export function cheapestStore(stores: Store[], purchaseQty: number): StoreCost {
  if (stores.length === 0) {
    throw new Error("cheapestStore: no stores configured");
  }
  return stores
    .map((s) => ({ ...s, total: storeCost(s, purchaseQty) }))
    .reduce((cheapest, s) => (s.total < cheapest.total ? s : cheapest));
}
