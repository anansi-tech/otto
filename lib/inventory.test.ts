import { describe, it, expect } from "vitest";
import {
  ratePerDay,
  daysOfSupply,
  runOutDate,
  daysUntilRunOut,
  unitsRemaining,
  needsReorder,
  storeCost,
  cheapestStore,
} from "@/lib/inventory";
import type { StoreConfig } from "@/lib/config";

// Milk item: 2 gal/purchase, 4 gal/week => 0.571/day, 3.5 days of supply.
const PURCHASE_QTY = 2;
const CONSUME_PER_WEEK = 4;

describe("rates", () => {
  it("ratePerDay = consumePerWeek / 7", () => {
    expect(ratePerDay(CONSUME_PER_WEEK)).toBeCloseTo(4 / 7);
  });

  it("daysOfSupply = purchaseQty / ratePerDay", () => {
    expect(daysOfSupply(PURCHASE_QTY, CONSUME_PER_WEEK)).toBeCloseTo(3.5);
  });
});

describe("runOutDate", () => {
  it("adds daysOfSupply to lastPurchasedAt", () => {
    const out = runOutDate("2026-06-01T00:00:00.000Z", PURCHASE_QTY, CONSUME_PER_WEEK);
    expect(out.toISOString()).toBe("2026-06-04T12:00:00.000Z");
  });
});

describe("daysUntilRunOut / unitsRemaining", () => {
  it("counts down as days pass", () => {
    expect(
      daysUntilRunOut("2026-06-01", PURCHASE_QTY, CONSUME_PER_WEEK, "2026-06-02"),
    ).toBeCloseTo(2.5);
  });

  it("unitsRemaining never goes negative", () => {
    expect(
      unitsRemaining("2026-06-01", PURCHASE_QTY, CONSUME_PER_WEEK, "2026-06-30"),
    ).toBe(0);
  });
});

describe("needsReorder", () => {
  const leadTime = 1;

  it("false when run-out is beyond the lead-time window", () => {
    // 3.5 days supply, 1 day after purchase => 2.5 days left > 1 lead day.
    expect(
      needsReorder("2026-06-01", PURCHASE_QTY, CONSUME_PER_WEEK, leadTime, "2026-06-02"),
    ).toBe(false);
  });

  it("true once within the lead-time window", () => {
    // 3 days after purchase => 0.5 days left <= 1 lead day.
    expect(
      needsReorder("2026-06-01", PURCHASE_QTY, CONSUME_PER_WEEK, leadTime, "2026-06-04"),
    ).toBe(true);
  });
});

describe("cheapestStore", () => {
  const tmpl = "https://example.com/{query}";
  const stores: StoreConfig[] = [
    { name: "Publix", pricePerUnit: 4.5, deliveryFee: 0, buyUrlTemplate: tmpl }, // 9.00
    { name: "Walmart", pricePerUnit: 3.5, deliveryFee: 3, buyUrlTemplate: tmpl }, // 10.00
    { name: "Aldi", pricePerUnit: 3.25, deliveryFee: 2, buyUrlTemplate: tmpl }, // 8.50
  ];

  it("storeCost = pricePerUnit * qty + deliveryFee", () => {
    expect(storeCost(stores[1], PURCHASE_QTY)).toBe(10);
  });

  it("picks the lowest total cost, not the lowest per-unit", () => {
    const winner = cheapestStore(stores, PURCHASE_QTY);
    expect(winner.name).toBe("Aldi");
    expect(winner.total).toBe(8.5);
  });

  it("throws when no stores are configured", () => {
    expect(() => cheapestStore([], PURCHASE_QTY)).toThrow();
  });
});
