// src/ai/substrate/SubstrateTelemetryLogger.ts

import type { ZoneId, BecomingBias, ProcessTrace } from "./ProcessMemoryEngine";
import type { CommitmentSnapshot } from "./CommitmentMemoryEngine";
import type { RetentionTelemetry, RetentionDecayMode } from "./RetentionAsymmetryEngine";

export interface PM2TelemetryFields {
  foreclosureDepth: number;
  directionalAsymmetry: number;
  compressionPressure: number;
  confidence: number;
  favoredTrendStrength: number;
  suppressedTrendStrength: number;
  entropyCompression: number;
  favoredTransitions: Array<{ from: ZoneId; to: ZoneId; weight: number }>;
  suppressedTransitions: Array<{ from: ZoneId; to: ZoneId; weight: number }>;
  anchorZone: string | null;
  snapshotActive: boolean;
  snapshotDecay: number | null;
}

export interface PM1TelemetryFields {
  phaseDirection: string | null;
  unresolvedTensions: string[];
  selfLoopDepth: number;
  gammaTrend: number;
  ringTrend: number;
  btlTrend: number;
  unfinishedBecomingActive: boolean;
  completionPressure: number | null;
}

export interface ZoneOccupancyFields {
  ringPercent: number;
  parentPercent: number;
  gammaPercent: number;
  crystalPercent: number;
  syzygy: number;
}

export interface TransitionDistributionFields {
  z0ToZ9: number;
  z0ToZ2: number;
  z0ToZ1: number;
  z0ToSelf: number;
  z2ToSelf: number;
  z2ToZ4: number;
  z2ToZ1: number;
  z2ToZ7: number;
  z1ToCrystal: number;
  z1ToSelf: number;
  z1ToZ0: number;
  z5ToZ4: number;
  z9ToZ0: number;
}

export interface LatentCrystalFields {
  latentFiredThisStep: boolean;
  latentRouting: "ring" | "cycle" | "other" | null;
  crystalFiredThisStep: boolean;
  crystalGapSinceLast: number | null;
}

export interface TelemetryFrame {
  step: number;
  currentZone: ZoneId;
  nextZone: ZoneId;
  pm2: PM2TelemetryFields;
  pm1: PM1TelemetryFields;
  occupancy: ZoneOccupancyFields;
  transitions: TransitionDistributionFields;
  latentCrystal: LatentCrystalFields;
  netZ0ToZ2Boost: number;
  phaseLabel: string;
  retention?: RetentionTelemetry[];
}

export class SubstrateTelemetryLogger {
    private history: TelemetryFrame[] = [];

    public record(frame: TelemetryFrame) {
        this.history.push(frame);
        if (this.history.length > 2000) this.history.shift();
        return frame;
    }

    public getHistory() {
        return [...this.history];
    }
}
