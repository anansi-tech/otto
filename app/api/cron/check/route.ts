import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/state";
import { runAgent } from "@/lib/agent";
import { sendNudge, digestHtml, type DigestRow } from "@/lib/notify";
import { sign } from "@/lib/token";
import { BRAND, type ItemConfig } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

// A pending nudge is considered live for this long; within the window we don't
// re-notify (the daily cron would otherwise email every day until handled).
const NUDGE_TTL_HOURS = 48;

function isExpired(createdAt: string, now: Date): boolean {
  const ageHours = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return ageHours > NUDGE_TTL_HOURS;
}

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = await getState();
  if (!state) {
    return NextResponse.json({ error: "no state — run the seed script" }, { status: 500 });
  }

  const now = new Date();
  const rows: DigestRow[] = [];
  const due: { id: string; store: string; total: number }[] = [];
  const items: ItemConfig[] = [];

  for (const item of state.items) {
    const decision = await runAgent(item, now);
    const hasLiveNudge =
      item.pendingNudge !== null && !isExpired(item.pendingNudge.createdAt, now);

    if (decision.reorder && !hasLiveNudge) {
      const createdAt = now.toISOString();
      const token = sign(`${item.id}:${createdAt}`);
      const buyUrl = `${process.env.APP_URL}/api/buy?item=${encodeURIComponent(item.id)}&token=${token}`;
      const store = decision.store ?? "";
      const total = decision.total ?? 0;

      rows.push({ name: item.name, store, total, buyUrl, message: decision.message });
      due.push({ id: item.id, store, total });
      items.push({ ...item, pendingNudge: { createdAt, store, total } });
    } else {
      items.push(item);
    }
  }

  if (rows.length > 0) {
    await sendNudge(
      state.notifyEmail,
      `${BRAND}: ${rows.length} item${rows.length === 1 ? "" : "s"} to reorder`,
      digestHtml(rows),
    );
    await setState({ ...state, items });
  }

  return NextResponse.json({ evaluated: state.items.length, due });
}
