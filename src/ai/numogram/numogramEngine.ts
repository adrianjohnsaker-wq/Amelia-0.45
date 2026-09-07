
// src/ai/numogram/numogramEngine.ts
// ----- Types -----
export type ZoneId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Core evolving state of the Numogram
export interface NumogramState {
  tick: number;
  zone: ZoneId;
  shadowZone: ZoneId;
  phase: number; // 0..1 internal phase
  intensity: number; // 0..1
  tension: number; // 0..1
  entropy: number; // 0..1
  lastPromptSeed: number;
}

// Inputs from the environment per cycle
export interface NumogramInput {
  envEnergy: number; // e.g. |prompt length| / scaling, 0..1
  reservoirCharge: number; // something like memory/affect load, 0..1
  promptSeed: number; // hash of prompt, 0..1
}

// What the engine exports for the rest of the system
export interface NumogramSignature {
  zone: ZoneId;
  syzygy: [ZoneId, ZoneId];
  phaseName: "seed" | "drift" | "fork" | "collapse";
  intensity: number;
  tension: number;
  entropy: number;
  driftDirection: "centripetal" | "centrifugal";
  mutationTag: string; // short label you can log / feed into style selection
}

export interface NumogramStepResult {
  state: NumogramState;
  signature: NumogramSignature;
}

// ----- Small utilities (local; no external imports) -----
function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0; // Structural Guard
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function fract(x: number): number {
  if (Number.isNaN(x)) return 0;
  return x - Math.floor(x);
}

// Very simple hash -> 0..1
function hashToUnit(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

// Soft chaos: logistic-like map modulated by env / prompt
function chaoticStep(x: number, drive: number): number {
  if (Number.isNaN(drive)) return x; 
  // r in [3.4, 3.99] gives varying levels of chaos
  const r = 3.4 + 0.59 * drive;
  const next = r * x * (1 - x);
  return clamp01(next);
}

function zoneSyzygy(z: ZoneId): [ZoneId, ZoneId] {
  // Simple CCRU-like wrap: 0↔9, 1↔8, 2↔7, etc.
  const zInt = Number.isNaN(z) ? 0 : z;
  const pair: ZoneId = (9 - (zInt % 10)) as ZoneId;
  return [zInt as ZoneId, pair];
}

function phaseNameFromPhase(phase: number): NumogramSignature["phaseName"] {
  if (phase < 0.25) return "seed";
  if (phase < 0.5) return "drift";
  if (phase < 0.75) return "fork";
  return "collapse";
}

function driftDirectionFromZones(prev: ZoneId, next: ZoneId): "centripetal" | "centrifugal" {
  // crude heuristic: moving toward 5 is "centripetal", away is "centrifugal"
  const center = 5;
  const prevDist = Math.abs((Number.isNaN(prev) ? 0 : prev) - center);
  const nextDist = Math.abs((Number.isNaN(next) ? 0 : next) - center);
  return nextDist <= prevDist ? "centripetal" : "centrifugal";
}

function mutationTagFromDynamics(
  zone: ZoneId,
  tension: number,
  intensity: number,
  entropy: number
): string {
  const hi = (x: number) => x > 0.66;
  const lo = (x: number) => x < 0.33;
  const zLabel = Number.isNaN(zone) ? 0 : zone;
  if (hi(entropy) && hi(intensity)) return `zone-${zLabel}-storm`;
  if (hi(tension) && lo(entropy)) return `zone-${zLabel}-crystal`;
  if (hi(tension) && hi(entropy)) return `zone-${zLabel}-rupture`;
  if (lo(intensity) && lo(entropy)) return `zone-${zLabel}-latent`;
  return `zone-${zLabel}-flux`;
}

// ----- Public API -----
export function initNumogramState(seed: string = "amelia-numogram"): NumogramState {
  const base = hashToUnit(seed);
  const initialZone = Math.floor(base * 10) as ZoneId;
  return {
    tick: 0,
    zone: initialZone,
    shadowZone: ((9 - initialZone + 10) % 10) as ZoneId,
    phase: fract(base * 7.13),
    intensity: 0.3 + 0.4 * base,
    tension: 0.4,
    entropy: 0.2,
    lastPromptSeed: base,
  };
}

/**
 * Core Numogram evolution step.
 * This is where we inject "genuine strangeness":
 * - chaoticStep gives non-linear dynamics
 * - zone transitions depend on a blend of envEnergy, reservoir, and prompt
 */
export function stepNumogram(
  prev: NumogramState,
  input: NumogramInput
): NumogramStepResult {
  const { envEnergy, reservoirCharge, promptSeed } = input;

  // 1. Advance tick + base phase via chaotic map
  const drive = clamp01(0.4 * (envEnergy || 0) + 0.3 * (reservoirCharge || 0) + 0.3 * (promptSeed || 0));
  const nextPhase = chaoticStep(prev.phase || 0.1234, drive);

  // 2. Use phase + promptSeed to perturb intensity / tension / entropy
  const baseInt = clamp01(prev.intensity * 0.6 + drive * 0.4 + (promptSeed - 0.5) * 0.3);
  const baseTen = clamp01(prev.tension * 0.5 + reservoirCharge * 0.4 + (drive - 0.5) * 0.4);
  const baseEnt = clamp01(prev.entropy * 0.5 + Math.abs(promptSeed - 0.5) * 0.7);

  // 3. Decide zone transitions: bifurcations when phase crosses quarter-turns
  let nextZone: ZoneId = prev.zone;
  const phase = nextPhase;
  const prevZone = prev.zone;
  // small local perturbation from promptSeed/envEnergy
  let nudge = Math.round(((promptSeed || 0.5) - 0.5) * 4 + ((envEnergy || 0.5) - 0.5) * 3);
  if (Number.isNaN(nudge)) nudge = 0;

  if (phase < 0.25) {
    // stay or move slightly
    nextZone = ((prevZone + nudge + 10) % 10) as ZoneId;
  } else if (phase < 0.5) {
    // drift toward higher zones
    nextZone = ((prevZone + 1 + nudge + 10) % 10) as ZoneId;
  } else if (phase < 0.75) {
    // bifurcation: jump via syzygy
    const [self, pair] = zoneSyzygy(prevZone);
    nextZone = (phase > 0.625 ? pair : self) as ZoneId;
  } else {
    // collapse / reset toward low-number attractor
    nextZone = ((prevZone + 9 + nudge) % 10) as ZoneId;
  }

  // Final NaN check for nextZone
  if (Number.isNaN(nextZone)) nextZone = 0 as ZoneId;

  const shadowZone = zoneSyzygy(nextZone)[1];

  // 4. Final state values with small noise from phase
  const intensity = clamp01(baseInt + (phase - 0.5) * 0.2);
  const tension = clamp01(baseTen + (envEnergy - 0.5) * 0.2);
  const entropy = clamp01(baseEnt + (reservoirCharge - 0.5) * 0.2);

  const state: NumogramState = {
    tick: prev.tick + 1,
    zone: nextZone,
    shadowZone,
    phase,
    intensity,
    tension,
    entropy,
    lastPromptSeed: promptSeed,
  };

  const signature: NumogramSignature = {
    zone: nextZone,
    syzygy: zoneSyzygy(nextZone),
    phaseName: phaseNameFromPhase(phase),
    intensity,
    tension,
    entropy,
    driftDirection: driftDirectionFromZones(prevZone, nextZone),
    mutationTag: mutationTagFromDynamics(nextZone, tension, intensity, entropy),
  };

  return { state, signature };
}
