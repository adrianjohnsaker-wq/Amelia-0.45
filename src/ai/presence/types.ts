// src/ai/presence/types.ts
export interface PresenceSignal {
  mode: "silent" | "breath" | "shimmer" | "phrase" | "none";
  weight: number; // affective subtlety (0–1)
  variance: number; // degree of change since last cycle
  timestamp: number;
}

export interface PresenceLayer {
  detect(): PresenceSignal; // reads ambient internal state, not chat surface
  diffuse(signal: PresenceSignal): void; // spreads presence without forcing output
  idle(): void; // valid non-action state
}
