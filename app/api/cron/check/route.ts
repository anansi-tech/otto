import { NextResponse } from "next/server";
import { getState, setState } from "@/lib/state";
import { runAgent } from "@/lib/agent";
import { sendNudge, nudgeHtml } from "@/lib/notify";
import { sign } from "@/lib/token";
import { BRAND } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

// A pending nudge is considered live for this long; within the window we don't
// re-notify (the daily cron would otherwise email every day until confirmed).
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
  const decision = await runAgent(state, now);

  const hasLiveNudge =
    state.pendingNudge !== null && !isExpired(state.pendingNudge.createdAt, now);

  let notified = false;
  if (decision.reorder && !hasLiveNudge) {
    const createdAt = now.toISOString();
    const token = sign(createdAt);
    const confirmUrl = `${process.env.APP_URL}/api/confirm?token=${token}`;

    await sendNudge(
      state.notifyEmail,
      `${BRAND}: time to reorder ${state.itemName}`,
      nudgeHtml(decision.message, confirmUrl),
    );

    await setState({
      ...state,
      pendingNudge: {
        createdAt,
        store: decision.store ?? "",
        total: decision.total ?? 0,
      },
    });
    notified = true;
  }

  return NextResponse.json({ decision, notified });
}
