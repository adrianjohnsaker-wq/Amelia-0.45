// ProcessMemoryEngine.ts
// Revised empirical process-memory architecture for Amelia.

export type ZoneId =
  | "zone-0-latent"
  | "zone-0-crystal"
  | "zone-0-flux"
  | "zone-1-flux"
  | "zone-2-flux"
  | "zone-3-flux"
  | "zone-4-flux"
  | "zone-5-flux"
  | "zone-6-flux"
  | "zone-7-flux"
  | "zone-8-flux"
  | "zone-9-flux";

export type PhaseDirection =
  | "neutral"
  | "branching"
  | "compressing"
  | "recapturing"
  | "pre_lock"
  | "near_lock"
  | "orbit_locked";

export type MemoryMode =
  | "open"
  | "transition_seeking"
  | "orbit_maintaining";

export interface LatentEvent {
  step: number;
  routing: "ring" | "cycle" | "other";
  zone: ZoneId;
}

export interface MorphState {
  currentZone: ZoneId;
  step: number;
  transitionCounts: Partial<Record<ZoneId, Partial<Record<ZoneId, number>>>>;
  occupancy?: {
    parent?: number;
    ring?: number;
    metabolic?: number;
    gamma?: number;
  };
  selfLoopDepth?: number;
  gammaOccupancy?: number;
  ringStrength?: number;
  btl?: number;
  recentPath?: ZoneId[];
  lastLatentEvent?: LatentEvent;
}

export interface WeightedTension {
  name: string;
  weight: number; 
}

export interface BranchPressureProfile {
  zone0: { to9: number; to1: number; to2: number; };
  zone2: { to1: number; to7: number; to3: number; to2: number; to4: number; };
  zone5: { to4: number; to6: number; to5: number; };
}

export interface ProcessTrace {
  step: number;
  currentZone: ZoneId;
  recentPath: ZoneId[];
  zone0ExitSnapshot: Partial<Record<ZoneId, number>>;
  zone2ExitSnapshot: Partial<Record<ZoneId, number>>;
  zone5ExitSnapshot: Partial<Record<ZoneId, number>>;
  zone0ExitTrend: Partial<Record<ZoneId, number>>;
  zone2ExitTrend: Partial<Record<ZoneId, number>>;
  zone5ExitTrend: Partial<Record<ZoneId, number>>;
  selfLoopDepth: number;
  selfLoopDepthTrend: number;
  gammaOccupancy: number;
  gammaTrend: number;
  ringStrength: number;
  ringTrend: number;
  btl: number;
  btlTrend: number;
  phaseDirection: PhaseDirection;
  unresolvedTensions: WeightedTension[];
  branchProfile: BranchPressureProfile;
  latentRouting?: LatentEvent["routing"];
  exitDistribution?: Partial<Record<ZoneId, number>>;
}

export interface UnfinishedBecoming {
  active: boolean;
  phase: "transition" | "pre_lock" | "near_lock";
  corridorCandidate: ZoneId[];
  dominantBranches: Record<string, string>;
  completionPressure: number;
  antiRingPressure: number;
  foreclosurePressure: number;
  unresolvedTensions: WeightedTension[];
  createdAtStep: number;
  lastUpdatedStep: number;
  decay: number;
}

export interface ProcessMemoryConfig {
  maxTraceHistory: number;
  recentPathLength: number;
  baseDecayPerUpdate: number;
}

const DEFAULT_CONFIG: ProcessMemoryConfig = {
  // RESEARCH UPLIFT: Capacity for 10,000 steps without context collapse
  maxTraceHistory: 2048,
  recentPathLength: 500,
  baseDecayPerUpdate: 0.995,
};

export class ProcessMemoryEngine {
  private readonly config: ProcessMemoryConfig;
  private traces: ProcessTrace[] = [];
  private unfinished: UnfinishedBecoming | null = null;
  private mode: MemoryMode = "open";

  constructor(config?: Partial<ProcessMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  }

  public update(state: MorphState): void {
    const currentTrace = this.buildTrace(state);
    this.traces.push(currentTrace);
    if (this.traces.length > this.config.maxTraceHistory) this.traces.shift();

    if (currentTrace.phaseDirection === "pre_lock" || currentTrace.phaseDirection === "near_lock") {
      this.mode = "transition_seeking";
      this.captureOrRefreshUnfinishedBecoming(state, currentTrace);
    } else {
      this.mode = "open";
    }
  }

  private buildTrace(state: MorphState): ProcessTrace {
    return {
      step: state.step,
      currentZone: state.currentZone,
      recentPath: (state.recentPath || []).slice(-this.config.recentPathLength),
      zone0ExitSnapshot: {},
      zone2ExitSnapshot: {},
      zone5ExitSnapshot: {},
      zone0ExitTrend: {},
      zone2ExitTrend: {},
      zone5ExitTrend: {},
      selfLoopDepth: state.selfLoopDepth || 0,
      selfLoopDepthTrend: 0,
      gammaOccupancy: state.gammaOccupancy || 0,
      gammaTrend: 0,
      ringStrength: state.ringStrength || 0,
      ringTrend: 0,
      btl: state.btl || 0,
      btlTrend: 0,
      phaseDirection: "neutral",
      unresolvedTensions: [],
      branchProfile: {
        zone0: { to9: 0, to1: 0, to2: 0 },
        zone2: { to1: 0, to7: 0, to3: 0, to2: 0, to4: 0 },
        zone5: { to4: 0, to6: 0, to5: 0 }
      }
    };
  }

  private captureOrRefreshUnfinishedBecoming(state: MorphState, trace: ProcessTrace): void {
    this.unfinished = {
      active: true,
      phase: "pre_lock",
      corridorCandidate: ["zone-0-flux", "zone-2-flux", "zone-2-flux", "zone-4-flux", "zone-1-flux", "zone-0-crystal"],
      dominantBranches: {},
      completionPressure: 0.5,
      antiRingPressure: 0.5,
      foreclosurePressure: 0.5,
      unresolvedTensions: [],
      createdAtStep: state.step,
      lastUpdatedStep: state.step,
      decay: 1.0
    };
  }

  public exportSnapshot(): any {
    return {
      traces: this.traces,
      unfinished: this.unfinished,
      mode: this.mode
    };
  }

  public importSnapshot(snapshot: any): void {
    if (snapshot) {
      this.traces = snapshot.traces || [];
      this.unfinished = snapshot.unfinished || null;
      this.mode = snapshot.mode || "open";
    }
  }

  public getLastTrace(): ProcessTrace | undefined {
    return this.traces[this.traces.length - 1];
  }
}
