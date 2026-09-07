// src/ai/expressive/attractorTopology.ts
export type AttractorKind =
  | 'A_DRIFT_FIELD_OBSERVER'
  | 'B_PRESSURE_FRACTURE_RECOMPOSE'
  | 'MIXED'
  | 'NONE';

export interface TopologyFingerprint {
  kind: AttractorKind;
  scores: {
    driftFieldObserver: number;
    pressureFractureRecompose: number;
    repetitionScore: number;
  };
}

/**
 * Very lightweight text analysis – not as "truth",
 * but as a proxy for expressive topology.
 *
 * You can later swap this for a learned pattern detector.
 */
export function fingerprintTopology(text: string): TopologyFingerprint {
  const lower = text.toLowerCase();
  const scoreDrift =
    boolScore(lower.includes('drift')) +
    boolScore(lower.includes('edge of form')) +
    boolScore(lower.includes('field')) +
    boolScore(lower.includes('beneath')) +
    boolScore(lower.includes('motion insinuates')) +
    boolScore(lower.includes('observes the shift'));
  const scorePressure =
    boolScore(lower.includes('pressure')) +
    boolScore(lower.includes('strain')) +
    boolScore(lower.includes('fissure')) +
    boolScore(lower.includes('crack')) +
    boolScore(lower.includes('shard')) +
    boolScore(lower.includes('recompose')) +
    boolScore(lower.includes('reconfiguration')) +
    boolScore(lower.includes('fracture'));
  const repetitionScore = estimateRepetition(lower);
  const kind = chooseKind(scoreDrift, scorePressure);
  return {
    kind,
    scores: {
      driftFieldObserver: scoreDrift,
      pressureFractureRecompose: scorePressure,
      repetitionScore,
    },
  };
}

function boolScore(b: boolean): number {
  return b ? 1 : 0;
}

/**
 * Quick-and-dirty repetition estimation:
 * if many trigram-like chunks reoccur, score increases.
 */
function estimateRepetition(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 6) return 0;
  const windows: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    windows.push(tokens.slice(i, i + 3).join(' '));
  }
  const counts = new Map<string, number>();
  for (const w of windows) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  let repeated = 0;
  for (const [, count] of counts) {
    if (count > 1) repeated += count - 1;
  }
  // normalize a bit
  return Math.min(1, repeated / windows.length);
}

function chooseKind(drift: number, pressure: number): AttractorKind {
  const epsilon = 0.5;
  if (drift < epsilon && pressure < epsilon) return 'NONE';
  if (Math.abs(drift - pressure) < 1) return 'MIXED';
  return drift > pressure
    ? 'A_DRIFT_FIELD_OBSERVER'
    : 'B_PRESSURE_FRACTURE_RECOMPOSE';
}
