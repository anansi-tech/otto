import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/state";
import { verify } from "@/lib/token";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const base = process.env.APP_URL ?? new URL(req.url).origin;

  const state = await getState();
  const pending = state?.pendingNudge;

  if (!state || !pending || !verify(pending.createdAt, token)) {
    return NextResponse.redirect(`${base}/confirm?ok=0`);
  }

  await setState({
    ...state,
    lastPurchasedAt: new Date().toISOString(),
    pendingNudge: null,
  });

  return NextResponse.redirect(`${base}/confirm?ok=1`);
}
