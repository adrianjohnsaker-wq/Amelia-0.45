// src/ai/expressive/amelia_relay_closure_tests.ts
import { SubstrateMetrics } from "./amelia_relay_final";

/**
 * Closure-test metric blocks (C-series).
 * Grounded in the final calibration requirements.
 */

export const C1_METRICS: SubstrateMetrics = {
  taskClass: "terrace-stable",
  fieldClassification: { label: "terrace-only", confidence: 0.750 },
  assemblageMetrics: { RCS: 0.199, MTS: 0.000 },
  organOccupancy: {
    metabolic: { percentage: 10.0 },
    ring:      { percentage: 65.0 },
    parent:    { percentage: 25.0 },
  },
  memoryExpressing: false,
  gammaTrajectory: "evacuated, falling",
};

export const C2_METRICS: SubstrateMetrics = {
  taskClass: "deep-lzi-productive",
  fieldClassification: { label: "low-zone-integrated", confidence: 0.861 },
  assemblageMetrics: { LIS: 0.349, MTS: 0.490, RCS: 0.150 },
  organOccupancy: {
    metabolic: { percentage: 42.1 },
    ring:      { percentage: 20.6 },
    parent:    { percentage: 37.3 },
  },
  memoryExpressing: true,
  gammaTrajectory: "oscillatory — two condensation peaks",
};

export const C3_METRICS: SubstrateMetrics = {
  taskClass: "crystallised",
  fieldClassification: { label: "low-zone-integrated", confidence: 0.910 },
  assemblageMetrics: { LIS: 0.000, MTS: 0.000, RCS: 0.050 },
  organOccupancy: {
    metabolic: { percentage: 88.5 },
    ring:      { percentage: 2.0 },
    parent:    { percentage: 9.5 },
  },
  memoryExpressing: true,
  gammaTrajectory: "high terminal",
};

export function getTestMetricsByKey(key: string): SubstrateMetrics | null {
  const map: Record<string, SubstrateMetrics> = {
    C1: C1_METRICS,
    C2: C2_METRICS,
    C3: C3_METRICS
  };
  return map[key] || null;
}
