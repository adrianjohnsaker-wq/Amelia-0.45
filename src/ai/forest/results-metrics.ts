// results-metrics.ts

import { ForestState, RegimeZone, StepMetrics } from "./types";
import { computeFieldVariance } from "./field-update";

const ZONES: RegimeZone[] = [
  "quiescent",
  "plastic",
  "metastable",
  "critical",
  "decay",
];

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return values.reduce((acc, v) => acc + (v - m) * (v - m), 0) / values.length;
}

export function computeStepMetrics(state: ForestState): StepMetrics {
  const zoneDistribution: Record<RegimeZone, number> = {
    quiescent: 0,
    plastic: 0,
    metastable: 0,
    critical: 0,
    decay: 0,
  };

  for (const c of state.cells) zoneDistribution[c.zone]++;

  for (const z of ZONES) {
    zoneDistribution[z] = zoneDistribution[z] / Math.max(1, state.cells.length);
  }

  const meanGradient = mean(Object.values(state.field.gradients));
  const meanFlux = mean(Object.values(state.field.flux));

  const pathwayConcentration =
    Object.values(state.field.flux).filter(v => v > meanFlux).length /
    Math.max(1, state.cells.length);

  const conductances = Object.values(state.vascular.edgeConductance);
  const fluxes = Object.values(state.vascular.edgeFlux);

  const meanConductance = mean(conductances);
  const conductanceVariance = variance(conductances);

  const totalFlux = fluxes.reduce((a, b) => a + b, 0);
  const maxFlux = fluxes.length ? Math.max(...fluxes) : 0;
  const vascularDominance = totalFlux > 0 ? maxFlux / totalFlux : 0;

  const organs = Object.values(state.organ.organs);
  const organCount = organs.length;
  const maxOrganSize = organs.length > 0 ? Math.max(...organs.map(o => o.cells.size)) : 0;

  return {
    tick: state.tick,
    meanActivation: mean(state.cells.map(c => c.activation)),
    meanStress: mean(state.cells.map(c => c.stress)),
    meanCoherence: mean(state.cells.map(c => c.coherence)),
    meanEnergy: mean(state.cells.map(c => c.energy)),
    zoneDistribution,
    totalOperators: state.operators.length,
    fieldVariance: computeFieldVariance(state.field),
    meanGradient,
    meanFlux,
    pathwayConcentration,
    meanConductance,
    conductanceVariance,
    vascularDominance,
    organCount,
    maxOrganSize,
  };
}
