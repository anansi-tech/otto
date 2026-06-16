// Brand name lives in one place so renaming Otto later is a one-line change.
// Used in emails and the confirm page.
export const BRAND = "Otto";

export type Store = {
  name: string;
  pricePerGallon: number;
  deliveryFee: number;
};

export type PendingNudge = {
  createdAt: string; // ISO date
  store: string;
  total: number;
};

export type State = {
  itemName: string; // "milk"
  unit: string; // "gallon"
  purchaseQty: number; // gallons bought per purchase, e.g. 2
  gallonsPerWeek: number; // consumption rate, e.g. 4
  leadTimeDays: number; // reorder this many days before run-out, e.g. 1
  lastPurchasedAt: string; // ISO date
  stores: Store[];
  notifyEmail: string;
  pendingNudge: PendingNudge | null;
};
