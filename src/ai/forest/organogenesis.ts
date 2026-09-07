// organogenesis.ts

import { ForestState, CellState, OperatorClass, Organ, OrganState, OrganType, OrganogenesisParams, DevelopmentLog } from "./types";
import { SpatialTopology } from "./spatial-topology";

function uuid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getNeighbors(topology: SpatialTopology, id: string) {
  return topology.adjacency[id] ?? [];
}

function dominantField(cell: CellState): OperatorClass {
  let best: OperatorClass = "attention";
  let bestVal = -Infinity;

  for (const k of Object.keys(cell.localField) as OperatorClass[]) {
    const v = cell.localField[k];
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }

  return best;
}

function organFromOperator(op: OperatorClass): OrganType {
  switch (op) {
    case "inference":
      return "inference_cortex";
    case "memory":
      return "memory_basin";
    case "mutation":
      return "mutation_storm";
    case "stabilizer":
      return "stabilizing_cluster";
    default:
      return "inference_cortex";
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (na === 0 || nb === 0) return 0;
  return dot / (na * nb);
}

function organSignature(
  organ: Organ,
  cells: Record<string, CellState>
): number[] {
  const sums = [0, 0, 0, 0, 0];
  const keys: OperatorClass[] = ["attention", "inference", "memory", "mutation", "stabilizer"];

  for (const id of organ.cells) {
    const f = cells[id]?.localField;
    if (!f) continue;
    keys.forEach((k, i) => sums[i] += f[k]);
  }

  return sums.map(v => v / Math.max(1, organ.cells.length));
}

function fieldSimilarity(
  a: Record<OperatorClass, number>,
  b: number[] // signature vector
) {
  const keys: OperatorClass[] = ["attention", "inference", "memory", "mutation", "stabilizer"];
  const aVec = keys.map(k => a[k]);

  const dot = aVec.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(aVec.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (na === 0 || nb === 0) return 0;
  return dot / (na * nb);
}

function mergeOrgans(state: OrganState, a: Organ, b: Organ) {
  for (const cellId of b.cells) {
    if (!a.cells.includes(cellId)) {
      a.cells.push(cellId);
    }
    state.cellToOrgan[cellId] = a.id;
  }
  delete state.organs[b.id];
}

export function initializeOrganState(cellIds: string[]): OrganState {
  const map: Record<string, string | null> = {};
  for (const id of cellIds) map[id] = null;

  return {
    organs: {},
    cellToOrgan: map
  };
}

function createOrgan(
  state: OrganState,
  center: string,
  type: OrganType
): Organ {
  const organ: Organ = {
    id: uuid("organ"),
    type,
    cells: [center],
    center,
    stability: 1,
    age: 0
  };

  state.organs[organ.id] = organ;
  state.cellToOrgan[center] = organ.id;

  return organ;
}

export function runOrganogenesis(
  topology: SpatialTopology,
  forest: ForestState,
  organState: OrganState,
  params: OrganogenesisParams,
  logs: DevelopmentLog
): OrganState {
  const cells: Record<string, CellState> = {};
  for (const c of forest.cells) cells[c.id] = c;

  // 1. Reinforce and Spread existing organs
  const organIds = Object.keys(organState.organs);
  for (const organId of organIds) {
    const organ = organState.organs[organId];
    if (!organ) continue;

    const signature = organSignature(organ, cells);
    const signals = organ.cells.map(id => {
      const c = cells[id];
      return c ? mean(Object.values(c.localField)) : 0;
    });

    const signal = mean(signals);
    const internalSimilarity = mean(organ.cells.map(id => {
      const c = cells[id];
      return c ? fieldSimilarity(c.localField, signature) : 0;
    }));

    const stabilityInput = signal * internalSimilarity;

    if (stabilityInput > params.emergenceThreshold) {
      organ.stability += params.reinforcementRate * stabilityInput;
      organ.age += 1;
    } else {
      organ.stability -= params.decayRate * (1 - internalSimilarity);
    }

    if (organ.stability <= 0) {
      for (const c of organ.cells) organState.cellToOrgan[c] = null;
      delete organState.organs[organ.id];
      logs.organogenesis.organsRemoved++;
      continue;
    }

    // Spread based on profile similarity
    const newMembers: string[] = [];
    for (const cellId of organ.cells) {
      const neighbors = getNeighbors(topology, cellId);
      for (const edge of neighbors) {
        if (organState.cellToOrgan[edge.to]) continue;
        if (Math.random() > params.spreadProbability) continue;

        const neighborCell = cells[edge.to];
        if (!neighborCell) continue;

        if (fieldSimilarity(neighborCell.localField, signature) > params.mergeSimilarity) {
          newMembers.push(edge.to);
        }
      }
    }

    for (const id of newMembers) {
      if (!organ.cells.includes(id)) {
        organ.cells.push(id);
      }
      organState.cellToOrgan[id] = organ.id;
      logs.organogenesis.cellsJoinedOrgans++;
    }
  }

  // 2. Organ merging
  const currentOrgans = Object.values(organState.organs);
  for (let i = 0; i < currentOrgans.length; i++) {
    for (let j = i + 1; j < currentOrgans.length; j++) {
      const organA = currentOrgans[i];
      const organB = currentOrgans[j];
      if (!organA || !organB || organA.type !== organB.type) continue;

      const sigA = organSignature(organA, cells);
      const sigB = organSignature(organB, cells);

      if (cosineSimilarity(sigA, sigB) > params.mergeSimilarity) {
        mergeOrgans(organState, organA, organB);
        logs.organogenesis.organsMerged++;
      }
    }
  }

  // 3. Create new organs
  if (Object.keys(organState.organs).length < params.maxOrgans) {
    for (const cell of forest.cells) {
      if (organState.cellToOrgan[cell.id]) continue;

      const dominant = dominantField(cell);
      const strength = cell.localField[dominant];

      if (strength < params.emergenceThreshold) continue;

      const type = organFromOperator(dominant);
      createOrgan(organState, cell.id, type);
      logs.organogenesis.organsBorn++;
    }
  }

  return organState;
}