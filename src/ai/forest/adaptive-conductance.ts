// adaptive-conductance.ts

import { CellState, ForestState, OperatorClass } from "./types";
import { SpatialTopology, Edge, getNeighbors } from "./spatial-topology";

export type ConductanceMemory = Record<string, number>;

export interface ConductanceParams {
  coherenceGain: number;          // strengthen channels between coherent cells
  stressBarrierGain: number;      // reduce permeability when stress is high
  zoneAffinityGain: number;       // reward compatible developmental states
  mutationTurbulenceGain: number; // mutation-rich zones become less stable carriers
  memoryReinforcementGain: number;// previously used pathways become easier to traverse
  reinforcementDecay: number;     // vascular memory decay per step
  reinforcementLearningRate: number;
  minConductance: number;
  maxConductance: number;
};

export type EffectiveEdge = Edge & {
  effectiveWeight: number;
};

export type EffectiveAdjacency = Record<string, EffectiveEdge[]>;

const ZONE_SIMILARITY: Record<string, Record<string, number>> = {
  quiescent: {
    quiescent: 1.0,
    plastic: 0.85,
    metastable: 0.55,
    critical: 0.25,
    decay: 0.15,
  },
  plastic: {
    quiescent: 0.85,
    plastic: 1.0,
    metastable: 0.85,
    critical: 0.50,
    decay: 0.20,
  },
  metastable: {
    quiescent: 0.55,
    plastic: 0.85,
    metastable: 1.0,
    critical: 0.80,
    decay: 0.30,
  },
  critical: {
    quiescent: 0.25,
    plastic: 0.50,
    metastable: 0.80,
    critical: 1.0,
    decay: 0.45,
  },
  decay: {
    quiescent: 0.15,
    plastic: 0.20,
    metastable: 0.30,
    critical: 0.45,
    decay: 1.0,
  },
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function mean(a: number, b: number): number {
  return 0.5 * (a + b);
}

function getCellMap(cells: CellState[]): Record<string, CellState> {
  const out: Record<string, CellState> = {};
  for (const c of cells) out[c.id] = c;
  return out;
}

function zoneAffinity(a: CellState, b: CellState): number {
  return ZONE_SIMILARITY[a.zone]?.[b.zone] ?? 0.5;
}

function turbulencePenalty(a: CellState, b: CellState): number {
  const ma = a.localField.mutation ?? 0;
  const mb = b.localField.mutation ?? 0;
  return mean(ma, mb);
}

export function initializeConductanceMemory(
  topology: SpatialTopology,
  seedValue = 0
): ConductanceMemory {
  const memory: ConductanceMemory = {};

  for (const node of topology.nodes) {
    for (const edge of getNeighbors(topology, node.id)) {
      const k = edgeKey(edge.from, edge.to);
      if (!(k in memory)) memory[k] = seedValue;
    }
  }

  return memory;
}

export function updateConductanceMemory(
  prevMemory: ConductanceMemory,
  traversedFlux: Record<string, number>,
  topology: SpatialTopology,
  state: ForestState,
  params: ConductanceParams
): ConductanceMemory {
  const next: ConductanceMemory = {};
  const cells = getCellMap(state.cells);

  for (const node of topology.nodes) {
    for (const edge of getNeighbors(topology, node.id)) {
      const k = edgeKey(edge.from, edge.to);
      if (k in next) continue;

      const a = cells[edge.from];
      const b = cells[edge.to];
      if (!a || !b) {
        next[k] = 0;
        continue;
      }

      const localFlowSignal =
        mean(traversedFlux[edge.from] ?? 0, traversedFlux[edge.to] ?? 0);

      const prev = prevMemory[k] ?? 0;
      const learned =
        prev * (1 - params.reinforcementDecay) +
        params.reinforcementLearningRate * localFlowSignal;

      next[k] = Math.max(0, learned);
    }
  }

  return next;
}

export function computeEffectiveAdjacency(
  topology: SpatialTopology,
  cells: CellState[],
  conductanceMemory: ConductanceMemory,
  params: ConductanceParams
): EffectiveAdjacency {
  const cellMap = getCellMap(cells);
  const effective: EffectiveAdjacency = {};

  for (const node of topology.nodes) {
    effective[node.id] = [];
  }

  for (const node of topology.nodes) {
    const fromId = node.id;
    const fromCell = cellMap[fromId];
    if (!fromCell) continue;

    for (const edge of getNeighbors(topology, fromId)) {
      const toCell = cellMap[edge.to];
      if (!toCell) continue;

      const k = edgeKey(edge.from, edge.to);
      const vascularMemory = conductanceMemory[k] ?? 0;

      const coherenceTerm =
        1 + params.coherenceGain * mean(fromCell.coherence, toCell.coherence);

      const stressTerm =
        1 - params.stressBarrierGain * mean(fromCell.stress, toCell.stress);

      const zoneTerm =
        1 + params.zoneAffinityGain * zoneAffinity(fromCell, toCell);

      const turbulenceTerm =
        1 - params.mutationTurbulenceGain * turbulencePenalty(fromCell, toCell);

      const memoryTerm =
        1 + params.memoryReinforcementGain * vascularMemory;

      const effectiveWeight = clamp(
        edge.weight *
          coherenceTerm *
          stressTerm *
          zoneTerm *
          turbulenceTerm *
          memoryTerm,
        params.minConductance,
        params.maxConductance
      );

      effective[fromId].push({
        ...edge,
        effectiveWeight,
      });
    }
  }

  return effective;
}
