// src/ai/telemetry/AdaptiveAttractorControl.ts
// Evolutionary adaptive attractor control for regime+zone stabilization.

export type Regime = "alpha" | "beta" | "gamma";

export type TaskClass =
  | "dir"          // directive / technical / proof-like
  | "q"            // philosophical / open inquiry
  | "mix"          // ethical / hybrid / ambiguous
  | "unclassified";

export type Vector3 = [number, number, number];

export interface Telemetry {
  step: number;
  timestamp: number;
  // Raw regime scores from classifier (pre-softmax)
  regimeScores: Record<Regime, number>;
  // Current zone label (e.g., "zone-1-flux")
  zone?: string;
  // Optional: coherence/appropriateness/etc (can be -1 if not evaluated)
  performance?: {
    taskSuccess?: number;       // -1..1
    appropriateness?: number;   // -1..1
    coherence?: number;         // -1..1
    creativity?: number;        // -1..1
    alignment?: number;         // -1..1
  };
  // Control-plane signals
  couplingError?: number; // 0..1 (smaller = better)
  pragmaticMode?: { Q?: number; DIR?: number }; // if you have it
  taskClass?: TaskClass;
}

export interface ContextFeatures {
  taskClass: TaskClass;
  dirHint: number; // 0..1
  qHint: number;   // 0..1
  mixHint: number; // 0..1
}

export interface AttractorControlOutput {
  logitBias: Record<Regime, number>;
  temperature: number;
  stickiness: number;
  allowExploration: boolean;
  debug: Record<string, any>;
}

export interface AACConfig {
  etaFast: number;
  etaSlow: number;
  traceDecay: number;
  hysteresis: number;
  baseStickiness: number;
  Tmin: number;
  Tmax: number;
  exploreCe: number;
  exploreDrop: number;
  maxBias: number;
}

const DEFAULT_CFG: AACConfig = {
  etaFast: 0.18,
  etaSlow: 0.03,
  traceDecay: 0.85,
  hysteresis: 0.12,
  baseStickiness: 0.55,
  Tmin: 0.25,
  Tmax: 1.25,
  exploreCe: 0.32,
  exploreDrop: -0.12,
  maxBias: 2.25,
};

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function softmax3(logits: Vector3, temperature: number): Vector3 {
  const t = Math.max(1e-6, temperature);
  const z0 = logits[0] / t;
  const z1 = logits[1] / t;
  const z2 = logits[2] / t;
  const m = Math.max(z0, z1, z2);
  const e0 = Math.exp(z0 - m);
  const e1 = Math.exp(z1 - m);
  const e2 = Math.exp(z2 - m);
  const s = e0 + e1 + e2;
  return [e0 / s, e1 / s, e2 / s];
}

function toVec(scores: Record<Regime, number>): Vector3 {
  return [scores.alpha, scores.beta, scores.gamma];
}

function toRec(v: Vector3): Record<Regime, number> {
  return { alpha: v[0], beta: v[1], gamma: v[2] };
}

