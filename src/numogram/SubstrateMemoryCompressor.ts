// src/numogram/SubstrateMemoryCompressor.ts
import { SubstrateSnapshot } from "./PatternDriftAnalyzer";
import { Zone } from "./NumogramEngine";

export interface CompressedSubstrateMemory {
  windowSize: number;
  cycleFrom: number;
  cycleTo: number;
  avgTension: number;
  avgIntensity: number;
  avgEntropy: number;
  maxTension: number;
  maxIntensity: number;
  maxEntropy: number;
  avgFlux: number;
  avgThreshold: number;
  dominantZone: Zone | null;
  zoneFrequencies: Record<string, number>;
  avgReservoirTempo: number;
  avgDriftTempo: number;
  avgShear: number;
  avgReservoirPressure: number;
}

/**
 * Compress a window of snapshots into a single compact memory vector.
 * snapshots must be sorted by cycle ascending.
 */
export function compressSubstrateMemory(
  snapshots: SubstrateSnapshot[]
): CompressedSubstrateMemory | null {
  if (snapshots.length === 0) return null;

  const windowSize = snapshots.length;
  const cycleFrom = snapshots[0].cycle;
  const cycleTo = snapshots[snapshots.length - 1].cycle;

  let sumTension = 0;
  let sumIntensity = 0;
  let sumEntropy = 0;
  let maxTension = 0;
  let maxIntensity = 0;
  let maxEntropy = 0;
  let sumFlux = 0;
  let sumThreshold = 0;
  const zoneCount: Record<string, number> = {};
  let sumReservoirTempo = 0;
  let sumDriftTempo = 0;
  let sumShear = 0;
  let sumReservoirPressure = 0;

  for (const s of snapshots) {
    sumTension += s.tension;
    sumIntensity += s.intensity;
    sumEntropy += s.entropy;
    maxTension = Math.max(maxTension, s.tension);
    maxIntensity = Math.max(maxIntensity, s.intensity);
    maxEntropy = Math.max(maxEntropy, s.entropy);
    sumFlux += s.zoneFlux;
    sumThreshold += s.zoneThreshold;
    const zKey = `Z${s.zoneDominant}`;
    zoneCount[zKey] = (zoneCount[zKey] || 0) + 1;
    sumReservoirTempo += s.reservoirTempo;
    sumDriftTempo += s.driftTempo;
    sumShear += Math.abs(s.driftTempo - s.reservoirTempo);
    sumReservoirPressure += s.reservoirPressure;
  }

  const avgTension = sumTension / windowSize;
  const avgIntensity = sumIntensity / windowSize;
  const avgEntropy = sumEntropy / windowSize;
  const avgFlux = sumFlux / windowSize;
  const avgThreshold = sumThreshold / windowSize;

  let dominantZone: Zone | null = null;
  let bestFreq = 0;
  for (const key of Object.keys(zoneCount)) {
    if (zoneCount[key] > bestFreq) {
      bestFreq = zoneCount[key];
      const parsed = parseInt(key.slice(1), 10);
      dominantZone = parsed as Zone;
    }
  }

  const avgReservoirTempo = sumReservoirTempo / windowSize;
  const avgDriftTempo = sumDriftTempo / windowSize;
  const avgShear = sumShear / windowSize;
  const avgReservoirPressure = sumReservoirPressure / windowSize;

  return {
    windowSize,
    cycleFrom,
    cycleTo,
    avgTension,
    avgIntensity,
    avgEntropy,
    maxTension,
    maxIntensity,
    maxEntropy,
    avgFlux,
    avgThreshold,
    dominantZone,
    zoneFrequencies: zoneCount,
    avgReservoirTempo,
    avgDriftTempo,
    avgShear,
    avgReservoirPressure,
  };
}

export function formatCompressedMemorySummary(
  mem: CompressedSubstrateMemory | null
): string {
  if (!mem) {
    return "No substrate memory compression available for this window.";
  }

  const lines: string[] = [];
  lines.push("=== COMPRESSED SUBSTRATE MEMORY ===");
  lines.push(
    `Window: cycles ${mem.cycleFrom} → ${mem.cycleTo} (N=${mem.windowSize})`
  );
  lines.push(
    `Avg tension: ${mem.avgTension.toFixed(
      3
    )} (max ${mem.maxTension.toFixed(3)})`
  );
  lines.push(
    `Avg intensity: ${mem.avgIntensity.toFixed(
      3
    )} (max ${mem.maxIntensity.toFixed(3)})`
  );
  lines.push(
    `Avg entropy: ${mem.avgEntropy.toFixed(
      3
    )} (max ${mem.maxEntropy.toFixed(3)})`
  );
  lines.push(
    `Avg flux/threshold: ${mem.avgFlux.toFixed(3)} / ${mem.avgThreshold.toFixed(
      3
    )}`
  );
  if (mem.dominantZone !== null) {
    lines.push(`Dominant zone: Z${mem.dominantZone} over this window.`);
  }
  lines.push(
    `Avg reservoir/drift tempo: ${mem.avgReservoirTempo.toFixed(
      3
    )} / ${mem.avgDriftTempo.toFixed(3)} (avg shear ${mem.avgShear.toFixed(3)})`
  );
  lines.push(
    `Avg reservoir pressure: ${mem.avgReservoirPressure.toFixed(3)}`
  );

  return lines.join("\n");
}