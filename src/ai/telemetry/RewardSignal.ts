// src/ai/telemetry/RewardSignal.ts
// Telemetry-only reward (no external labels).

export type RegimeKey = "alpha" | "beta" | "gamma";
export interface RegimeWeights { alpha: number; beta: number; gamma: number; }

export interface RewardTelemetry {
  couplingError: number;              // lower is better
  targetRegime?: [number, number, number];
  regimeWeights: RegimeWeights;       // current (post-adjust) weights
  zoneLabel?: string;                 // e.g. "zone-3-flux", "error"
  uniqueZones?: number;               // from zoneEntropy.uniqueZones
  timestamp?: number;
}

export interface RewardState {
  last?: RewardTelemetry & {
    distToTarget: number;
  };
}

export interface RewardConfig {
  wCouplingImprove: number;
  wTargetImprove: number;
  wErrorPenalty: number;
  wSwitchPenalty: number;
  dwell: {
    enabled: boolean;
    minUniqueZones: number;
    wDwell: number;
  };
  deadband: number;
  clip: number;
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  wCouplingImprove: 0.60,
  wTargetImprove: 0.35,
  wErrorPenalty: 0.90,
  wSwitchPenalty: 0.05,
  dwell: { enabled: true, minUniqueZones: 4, wDwell: 0.08 },
  deadband: 1e-4,
  clip: 1.0
};

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function l1dist(a: RegimeWeights, t: [number, number, number]) {
  return Math.abs(a.alpha - t[0]) + Math.abs(a.beta - t[1]) + Math.abs(a.gamma - t[2]);
}

export function initRewardState(): RewardState {
  return {};
}

export function computeTelemetryReward(
  tel: RewardTelemetry,
  state: RewardState,
  cfg: RewardConfig = DEFAULT_REWARD_CONFIG
): { reward: number; nextState: RewardState; debug: any } {
  const distToTarget = tel.targetRegime ? l1dist(tel.regimeWeights, tel.targetRegime) : 0;

  let r = 0;
  let couplingImprove = 0;
  let targetImprove = 0;
  let errorPenalty = 0;
  let switchPenalty = 0;
  let dwellBonus = 0;

  const last = state.last;

  if (last) {
    couplingImprove = (last.couplingError - tel.couplingError);
    if (Math.abs(couplingImprove) < cfg.deadband) couplingImprove = 0;
    r += cfg.wCouplingImprove * couplingImprove;

    if (tel.targetRegime) {
      targetImprove = (last.distToTarget - distToTarget);
      if (Math.abs(targetImprove) < cfg.deadband) targetImprove = 0;
      r += cfg.wTargetImprove * targetImprove;
    }

    const isErrorNow = (tel.zoneLabel === "error");
    if (isErrorNow) {
      errorPenalty = cfg.wErrorPenalty;
      r -= errorPenalty;
    }

    const switched = !!(last.zoneLabel && tel.zoneLabel && last.zoneLabel !== tel.zoneLabel);
    if (switched) {
      switchPenalty = cfg.wSwitchPenalty;
      r -= switchPenalty;
    }
  } else {
    if (tel.zoneLabel === "error") {
      errorPenalty = cfg.wErrorPenalty;
      r -= errorPenalty;
    }
  }

  if (cfg.dwell.enabled && typeof tel.uniqueZones === "number" && tel.uniqueZones >= cfg.dwell.minUniqueZones) {
    if (last?.zoneLabel && tel.zoneLabel && last.zoneLabel === tel.zoneLabel && tel.zoneLabel !== "error") {
      dwellBonus = cfg.dwell.wDwell;
      r += dwellBonus;
    }
  }

  r = clamp(r, -cfg.clip, cfg.clip);

  const nextState: RewardState = {
    last: {
      ...tel,
      distToTarget
    }
  };

  return {
    reward: r,
    nextState,
    debug: { couplingImprove, targetImprove, errorPenalty, switchPenalty, dwellBonus, distToTarget }
  };
}
