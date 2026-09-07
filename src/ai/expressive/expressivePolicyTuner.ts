// src/ai/expressive/expressivePolicyTuner.ts

import {
  ExpressivePolicy,
  defaultExpressivePolicy,
  RelayMode,
} from "./expressivePolicies";

/**
 * PolicyTuner observes successive relay decisions and substrate deltas
 * to adjust novelty and recurrence thresholds on the fly.
 *
 * It uses a sliding window of recent events to estimate two probabilities:
 *  - falsePositiveRate: proportion of low-novelty emissions
 *  - falseNegativeRate: proportion of high-novelty silences
 * and adjusts thresholds and weights accordingly.
 */

export interface TunerObservation {
  tick: number;
  novelty: number;
  emitted: boolean;
  mode?: RelayMode;
  entropy: number;
  energyDelta: number;
}

export interface PolicyTunerIF {
  observe(o: TunerObservation): void;
  current(): ExpressivePolicy;
}

export function createPolicyTuner(
  base: Partial<ExpressivePolicy> = {}
): PolicyTunerIF {
  const P: ExpressivePolicy = { ...defaultExpressivePolicy, ...base, noveltyThreshold: 0.45, };

  const window: TunerObservation[] = [];
  const WINDOW = 256; // rolling window length

  let lastAdjust = 0;
  const ADJUST_PERIOD = 64; // adjust every N observations
  const LR = 0.05; // learning rate (small to ensure stability)

  function observe(o: TunerObservation) {
    window.push(o);
    if (window.length > WINDOW) window.shift();

    if (o.tick - lastAdjust > ADJUST_PERIOD && window.length >= ADJUST_PERIOD) {
      adjust();
      lastAdjust = o.tick;
    }
  }

  function adjust() {
    // Compute rates.
    const emitted = window.filter((w) => w.emitted);
    const silent = window.filter((w) => !w.emitted);
    const avgNovelEmit =
      emitted.reduce((a, b) => a + b.novelty, 0) / Math.max(1, emitted.length);
    const avgNovelSilent =
      silent.reduce((a, b) => a + b.novelty, 0) / Math.max(1, silent.length);

    // Estimate “false positive” = emitted below threshold
    const fp = emitted.filter((e) => e.novelty < P.noveltyThreshold).length;
    const fn = silent.filter((e) => e.novelty > P.noveltyThreshold).length;

    const fpRate = fp / Math.max(1, emitted.length);
    const fnRate = fn / Math.max(1, silent.length);

    // Adjust novelty threshold toward balance:
    // if fp > fn → too talkative → raise threshold
    // if fn > fp → too quiet → lower threshold
    const delta = clamp((fnRate - fpRate) * LR, -0.05, 0.05);
    P.noveltyThreshold = clamp01(P.noveltyThreshold - delta);

    // Adjust recurrenceCeil based on overall coherence of emissions
    if (avgNovelEmit < avgNovelSilent) {
      // Emissions are less novel than silences → tighten recurrence guard
      P.recurrenceCeil = clamp01(P.recurrenceCeil - 0.02 * LR);
    } else {
      P.recurrenceCeil = clamp01(P.recurrenceCeil + 0.02 * LR);
    }

    // Fine-tune weight distribution to favor underperforming factors.
    // Compute correlation between novelty and each metric.
    const covEnergy = covariance(window.map(w=>w.novelty), window.map(w=>Math.abs(w.energyDelta)));
    const covEntropy = covariance(window.map(w=>w.novelty), window.map(w=>w.entropy));
    const total = Math.abs(covEnergy) + Math.abs(covEntropy);
    if (total > 0) {
      P.noveltyWeights.energyDelta += (covEnergy / total) * LR;
      P.noveltyWeights.entropyCurvature += (covEntropy / total) * LR;
      normalizeWeights(P.noveltyWeights);
    }
  }

  function current(): ExpressivePolicy {
    return P;
  }

  return { observe, current };
}

// — utility helpers — //

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function covariance(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / n;
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

function normalizeWeights(w: Record<string, number>) {
  const sum = Object.values(w).reduce((a, b) => a + Math.abs(b), 0);
  if (sum <= 0) return;
  for (const k in w) w[k] = Math.abs(w[k]) / sum;
}
