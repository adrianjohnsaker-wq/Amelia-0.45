// operator-metabolism.ts

import { CellState, Operator, OperatorClass, SimulationParams } from "./types";

const OPERATOR_TYPES: OperatorClass[] = [
  "attention",
  "inference",
  "memory",
  "mutation",
  "stabilizer",
];

function uuid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function pickOperatorType(cell: CellState): OperatorClass {
  let best: OperatorClass = "attention";
  let bestScore = -Infinity;

  for (const t of OPERATOR_TYPES) {
    const bias = cell.operatorProductionBias[t] ?? 1;
    const fieldBias = cell.localField[t] ?? 0;
    const score = bias + 0.25 * fieldBias + Math.random() * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function updateOperators(
  prevOperators: Operator[],
  cells: CellState[],
  params: SimulationParams
): Operator[] {
  const survivors: Operator[] = [];

  for (const op of prevOperators) {
    const nextAge = op.age + 1;
    const decayedStrength = op.strength * Math.exp(-params.basalDecay - 1 / op.halfLife);

    if (decayedStrength > 0.01) {
      survivors.push({
        ...op,
        age: nextAge,
        strength: decayedStrength,
      });
    }
  }

  const births: Operator[] = [];

  for (const cell of cells) {
    const productionDrive =
      params.operatorEmissionRate *
      (0.4 + cell.activation * 0.35 + cell.coherence * 0.25) *
      (1 - Math.min(cell.stress, 0.95));

    const n = Math.max(0, Math.floor(productionDrive + Math.random() * 0.75));

    for (let i = 0; i < n; i++) {
      const type = pickOperatorType(cell);

      births.push({
        id: uuid(type),
        type,
        age: 0,
        halfLife: 3 + Math.random() * 8,
        strength: 0.3 + Math.random() * 0.7,
        sourceCellId: cell.id,
        localBias: cell.coherence - cell.stress,
      });
    }
  }

  return [...survivors, ...births];
}
