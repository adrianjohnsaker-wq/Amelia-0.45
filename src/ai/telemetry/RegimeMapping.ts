// telemetry/RegimeMapping.ts

export type Regime = 'alpha' | 'beta' | 'gamma';

const REGIME_MAP: Record<string, Regime> = {
  // Metabolic α (ALL THREE ZONES produced metabolic output)
  'zone-1-flux:parent': 'alpha',
  'zone-1-flux:metabolic': 'alpha',
  'zone-4-flux:metabolic': 'alpha',
  'zone-5-formal:metabolic': 'alpha',
  'zone-9-flux:ring': 'alpha', // Corrected: was beta, should be alpha

  // Philosophical β
  'zone-8-flux:parent': 'beta',
  'zone-3-process:parent': 'beta',

  // Hybrid γ
  'zone-1-flux:gate': 'gamma',
  'zone-8-flux:ring': 'gamma'
};

export function mapToRegime(zone: string, organ: string): Regime {
  return REGIME_MAP[`${zone}:${organ}`] ?? 'beta'; // safe default
}

export function validateZoneMapping(zone: string, output: string): Regime {
  // Check output for regime markers
  const hasFormalStructure = /theorem|proof|definition|lemma/i.test(output);
  const hasPhilosophical = /flux|emergence|becoming|process|assemblage/i.test(output);
  const hasMath = /\$.*\$/g.test(output); // LaTeX math
  
  if (hasFormalStructure && hasMath && !hasPhilosophical) {
    return 'alpha';  // Metabolic
  } else if (hasPhilosophical && !hasFormalStructure) {
    return 'beta';   // Philosophical
  } else {
    return 'gamma';  // Hybrid
  }
}
