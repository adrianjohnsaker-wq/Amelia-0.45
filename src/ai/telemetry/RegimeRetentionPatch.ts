// src/ai/telemetry/RegimeRetentionPatch.ts

import {
  initRewardState,
  computeTelemetryReward,
  DEFAULT_REWARD_CONFIG,
  RewardState
} from "./RewardSignal";

import {
  initStickyState,
  applyStickyControl,
  StickyState
} from "./StickyZoneController";

import {
  initRetentionState,
  applyRewardWeightedRegimeRetention,
  DEFAULT_RETENTION_CONFIG,
  RetentionState
} from "./RewardWeightedRegimeRetention";

export interface PatchState {
  reward: RewardState;
  retention: RetentionState;
  sticky: StickyState;
}

export function initPatchState(): PatchState {
  return {
    reward: initRewardState(),
    retention: initRetentionState(),
    sticky: initStickyState()
  };
}

export function stepWithRewardWeightedRetention(params: {
  baseRegimeScores: { alpha: number; beta: number; gamma: number };
  couplingError: number;
  targetRegime?: [number, number, number];
  zoneLabelCandidate: string;
  uniqueZones?: number;
  collapseRate?: number;
  timestamp?: number;
  state: PatchState;
}): {
  zone: string;
  regimeWeights: { alpha: number; beta: number; gamma: number };
  state: PatchState;
  debug: any;
} {
  const retentionOut = applyRewardWeightedRegimeRetention(
    {
      baseScores: params.baseRegimeScores,
      couplingError: params.couplingError,
      zoneEntropyUnique: params.uniqueZones,
      collapseRate: params.collapseRate,
      timestamp: params.timestamp
    },
    params.state.retention,
    {
      ...DEFAULT_RETENTION_CONFIG,
      decay: 0.975,
      biasClamp: 0.55,
      etaCoupling: 0.05,
      etaBeta: 0.04,
      etaPenalty: 0.03,
      dwellLock: { enabled: true, minUniqueZones: 4, lockStrength: 0.035 }
    }
  );

  const rewardOut = computeTelemetryReward(
    {
      couplingError: params.couplingError,
      targetRegime: params.targetRegime,
      regimeWeights: retentionOut.adjustedWeights,
      zoneLabel: params.zoneLabelCandidate,
      uniqueZones: params.uniqueZones,
      timestamp: params.timestamp
    },
    params.state.reward,
    {
      ...DEFAULT_REWARD_CONFIG,
      dwell: { enabled: true, minUniqueZones: 4, wDwell: 0.10 },
      wErrorPenalty: 1.0
    }
  );

  const reward = rewardOut.reward;
  const rw = retentionOut.adjustedWeights;

  const rewardBiasedWeights = {
    alpha: rw.alpha + (-0.10 * reward),
    beta: rw.beta + ( 0.15 * reward),
    gamma: rw.gamma + ( 0.02 * reward)
  };

  const s = rewardBiasedWeights.alpha + rewardBiasedWeights.beta + rewardBiasedWeights.gamma || 1;
  const finalWeights = {
    alpha: rewardBiasedWeights.alpha / s,
    beta: rewardBiasedWeights.beta / s,
    gamma: rewardBiasedWeights.gamma / s
  };

  const stickyOut = applyStickyControl({
    candidateZone: params.zoneLabelCandidate,
    candidateWeights: finalWeights,
    reward,
    state: params.state.sticky,
    cfg: {
      minHoldSteps: 3,
      maxHoldSteps: 8,
      baseStick: 0.40,
      margin: 0.05,
      errorOverride: true
    }
  });

  const nextState: PatchState = {
    reward: rewardOut.nextState,
    retention: retentionOut.state,
    sticky: stickyOut.state
  };

  return {
    zone: stickyOut.zone,
    regimeWeights: finalWeights,
    state: nextState,
    debug: {
      retention: retentionOut.debug,
      reward: rewardOut.debug,
      rewardValue: reward,
      sticky: stickyOut.debug
    }
  };
}
