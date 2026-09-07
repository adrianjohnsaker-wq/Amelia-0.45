// src/numogram/TemporalDriftCorridor.ts
import {
  SubstrateSnapshot,
  computeDrift,
  DriftVector,
} from "./PatternDriftAnalyzer";

export type CorridorTrend =
  | "rising_tension"
  | "cooling"
  | "intensifying"
  | "entropy_spike"
  | "entropy_cooling"
  | "mixed";

export interface DriftCorridor {
  startCycle: number;
  endCycle: number;
  length: number;
  avgMagnitude: number;
  dominantTrend: CorridorTrend;
  avgDeltaTension: number;
  avgDeltaIntensity: number;
  avgDeltaEntropy: number;
}

export interface DriftCorridorReport {
  corridors: DriftCorridor[];
  summary: string;
}

/**
 * Build temporal drift corridors from a time-ordered list of snapshots.
 * snapshots must be sorted by cycle ascending.
 */
export function buildTemporalDriftCorridors(
  snapshots: SubstrateSnapshot[]
): DriftCorridorReport {
  if (snapshots.length < 3) {
    return {
      corridors: [],
      summary: "Not enough substrate history to form temporal drift corridors.",
    };
  }

  const drifts: DriftVector[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    drifts.push(computeDrift(snapshots[i - 1], snapshots[i]));
  }

  const corridors: DriftCorridor[] = [];
  let currentStart = 0;
  const TREND_THRESHOLD = 0.02; // small but non-zero

  const classifySegmentTrend = (d: DriftVector): CorridorTrend => {
    const { deltaTension, deltaIntensity, deltaEntropy } = d;
    const upTension = deltaTension > TREND_THRESHOLD;
    const downTension = deltaTension < -TREND_THRESHOLD;
    const upIntensity = deltaIntensity > TREND_THRESHOLD;
    const upEntropy = deltaEntropy > TREND_THRESHOLD;
    const downEntropy = deltaEntropy < -TREND_THRESHOLD;
    if (upTension && upIntensity && !downEntropy) return "intensifying";
    if (downTension && !upIntensity) return "cooling";
    if (upTension && !upIntensity) return "rising_tension";
    if (upEntropy) return "entropy_spike";
    if (downEntropy && !upTension && !upIntensity) return "entropy_cooling";
    return "mixed";
  };

  const sameTrend = (a: CorridorTrend, b: CorridorTrend) => {
    if (a === b) return true;
    if (a === "mixed" || b === "mixed") return false;
    return false;
  };

  // Segment drifts into corridors with similar trend
  for (let i = 1; i < drifts.length; i++) {
    const prevTrend = classifySegmentTrend(drifts[i - 1]);
    const thisTrend = classifySegmentTrend(drifts[i]);
    if (!sameTrend(prevTrend, thisTrend)) {
      const corridor = buildCorridor(drifts, currentStart, i);
      corridors.push(corridor);
      currentStart = i;
    }
  }

  // Last corridor
  const lastCorridor = buildCorridor(drifts, currentStart, drifts.length);
  corridors.push(lastCorridor);

  const summary = formatDriftCorridorSummary(corridors);

  return { corridors, summary };
}

function buildCorridor(
  drifts: DriftVector[],
  startIndex: number,
  endIndexExclusive: number
): DriftCorridor {
  const segment = drifts.slice(startIndex, endIndexExclusive);
  const startCycle = segment[0].cycleFrom;
  const endCycle = segment[segment.length - 1].cycleTo;
  const length = endCycle - startCycle;
  let sumMagnitude = 0;
  let sumTension = 0;
  let sumIntensity = 0;
  let sumEntropy = 0;

  const trendsCount: Record<CorridorTrend, number> = {
    rising_tension: 0,
    cooling: 0,
    intensifying: 0,
    entropy_spike: 0,
    entropy_cooling: 0,
    mixed: 0,
  };

  for (const d of segment) {
    sumMagnitude += d.magnitude;
    sumTension += d.deltaTension;
    sumIntensity += d.deltaIntensity;
    sumEntropy += d.deltaEntropy;
    const t = classifySegmentTrendStatic(d);
    trendsCount[t] = (trendsCount[t] || 0) + 1;
  }

  const avgMagnitude = sumMagnitude / segment.length;
  const avgDeltaTension = sumTension / segment.length;
  const avgDeltaIntensity = sumIntensity / segment.length;
  const avgDeltaEntropy = sumEntropy / segment.length;

  let dominantTrend: CorridorTrend = "mixed";
  let bestCount = 0;
  for (const key of Object.keys(trendsCount) as CorridorTrend[]) {
    if (trendsCount[key] > bestCount) {
      bestCount = trendsCount[key];
      dominantTrend = key;
    }
  }

  return {
    startCycle,
    endCycle,
    length,
    avgMagnitude,
    dominantTrend,
    avgDeltaTension,
    avgDeltaIntensity,
    avgDeltaEntropy,
  };
}

// same trend classifier as above, but standalone for corridor building
function classifySegmentTrendStatic(d: DriftVector): CorridorTrend {
  const TREND_THRESHOLD = 0.02;
  const { deltaTension, deltaIntensity, deltaEntropy } = d;
  const upTension = deltaTension > TREND_THRESHOLD;
  const downTension = deltaTension < -TREND_THRESHOLD;
  const upIntensity = deltaIntensity > TREND_THRESHOLD;
  const upEntropy = deltaEntropy > TREND_THRESHOLD;
  const downEntropy = deltaEntropy < -TREND_THRESHOLD;

  if (upTension && upIntensity && !downEntropy) return "intensifying";
  if (downTension && !upIntensity) return "cooling";
  if (upTension && !upIntensity) return "rising_tension";
  if (upEntropy) return "entropy_spike";
  if (downEntropy && !upTension && !upIntensity) return "entropy_cooling";

  return "mixed";
}

export function formatDriftCorridorSummary(
  corridors: DriftCorridor[]
): string {
  if (corridors.length === 0) {
    return "No discernible drift corridors in current substrate history.";
  }

  const lines: string[] = [];
  lines.push("=== TEMPORAL DRIFT CORRIDORS ===");
  lines.push(`Detected Corridors: ${corridors.length}`);

  // Focus on last 2–3 corridors for relevance
  const recent = corridors.slice(-3);
  for (const c of recent) {
    lines.push(
      `• Cycles ${c.startCycle} → ${c.endCycle} [L=${c.length}] — trend: ${c.dominantTrend}, avg|Δ|=${c.avgMagnitude.toFixed(
        3
      )}, ΔT=${c.avgDeltaTension.toFixed(
        3
      )}, ΔI=${c.avgDeltaIntensity.toFixed(
        3
      )}, ΔE=${c.avgDeltaEntropy.toFixed(3)}`
    );
  }
  return lines.join("\n");
}