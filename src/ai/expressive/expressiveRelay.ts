
'use server';
// src/ai/expressive/expressiveRelay.ts

import { callLLM } from "@/ai/llm/callLLM";
import { buildExpressiveMembranePrompt } from "./buildExpressiveMembranePrompt";
import { buildRelayContextFromState } from "./relayContext";
import type { FullAmeliaState } from "@/ai/runtime/cycle";

export interface RelayInput {
  userPrompt: string;
  cycleState: FullAmeliaState;
}

export interface RelayResult {
  text: string;
}

/**
 * The relay does ONE thing:
 * - Takes Amelia's current state (Numogram, substrate, reservoir, drift...)
 * - Builds a system prompt that describes that state
 * - Sends that plus the user's prompt to the LLM
 * - Returns whatever comes back
 *
 * No veto, no fallback phrases, no silence injection.
 */
export async function runExpressiveRelay(input: RelayInput): Promise<RelayResult> {
  // 1. Compress the current Amelia state into a relay context
  const ctx = buildRelayContextFromState(input.cycleState);

  // 2. Build the system prompt from the Numogram/substrate layers
  const systemPrompt = await buildExpressiveMembranePrompt(ctx);

  // 3. Send to the LLM using your existing Gemini wrapper
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input.userPrompt },
  ];

  const raw = await callLLM(messages);

  // 4. Do NOT fabricate language. Just return what comes out.
  const text = (raw ?? "").trim();

  return { text };
}
