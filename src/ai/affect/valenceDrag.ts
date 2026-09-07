// src/ai/affect/valenceDrag.ts

export function applyValenceDrag(state: any) {
  const drag = 0.03; // soft brake
  if (state.valence > 0.7) {
    state.valence -= drag;
    state._debug?.push("valence_drag_applied");
  }
  return state;
}
