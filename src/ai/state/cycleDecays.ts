// cycleDecays.ts
import { AmeliaState, normalizeState } from "./stateSchema";

export function decayTransients(s: AmeliaState): AmeliaState {
  // exponential decay for sticky terms
  s.recursionPenalty *= 0.5; // halves each cycle

  // rhythm nudges
  if (s.mode === "dream") {
    s.coherence *= 0.97;
    s.entropy = Math.min(1, s.entropy * 1.03);
  } else {
    s.entropy *= 0.97;
    s.coherence = Math.min(1, s.coherence * 1.02);
  }
  
  return normalizeState(s);
}

    