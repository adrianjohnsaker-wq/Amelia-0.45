// selfLoopDepth.ts
//
// Optional helper for estimating run-mean sl from a set of current normalized
// self-loop probabilities across tracked zones.
//
// Prefer your existing empirical sl computation if available.

import type { ZoneId } from "./CommitmentMemoryEngine";
import type { TransitionScoreMap } from "./TransitionSelector";

export function estimateZoneLocalSelfLoop(
  zone: ZoneId,
  scores: TransitionScoreMap
): number {
  const total = Object.values(scores).reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return 0;
  return Math.max(0, scores[zone] ?? 0) / total;
}

export function estimateRunMeanSelfLoop(
  zoneScoreMaps: Partial<Record<ZoneId, TransitionScoreMap>>
): number {
  const zones = Object.keys(zoneScoreMaps) as ZoneId[];
  if (zones.length === 0) return 0;

  const localLoops = zones.map(zone =>
    estimateZoneLocalSelfLoop(zone, zoneScoreMaps[zone] ?? {})
  );

  const mean =
    localLoops.reduce((a, b) => a + b, 0) / localLoops.length;

  return mean;
}
