// CommitmentMemoryEngine.ts
//
// PM2.1 — Foreclosure Gain / Rival Suppression Patch

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

export interface ProcessTrace {
  step: number;
  currentZone: ZoneId;
  exitDistribution?: Partial<Record<ZoneId, number>>;
  entropy?: number;
  selfLoopDepth?: number;
  gammaOccupancy?: number;
  btl?: number;
}

export interface ForeclosureSnapshot {
  zone: ZoneId;
  dominantExit: ZoneId | null;
  dominantStrength: number;
  secondStrength: number;
  localEntropy: number;
  narrowingConfidence: number;
  rivalSuppression: Partial<Record<ZoneId, number>>;
  foreclosureStrength: number;
  commitmentConfidence: number;
}

export interface UnfinishedState {
  runId: string;
  sourceZone: ZoneId;
  candidateExit: ZoneId | null;
  confidence: number;
  savedAtStep: number;
  traces: ProcessTrace[];
  foreclosure?: ForeclosureSnapshot;
  active?: boolean;
  decay?: number;
}

export interface CommitmentSnapshot {
  anchorZone: ZoneId | null;
  favoredTransitions: Array<{ from: ZoneId; to: ZoneId; weight: number }>;
  suppressedTransitions: Array<{ from: ZoneId; to: ZoneId; weight: number }>;
  decay: number;
  foreclosure?: ForeclosureSnapshot;
  active?: boolean;
  confidence?: number;
  foreclosureDepth?: number;
  directionalAsymmetry?: number;
  compressionPressure?: number;
}

export interface ResumeBias {
  preferredExit: ZoneId | null;
  boost: number;
  rivalPenalties: Partial<Record<ZoneId, number>>;
  confidence: number;
  foreclosureStrength: number;
  commitmentConfidence: number;
  narrowingConfidence: number;
  shouldApply: boolean;
  decay: number;
}

export interface CommitmentMemoryConfig {
  minConfidence: number;
  minForeclosureStrength: number;
  maxBoost: number;
  maxRivalPenalty: number;
  decayBasePerStep: number;
  traceWindow: number;
}

