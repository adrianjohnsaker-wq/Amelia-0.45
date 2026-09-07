// selectionRules.ts
import { AmeliaState, safe } from "@/ai/state/stateSchema";
import { deadBin } from "./deadBinInstance";

export function applyReemergencePenalty(archetype: any, state: AmeliaState) {
  if (!state._debug) state._debug = [];
  if (deadBin.contains(archetype.name)) {
    // multiplicative vitality hit
    archetype.energy = safe(archetype.energy, 0, -1, 1) * 0.4;
    
    // additive, clamped, decaying penalty (handled per cycle)
    const add = 0.2;
    const blended = safe(state.recursionPenalty + add, 0, 0, 1);
    state.recursionPenalty = blended;
    
    state._debug.push(`penalized_revival:${archetype.name}`);
  } else {
    // ensure finite even when not penalized
    state.recursionPenalty = safe(state.recursionPenalty, 0, 0, 1);
  }
}

    