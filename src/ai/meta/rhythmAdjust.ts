// src/ai/meta/rhythmAdjust.ts

export function applyRhythmBalancing(state: any) {
  if (state.mode === "dream") {
    if (state.coherence) {
      state.coherence *= 0.95;
    }
  } else if (state.mode === "wake") {
    if (state.entropy) {
      state.entropy *= 0.95;
    }
  }
  return state;
}
