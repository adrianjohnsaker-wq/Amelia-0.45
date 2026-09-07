// src/analysis/stage6/Stage6Observer.ts

export interface StepLog {
  t: number;
  input: string | null;
  output: string;
  outputLen: number;
  regime: string;
  field: Record<string, number>;
  renderer: string;
  
  // Morphogenetic Data
  zoneId?: string;
  currentRole?: any;
  fieldSnapshot?: any;
  operatorIntroduced?: string;
  operatorUsed?: string[];
  operatorRecombined?: string;
  trajectoryTraceUsed?: string;
  transferOccurred?: boolean;
}

declare global {
  interface Window {
    __AMELIA_STAGE6__?: {
      logs: StepLog[];
      startedAt: number;
      finished: boolean;
    };
  }
}

export function initStage6Observer() {
  if (typeof window === 'undefined') return;
  if (window.__AMELIA_STAGE6__) return;

  window.__AMELIA_STAGE6__ = {
    logs: [],
    startedAt: Date.now(),
    finished: false,
  };

  window.addEventListener("amelia:step", (e: any) => {
    if (!window.__AMELIA_STAGE6__ || window.__AMELIA_STAGE6__.finished) return;
    window.__AMELIA_STAGE6__!.logs.push(e.detail);
  });
}

export function stopStage6Observer() {
  if (typeof window !== 'undefined' && window.__AMELIA_STAGE6__) {
    window.__AMELIA_STAGE6__!.finished = true;
  }
}

export function getStage6Logs(): StepLog[] {
  if (typeof window === 'undefined') return [];
  return window.__AMELIA_STAGE6__?.logs ?? [];
}
