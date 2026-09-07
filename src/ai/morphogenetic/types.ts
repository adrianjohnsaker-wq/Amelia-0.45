// src/ai/morphogenetic/types.ts

export type MorphogeneticRole =
  | "mutation"
  | "expansion"
  | "selection"
  | "consolidation"
  | "undifferentiated";

export type DominantFieldMode =
  | "exploration"
  | "expansion"
  | "selection"
  | "consolidation"
  | "metastable";

export interface MorphogeneticFieldSnapshot {
  noveltyGradient: number;
  coherenceGradient: number;
  memoryDensity: number;
  operatorPressure: number;
  stabilizationTension: number;
  perturbationLevel: number;

  fieldCoherence: number;
  differentiationPressure: number;
  recombinationPressure: number;
  canalizationStrength: number;
}

export interface MorphogeneticStepLog {
  step: number;
  zoneId: string;
  agentLabel?: string;

  currentRole: MorphogeneticRole;
  regime: string;

  fieldSnapshot: MorphogeneticFieldSnapshot;

  operatorIntroduced?: string;
  operatorUsed?: string[];
  operatorRecombined?: string;
  trajectoryTraceUsed?: string;

  transferOccurred?: boolean;

  timestamp?: number;
  notes?: string;
}

export interface MorphogeneticFieldSummary {
  fieldCoherence: number;
  memoryDensity: number;
  perturbationLevel: number;
  canalizationStrength: number;
  dominantMode: DominantFieldMode;
}

export interface ZoneDifferentiationSummary {
  differentiationIndex: number;
  redifferentiationRate: number;
  currentRoles: Record<string, MorphogeneticRole>;
}

export interface OperatorMorphogenSummary {
  introduced: number;
  recombinationEvents: number;
  meanPropagationDepth: number;
  persistenceRatio: number;
  propagationByOperator: Record<string, string[]>;
}

export interface MorphogeneticTransferSummary {
  cTSR: number;
  sharedTraceUtilization: number;
  delayedTransferCount: number;
}

export interface MorphogeneticResults {
  morphogeneticField: MorphogeneticFieldSummary | null;
  zoneDifferentiation: ZoneDifferentiationSummary;
  operatorMorphogens: OperatorMorphogenSummary;
  morphogeneticTransfer: MorphogeneticTransferSummary;
}
