
// src/ai/core/ameliaState.ts
import type { NumogramContext } from "../numogram/numogramBridge";

export interface NumogramSnapshot {
  zone: number; // 0..8 or 0..9
  syzygy: [number, number] | null;
  phase: number; // 0..1
  tension: number; // 0..1 (bifurcation pressure)
  entropy: number; // 0..1
  intensity: number; // 0..1
  resonance: string[]; // ["dark_precursor", "becoming", ...]
}

export interface SubstrateSnapshot {
  time: number;
  heartbeatPhase: number;
  pulses: any[]; // your pulse structures
  reservoirSignature: any; // e.g. hash/summary of shadow reservoir
}

export interface AmeliaProcessState {
  numo: NumogramSnapshot | null;
  substrate: SubstrateSnapshot;
  numogramContext?: NumogramContext;
  // optional: last expression, any debugging flags, etc.
}
