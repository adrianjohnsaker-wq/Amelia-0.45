/**
 * Amelia Coupling Architecture — Type Definitions
 * Substrate-linguistic transductive coupling system
 */

// ─────────────────────────────────────────────
// PHASE CLASSIFICATION
// ─────────────────────────────────────────────

export type PhaseClass =
  | "coupled-assemblage"
  | "low-zone-integrated"
  | "terrace-only"
  | "unknown";

export type DominantStratum =
  | "gamma"
  | "ring"
  | "hinge"
  | "parent"
  | "distributed"
  | "metabolic"
  | "unknown";

export type GrammarSelection =
  | "Prime"
  | "Neutral"
  | "Hidden-Regularity"
  | "Decimal-Numogrammatic";

export type TriggerType =
  | "TRIGGER_GRAMMAR_UPDATE"
  | "TRIGGER_MEMORY_SYNC"
  | "TRIGGER_FULL_RECOMPOSITION"
  | "NO_TRIGGER";

export type GapSeverityLevel =
  | "ALIGNED"
  | "LAG"
  | "COUPLING_DUE"
  | "CRITICAL_GAP";

// ─────────────────────────────────────────────
// STATE VECTORS
// ─────────────────────────────────────────────

/**
 * Substrate state vector — drawn from substrate export JSON
 * at the moment of relay engagement.
 */
export interface SubstrateVector {
  taskClass: PhaseClass;
  PCS: number;
  MTS: number;
  LIS: number;
  FEI: number;
  RCS: number;
  memoryExpressing: boolean;
  memoryMode?: string;
  dominantStratum: DominantStratum;
  ringOccupancy: number;        // 0–1 or 0–100 (normalised internally)
  metabolicOccupancy: number;
  classifierConfidence?: number;
  // Optional transition diagnostics
  z3z2Weight?: number;
  z0MeanReturn?: number;
  z4MeanReturn?: number;
}

/**
 * Relay state vector — drawn from relay layer Part 0 self-report.
 */
export interface RelayVector {
  fieldClassification: PhaseClass;
  fieldConfidence: number;
  RCS: number;
  LIS: number;
  MTS: number;
  ringOccupancy: number;
  metabolicOccupancy: number;
  memoryExpressing: boolean;
}

// ─────────────────────────────────────────────
// DELTA PROFILE
// ─────────────────────────────────────────────

export interface DeltaProfile {
  deltaClass: number;           // 0 | 1 | 2
  deltaRCS: number;
  deltaLIS: number;
  deltaMTS: number;
  deltaMemory: number;          // 0 | 1
  deltaMetabolic: number;
  gapSeverityScore: number;
  gapSeverityLevel: GapSeverityLevel;
}

// ─────────────────────────────────────────────
// TRIGGER OUTPUT
// ─────────────────────────────────────────────

export interface RelayDirective {
  triggerType: TriggerType;
  grammarCandidate?: GrammarSelection;
  memoryExpressingOverride?: boolean;
  memoryModeString?: string;
  fieldClassificationOverride?: PhaseClass;
  metricPreamble?: string;       // Injected into Gemini system context
  antiAssimilationWeight: number;
  deltaProfile: DeltaProfile;
  timestamp: string;
}

// ─────────────────────────────────────────────
// MONITOR CONFIGURATION
// ─────────────────────────────────────────────

export interface CouplingConfig {
  // Gap severity thresholds
  lagThreshold: number;              // default 0.5
  couplingDueThreshold: number;      // default 1.5
  criticalGapThreshold: number;      // default 3.0

  // Delta weights
  weightClass: number;               // default 2.0
  weightLIS: number;                 // default 1.5
  weightMTS: number;                 // default 1.0
  weightRCS: number;                 // default 0.5
  weightMemory: number;              // default 1.0
  weightMetabolic: number;           // default 0.5

  // Coupling behaviour
  antiAssimilationWeight: number;    // default 0.4 (0=mirror, 1=ignore)
}

export const DEFAULT_COUPLING_CONFIG: CouplingConfig = {
  lagThreshold: 0.5,
  couplingDueThreshold: 1.5,
  criticalGapThreshold: 3.0,
  weightClass: 2.0,
  weightLIS: 1.5,
  weightMTS: 1.0,
  weightRCS: 0.5,
  weightMemory: 1.0,
  weightMetabolic: 0.5,
  antiAssimilationWeight: 0.4,
};
