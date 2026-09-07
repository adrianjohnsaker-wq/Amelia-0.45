// field-update.ts

import { ForestState, GlobalFieldState, OperatorClass, SimulationParams } from "./types";
import { SpatialTopology } from "./spatial-topology";
import {
  computeEffectiveAdjacency,
  EffectiveAdjacency,
} from "./adaptive-conductance";

const OPERATOR_TYPES: OperatorClass[] = [
  "attention",
  "inference",
  "memory",
  "mutation",
  "stabilizer",
];

function emptyLocalField(): Record<OperatorClass, number> {
  return {
    attention: 0,
    inference: 0,
    memory: 0,
    mutation: 0,
    stabilizer: 0,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function initializeField(cellIds: string[]): GlobalFieldState {
  const concentrations: GlobalFieldState["concentrations"] = {};
  const gradients: GlobalFieldState["gradients"] = {};
  const flux: GlobalFieldState["flux"] = {};

  for (const id of cellIds) {
    concentrations[id] = emptyLocalField();
    gradients[id] = 0;
    flux[id] = 0;
  }

  return { concentrations, gradients, flux };
}

export function updateField(
  state: ForestState,
  topology: SpatialTopology,
  params: SimulationParams
): {
  field: GlobalFieldState;
  edgeFlux: Record<string, number>;
  edgeConductance: Record<string, number>;
} {
  const next: GlobalFieldState = {
    concentrations: {},
    gradients: {},
    flux: {},
  };

  for (const node of topology.nodes) {
    next.concentrations[node.id] = emptyLocalField();
    next.gradients[node.id] = 0;
    next.flux[node.id] = 0;
  }

  const effectiveAdjacency: EffectiveAdjacency = computeEffectiveAdjacency(
    topology,
    state.cells,
    state.vascular.conductanceMemory,
    params.conductance
  );

  const edgeFlux: Record<string, number> = {};
  const edgeConductance: Record<string, number> = {};

  // 1) Deposit fresh operators
  for (const op of state.operators) {
    if (!next.concentrations[op.sourceCellId]) continue;
    next.concentrations[op.sourceCellId][op.type] += op.strength;
  }

  // 2) Retain prior field
  for (const node of topology.nodes) {
    const id = node.id;
    const prev = state.field.concentrations[id] ?? emptyLocalField();
    for (const t of OPERATOR_TYPES) {
      next.concentrations[id][t] += prev[t] * params.retentionRate;
    }
  }

  // 3) Anisotropic diffusion
  const diffused: GlobalFieldState["concentrations"] = {};
  for (const node of topology.nodes) {
    diffused[node.id] = emptyLocalField();
  }

  for (const node of topology.nodes) {
    const id = node.id;
    const neighbors = effectiveAdjacency[id] ?? [];

    for (const t of OPERATOR_TYPES) {
      const localAmount = next.concentrations[id][t];
      if (localAmount <= 0) continue;

      const spreadable = localAmount * params.diffusionRate;
      const retained = localAmount * (1 - params.diffusionRate);

      diffused[id][t] += retained;

      const totalConductance = neighbors.reduce(
        (s, e) => s + e.effectiveWeight,
        0
      );

      if (totalConductance <= 0) {
        diffused[id][t] += spreadable;
        continue;
      }

      for (const edge of neighbors) {
        const portion = spreadable * (edge.effectiveWeight / totalConductance);
        diffused[edge.to][t] += portion;
        next.flux[id] += Math.abs(portion);

        const k = edgeKey(edge.from, edge.to);
        edgeFlux[k] = (edgeFlux[k] ?? 0) + Math.abs(portion);
        edgeConductance[k] = edge.effectiveWeight;
      }
    }
  }

  // 4) Apply decay and saturation
  for (const node of topology.nodes) {
    const id = node.id;
    for (const t of OPERATOR_TYPES) {
      const raw = diffused[id][t] * (1 - params.operatorDecayRate);
      next.concentrations[id][t] = clamp(raw, 0, params.saturationLimit);
    }
  }

  // 5) Gradient calculation
  for (const node of topology.nodes) {
    const id = node.id;
    const neighbors = effectiveAdjacency[id] ?? [];

    let grad = 0;
    let comparisons = 0;

    for (const edge of neighbors) {
      for (const t of OPERATOR_TYPES) {
        const a = next.concentrations[id][t];
        const b = next.concentrations[edge.to][t];
        grad += Math.abs(a - b);
        comparisons++;
      }
    }

    next.gradients[id] = comparisons > 0 ? grad / comparisons : 0;
  }

  return {
    field: next,
    edgeFlux,
    edgeConductance,
  };
}

export function computeFieldVariance(field: GlobalFieldState): number {
  const totals = Object.values(field.concentrations).map(c =>
    Object.values(c).reduce((a, b) => a + b, 0)
  );
  return variance(totals);
}
