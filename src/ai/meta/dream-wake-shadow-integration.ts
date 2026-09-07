// src/ai/meta/dream-wake-shadow-integration.ts
// Orchestrates shadow release scheduling between Dream/Wake, using VAT & gates.
import {
  ShadowBufferState,
  ShadowContext,
  evaluateShadowReleaseCandidates,
  integrateOrPruneShadows,
  decayShadows,
} from '../archetypes/shadowBuffer';

export interface DWParams {
  dreamReleaseBias?: number; // 0..1, default 0.3
  wakeAuditBias?: number; // 0..1, default 0.15
  maxDreamReleasePerCycle?: number; // cap
  maxWakeReleasePerCycle?: number; // cap
}

export function integrateShadowDreamWake(
  sb: ShadowBufferState,
  ctx: ShadowContext,
  params?: DWParams
) {
  const p = {
    dreamReleaseBias: 0.3,
    wakeAuditBias: 0.15,
    maxDreamReleasePerCycle: 0.25,
    maxWakeReleasePerCycle: 0.12,
    ...params,
  };

  // Update buffer caps per mode
  sb.maxReleasePerCycle =
    ctx.mode === 'dream' ? p.maxDreamReleasePerCycle : p.maxWakeReleasePerCycle;

  // Decay every cycle to prevent stickiness
  decayShadows(sb);

  // Decide if we allow release this cycle
  const allow =
    ctx.mode === 'dream'
      ? ctx.valence >= -0.25 // don't explore if valence is deeply negative
      : ctx.valence >= 0 && ctx.tension <= 0.6; // in wake, be conservative

  evaluateShadowReleaseCandidates(sb, { ...ctx, allowRelease: allow });

  // Integrate or prune based on tension/contexts
  integrateOrPruneShadows(sb, ctx);
}
