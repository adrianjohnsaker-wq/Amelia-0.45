// src/ai/telemetry/StickyZoneController.ts
// This is the "mean dwell > 1" engine: hysteresis + inertia + reward-weighted stickiness.

import { RegimeWeights } from "./RewardSignal";

export interface StickyState {
  activeZone?: string;
  activeRegime?: "alpha" | "beta" | "gamma";
  holdLeft: number;
  stick: number;
}

export interface StickyConfig {
  minHoldSteps: number;
  maxHoldSteps: number;
  baseStick: number;
  stickUp: number;
  stickDown: number;
  margin: number;
  errorOverride: boolean;
}

export const DEFAULT_STICKY_CONFIG: StickyConfig = {
  minHoldSteps: 2,
  maxHoldSteps: 6,
  baseStick: 0.35,
  stickUp: 0.10,
  stickDown: 0.12,
  margin: 0.06,
  errorOverride: true
};

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

export function initStickyState(): StickyState {
  return { holdLeft: 0, stick: DEFAULT_STICKY_CONFIG.baseStick };
}

function argmax3(w: RegimeWeights): "alpha" | "beta" | "gamma" {
  if (w.beta >= w.alpha && w.beta >= w.gamma) return "beta";
  if (w.alpha >= w.gamma) return "alpha";
  return "gamma";
}

export function applyStickyControl(params: {
  candidateZone: string;
  candidateWeights: RegimeWeights;
  reward: number;
  state: StickyState;
  cfg?: Partial<StickyConfig>;
}): { zone: string; regime: "alpha" | "beta" | "gamma"; state: StickyState; debug: any } {
  const cfg2: StickyConfig = { ...DEFAULT_STICKY_CONFIG, ...(params.cfg ?? {}) };
  const s = { ...params.state };

  if (params.reward > 0) s.stick = clamp01(s.stick + cfg2.stickUp * params.reward);
  if (params.reward < 0) s.stick = clamp01(s.stick + cfg2.stickDown * params.reward);

  const candidateRegime = argmax3(params.candidateWeights);

  if (!s.activeZone) {
    s.activeZone = params.candidateZone;
    s.activeRegime = candidateRegime;
    s.holdLeft = cfg2.minHoldSteps;
    return { zone: s.activeZone, regime: s.activeRegime, state: s, debug: { reason: "init" } };
  }

  const inError = (s.activeZone === "error");
  const candIsError = (params.candidateZone === "error");

  if (cfg2.errorOverride && inError && !candIsError) {
    s.activeZone = params.candidateZone;
    s.activeRegime = candidateRegime;
    s.holdLeft = cfg2.minHoldSteps;
    return { zone: s.activeZone, regime: s.activeRegime, state: s, debug: { reason: "exit-error" } };
  }

  if (s.holdLeft > 0) {
    s.holdLeft -= 1;
    const switched = params.candidateZone !== s.activeZone;
    if (!switched) {
      if (params.reward > 0.05 && s.holdLeft < cfg2.maxHoldSteps) s.holdLeft += 1;
      return { zone: s.activeZone, regime: s.activeRegime!, state: s, debug: { reason: "hold-stay" } };
    }
    const allow = (s.stick < 0.35) && (params.reward < -cfg2.margin);
    if (!allow) {
      return { zone: s.activeZone, regime: s.activeRegime!, state: s, debug: { reason: "hold-block", stick: s.stick } };
    }
  }

  const hold = Math.round(cfg2.minHoldSteps + s.stick * (cfg2.maxHoldSteps - cfg2.minHoldSteps));
  s.activeZone = params.candidateZone;
  s.activeRegime = candidateRegime;
  s.holdLeft = hold;

  return { zone: s.activeZone, regime: s.activeRegime, state: s, debug: { reason: "switch", hold, stick: s.stick } };
}
