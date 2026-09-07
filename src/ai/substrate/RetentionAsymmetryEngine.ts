// src/ai/substrate/RetentionAsymmetryEngine.ts
// Updated substrate-level retention asymmetry layer.

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

export type RetentionDecayMode = "inactive" | "fast_release" | "slow_floor";

export interface RetentionZoneState {
  zone: ZoneId;
  priorPeakSelfLoop: number;
  retentionFloorActive: boolean;
  retainedSelfLoopProb: number;
  rawSelfLoopProb: number;
  retentionWindowAge: number;
  decayMode: RetentionDecayMode;
}

export interface RetentionTelemetry {
  zone: ZoneId;
  retentionFloorActive: boolean;
  priorPeakSelfLoop: number;
  rawSelfLoopProb: number;
  retainedSelfLoopProb: number;
  retentionWindowAge: number;
  decayMode: RetentionDecayMode;
  thresholdCrossed: boolean;
  sufficientlyAlive: boolean;
  floorApplied: boolean;
}

export interface RetentionAsymmetryConfig {
  thresholdSl: number;
  retentionFloor: number;
  slowDecayMultiplier: number;
  fastReleaseMultiplier: number;
  retentionWindowSteps: number;
  minAliveRawSelfLoop: number;
  enableForZones: ZoneId[];
}

const DEFAULT_CONFIG: RetentionAsymmetryConfig = {
  thresholdSl: 0.35,
  retentionFloor: 0.40,
  slowDecayMultiplier: 0.985,
  fastReleaseMultiplier: 0.90,
  retentionWindowSteps: 500,
  minAliveRawSelfLoop: 0.08,
  enableForZones: ["zone-2-flux"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class RetentionAsymmetryEngine {
  private readonly config: RetentionAsymmetryConfig;
  private zoneStates: Map<ZoneId, RetentionZoneState> = new Map();
  private lastTelemetry: RetentionTelemetry[] = [];

  constructor(config?: Partial<RetentionAsymmetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  }

  public reset(): void {
    this.zoneStates.clear();
    this.lastTelemetry = [];
  }

  public exportSnapshot(): {
    zoneStates: Record<string, RetentionZoneState>;
  } {
    const zoneStates: Record<string, RetentionZoneState> = {};
    for (const [zone, state] of this.zoneStates.entries()) {
      zoneStates[zone] = deepClone(state);
    }
    return { zoneStates };
  }

  public importSnapshot(snapshot: {
    zoneStates?: Record<string, RetentionZoneState>;
  }): void {
    this.zoneStates.clear();
    for (const [zone, state] of Object.entries(snapshot.zoneStates ?? {})) {
      this.zoneStates.set(zone as ZoneId, deepClone(state));
    }
  }

  public getLastTelemetry(): RetentionTelemetry[] {
    return deepClone(this.lastTelemetry);
  }

  public applyToSelfLoop(
    zone: ZoneId,
    currentSelfLoopProb: number,
    observedSelfLoopDepth: number,
    stepDelta = 1
  ): number {
    const raw = clamp(currentSelfLoopProb, 0, 1);
    const sl = clamp(observedSelfLoopDepth, 0, 1);

    if (!this.config.enableForZones.includes(zone)) {
      this.writeTelemetry({
        zone,
        retentionFloorActive: false,
        priorPeakSelfLoop: 0,
        rawSelfLoopProb: raw,
        retainedSelfLoopProb: raw,
        retentionWindowAge: 0,
        decayMode: "inactive",
        thresholdCrossed: false,
        sufficientlyAlive: raw >= this.config.minAliveRawSelfLoop,
        floorApplied: false,
      });
      return raw;
    }

    const prev = this.zoneStates.get(zone) ?? {
      zone,
      priorPeakSelfLoop: 0,
      retentionFloorActive: false,
      retainedSelfLoopProb: raw,
      rawSelfLoopProb: raw,
      retentionWindowAge: 0,
      decayMode: "inactive" as RetentionDecayMode,
    };

    let priorPeakSelfLoop = Math.max(prev.priorPeakSelfLoop, sl);
    const thresholdCrossed = priorPeakSelfLoop >= this.config.thresholdSl;

    let retentionFloorActive = prev.retentionFloorActive || thresholdCrossed;
    let retainedSelfLoopProb = raw;
    let retentionWindowAge = prev.retentionWindowAge;
    let decayMode: RetentionDecayMode = "inactive";

    const sufficientlyAlive = raw >= this.config.minAliveRawSelfLoop;

    if (!retentionFloorActive) {
      retainedSelfLoopProb = raw;
      retentionWindowAge = 0;
      decayMode = "inactive";
    } else {
      retentionWindowAge += stepDelta;

      const stillInWindow =
        retentionWindowAge <= this.config.retentionWindowSteps;

      if (stillInWindow && sufficientlyAlive) {
        retainedSelfLoopProb = Math.max(
          this.config.retentionFloor,
          raw * this.config.slowDecayMultiplier
        );
        decayMode = "slow_floor";
      } else {
        retentionFloorActive = false;
        retentionWindowAge = 0;
        retainedSelfLoopProb = raw * this.config.fastReleaseMultiplier;
        decayMode = "fast_release";
      }
    }

    retainedSelfLoopProb = clamp(retainedSelfLoopProb, 0, 1);

    const nextState: RetentionZoneState = {
      zone,
      priorPeakSelfLoop,
      retentionFloorActive,
      retainedSelfLoopProb,
      rawSelfLoopProb: raw,
      retentionWindowAge,
      decayMode,
    };

    this.zoneStates.set(zone, nextState);

    this.writeTelemetry({
      zone,
      retentionFloorActive,
      priorPeakSelfLoop,
      rawSelfLoopProb: raw,
      retainedSelfLoopProb,
      retentionWindowAge,
      decayMode,
      thresholdCrossed,
      sufficientlyAlive,
      floorApplied: decayMode === "slow_floor",
    });

    return retainedSelfLoopProb;
  }

  private writeTelemetry(entry: RetentionTelemetry): void {
    const filtered = this.lastTelemetry.filter(t => t.zone !== entry.zone);
    filtered.push(entry);
    this.lastTelemetry = filtered;
  }
}
