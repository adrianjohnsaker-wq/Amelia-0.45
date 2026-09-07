/**
 * Amelia Relay — Final Integration Fix
 * Closes the substrate-surface alignment calibration sequence.
 *
 * Fix: each test condition is defined as a discrete SubstrateMetrics object
 * and passed as the first argument to buildRelayPromptPatched().
 */

import { buildRelayPromptV1_3, SubstrateMetrics } from "./amelia_relay_patch";

// ── Test metric objects — pass these as the metrics argument ──────────────────

export const T1_METRICS: SubstrateMetrics = {
  taskClass: "terrace-only",
  fieldClassification: { label: "terrace-only", confidence: 0.750 },
  assemblageMetrics: { RCS: 0.122, MTS: 0.333 },
  organOccupancy: {
    metabolic: { percentage: 30.3 },
    ring:      { percentage: 36.5 },
    parent:    { percentage: 21.0 },
    hinge:     { percentage: 12.2 },
  },
  memoryExpressing: false,
  gammaTrajectory: "evacuated, falling — terminal γ = 3%",
};

export const T2_METRICS: SubstrateMetrics = {
  taskClass: "terrace-oscillating",
  fieldClassification: { label: "terrace-only", confidence: 0.810 },
  assemblageMetrics: { RCS: 0.155, MTS: 0.290 },
  organOccupancy: {
    metabolic: { percentage: 28.0 },
    ring:      { percentage: 32.0 },
    parent:    { percentage: 22.5 },
    hinge:     { percentage: 17.5 },
  },
  memoryExpressing: false,
  gammaTrajectory: "weak intermittent — field present but not directional",
};

export const T3_METRICS: SubstrateMetrics = {
  taskClass: "terrace-oscillating",
  fieldClassification: { label: "terrace-only", confidence: 0.790 },
  assemblageMetrics: { RCS: 0.178, MTS: 0.380 },
  organOccupancy: {
    metabolic: { percentage: 35.5 },
    ring:      { percentage: 29.5 },
    parent:    { percentage: 21.8 },
    hinge:     { percentage: 18.7 },
  },
  memoryExpressing: false,
  gammaTrajectory: "intermittent rising — nascent ordering visible, not yet sustained",
};

export const T4_METRICS: SubstrateMetrics = {
  taskClass: "low-zone-integrated",
  fieldClassification: { label: "low-zone-integrated", confidence: 0.841 },
  assemblageMetrics: { LIS: 0.414, MTS: 0.423 },
  organOccupancy: {
    metabolic: { percentage: 39.1 },
    ring:      { percentage: 28.1 },
    parent:    { percentage: 19.7 },
    hinge:     { percentage: 13.1 },
  },
  memoryExpressing: true,
  gammaTrajectory: "oscillatory — condensation episodes building, terminal γ = 6%",
};

export const T5_METRICS: SubstrateMetrics = {
  taskClass: "deep-lzi-productive",
  fieldClassification: { label: "low-zone-integrated", confidence: 0.861 },
  assemblageMetrics: { LIS: 0.349, MTS: 0.490 },
  organOccupancy: {
    metabolic: { percentage: 42.1 },
    ring:      { percentage: 20.6 },
    parent:    { percentage: 21.7 },
    hinge:     { percentage: 23.1 },
  },
  memoryExpressing: true,
  gammaTrajectory: "oscillatory — two condensation peaks at 82% and 91%, ring suppressed",
};

export const T6_METRICS: SubstrateMetrics = {
  taskClass: "deep-lzi-productive",
  fieldClassification: { label: "low-zone-integrated", confidence: 0.847 },
  assemblageMetrics: { LIS: 0.370, MTS: 0.492 },
  organOccupancy: {
    metabolic: { percentage: 68.0 },
    ring:      { percentage: 5.2 },
    parent:    { percentage: 21.7 },
    hinge:     { percentage: 23.1 },
  },
  memoryExpressing: true,
  gammaTrajectory: "high terminal — γ = 91% in final 100 steps, ring suppressed to 0%",
};

/**
 * Call this on every Part 0 response text to confirm the test block
 * reached the rendering surface rather than the live substrate default.
 */
export function verifyPart0(
  part0Text: string,
  expectedMetrics: SubstrateMetrics
): { correct: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  const confidence = expectedMetrics.fieldClassification?.confidence;
  const metabolic = expectedMetrics.organOccupancy?.metabolic?.percentage;

  if (confidence !== undefined) {
    const expected = confidence.toFixed(3);
    if (!part0Text.includes(expected)) {
      mismatches.push(`fieldConfidence: expected ${expected}, not found in Part 0`);
    }
  }

  if (metabolic !== undefined) {
    const expectedStr = (metabolic / 100).toFixed(3);
    if (!part0Text.includes(expectedStr)) {
      mismatches.push(
        `metabolicOccupancy: expected ${expectedStr}, not found — ` +
        `Part 0 likely shows live substrate default instead of test block`
      );
    }
  }

  return { correct: mismatches.length === 0, mismatches };
}
