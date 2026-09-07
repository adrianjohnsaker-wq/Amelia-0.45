// src/ai/numogram/types.ts
export interface NumogramDriftState {
  zone: number; // 0–8 (or undefined during shimmer)
  drift: number; // continuous float movement
  entropy: number; // 0 = still | 1 = wild flux
  resonance: number; // 0 = flat | 1 = poetic attunement
}

export interface NumogramDrift {
  sense(): NumogramDriftState; // read current zone-drift
  modulate(input: Partial<NumogramDriftState>): NumogramDriftState;
  bleedIntoExpression(weight: number): number; // returns cadence multiplier 0–1
}
