import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/state";
import { verify } from "@/lib/token";
import { provider } from "@/lib/commerce";

export const runtime = "nodejs";

// Tapping "Buy" hands the owner off to the store. v1 assumption: tapping Buy =
// intent to purchase = clock reset. This is a deliberate simplification until a
// real ordering API can confirm the purchase (see README).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const itemId = url.searchParams.get("item") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const base = process.env.APP_URL ?? url.origin;

  const state = await getState();
  const item = state?.items.find((i) => i.id === itemId);
  const pending = item?.pendingNudge;

  if (!state || !item || !pending || !verify(`${item.id}:${pending.createdAt}`, token)) {
    return NextResponse.redirect(`${base}/confirm?ok=0`);
  }

  const store = item.stores.find((s) => s.name === pending.store) ?? item.stores[0];
  const result = await provider.checkout(item.name, item.purchaseQty, store);

  const items = state.items.map((i) =>
    i.id === item.id
      ? { ...i, lastPurchasedAt: new Date().toISOString(), pendingNudge: null }
      : i,
  );
  await setState({ ...state, items });

  const target = result.type === "handoff" ? result.url : `${base}/confirm?ok=1`;
  return NextResponse.redirect(target, 302);
}