const DEFAULT_CONFIG: CommitmentMemoryConfig = {
  minConfidence: 0.55,
  minForeclosureStrength: 0.18,
  maxBoost: 0.22,
  maxRivalPenalty: 0.28,
  decayBasePerStep: 0.9985,
  traceWindow: 4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function safe(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export class CommitmentMemoryEngine {
  private readonly config: CommitmentMemoryConfig;
  private unfinishedStates = new Map<string, UnfinishedState>();
  private current: (CommitmentSnapshot & { active: boolean }) | null = null;
  private snapshots: CommitmentSnapshot[] = [];

  constructor(config?: Partial<CommitmentMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  }

  public saveUnfinishedState(key: string, state: UnfinishedState): void {
    const enriched = this.enrichWithForeclosure(state);
    if (!this.shouldCapture(enriched)) return;
    
    enriched.active = true;
    enriched.decay = 1.0;
    this.unfinishedStates.set(key, enriched);
    
    // Maintain a "current" snapshot for persistence
    if (enriched.foreclosure) {
      this.current = {
        anchorZone: enriched.sourceZone,
        favoredTransitions: enriched.foreclosure.dominantExit ? [{
          from: enriched.sourceZone,
          to: enriched.foreclosure.dominantExit,
          weight: enriched.foreclosure.dominantStrength
        }] : [],
        suppressedTransitions: Object.entries(enriched.foreclosure.rivalSuppression).map(([to, s]) => ({
          from: enriched.sourceZone,
          to: to as ZoneId,
          weight: s as number
        })),
        decay: 1.0,
        confidence: enriched.confidence,
        foreclosure: enriched.foreclosure,
        active: true
      };
    }
  }

  public getUnfinishedState(key: string): UnfinishedState | null {
    return this.unfinishedStates.get(key) ?? null;
  }

  public clearRun(runId: string): void {
    for (const key of this.unfinishedStates.keys()) {
      if (key.startsWith(`${runId}:`)) {
        this.unfinishedStates.delete(key);
      }
    }
  }

  public getResumeBias(
    key: string,
    currentZone: ZoneId,
    currentStep: number
  ): ResumeBias | null {
    const unfinished = this.getUnfinishedState(key);
    if (!unfinished || !unfinished.active) return null;
    if (unfinished.sourceZone !== currentZone) return null;
    if (!unfinished.foreclosure) return null;

    const f = unfinished.foreclosure;
    const stepAge = Math.max(0, currentStep - unfinished.savedAtStep);
    const decay = Math.pow(this.config.decayBasePerStep, stepAge) * (unfinished.decay || 1.0);

    if (decay < 0.08) return null;

    const shouldApply =
      unfinished.confidence >= this.config.minConfidence &&
      f.foreclosureStrength >= this.config.minForeclosureStrength &&
      !!f.dominantExit;

    if (!shouldApply) return null;

    const boost = Math.min(this.config.maxBoost, (0.08 + f.commitmentConfidence * 0.14) * decay);
    const rivalPenalties: Partial<Record<ZoneId, number>> = {};
    for (const [zone, suppression] of Object.entries(f.rivalSuppression)) {
      rivalPenalties[zone as ZoneId] = Math.min(this.config.maxRivalPenalty, (suppression as number) * (0.65 + f.foreclosureStrength) * decay);
    }

    return {
      preferredExit: f.dominantExit,
      boost,
      rivalPenalties,
      confidence: unfinished.confidence,
      foreclosureStrength: f.foreclosureStrength,
      commitmentConfidence: f.commitmentConfidence,
      narrowingConfidence: f.narrowingConfidence,
      shouldApply: true,
      decay,
    };
  }

  public getCurrentSnapshot(runId: string, currentZone: ZoneId, currentStep: number): CommitmentSnapshot | null {
    const key = `${runId}:${currentZone}`;
    const unfinished = this.getUnfinishedState(key);
    if (!unfinished || !unfinished.foreclosure || !unfinished.active) return null;

    const f = unfinished.foreclosure;
    const stepAge = Math.max(0, currentStep - unfinished.savedAtStep);
    const decay = Math.pow(this.config.decayBasePerStep, stepAge) * (unfinished.decay || 1.0);

    return {
      anchorZone: currentZone,
      favoredTransitions: f.dominantExit ? [{
        from: currentZone,
        to: f.dominantExit,
        weight: (0.08 + f.commitmentConfidence * 0.14) * decay
      }] : [],
      suppressedTransitions: Object.entries(f.rivalSuppression).map(([to, s]) => ({
        from: currentZone,
        to: to as ZoneId,
        weight: Math.min(this.config.maxRivalPenalty, (s as number) * (0.65 + f.foreclosureStrength) * decay)
      })),
      decay,
      foreclosure: f,
      active: true
    };
  }

  private enrichWithForeclosure(state: UnfinishedState): UnfinishedState {
    const traces = state.traces;
    if (!traces.length) return state;

    const latest = traces[traces.length - 1];
    const latestDist = this.normalizeDistribution(latest.exitDistribution ?? {});
    const ranked = Object.entries(latestDist).sort((a, b) => b[1] - a[1]) as [ZoneId, number][];

    let dominantExit: ZoneId | null = ranked.length ? ranked[0][0] : null;
    let dominantStrength = ranked.length ? ranked[0][1] : 0;
    const secondStrength = ranked.length > 1 ? ranked[1][1] : 0;

    if (state.sourceZone === "zone-1-flux") {
      const crystalProb = latestDist["zone-0-crystal"] ?? 0;
      if (crystalProb > 0) {
        dominantExit = "zone-0-crystal";
        dominantStrength = crystalProb;
      }
    }

    const rivalSuppression: Partial<Record<ZoneId, number>> = {};
    for (const [candidate, prob] of ranked) {
      if (candidate === dominantExit) continue;
      rivalSuppression[candidate] = Math.max(0, dominantStrength - prob);
    }

    const narrowingConfidence = this.computeNarrowingConfidence(traces, dominantExit);
    const foreclosureStrength = this.computeForeclosureStrength(Math.max(0, dominantStrength - secondStrength), this.computeEntropy(latestDist), rivalSuppression);
    const commitmentConfidence = this.computeCommitmentConfidence(traces, dominantExit, foreclosureStrength);

    return {
      ...state,
      foreclosure: {
        zone: state.sourceZone,
        dominantExit,
        dominantStrength,
        secondStrength,
        localEntropy: this.computeEntropy(latestDist),
        narrowingConfidence,
        rivalSuppression,
        foreclosureStrength,
        commitmentConfidence,
      },
    };
  }

  private computeNarrowingConfidence(traces: ProcessTrace[], dominantExit: ZoneId | null): number {
    if (!dominantExit || traces.length < 2) return 0;
    const strengths = traces.slice(-4).map(t => this.normalizeDistribution(t.exitDistribution || {})[dominantExit] ?? 0);
    const slope = strengths[strengths.length - 1] - strengths[0];
    return clamp01(0.5 + slope * 2.0);
  }

  private computeForeclosureStrength(margin: number, localEntropy: number, rivalSuppression: Partial<Record<ZoneId, number>>): number {
    const vals = Object.values(rivalSuppression);
    const avgSuppression = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return clamp01(margin * 1.8 + avgSuppression * 1.2 + (1 - localEntropy / 2.2) * 0.8);
  }

  private computeCommitmentConfidence(traces: ProcessTrace[], dominantExit: ZoneId | null, foreclosureStrength: number): number {
    if (!dominantExit || traces.length < 2) return foreclosureStrength * 0.5;
    const latest = traces[traces.length - 1];
    const btlNorm = clamp01((safe(latest.btl) - 30) / 20);
    return clamp01(foreclosureStrength * 0.45 + (latest.selfLoopDepth || 0) * 0.20 + (latest.gammaOccupancy || 0) * 0.20 + btlNorm * 0.15);
  }

  private shouldCapture(state: UnfinishedState): boolean {
    const f = state.foreclosure;
    if (!f) return false;
    if (f.zone === "zone-0-flux" && f.dominantExit === "zone-9-flux") return false;
    return f.foreclosureStrength >= this.config.minForeclosureStrength && f.commitmentConfidence >= this.config.minConfidence;
  }

  private normalizeDistribution(dist: Partial<Record<ZoneId, number>>): Partial<Record<ZoneId, number>> {
    const total = Object.values(dist).reduce((sum, v) => sum + (v || 0), 0);
    if (total <= 0) return {};
    const out: Partial<Record<ZoneId, number>> = {};
    for (const [k, v] of Object.entries(dist)) out[k as ZoneId] = (v || 0) / total;
    return out;
  }

  private computeEntropy(dist: Partial<Record<ZoneId, number>>): number {
    const vals = Object.values(dist).filter(v => (v || 0) > 0);
    return vals.length ? -vals.reduce((acc, p) => acc + (p || 0) * Math.log2(p || 1), 0) : 0;
  }

  public exportSnapshot(): any {
    return { 
      unfinishedStates: Object.fromEntries(this.unfinishedStates.entries()),
      current: this.current,
      snapshots: this.snapshots
    };
  }

  public importSnapshot(snapshot: any): void {
    if (snapshot) {
      if (snapshot.unfinishedStates) this.unfinishedStates = new Map(Object.entries(snapshot.unfinishedStates));
      if (snapshot.current) this.current = snapshot.current;
      if (snapshot.snapshots) this.snapshots = snapshot.snapshots;
    }
  }
}
