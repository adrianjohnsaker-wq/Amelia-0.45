// src/ai/telemetry/Phase2Controller.ts

export interface PragmaticMode {
  DIR?: number;   // Directive
  DECL?: number;  // Declarative
  Q?: number;     // Interrogative
  EVAL?: number;  // Evaluative
  META?: number;  // Meta-methodological
  NARR?: number;  // Narrative
}

export interface Phase2Output {
  pragmaticMode: PragmaticMode;
  targetRegime: [number, number, number]; // [α, β, γ]
  couplingError: number;
}

/**
 * Heuristic detector for pragmatic intent.
 * Prioritizes structural signals over simple keyword matching.
 */
export function detectPragmaticMode(text: string): PragmaticMode {
  const t = text.trim();
  
  // Priority 1: Interrogative (questions)
  if (/\?/.test(t)) {
    // "Should/Ought" questions
    if (/^should|^ought|^must we|^can we|^could we/i.test(t)) {
      return { Q: 0.8 };
    }
    // "What/Why/How" questions
    if (/^what|^why|^how|^when|^where|^who/i.test(t)) {
      return { Q: 0.8 };
    }
    // Other questions
    return { Q: 0.7 };
  }
  
  // Priority 2: Directive (imperatives)
  if (/^prove|^calculate|^derive|^compute|^design|^implement/i.test(t)) {
    return { DIR: 0.9 };
  }
  
  // Priority 3: Declarative (goal statements)
  if (/^we need|^the goal|^our approach|^let us/i.test(t)) {
    return { DECL: 0.8 };
  }
  
  // Priority 4: Meta-methodological
  if (/^define|^measure|^instrument|^benchmark|^formalize/i.test(t)) {
    return { META: 0.8 };
  }
  
  // Priority 5: Evaluative
  if (/^evaluate|^assess|^judge|^critique/i.test(t)) {
    return { EVAL: 0.7 };
  }
  
  // Priority 6: Narrative
  if (/^imagine|^describe|^tell|^story|^once/i.test(t)) {
    return { NARR: 0.9 };
  }
  
  // Default fallback
  return { Q: 0.5 };
}

/**
 * G-Matrix: Maps Pragmatic Modes to ideal cognitive Regime Weights [α, β, γ]
 */
const G_MATRIX: Record<string, [number, number, number]> = {
  'DIR':  [0.70, 0.20, 0.10],  // Directive → high α
  'DECL': [0.05, 0.90, 0.05],  // Declarative → high β
  'Q':    [0.25, 0.55, 0.20],  // Question → balanced
  'EVAL': [0.35, 0.55, 0.10],  // Evaluation → mixed
  'META': [0.30, 0.60, 0.10],  // Meta → slight β
  'NARR': [0.05, 0.85, 0.10],  // Narrative → high β
};

/**
 * Blends multiple pragmatic modes into a single target regime vector.
 */
export function computeTargetRegime(modeDistribution: PragmaticMode): [number, number, number] {
  const entries = Object.entries(modeDistribution) as [keyof PragmaticMode, number][];
  
  // Dominant mode optimization
  if (entries.length === 1 && (entries[0][1] ?? 0) >= 0.7) {
    const mode = entries[0][0];
    return G_MATRIX[mode] || [0.33, 0.33, 0.34];
  }
  
  let alpha = 0, beta = 0, gamma = 0;
  let totalWeight = 0;
  
  for (const [mode, weight] of entries) {
    if (weight === undefined) continue;
    const [a, b, g] = G_MATRIX[mode] || [0.33, 0.33, 0.34];
    alpha += weight * a;
    beta += weight * b;
    gamma += weight * g;
    totalWeight += weight;
  }
  
  if (totalWeight > 0) {
    return [alpha / totalWeight, beta / totalWeight, gamma / totalWeight];
  }
  
  return [0.33, 0.33, 0.34];
}

/**
 * Computes Euclidean distance between two regime vectors.
 */
export function l2Distance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0)
  );
}

/**
 * Main Phase II entry point for processing pragmatic-regime coupling.
 */
export function processPhase2(
  inputText: string,
  observedRegime: [number, number, number]
): Phase2Output {
  const pragmaticMode = detectPragmaticMode(inputText);
  const targetRegime = computeTargetRegime(pragmaticMode);
  const couplingError = l2Distance(observedRegime, targetRegime);

  return {
    pragmaticMode,
    targetRegime,
    couplingError
  };
}
