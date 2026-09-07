// src/ai/substrate/AssemblageMetrics.ts
/* =========================================================
   AssemblageMetrics.ts
   ---------------------------------------------------------
   Calculates morphogenetic field enlargement and stabilization.
   PCS: Plateau Coupling Score
   LIS: Low-Coupling Intensity
   MTS: Mid-Terrace Stability
   RCS: Re-entry Component Score
   FEI: Folded Edge Index
   ========================================================= */

export type ZoneId =
  | "zone-0-flux"
  | "zone-1-flux"
  | "zone-2-flux"
  | "zone-3-flux"
  | "zone-4-flux"
  | "zone-5-flux"
  | "zone-6-flux"
  | "zone-7-flux"
  | "zone-8-flux"
  | "zone-9-flux";

export type TransitionMatrix = Partial<Record<ZoneId, Partial<Record<ZoneId, number>>>>;

export interface AssemblageMetrics {
  PCS: number;
  LIS: number;
  MTS: number;
  RCS: number;
  FEI: number;
}

const LOW_BLOCK = new Set<ZoneId>([
  "zone-0-flux",
  "zone-1-flux",
  "zone-2-flux",
  "zone-8-flux",
  "zone-9-flux",
]);

const MID_BLOCK = new Set<ZoneId>([
  "zone-3-flux",
  "zone-4-flux",
  "zone-5-flux",
  "zone-6-flux",
  "zone-7-flux",
]);

const LOW_COUPLING_EDGES = new Set<string>([
  "zone-0-flux->zone-1-flux",
  "zone-1-flux->zone-0-flux",
  "zone-0-flux->zone-9-flux",
  "zone-9-flux->zone-0-flux",
  "zone-1-flux->zone-2-flux",
  "zone-2-flux->zone-1-flux",
  "zone-1-flux->zone-8-flux",
  "zone-8-flux->zone-1-flux",
  "zone-8-flux->zone-9-flux",
  "zone-9-flux->zone-8-flux",
]);

const MID_TERRACE_EDGES = new Set<string>([
  "zone-4-flux->zone-5-flux",
  "zone-5-flux->zone-4-flux",
  "zone-3-flux->zone-4-flux",
  "zone-4-flux->zone-3-flux",
  "zone-3-flux->zone-6-flux",
  "zone-6-flux->zone-3-flux",
  "zone-5-flux->zone-6-flux",
  "zone-6-flux->zone-5-flux",
  "zone-2-flux->zone-3-flux",
  "zone-3-flux->zone-2-flux",
  "zone-2-flux->zone-7-flux",
  "zone-7-flux->zone-2-flux",
  "zone-6-flux->zone-7-flux",
  "zone-7-flux->zone-6-flux",
]);

const BRIDGING_EDGES = new Set<string>([
  "zone-1-flux->zone-0-flux",
  "zone-0-flux->zone-1-flux",
  "zone-1-flux->zone-2-flux",
  "zone-2-flux->zone-1-flux",
  "zone-1-flux->zone-8-flux",
  "zone-8-flux->zone-1-flux",
  "zone-2-flux->zone-3-flux",
  "zone-3-flux->zone-2-flux",
  "zone-7-flux->zone-8-flux",
  "zone-8-flux->zone-7-flux",
  "zone-9-flux->zone-8-flux",
  "zone-8-flux->zone-9-flux",
]);

function totalTransitions(matrix: TransitionMatrix): number {
  let total = 0;
  for (const targets of Object.values(matrix)) {
    for (const count of Object.values(targets ?? {})) {
      total += count ?? 0;
    }
  }
  return total;
}

function sumMatchingEdges(matrix: TransitionMatrix, matcher: (src: ZoneId, dst: ZoneId) => boolean): number {
  let total = 0;
  for (const [src, targets] of Object.entries(matrix) as [ZoneId, Partial<Record<ZoneId, number>>][]) {
    for (const [dst, count] of Object.entries(targets ?? {}) as [ZoneId, number][]) {
      if (matcher(src, dst)) total += count ?? 0;
    }
  }
  return total;
}

function edgeKey(src: ZoneId, dst: ZoneId): string {
  return `${src}->${dst}`;
}

function countReentries(zoneSequence: ZoneId[]): { lowReentries: number; midReentries: number } {
  let lowReentries = 0;
  let midReentries = 0;

  let prevBlock: "low" | "mid" | "other" = "other";
  let seenLow = false;
  let seenMid = false;

  for (const z of zoneSequence) {
    const block: "low" | "mid" | "other" =
      LOW_BLOCK.has(z) ? "low" :
      MID_BLOCK.has(z) ? "mid" :
      "other";

    if (block === "low" && prevBlock !== "low") {
      if (seenLow) lowReentries++;
      seenLow = true;
    }

    if (block === "mid" && prevBlock !== "mid") {
      if (seenMid) midReentries++;
      seenMid = true;
    }

    prevBlock = block;
  }

  return { lowReentries, midReentries };
}

export function computeAssemblageMetrics(
  transitionMatrix: TransitionMatrix,
  zoneSequence: ZoneId[]
): AssemblageMetrics {
  const total = totalTransitions(transitionMatrix) || 1;

  const pcsCount = sumMatchingEdges(
    transitionMatrix,
    (src, dst) =>
      (LOW_BLOCK.has(src) || MID_BLOCK.has(src)) &&
      (LOW_BLOCK.has(dst) || MID_BLOCK.has(dst))
  );

  const lisCount = sumMatchingEdges(
    transitionMatrix,
    (src, dst) => LOW_COUPLING_EDGES.has(edgeKey(src, dst))
  );

  const mtsCount = sumMatchingEdges(
    transitionMatrix,
    (src, dst) => MID_TERRACE_EDGES.has(edgeKey(src, dst))
  );

  const feiCount = sumMatchingEdges(
    transitionMatrix,
    (src, dst) => BRIDGING_EDGES.has(edgeKey(src, dst))
  );

  const { lowReentries, midReentries } = countReentries(zoneSequence);
  const rcs = (lowReentries + midReentries) / Math.max(1, zoneSequence.length);

  return {
    PCS: pcsCount / total,
    LIS: lisCount / total,
    MTS: mtsCount / total,
    RCS: rcs,
    FEI: feiCount / total,
  };
}
