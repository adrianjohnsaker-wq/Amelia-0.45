// cell-update.ts

import { CellState, ForestState, RegimeZone, SimulationParams } from "./types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function determineZone(
  activation: number,
  stress: number,
  thresholds: SimulationParams["zoneThresholds"]
): RegimeZone {
  if (stress >= thresholds.decay) return "decay";
  if (activation >= thresholds.critical) return "critical";
  if (activation >= thresholds.metastable) return "metastable";
  if (activation >= thresholds.plastic) return "plastic";
  return "quiescent";
}

export function updateCells(
  prevCells: CellState[],
  state: ForestState,
  params: SimulationParams
): CellState[] {
  return prevCells.map(cell => {
    const local = state.field.concentrations[cell.id] ?? {
      attention: 0,
      inference: 0,
      memory: 0,
      mutation: 0,
      stabilizer: 0,
    };

    const totalField =
      local.attention +
      local.inference +
      local.memory +
      local.mutation +
      local.stabilizer;

    const activation = clamp(
      0.55 * cell.activation +
        0.25 * totalField +
        0.15 * local.attention +
        0.10 * local.inference -
        0.08 * local.stabilizer,
      0,
      1.5
    );

    const coherence = clamp(
      0.6 * cell.coherence +
        0.18 * local.memory +
        0.16 * local.stabilizer -
        0.12 * local.mutation,
      0,
      1.5
    );

    const stress = clamp(
      0.62 * cell.stress +
        params.stressFromOverload * Math.max(0, totalField - params.saturationLimit * 0.55) +
        0.12 * local.mutation -
        0.10 * local.stabilizer,
      0,
      1.5
    );

    const energy = clamp(
      cell.energy +
        0.08 * coherence -
        0.06 * activation -
        0.10 * stress +
        0.03 * local.memory,
      0,
      2
    );

    const zone = determineZone(activation, stress, params.zoneThresholds);

    return {
      ...cell,
      activation,
      stress,
      coherence,
      energy,
      zone,
      localField: { ...local },
    };
  });
}
