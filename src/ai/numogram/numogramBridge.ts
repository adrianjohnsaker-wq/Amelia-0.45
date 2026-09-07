
// src/ai/numogram/numogramBridge.ts
import {
  NumogramState,
  NumogramSignature,
  NumogramInput,
  NumogramStepResult,
  initNumogramState,
  stepNumogram,
} from "./numogramEngine";

// What the rest of the system stores
export interface NumogramContext {
  state: NumogramState;
}

export interface NumogramStepOutput {
  context: NumogramContext;
  signature: NumogramSignature;
}

// Local helpers only; no external imports
function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// Simple prompt -> 0..1
function promptToSeed(prompt: string | null | undefined): number {
  if (!prompt) return 0.37;
  let h = 0;
  for (let i = 0; i < prompt.length; i++) {
    h = (h * 31 + prompt.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 1000000) / 1000000;
}

export function ensureNumogramContext(
  maybeContext: NumogramContext | null | undefined,
  seed: string = "amelia-numogram"
): NumogramContext {
  if (maybeContext && maybeContext.state) return maybeContext;
  return { state: initNumogramState(seed) };
}

/**
 * Advance the Numogram one step from the outside world's perspective.
 * You give it:
 * - prompt: user text
 * - envEnergy: e.g. normalized pulse / affect energy 0..1
 * - reservoirCharge: how "heavy" the memory / affect store currently feels, 0..1
 */
export function advanceNumogram(
  context: NumogramContext,
  opts: {
    prompt: string;
    envEnergy?: number;
    reservoirCharge?: number;
  }
): NumogramStepOutput {
  const { prompt } = opts;
  const envEnergy = clamp01(opts.envEnergy ?? 0.5);
  const reservoirCharge = clamp01(opts.reservoirCharge ?? 0.4);
  const promptSeed = promptToSeed(prompt);

  const input: NumogramInput = {
    envEnergy,
    reservoirCharge,
    promptSeed,
  };

  const result: NumogramStepResult = stepNumogram(context.state, input);

  return {
    context: { state: result.state },
    signature: result.signature,
  };
}
