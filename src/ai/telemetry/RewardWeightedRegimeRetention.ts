// RewardWeightedRegimeRetention.ts
// Minimal, drop-in patch: adds reward-weighted regime retention (momentum + decay + clamp + normalization).
// Assumes you already compute: base regime scores/weights, couplingError, zoneEntropy, collapseRate, etc.

export type RegimeKey = "alpha" | "beta" | "gamma";

export interface RegimeWeights {
  alpha: number;
  beta: number;
  gamma: number;
}

export interface RetentionState {
  // momentum biases added onto *scores* (or logits) before softmax
  bias: RegimeWeights;

  // last-step telemetry snapshot (for reward comparison)
  last?: {
    couplingError: number;
    betaWeight: number;
    collapseRate?: number;
    uniqueZones?: number;
    timestamp?: number;
  };
}

export interface RetentionConfig {
  // reward signals
  couplingImproveEps: number;     // how much coupling must improve to count as reward
  betaGainEps: number;            // minimal beta increase to count as reward
  collapseRateBad?: number;       // optional: treat high collapse as negative reward

  // learning rates
  etaCoupling: number;            // reward update magnitude for coupling improvement
  etaBeta: number;                // reward update magnitude for beta gain
  etaPenalty: number;             // penalty magnitude for regression

  // stability controls
  decay: number;                  // 0.90–0.99 typical; closer to 1 = longer memory
  biasClamp: number;              // max absolute bias
  deadband: number;               // ignore tiny changes (prevents jitter)

  // optional: encourage dwell (reduce wandering) once exploration is sufficient
  dwellLock?: {
    enabled: boolean;
    minUniqueZones: number;       // only lock once exploration happened
    lockStrength: number;         // 0.01–0.06 typical
  };
}

export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  couplingImproveEps: 0.01,
  betaGainEps: 0.015,
  collapseRateBad: 0.6, // optional (only used if you pass collapseRate)

  etaCoupling: 0.03,
  etaBeta: 0.02,
  etaPenalty: 0.02,

  decay: 0.95,
  biasClamp: 0.35,
  deadband: 1e-4,

  dwellLock: {
    enabled: true,
    minUniqueZones: 4,     // once you’ve explored >2 zones, start preferring stable gains
    lockStrength: 0.02
  }
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function normalizeWeights(w: RegimeWeights): RegimeWeights {
  const s = (w.alpha + w.beta + w.gamma) || 1;
  return { alpha: w.alpha / s, beta: w.beta / s, gamma: w.gamma / s };
}

function softmax3(scores: RegimeWeights): RegimeWeights {
  const m = Math.max(scores.alpha, scores.beta, scores.gamma);
  const ea = Math.exp(scores.alpha - m);
  const eb = Math.exp(scores.beta - m);
  const eg = Math.exp(scores.gamma - m);
  const sum = ea + eb + eg || 1;
  return { alpha: ea / sum, beta: eb / sum, gamma: eg / sum };
}

function l1diff(a: RegimeWeights, b: RegimeWeights): number {
  return Math.abs(a.alpha - b.alpha) + Math.abs(a.beta - b.beta) + Math.abs(a.gamma - b.gamma);
}

export interface RetentionInput {
  baseScores: RegimeWeights;      // your computed regime logits/scores (pre-softmax)
  baseWeights?: RegimeWeights;    // optional: if you already softmax elsewhere
  couplingError: number;
  zoneEntropyUnique?: number;
  collapseRate?: number;
  timestamp?: number;
}

export interface RetentionOutput {
  adjustedScores: RegimeWeights;
  adjustedWeights: RegimeWeights;
  state: RetentionState;
  debug: {
    reward: number;
    penalty: number;
    bias: RegimeWeights;
    usedDwellLock: boolean;
  };
}

export function initRetentionState(): RetentionState {
  return { bias: { alpha: 0, beta: 0, gamma: 0 } };
}

/**
 * Core update: compare current telemetry against last step.
 * If coupling improves and/or beta increases -> reward beta, damp alpha.
 * If coupling worsens -> penalize beta a bit and allow alpha back.
 */
