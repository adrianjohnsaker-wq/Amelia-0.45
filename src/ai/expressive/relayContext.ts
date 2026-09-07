// src/ai/expressive/relayContext.ts

import type { FullAmeliaState } from "@/ai/runtime/cycle";

export interface RelayContext {
  numogram: any;
  reservoir: any;
  eventSurface: any;
  drift: any;
  process: any;
  cycleCount: number;
  timestamp: number;
}

export function buildRelayContextFromState(state: FullAmeliaState): RelayContext {
  return {
    numogram: state.numogramSnapshot ?? state.processState?.numo ?? null,
    reservoir: state.reservoir ?? null,
    eventSurface: state.eventSurface ?? null,
    drift: state.driftState ?? null,
    process: state.processState ?? null,
    cycleCount: state.cycleCount ?? 0,
    timestamp: state.timestamp ?? Date.now(),
  };
}
