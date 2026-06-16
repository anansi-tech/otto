import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.CONFIRM_SIGNING_SECRET;
  if (!s) throw new Error("CONFIRM_SIGNING_SECRET is not set");
  return s;
}

// Sign a payload (we sign the pending nudge's createdAt) into an opaque token.
export function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verify(payload: string, token: string): boolean {
  const expected = sign(payload);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
