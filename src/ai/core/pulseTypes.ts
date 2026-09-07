// src/ai/core/pulseTypes.ts

// Who injected the pulse
export type PulseSource = "internal" | "environmental" | "feedback";

// A single energy event inside the substrate / autonomy loop
export interface Pulse {
  source: PulseSource;
  energy: number; // 0..1
  vector?: number[]; // optional semantic / affective embedding
  timestamp: number; // ms since epoch
  meta?: {
    kind?: "user_prompt" | "system_adjust" | "cycle_tick" | string;
    id?: string; // optional correlation ID
  };
}