function computeReward(t: Telemetry): number {
  const p = t.performance ?? {};
  const vals = [
    p.taskSuccess,
    p.appropriateness,
    p.coherence,
    p.creativity,
    p.alignment
  ].filter(
    (x) => typeof x === "number" && Number.isFinite(x) && x !== -1
  ) as number[];

  let perf = 0;
  if (vals.length > 0) {
    perf = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  let ce = 0;
  if (typeof t.couplingError === "number" && Number.isFinite(t.couplingError)) {
    ce = 1 - 2 * clamp(t.couplingError, 0, 1);
  }

  if (vals.length > 0) return 0.7 * perf + 0.3 * ce;
  if (typeof t.couplingError === "number") return ce;

  return 0;
}

export class AdaptiveAttractorControl {
  private cfg: AACConfig;
  private traitBias: Record<TaskClass, Vector3> = {
    dir: [0, 0, 0],
    q: [0, 0, 0],
    mix: [0, 0, 0],
    unclassified: [0, 0, 0],
  };
  private episodeBias: Vector3 = [0, 0, 0];
  private trace: Vector3 = [0, 0, 0];
  private lastWeights: Vector3 = [1 / 3, 1 / 3, 1 / 3];
  private lastReward = 0;

  constructor(cfg?: Partial<AACConfig>) {
    this.cfg = { ...DEFAULT_CFG, ...(cfg ?? {}) };
  }

  public decide(
    ctx: ContextFeatures,
    telemetry: Telemetry
  ): AttractorControlOutput {
    const r = computeReward(telemetry);
    const rewardDelta = r - this.lastReward;

    const trait = this.traitBias[ctx.taskClass] ?? [0, 0, 0];
    const base: Vector3 = [
      trait[0] + this.episodeBias[0],
      trait[1] + this.episodeBias[1],
      trait[2] + this.episodeBias[2],
    ];

    const intent: Vector3 = this.intentFromHints(ctx);
    const intentPeak = Math.max(intent[0], intent[1], intent[2]);
    const lastPeak = Math.max(this.lastWeights[0], this.lastWeights[1], this.lastWeights[2]);
    const allowSwitch = (intentPeak - lastPeak) > this.cfg.hysteresis;

    const effectiveIntent: Vector3 = allowSwitch ? intent : this.lastWeights;

    const confidence = this.confidenceFromScores(telemetry.regimeScores);
    let temp = this.temperatureFrom(confidence, rewardDelta);

    const biasVec = this.scaleBias(effectiveIntent, base);

    const allowExploration =
      (typeof telemetry.couplingError === "number" && telemetry.couplingError > this.cfg.exploreCe) ||
      (rewardDelta < this.cfg.exploreDrop);

    let stickiness = clamp(
      this.cfg.baseStickiness
        + 0.25 * confidence
        + 0.15 * clamp(r, -1, 1)
        - (allowExploration ? 0.25 : 0),
      0.05,
      0.95
    );

    const ctrl: AttractorControlOutput = {
      logitBias: toRec(biasVec),
      temperature: temp,
      stickiness,
      allowExploration,
      debug: {
        reward: r,
        rewardDelta,
        confidence,
        allowSwitch,
        ctx,
        intent,
        effectiveIntent,
        baseBias: base,
      },
    };

    // Deterministic lock when same prompt repeated or alignment good
    if (telemetry.couplingError !== undefined && telemetry.couplingError < 0.18) {
      ctrl.temperature = 0.22;
      ctrl.stickiness = 0.9;
    }

    // NaN Guards
    if (!Number.isFinite(ctrl.temperature)) ctrl.temperature = 1.0;
    Object.keys(ctrl.logitBias).forEach(k => {
      if (!Number.isFinite(ctrl.logitBias[k as Regime])) ctrl.logitBias[k as Regime] = 0;
    });

    this.lastReward = r;
    this.lastWeights = effectiveIntent;

    return ctrl;
  }

  public learn(
    ctx: ContextFeatures,
    usedWeights: Record<Regime, number>,
    telemetry: Telemetry
  ) {
    const w: Vector3 = [usedWeights.alpha, usedWeights.beta, usedWeights.gamma];
    const r = computeReward(telemetry);

    this.trace = [
      this.cfg.traceDecay * this.trace[0] + (1 - this.cfg.traceDecay) * w[0],
      this.cfg.traceDecay * this.trace[1] + (1 - this.cfg.traceDecay) * w[1],
      this.cfg.traceDecay * this.trace[2] + (1 - this.cfg.traceDecay) * w[2],
    ];

    const gradSign = clamp(r, -1, 1);

    this.episodeBias = [
      clamp(this.episodeBias[0] + this.cfg.etaFast * gradSign * (this.trace[0] - 1 / 3), -this.cfg.maxBias, this.cfg.maxBias),
      clamp(this.episodeBias[1] + this.cfg.etaFast * gradSign * (this.trace[1] - 1 / 3), -this.cfg.maxBias, this.cfg.maxBias),
      clamp(this.episodeBias[2] + this.cfg.etaFast * gradSign * (this.trace[2] - 1 / 3), -this.cfg.maxBias, this.cfg.maxBias),
    ];

    const key = ctx.taskClass ?? "unclassified";
    const tb = this.traitBias[key];
    this.traitBias[key] = [
      clamp(tb[0] + this.cfg.etaSlow * gradSign * (this.trace[0] - 1 / 3), -this.cfg.maxBias, this.cfg.maxBias),
      clamp(tb[1] + this.cfg.etaSlow * gradSign * (this.trace[1] - 1 / 3), -this.cfg.maxBias, this.cfg.maxBias),
      clamp(tb[2] + this.cfg.etaSlow * gradSign * (this.trace[2] - 1 / 3), -this.cfg.maxBias, this.cfg.maxBias),
    ];

    if (r < -0.4) {
      this.episodeBias = [this.episodeBias[0] * 0.65, this.episodeBias[1] * 0.65, this.episodeBias[2] * 0.65];
    }
  }

  private intentFromHints(ctx: ContextFeatures): Vector3 {
    const a = clamp(ctx.dirHint, 0, 1);
    const b = clamp(ctx.qHint, 0, 1);
    const g = clamp(ctx.mixHint, 0, 1);
    const eps = 0.06;
    const s = a + b + g + 3 * eps;
    return [(a + eps) / s, (b + eps) / s, (g + eps) / s];
  }

  private confidenceFromScores(scores: Record<Regime, number>): number {
    const v = toVec(scores);
    const sorted = [...v].sort((x, y) => y - x);
    const margin = sorted[0] - sorted[1];
    return clamp(1 - Math.exp(-0.35 * margin), 0, 1);
  }

  private temperatureFrom(confidence: number, rewardDelta: number): number {
    const sharpen = 0.55 * confidence + 0.25 * clamp(rewardDelta, -1, 1);
    const t = this.cfg.Tmax - (this.cfg.Tmax - this.cfg.Tmin) * clamp(sharpen, 0, 1);
    return clamp(t, this.cfg.Tmin, this.cfg.Tmax);
  }

  private scaleBias(intent: Vector3, base: Vector3): Vector3 {
    const centered: Vector3 = [
      intent[0] - 1 / 3,
      intent[1] - 1 / 3,
      intent[2] - 1 / 3,
    ];
    const k = 2.0;
    const raw: Vector3 = [
      base[0] + k * centered[0],
      base[1] + k * centered[1],
      base[2] + k * centered[2],
    ];
    return [
      clamp(raw[0], -this.cfg.maxBias, this.cfg.maxBias),
      clamp(raw[1], -this.cfg.maxBias, this.cfg.maxBias),
      clamp(raw[2], -this.cfg.maxBias, this.cfg.maxBias),
    ];
  }
}

export function applyAttractorControl(
  rawScores: Record<Regime, number>,
  ctrl: AttractorControlOutput
): { weights: Record<Regime, number>; weightsVec: Vector3 } {
  const logits: Vector3 = [
    rawScores.alpha + ctrl.logitBias.alpha,
    rawScores.beta + ctrl.logitBias.beta,
    rawScores.gamma + ctrl.logitBias.gamma,
  ];
  const w = softmax3(logits, ctrl.temperature);
  return { weights: toRec(w), weightsVec: w };
}
