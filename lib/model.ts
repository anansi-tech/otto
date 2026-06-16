import { openai } from "@ai-sdk/openai";

// The ONLY place a provider is imported. Swapping providers (or moving to the
// Claude Agent SDK) later is a one-file change — see the swap note in the spec.
export const model = openai("gpt-5-nano");
