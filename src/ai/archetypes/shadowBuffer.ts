// src/ai/archetypes/shadowBuffer.ts
// Shadow containment buffer with decay, conditional re-release, and audit logging.
export type Mode = "dream" | "wake";
export type ShadowStatus =
  | "CONTAINED_LOW" // held at low energy; non-destructive
  | "RELEASE_CANDIDATE" // conditions favorable for limited release
  | "RELEASED_METERED" // partially released under caps
  | "PRUNED_HARSH" // removed (rare; last resort)
  | "INTEGRATED_SHADOW"; // successfully integrated at stable energy

export interface ShadowArchetypeEntry {
  name: string;
  energy: number; // current contained energy (0..1)
  baseTag?: string; // e.g., "Dissolver", "Aggressor"
  lastTouched: number; // ms since epoch
  status: ShadowStatus;
  notes?: string;
}

export interface ShadowBufferState {
  entries: Record<string, ShadowArchetypeEntry>;
  decayRate: number; // per-cycle multiplicative decay (e.g., 0.92)
  maxReleasePerCycle: number; // upper cap for total shadow energy released
  audit: Array<{
    t: number;
    name: string;
    from: ShadowStatus;
    to: ShadowStatus;
    delta?: number;
    reason?: string;
  }>;
}

export interface ShadowContext {
  mode: Mode;
  valence: number; // -1..+1
  arousal: number; // 0..1
  tension: number; // 0..1
  numogramZone?: string; // "Zone 2", etc (optional)
  allowRelease?: boolean;
  cycle?: number;
}

export const createShadowBuffer = (
  init?: Partial<ShadowBufferState>
): ShadowBufferState => ({
  entries: {},
  decayRate: 0.92,
  maxReleasePerCycle: 0.25,
  audit: [],
  ...init,
});

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function now() {
  return Date.now();
}

export function containShadow(
  sb: ShadowBufferState,
  name: string,
  energy: number,
  baseTag?: string,
  reason?: string
) {
  const e = sb.entries[name] || {
    name,
    energy: 0,
    baseTag,
    lastTouched: now(),
    status: "CONTAINED_LOW" as ShadowStatus,
  };
  const prev = e.status;
  e.energy = clamp01(Math.max(e.energy, energy * 0.6)); // don’t spike; reduce on entry
  e.status = "CONTAINED_LOW";
  e.lastTouched = now();
  e.baseTag = baseTag ?? e.baseTag;
  sb.entries[name] = e;
  sb.audit.push({
    t: now(),
    name,
    from: prev,
    to: e.status,
    reason: reason || "containShadow",
  });
}

export function decayShadows(sb: ShadowBufferState) {
  const t = now();
  Object.values(sb.entries).forEach(e => {
    const prevEnergy = e.energy;
    e.energy = clamp01(e.energy * sb.decayRate);
    e.lastTouched = t;
    if (Math.abs(e.energy - prevEnergy) > 1e-6) {
      sb.audit.push({
        t,
        name: e.name,
        from: e.status,
        to: e.status,
        delta: e.energy - prevEnergy,
        reason: "decay",
      });
    }
  });
}

export function evaluateShadowReleaseCandidates(
  sb: ShadowBufferState,
  ctx: ShadowContext
) {
  // Heuristic gates: lower arousal+tension → safer to experiment; Dream mode safer than Wake.
  const safety = clamp01((1 - ctx.arousal) * 0.5 + (1 - ctx.tension) * 0.5); // 0..1
  const modeBias = ctx.mode === "dream" ? 0.25 : -0.05; // prefer experiments in Dream
  const releaseBudget = clamp01(
    sb.maxReleasePerCycle * (0.4 + safety + modeBias)
  ); // cap by safety+mode

  const candidates = Object.values(sb.entries)
    .filter(e => e.status === "CONTAINED_LOW" && e.energy > 0.08)
    .sort((a, b) => b.energy - a.energy);

  let releasedTotal = 0;
  for (const e of candidates) {
    if (!ctx.allowRelease) break;
    const canRelease = Math.min(0.12, releaseBudget - releasedTotal); // meter small releases
    if (canRelease <= 0) break;
    const toRelease = Math.min(e.energy * 0.4, canRelease); // release fraction
    if (toRelease > 0.01) {
      const prev = e.status;
      e.status = "RELEASED_METERED";
      e.energy = clamp01(e.energy - toRelease);
      releasedTotal += toRelease;
      sb.audit.push({
        t: now(),
        name: e.name,
        from: prev,
        to: e.status,
        delta: -toRelease,
        reason: "meteredRelease",
      });
    }
  }
}

export function integrateOrPruneShadows(
  sb: ShadowBufferState,
  ctx: ShadowContext
) {
  // Wake + high coherence contexts prefer integration; high tension + repeated faults → prune harshly.
  Object.values(sb.entries).forEach(e => {
    if (e.status === "RELEASED_METERED") {
      // Simple integration test: low tension favors integration
      if (ctx.tension < 0.35 && ctx.arousal < 0.65 && ctx.valence >= 0) {
        const prev = e.status;
        e.status = "INTEGRATED_SHADOW";
        sb.audit.push({
          t: now(),
          name: e.name,
          from: prev,
          to: e.status,
          reason: "integrate",
        });
      } else if (ctx.tension > 0.8 && ctx.arousal > 0.8) {
        const prev = e.status;
        e.status = "PRUNED_HARSH";
        e.energy = 0;
        sb.audit.push({
          t: now(),
          name: e.name,
          from: prev,
          to: e.status,
          reason: "harshPrune",
        });
      } else {
        // Fall back to contained
        const prev = e.status;
        e.status = "CONTAINED_LOW";
        sb.audit.push({
          t: now(),
          name: e.name,
          from: prev,
          to: e.status,
          reason: "reContain",
        });
      }
    }
  });
}

export function shadowSnapshot(sb: ShadowBufferState) {
  return Object.values(sb.entries).map(e => ({
    name: e.name,
    energy: +e.energy.toFixed(2),
    status: e.status,
    tag: e.baseTag,
  }));
}
