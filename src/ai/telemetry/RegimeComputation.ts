// src/ai/telemetry/RegimeComputation.ts

export type RegimeKey = "alpha" | "beta" | "gamma";
export type RegimeVec = Record<RegimeKey, number>;

export interface RegimeConfig {
  softmaxTemperature: number;
  basinMargin: number;
  emaAlpha: number;
  minWeight: number;
}

export interface RegimeTelemetry {
  regimeScores: RegimeVec;
  regimeWeightsSoftmax: RegimeVec;
  regimeWeightsFinal: RegimeVec;
  basinLabel: "alpha" | "beta" | "gamma" | "blended";
  basinConfidence: number;
  softmaxTemperature: number;
  basinMargin: number;
}

const DEFAULT_CFG: RegimeConfig = {
  softmaxTemperature: 0.25,
  basinMargin: 2.5,
  emaAlpha: 0.0,
  minWeight: 0.001,
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function normalize(v: RegimeVec): RegimeVec {
  const s = v.alpha + v.beta + v.gamma;
  if (s <= 0) return { alpha: 1 / 3, beta: 1 / 3, gamma: 1 / 3 };
  return { alpha: v.alpha / s, beta: v.beta / s, gamma: v.gamma / s };
}

function softmaxTemp(scores: RegimeVec, tau: number): RegimeVec {
  const t = Math.max(1e-6, tau);
  const a = scores.alpha / t;
  const b = scores.beta / t;
  const g = scores.gamma / t;
  const m = Math.max(a, b, g);
  const ea = Math.exp(a - m);
  const eb = Math.exp(b - m);
  const eg = Math.exp(g - m);
  const z = ea + eb + eg;
  return { alpha: ea / z, beta: eb / z, gamma: eg / z };
}

function applyMinWeight(w: RegimeVec, minW: number): RegimeVec {
  const m = Math.max(0, minW);
  const v = {
    alpha: Math.max(m, w.alpha),
    beta: Math.max(m, w.beta),
    gamma: Math.max(m, w.gamma),
  };
  return normalize(v);
}

function classifyBasin(scores: RegimeVec, margin: number): { label: RegimeTelemetry["basinLabel"]; conf: number } {
  const entries: Array<[RegimeKey, number]> = [
    ["alpha", scores.alpha],
    ["beta", scores.beta],
    ["gamma", scores.gamma],
  ].sort((x, y) => (y[1] as number) - (x[1] as number));

  const [topK, topV] = entries[0];
  const [, secondV] = entries[1];
  const diff = (topV as number) - (secondV as number);

  if (diff >= margin) {
    const conf = clamp01(diff / (margin * 2));
    return { label: topK as RegimeTelemetry["basinLabel"], conf };
  }
  const conf = clamp01(diff / Math.max(1e-6, margin));
  return { label: "blended", conf };
}

export function computeRegimes(
  regimeScores: RegimeVec,
  opts?: {
    cfg?: Partial<RegimeConfig>;
    prevFinal?: RegimeVec;
    controlBias?: RegimeVec;
  }
): RegimeTelemetry {
  const cfg: RegimeConfig = { ...DEFAULT_CFG, ...(opts?.cfg ?? {}) };
  const basin = classifyBasin(regimeScores, cfg.basinMargin);
  const soft = softmaxTemp(regimeScores, cfg.softmaxTemperature);
  const bias = opts?.controlBias ?? { alpha: 1, beta: 1, gamma: 1 };
  const biased = normalize({
    alpha: soft.alpha * bias.alpha,
    beta: soft.beta * bias.beta,
    gamma: soft.gamma * bias.gamma,
  });

  let finalW = biased;
  if (cfg.emaAlpha > 0 && opts?.prevFinal) {
    const a = clamp01(cfg.emaAlpha);
    finalW = normalize({
      alpha: (1 - a) * biased.alpha + a * opts.prevFinal.alpha,
      beta: (1 - a) * biased.beta + a * opts.prevFinal.beta,
      gamma: (1 - a) * biased.gamma + a * opts.prevFinal.gamma,
    });
  }

  finalW = applyMinWeight(finalW, cfg.minWeight);

  return {
    regimeScores,
    regimeWeightsSoftmax: soft,
    regimeWeightsFinal: finalW,
    basinLabel: basin.label,
    basinConfidence: basin.conf,
    softmaxTemperature: cfg.softmaxTemperature,
    basinMargin: cfg.basinMargin,
  };
}