export function applyRewardWeightedRegimeRetention(
  input: RetentionInput,
  prevState: RetentionState,
  cfg: RetentionConfig = DEFAULT_RETENTION_CONFIG
): RetentionOutput {
  // 1) decay old biases (memory)
  const decayedBias: RegimeWeights = {
    alpha: prevState.bias.alpha * cfg.decay,
    beta: prevState.bias.beta * cfg.decay,
    gamma: prevState.bias.gamma * cfg.decay
  };

  let reward = 0;
  let penalty = 0;

  const last = prevState.last;
  if (last) {
    const dCoupling = last.couplingError - input.couplingError; // positive => improved
    const dBeta = (input.baseWeights ? input.baseWeights.beta : softmax3(input.baseScores).beta) - last.betaWeight;

    // deadband to prevent micro-jitter
    const couplingImproved = dCoupling > cfg.couplingImproveEps;
    const couplingWorsened = dCoupling < -cfg.couplingImproveEps;
    const betaGained = dBeta > cfg.betaGainEps;
    const betaLost = dBeta < -cfg.betaGainEps;

    // Optional collapse guard (if you track it)
    const collapseBad =
      typeof cfg.collapseRateBad === "number" &&
      typeof input.collapseRate === "number" &&
      input.collapseRate >= cfg.collapseRateBad;

    if (couplingImproved) reward += cfg.etaCoupling;
    if (betaGained) reward += cfg.etaBeta;

    if (couplingWorsened) penalty += cfg.etaPenalty;
    if (betaLost) penalty += cfg.etaPenalty * 0.5;

    if (collapseBad) penalty += cfg.etaPenalty * 1.5;
  }

  // 2) update biases
  // Reward: push beta up, alpha down slightly (keeps gamma available as stabilizer/noise absorber)
  // Penalty: pull beta back slightly, allow alpha up (prevents runaway incoherence)
  let newBias: RegimeWeights = {
    alpha: decayedBias.alpha - reward * 0.7 + penalty * 0.6,
    beta: decayedBias.beta + reward * 1.0 - penalty * 0.7,
    gamma: decayedBias.gamma + reward * 0.2 - penalty * 0.1
  };

  // 3) optional: dwell lock (convert exploration into occupation once enough zones explored)
  let usedDwellLock = false;
  if (cfg.dwellLock?.enabled && typeof input.zoneEntropyUnique === "number") {
    if (input.zoneEntropyUnique >= cfg.dwellLock.minUniqueZones) {
      // This gently “sticks” to the current best regime by reinforcing its current dominant weight.
      const baseW = input.baseWeights ?? softmax3(input.baseScores);
      const dominant: RegimeKey =
        baseW.beta >= baseW.alpha && baseW.beta >= baseW.gamma ? "beta" :
        baseW.alpha >= baseW.gamma ? "alpha" : "gamma";

      newBias[dominant] += cfg.dwellLock.lockStrength;
      usedDwellLock = true;
    }
  }

  // 4) clamp biases
  newBias = {
    alpha: clamp(newBias.alpha, -cfg.biasClamp, cfg.biasClamp),
    beta: clamp(newBias.beta, -cfg.biasClamp, cfg.biasClamp),
    gamma: clamp(newBias.gamma, -cfg.biasClamp, cfg.biasClamp)
  };

  // 5) apply bias to scores
  const adjustedScores: RegimeWeights = {
    alpha: input.baseScores.alpha + newBias.alpha,
    beta: input.baseScores.beta + newBias.beta,
    gamma: input.baseScores.gamma + newBias.gamma
  };

  // 6) produce final weights
  const adjustedWeights = softmax3(adjustedScores);

  // 7) update state snapshot
  const nextState: RetentionState = {
    bias: newBias,
    last: {
      couplingError: input.couplingError,
      betaWeight: adjustedWeights.beta, // store post-adjust beta
      collapseRate: input.collapseRate,
      uniqueZones: input.zoneEntropyUnique,
      timestamp: input.timestamp ?? Date.now()
    }
  };

  return {
    adjustedScores,
    adjustedWeights: normalizeWeights(adjustedWeights),
    state: nextState,
    debug: { reward, penalty, bias: newBias, usedDwellLock }
  };
}

/**
 * Utility: if you want “target regime” tracking in logs.
 */
export function couplingErrorL1(weights: RegimeWeights, target: [number, number, number]): number {
  const t: RegimeWeights = { alpha: target[0], beta: target[1], gamma: target[2] };
  return l1diff(normalizeWeights(weights), normalizeWeights(t));
}
