import { Redis } from "@upstash/redis";
import type { State } from "@/lib/config";

export const STATE_KEY = "otto:state";

// Lazily constructed so importing this module at build time doesn't require the
// Upstash env vars.
let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

export async function getState(): Promise<State | null> {
  return redis().get<State>(STATE_KEY);
}

export async function setState(state: State): Promise<void> {
  await redis().set(STATE_KEY, state);
}
