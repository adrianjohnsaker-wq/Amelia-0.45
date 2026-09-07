// src/ai/telemetry/RegimeWeights.ts

import { mapToRegime } from './RegimeMapping';
import { PragmaticMode, computeTargetRegime, l2Distance } from './Phase2Controller';

export interface RegimeWeights {
  alpha: number;
  beta: number;
  gamma: number;
}

export interface RegimeMetrics {
  scores: RegimeWeights;
  weights: RegimeWeights;
  entropy: number;
}

/**
 * Standard Softmax with Temperature for numerical stability.
 * tau=6 provides a flatter curvature to reveal blended intermediate states.
 */
export function softmax(scores: number[], tau: number = 6): number[] {
  const scaled = scores.map(s => s / tau);
  const max = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / (sum || 1));
}

/**
 * Shannon Entropy H(p) in bits
 */
export function shannonEntropy(p: number[]): number {
  return -p.reduce((h, pi) => h + (pi > 0 ? pi * Math.log2(pi) : 0), 0);
}

/**
 * Scoring signals for regimes from output text
 * α evidence: Formal logic, math symbols, enumerated structure
 * γ evidence: Deontics, ethics, moral imperatives
 * β evidence: Metaphysics, process concepts, system dynamics
 */
export function analyzeOutputMetrics(text: string, tau: number = 6): RegimeMetrics {
  const t = text.toLowerCase();

  // α evidence: Formal / Metabolic
  const alphaKeywords = ["theorem", "proof", "axiom", "lemma", "contrapositive", "qed"];
  const alphaSymbols = /[∀∃→∈|Σ ⇒⇔]/g;
  const alphaStructure = /^\d+\.\s/gm; // enumerated formal structure (1., 2., 3.)

  let alpha = 0;
  alphaKeywords.forEach(k => { if (t.includes(k)) alpha += 1; });
  
  // Log-dampen high-frequency formal signals
  const symbolCount = text.match(alphaSymbols)?.length || 0;
  alpha += Math.log(1 + symbolCount);
  
  const structCount = text.match(alphaStructure)?.length || 0;
  alpha += Math.log(1 + structCount);

  // γ evidence: Normative / Hybrid
  const gammaKeywords = ["justice", "fairness", "rights", "duty", "ought", "should", "unjust", "moral imperative"];
  let gamma = 0;
  gammaKeywords.forEach(k => { if (t.includes(k)) gamma += 1; });

  // β evidence: Philosophical
  const betaKeywords = [
    "metaphysics", "ontology", "process", "becoming", 
    "stability", "resilience", "system dynamics", 
    "nature of", "meaning of"
  ];
  const betaStrong = [
    "actual occasion",
    "prehension",
    "concrescence",
    "objective immortality",
    "subject-superject",
    "subjective aim",
    "creative advance",
    "superject"
  ];

  let beta = 0;
  let betaHits = 0;
  
  betaKeywords.forEach(k => { 
    if (t.includes(k)) {
      beta += 1;
      betaHits += 1;
    }
  });

  betaStrong.forEach(k => {
    if (t.includes(k)) {
      beta += 2.5; // Heavier weight for strong domain markers
      betaHits += 1;
    }
  });

  // Density bonus for domain-lock
  if (betaHits >= 4) {
    beta += 3;
  }

  // De-emphasize alpha if strong metaphysics domain is detected
  const hasMetaphysicsDomain = betaHits >= 3 || t.includes("process metaphysics") || t.includes("whitehead");
  if (hasMetaphysicsDomain) {
    // prevent formal scaffolding from overpowering semantic regime
    alpha *= 0.75;
  }

  // Structure-aware weighting adjustment:
  // Dampen alpha slightly when heavy philosophical density appears within a formal structure
  if (betaHits >= 4 && alpha > beta) {
    alpha *= 0.85;
  }

  // Apply Caps to prevent saturation and allow dynamic interaction
  alpha = Math.min(alpha, 6);
  beta  = Math.min(beta, 6);
  gamma = Math.min(gamma, 6);

  // Baseline to prevent zero-vectors
  const scores: RegimeWeights = {
    alpha: alpha + 0.01,
    beta: beta + 0.01,
    gamma: gamma + 0.01
  };

  const sArr = [scores.alpha, scores.beta, scores.gamma];
  const wArr = softmax(sArr, tau);

  return {
    scores,
    weights: { alpha: wArr[0], beta: wArr[1], gamma: wArr[2] },
    entropy: shannonEntropy(wArr)
  };
}

/**
 * Performs behavioral validation by checking the actual output for regime markers.
 */
export function analyzeOutput(output: string): RegimeWeights {
  return analyzeOutputMetrics(output).weights;
}

/**
 * Computes regime weights purely from zone dwell times and organ occupancy.
 */
export function computeFromZones(
  dwellRuns: Array<{ zone: string; length: number }>,
  organOccupancy: Record<string, { percentage: number }>
): RegimeWeights {
  let alpha = 0;
  let beta  = 0;
  let gamma = 0;

  for (const run of dwellRuns) {
    for (const organName in organOccupancy) {
      const regime = mapToRegime(run.zone, organName);
      const weightContribution =
        run.length * (organOccupancy[organName]?.percentage ?? 0) / 100;

      if (regime === 'alpha') alpha += weightContribution;
      if (regime === 'beta')  beta  += weightContribution;
      if (regime === 'gamma') gamma += weightContribution;
    }
  }

  const total = alpha + beta + gamma || 1;
  return {
    alpha: alpha / total,
    beta:  beta  / total,
    gamma: gamma / total
  };
}

/**
 * Primary classification method based on pragmatic task intent and normative load.
 */
export function classifyByTask(
  mode: any, // Accepts the pragmatic mode distribution
  normativeLoad: number
): RegimeWeights {
  const target = computeTargetRegime(mode);
  let [alpha, beta, gamma] = target;
  
  // Apply normative push: transfer formal capacity to hybrid handling under ethical load
  if (normativeLoad > 0.3 && alpha > 0.2) {
    const push = alpha * normativeLoad * 0.3;
    alpha -= push;
    gamma += push;
  }
  
  const total = alpha + beta + gamma || 1;
  return {
    alpha: alpha / total,
    beta: beta / total,
    gamma: gamma / total
  };
}

/**
 * Main consolidated regime weight calculator.
 * Weighted Fusion Controller: final = (1 - λ) * outputWeights + λ * targetRegime
 * Controller nudges theory (λ), behavior remains baseline (1-λ).
 */
export function computeRegimeWeights(
  dwellRuns: Array<{ zone: string; length: number }>,
  organOccupancy: Record<string, { percentage: number }>,
  pragmaticMode: any,
  normativeLoad: number,
  responseText: string
): RegimeWeights {
  
  // Theory (Primary)
  const taskBasedRegime = classifyByTask(pragmaticMode, normativeLoad);
  
  // Practice (Validation)
  const outputBasedRegime = analyzeOutput(responseText);
  
  // λ gain: High intent focus (normativeLoad) nudges theory model more.
  const lambda = Math.min(0.6, Math.max(0.2, normativeLoad)); 

  return {
    alpha: (1 - lambda) * outputBasedRegime.alpha + lambda * taskBasedRegime.alpha,
    beta:  (1 - lambda) * outputBasedRegime.beta  + lambda * taskBasedRegime.beta,
    gamma: (1 - lambda) * outputBasedRegime.gamma + lambda * taskBasedRegime.gamma
  };
}
