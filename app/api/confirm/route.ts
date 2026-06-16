import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/state";
import { verify } from "@/lib/token";

export const runtime = "nodejs";

// Manual "I bought it" path: resets a single item without redirecting to a store.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const itemId = url.searchParams.get("item") ?? "";
  const token = url.searchParams.get("token") ?? "";

  const state = await getState();
  const item = state?.items.find((i) => i.id === itemId);
  const pending = item?.pendingNudge;

  if (!state || !item || !pending || !verify(`${item.id}:${pending.createdAt}`, token)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const items = state.items.map((i) =>
    i.id === item.id
      ? { ...i, lastPurchasedAt: new Date().toISOString(), pendingNudge: null }
      : i,
  );
  await setState({ ...state, items });

  return NextResponse.json({ ok: true, item: item.id });
}
