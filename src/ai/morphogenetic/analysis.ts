// src/ai/morphogenetic/analysis.ts

import type {
  DominantFieldMode,
  MorphogeneticFieldSummary,
  MorphogeneticResults,
  MorphogeneticRole,
  MorphogeneticStepLog,
  MorphogeneticTransferSummary,
  OperatorMorphogenSummary,
  ZoneDifferentiationSummary,
} from "./types";

function clamp01(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function summarizeField(
  logs: MorphogeneticStepLog[]
): MorphogeneticFieldSummary | null {
  const latest = logs[logs.length - 1]?.fieldSnapshot;
  if (!latest) return null;

  let dominantMode: DominantFieldMode = "metastable";

  if (latest.perturbationLevel >= 0.7 && latest.noveltyGradient >= 0.6) {
    dominantMode = "exploration";
  } else if (
    latest.coherenceGradient >= 0.7 &&
    latest.operatorPressure >= 0.6 &&
    latest.memoryDensity < 0.6
  ) {
    dominantMode = "expansion";
  } else if (
    latest.stabilizationTension >= 0.7 &&
    latest.operatorPressure >= 0.6
  ) {
    dominantMode = "selection";
  } else if (
    latest.memoryDensity >= 0.7 &&
    latest.canalizationStrength >= 0.6
  ) {
    dominantMode = "consolidation";
  }

  return {
    fieldCoherence: clamp01(latest.fieldCoherence),
    memoryDensity: clamp01(latest.memoryDensity),
    perturbationLevel: clamp01(latest.perturbationLevel),
    canalizationStrength: clamp01(latest.canalizationStrength),
    dominantMode,
  };
}

export function computeDifferentiationIndex(
  logs: MorphogeneticStepLog[]
): number {
  const latestPerZone = new Map<string, MorphogeneticStepLog>();

  logs.forEach((log) => latestPerZone.set(log.zoneId, log));

  const roles = Array.from(latestPerZone.values()).map((l) => l.currentRole);
  if (!roles.length) return 0;

  const uniqueRoles = new Set(roles).size;
  return clamp01(uniqueRoles / roles.length);
}

export function computeRedifferentiationRate(
  logs: MorphogeneticStepLog[]
): number {
  const byZone: Record<string, MorphogeneticRole[]> = {};

  logs.forEach((log) => {
    if (!byZone[log.zoneId]) byZone[log.zoneId] = [];
    byZone[log.zoneId].push(log.currentRole);
  });

  let changes = 0;
  let comparisons = 0;

  Object.values(byZone).forEach((seq) => {
    for (let i = 1; i < seq.length; i++) {
      comparisons++;
      if (seq[i] !== seq[i - 1]) changes++;
    }
  });

  return comparisons ? clamp01(changes / comparisons) : 0;
}

export function summarizeZoneDifferentiation(
  logs: MorphogeneticStepLog[]
): ZoneDifferentiationSummary {
  const latestPerZone = new Map<string, MorphogeneticStepLog>();
  logs.forEach((log) => latestPerZone.set(log.zoneId, log));

  const currentRoles: Record<string, MorphogeneticRole> = {};
  latestPerZone.forEach((log, zoneId) => {
    currentRoles[zoneId] = log.currentRole;
  });

  return {
    differentiationIndex: computeDifferentiationIndex(logs),
    redifferentiationRate: computeRedifferentiationRate(logs),
    currentRoles,
  };
}

export function computeOperatorMorphogenMetrics(
  logs: MorphogeneticStepLog[]
): OperatorMorphogenSummary {
  const introduced = new Set<string>();
  const recombined = new Set<string>();
  const opZones: Record<string, Set<string>> = {};

  logs.forEach((log) => {
    if (log.operatorIntroduced) {
      introduced.add(log.operatorIntroduced);
    }

    if (log.operatorRecombined) {
      recombined.add(log.operatorRecombined);
    }

    (log.operatorUsed || []).forEach((op) => {
      if (!opZones[op]) opZones[op] = new Set();
      opZones[op].add(log.zoneId);
    });
  });

  const propagationDepths = Object.values(opZones).map((set) => set.size);
  const meanPropagationDepth = mean(propagationDepths);

  const persistentOperators = propagationDepths.filter((d) => d > 1).length;
  const persistenceRatio = introduced.size
    ? persistentOperators / introduced.size
    : 0;

  const propagationByOperator: Record<string, string[]> = {};
  Object.entries(opZones).forEach(([op, zones]) => {
    propagationByOperator[op] = Array.from(zones).sort();
  });

  return {
    introduced: introduced.size,
    recombinationEvents: recombined.size,
    meanPropagationDepth,
    persistenceRatio: clamp01(persistenceRatio),
    propagationByOperator,
  };
}

export function computeMorphogeneticTransfer(
  logs: MorphogeneticStepLog[]
): MorphogeneticTransferSummary {
  const opportunities = logs.filter(
    (l) =>
      (l.operatorUsed && l.operatorUsed.length > 0) || !!l.trajectoryTraceUsed
  ).length;

  const successful = logs.filter((l) => l.transferOccurred).length;
  const delayed = logs.filter(
    (l) => l.transferOccurred && !!l.trajectoryTraceUsed
  ).length;

  return {
    cTSR: opportunities ? clamp01(successful / opportunities) : 0,
    sharedTraceUtilization: opportunities ? clamp01(delayed / opportunities) : 0,
    delayedTransferCount: delayed,
  };
}

export function analyzeMorphogeneticRun(
  logs: MorphogeneticStepLog[]
): MorphogeneticResults {
  return {
    morphogeneticField: summarizeField(logs),
    zoneDifferentiation: summarizeZoneDifferentiation(logs),
    operatorMorphogens: computeOperatorMorphogenMetrics(logs),
    morphogeneticTransfer: computeMorphogeneticTransfer(logs),
  };
}
