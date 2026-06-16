import { generateText, tool, stepCountIs, Output } from "ai";
import { z } from "zod";
import { model } from "@/lib/model";
import type { ItemConfig } from "@/lib/config";
import { provider } from "@/lib/commerce";
import { daysUntilRunOut, runOutDate, unitsRemaining } from "@/lib/inventory";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Plain, reusable read functions (no SDK dependency) — kept exported so they can
// be called directly outside the agent loop.
export function getInventoryState(item: ItemConfig, today: string | Date) {
  const daysSincePurchase =
    (new Date(today).getTime() - new Date(item.lastPurchasedAt).getTime()) / MS_PER_DAY;
  return {
    name: item.name,
    unit: item.unit,
    purchaseQty: item.purchaseQty,
    consumePerWeek: item.consumePerWeek,
    leadTimeDays: item.leadTimeDays,
    daysSincePurchase: round(daysSincePurchase),
    unitsRemaining: round(
      unitsRemaining(item.lastPurchasedAt, item.purchaseQty, item.consumePerWeek, today),
    ),
    projectedRunOutDate: runOutDate(
      item.lastPurchasedAt,
      item.purchaseQty,
      item.consumePerWeek,
    ).toISOString(),
    daysUntilRunOut: round(
      daysUntilRunOut(item.lastPurchasedAt, item.purchaseQty, item.consumePerWeek, today),
    ),
  };
}

export async function getPrices(item: ItemConfig) {
  const stores = await provider.getPrices(item.name, item.purchaseQty, item.stores);
  const cheapest = stores.reduce((c, s) => (s.total < c.total ? s : c));
  return { purchaseQty: item.purchaseQty, stores, cheapest: cheapest.store };
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

export async function runAgent(item: ItemConfig, today: string | Date): Promise<Decision> {
  const tools = {
    getInventoryState: tool({
      description:
        "Get current inventory state: days since last purchase, estimated units remaining, projected run-out date, and lead time.",
      inputSchema: z.object({}),
      execute: async () => getInventoryState(item, today),
    }),
    getPrices: tool({
      description:
        "Get the stores with the total cost (price * purchaseQty + delivery fee) for one purchase.",
      inputSchema: z.object({}),
      execute: async () => getPrices(item),
    }),
  };

  const system = `You manage a household's recurring ${item.name} supply. Given inventory state and store prices, decide if a reorder is needed within the lead-time window. If so, choose the cheapest store by total cost and write a short, friendly nudge telling the owner what to buy, where, and the price. If not, set reorder=false.`;

  const result = await generateText({
    model,
    system,
    prompt: `Today is ${new Date(today).toISOString()}. Decide whether to reorder ${item.name} now.`,
    tools,
    stopWhen: stepCountIs(5),
    experimental_output: Output.object({ schema: decisionSchema }),
  });

  return result.experimental_output;
}
