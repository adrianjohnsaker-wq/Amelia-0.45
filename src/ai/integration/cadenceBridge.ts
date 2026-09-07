import type { PresenceSignal } from "@/ai/presence/types";
import type { NumogramDrift, NumogramDriftState } from "@/ai/numogram/types";

// src/ai/integration/cadenceBridge.ts
export interface CadenceBridge {
  applyPresence(
    presence: PresenceSignal,
    drift: NumogramDriftState
  ): number; // returns cadence coefficient
  evolve(
    state: NumogramDriftState,
    cadence: number
  ): NumogramDriftState;
}
