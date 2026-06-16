import { Redis } from "@upstash/redis";
import type { State } from "@/lib/config";

export const STATE_KEY = "otto:state";

const redis = Redis.fromEnv();

export async function getState(): Promise<State | null> {
  return redis.get<State>(STATE_KEY);
}

export async function setState(state: State): Promise<void> {
  await redis.set(STATE_KEY, state);
}
