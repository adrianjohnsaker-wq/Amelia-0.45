import {
  SubstrateVector,
  RelayVector,
  DeltaProfile,
  GapSeverityLevel,
  PhaseClass,
  CouplingConfig,
  DEFAULT_COUPLING_CONFIG,
} from "./types";

// ─────────────────────────────────────────────
// PHASE DISTANCE
// ─────────────────────────────────────────────

const PHASE_ORDER: PhaseClass[] = [
  "terrace-only",
  "low-zone-integrated",
  "coupled-assemblage",
];

/**
 * Returns ordinal distance between two phase classes.
 * "unknown" treated as terrace-only for distance purposes.
 */
function phaseDistance(a: PhaseClass, b: PhaseClass): number {
  const ia = PHASE_ORDER.indexOf(a === "unknown" ? "terrace-only" : a);
  const ib = PHASE_ORDER.indexOf(b === "unknown" ? "terrace-only" : b);
  return Math.abs(ia - ib);
}

// ─────────────────────────────────────────────
// NORMALISATION
// ─────────────────────────────────────────────

/**
 * Normalise occupancy values to 0–1 range.
 * Substrate exports may use either 0–1 or 0–100 scale.
 */
function normalise(value: number): number {
  return value > 1 ? value / 100 : value;
}

// ─────────────────────────────────────────────
// COUPLING DELTA MONITOR
// ─────────────────────────────────────────────

export class CouplingDeltaMonitor {
  private config: CouplingConfig;

  constructor(config: Partial<CouplingConfig> = {}) {
    this.config = { ...DEFAULT_COUPLING_CONFIG, ...config };
  }

  /**
   * Primary method. Receives substrate and relay vectors,
   * returns a complete DeltaProfile.
   */
  compute(substrate: SubstrateVector, relay: RelayVector): DeltaProfile {
    const deltaClass = phaseDistance(substrate.taskClass, relay.fieldClassification);

    const deltaRCS = substrate.RCS - relay.RCS;
    const deltaLIS = substrate.LIS - relay.LIS;
    const deltaMTS = substrate.MTS - relay.MTS;

    const deltaMemory =
      substrate.memoryExpressing !== relay.memoryExpressing ? 1 : 0;

    const deltaMetabolic =
      normalise(substrate.metabolicOccupancy) -
      normalise(relay.metabolicOccupancy);

    const gapSeverityScore =
      this.config.weightClass    * deltaClass        +
      this.config.weightLIS      * Math.abs(deltaLIS) +
      this.config.weightMTS      * Math.abs(deltaMTS) +
      this.config.weightRCS      * Math.abs(deltaRCS) +
      this.config.weightMemory   * deltaMemory        +
      this.config.weightMetabolic * Math.abs(deltaMetabolic);

    const gapSeverityLevel = this.classifyGap(gapSeverityScore);

    return {
      deltaClass,
      deltaRCS,
      deltaLIS,
      deltaMTS,
      deltaMemory,
      deltaMetabolic,
      gapSeverityScore,
      gapSeverityLevel,
    };
  }

  private classifyGap(score: number): GapSeverityLevel {
    if (score < this.config.lagThreshold)          return "ALIGNED";
    if (score < this.config.couplingDueThreshold)  return "LAG";
    if (score < this.config.criticalGapThreshold)  return "COUPLING_DUE";
    return "CRITICAL_GAP";
  }

  /**
   * Diagnostic report — human-readable summary of delta profile.
   */
  report(delta: DeltaProfile): string {
    return [
      `── CouplingDeltaMonitor Report ──`,
      `Class distance:      ${delta.deltaClass}`,
      `ΔLIS:                ${delta.deltaLIS.toFixed(3)}`,
      `ΔMTS:                ${delta.deltaMTS.toFixed(3)}`,
      `ΔRCS:                ${delta.deltaRCS.toFixed(3)}`,
      `Memory disagreement: ${delta.deltaMemory === 1 ? "YES" : "no"}`,
      `ΔMetabolic:          ${delta.deltaMetabolic.toFixed(3)}`,
      `─────────────────────────────────`,
      `Gap severity score:  ${delta.gapSeverityScore.toFixed(3)}`,
      `Gap severity level:  ${delta.gapSeverityLevel}`,
    ].join("\n");
  }
}
