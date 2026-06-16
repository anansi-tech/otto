// Brand name lives in one place so renaming Otto later is a one-line change.
// Used in emails and the confirm page.
export const BRAND = "Otto";

export type StoreConfig = {
  name: string;
  pricePerUnit: number;
  deliveryFee: number;
  buyUrlTemplate: string; // e.g. "https://www.instacart.com/store/aldi/search/{query}"
};

export type PendingNudge = {
  createdAt: string; // ISO date
  store: string;
  total: number;
};

export type ItemConfig = {
  id: string; // slug, e.g. "milk"
  name: string; // "milk"
  unit: string; // "gallon"
  purchaseQty: number; // per purchase
  consumePerWeek: number; // consumption rate (generic; was v0 gallonsPerWeek)
  leadTimeDays: number; // reorder this many days before run-out
  lastPurchasedAt: string; // ISO date
  stores: StoreConfig[];
  pendingNudge: PendingNudge | null;
};

export type State = {
  notifyEmail: string;
  items: ItemConfig[];
};
