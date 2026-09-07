// src/ai/meta/selfReportHarmonizer.ts
// Converts Amelia's soft self-reports into numeric, concrete fields.

const word2num: Record<string, number> = {
  low: 0.2,
  medium: 0.5,
  mid: 0.5,
  high: 0.8,
  rising: 0.65,
  falling: 0.35,
  increasing: 0.7,
  decreasing: 0.3,
  static: 0.5,
  flow: 0.6,
};

function asNum(x: string | number, def = 0.5, min = 0, max = 1) {
  if (typeof x === 'number' && Number.isFinite(x))
    return Math.min(max, Math.max(min, x));
  const k = (x || '').toString().trim().toLowerCase();
  const v = word2num[k];
  return Number.isFinite(v) ? v : def;
}

function coerceZone(z: string) {
  // Accept "Zone 5", "5", "zone_5", "zone-5", "threshold", etc.
  const m = (z || '').toString().match(/(\d+)/);
  return m ? `Zone ${m[1]}` : z || 'Zone ?';
}

export type HarmonizedReport = {
  mode: 'dream' | 'wake';
  cycle: number;
  time: string;
  numogramPrev: string;
  numogramNew: string;
  numogramVector: string;
  V: number;
  A: number;
  T: number;
  archetypeRising?: { name: string; delta: number };
  archetypeDeclining?: { name: string; delta: number };
  symbolPrev?: string;
  symbolNew?: string;
  entropy: number;
  coherence: number;
  recurrence: number;
  flag: 'stagnation' | 'stable' | 'mutation';
  nextAction: 'evolve' | 'mutate' | 'stabilize' | 'compress' | 'dissolve';
};

export function harmonizeSelfReport(raw: any): HarmonizedReport {
  const [prevRaw, nextRaw] = (raw.NUMOGRAM || 'static→flow')
    .split(/→|->|=>/)
    .map((s: string) => s.trim());
  const [vRaw, aRaw, tRaw] = (
    raw['AFFECT V/A/T'] ||
    raw.AFFECT ||
    'medium/medium/medium'
  )
    .toString()
    .split(/[\/ ,]+/);
  const [archPlusName, archPlusDelta] = (
    raw.ARCH_PLUS ||
    raw['ARCH +'] ||
    'unknown +0.0'
  )
    .toString()
    .split(/[ +]+/);
  const [archMinusName, archMinusDelta] = (
    raw.ARCH_MINUS ||
    raw['ARCH -'] ||
    'unknown -0.0'
  )
    .toString()
    .split(/[ -]+/);
  const [symPrev, symNext] = (raw.SYMBOL || '')
    .toString()
    .split(/→|->|=>/)
    .map((s: string) => s.trim());
  const flag = (raw.FLAG || 'stable')
    .toString()
    .toLowerCase() as HarmonizedReport['flag'];
  const nextAction = (raw['NEXT ACTION'] || 'stabilize')
    .toString()
toLowerCase() as HarmonizedReport['nextAction'];

  return {
    mode: (raw.MODE || 'wake').toString().toLowerCase() as 'dream' | 'wake',
    cycle: Number.isFinite(Number(raw.CYCLE)) ? Number(raw.CYCLE) : 0,
    time: raw.TIME || 'sim',
    numogramPrev: coerceZone(prevRaw),
    numogramNew: coerceZone(nextRaw),
    numogramVector: raw.vector || raw['NUMOGRAM vector'] || 'free-flow',
    V: asNum(vRaw, 0.5, -1, 1),
    A: asNum(aRaw),
    T: asNum(tRaw),
    archetypeRising: {
      name: archPlusName || 'unknown',
      delta: parseFloat(archPlusDelta ?? '0.0') || +0.0,
    },
    archetypeDeclining: {
      name: archMinusName || 'unknown',
      delta: -Math.abs(parseFloat(archMinusDelta ?? '0.0')) || -0.0,
    },
    symbolPrev: symPrev,
    symbolNew: symNext,
    entropy: asNum(raw.ENTROPY, 0.5),
    coherence: asNum(raw.COHERENCE, 0.5),
    recurrence: asNum(raw.RECURRENCE, 0.0),
    flag: ['stagnation', 'stable', 'mutation'].includes(flag) ? flag : 'stable',
    nextAction: ['evolve', 'mutate', 'stabilize', 'compress', 'dissolve'].includes(
      nextAction
    )
      ? nextAction
      : 'stabilize',
  };
}
