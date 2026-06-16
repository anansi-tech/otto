import type { CommerceProvider } from "./types";
import { ConfigHandoffProvider } from "./configHandoff";

// The ONLY place a concrete provider is referenced. Swapping to AutonomousProvider
// later is a one-line change here. Mirrors the lib/model.ts discipline.
export const provider: CommerceProvider = new ConfigHandoffProvider();

export type { CommerceProvider, StorePrice, CheckoutResult } from "./types";
