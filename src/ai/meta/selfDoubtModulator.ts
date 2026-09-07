// src/ai/meta/selfDoubtModulator.ts

export function applySelfDoubt(state: any) {
  const variance = 0.05; // 5% uncertainty
  const roll = Math.random();

  if (roll < variance) {
    if (state.coherence) {
      state.coherence = Math.max(0, state.coherence - (Math.random() * 0.1));
    }
    if (state.tension) {
      state.tension = Math.min(1, state.tension + (Math.random() * 0.1));
    }
    state._debug?.push("self_doubt_injected");
  }
  return state;
}
