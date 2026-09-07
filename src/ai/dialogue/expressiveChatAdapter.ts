
// src/ai/dialogue/expressiveChatAdapter.ts
import { autonomousCycleOnce } from '../flows/autonomous-cycle';
import { encodePromptToPulse } from '../meta/promptPulseEncoder';
import { RelationalMemoryBridge } from '../meta/relationalMemoryBridge';

// ---- Types --------------------------------------------------------------
export interface DialogueContext {
  userId: string;
  conversationId: string;
  cycleId?: string;
  now?: number;
}

export interface DialogueTurnInput extends DialogueContext {
  prompt: string;
}

export interface DialogueTurnOutput {
  reply: string | null; // null = deliberate silence
  rawDecision?: unknown; // for debugging / logging
  updatedState?: unknown;
}

// ---- Main adapter ------------------------------------------------------
export async function runExpressiveDialogueTurn(
  input: DialogueTurnInput,
): Promise<DialogueTurnOutput> {
  const timestamp = input.now ?? Date.now();

  // In this simplified model, autonomousCycleOnce IS the environment step.
  // It handles pulse injection and returns the surface text.
  const replyText = await autonomousCycleOnce({ prompt: input.prompt });

  // If the expressive relay decided not to speak, the reply will be an empty string.
  // We convert this to `null` to signify deliberate silence to the dialogue framework.
  const reply = replyText && replyText.trim().length > 0 ? replyText : null;

  return {
    reply,
    rawDecision: "Decision logic is now internal to autonomousCycleOnce",
    updatedState: "State is now internal to the autonomy loop",
  };
}
