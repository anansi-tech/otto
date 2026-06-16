import { generateText, tool, stepCountIs, Output } from "ai";
import { z } from "zod";
import { model } from "@/lib/model";
import type { State } from "@/lib/config";
import {
  cheapestStore,
  daysUntilRunOut,
  gallonsRemaining,
  runOutDate,
  storeCost,
} from "@/lib/inventory";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Plain, reusable read functions (no SDK dependency) — kept exported so they can
// be called directly outside the agent loop.
export function getInventoryState(state: State, today: string | Date) {
  const daysSincePurchase =
    (new Date(today).getTime() - new Date(state.lastPurchasedAt).getTime()) / MS_PER_DAY;
  return {
    itemName: state.itemName,
    unit: state.unit,
    purchaseQty: state.purchaseQty,
    gallonsPerWeek: state.gallonsPerWeek,
    leadTimeDays: state.leadTimeDays,
    daysSincePurchase: round(daysSincePurchase),
    gallonsRemaining: round(
      gallonsRemaining(state.lastPurchasedAt, state.purchaseQty, state.gallonsPerWeek, today),
    ),
    projectedRunOutDate: runOutDate(
      state.lastPurchasedAt,
      state.purchaseQty,
      state.gallonsPerWeek,
    ).toISOString(),
    daysUntilRunOut: round(
      daysUntilRunOut(state.lastPurchasedAt, state.purchaseQty, state.gallonsPerWeek, today),
    ),
  };
}

export function getPrices(state: State) {
  const stores = state.stores.map((s) => ({
    name: s.name,
    pricePerGallon: s.pricePerGallon,
    deliveryFee: s.deliveryFee,
    total: round(storeCost(s, state.purchaseQty)),
  }));
  const cheapest = cheapestStore(state.stores, state.purchaseQty);
  return { purchaseQty: state.purchaseQty, stores, cheapest: cheapest.name };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export const decisionSchema = z.object({
  reorder: z.boolean(),
  store: z.string().nullable(),
  total: z.number().nullable(),
  reason: z.string(),
  message: z.string(),
});

export type Decision = z.infer<typeof decisionSchema>;

export async function runAgent(state: State, today: string | Date): Promise<Decision> {
  const tools = {
    getInventoryState: tool({
      description:
        "Get current inventory state: days since last purchase, estimated gallons remaining, projected run-out date, and lead time.",
      inputSchema: z.object({}),
      execute: async () => getInventoryState(state, today),
    }),
    getPrices: tool({
      description:
        "Get the configured stores with the total cost (price * purchaseQty + delivery fee) for one purchase.",
      inputSchema: z.object({}),
      execute: async () => getPrices(state),
    }),
  };

  const system = `You manage a household's recurring ${state.itemName} supply. Given inventory state and store prices, decide if a reorder is needed within the lead-time window. If so, choose the cheapest store by total cost and write a short, friendly nudge telling the owner what to buy, where, and the price. If not, set reorder=false.`;

  const result = await generateText({
    model,
    system,
    prompt: `Today is ${new Date(today).toISOString()}. Decide whether to reorder ${state.itemName} now.`,
    tools,
    stopWhen: stepCountIs(5),
    experimental_output: Output.object({ schema: decisionSchema }),
  });

  return result.experimental_output;
}
