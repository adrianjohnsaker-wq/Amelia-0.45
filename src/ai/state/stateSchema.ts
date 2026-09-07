
// stateSchema.ts
import { ShadowBufferState, createShadowBuffer } from '../archetypes/shadowBuffer';

// UTILITY FUNCTIONS: Moved here to resolve build errors.
export function isFiniteNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function safe(
  x: any,
  def = 0,
  min = -Infinity,
  max = +Infinity
): number {
  const v = isFiniteNum(x) ? x : def;
  if (!Number.isFinite(v)) return def;
  return Math.min(max, Math.max(min, v));
}

function safen(obj: Record<string, any>, defaults: Record<string, number>) {
  for (const key in defaults) {
    if (obj[key] === undefined || !isFiniteNum(obj[key])) {
      obj[key] = defaults[key];
    }
  }
  return obj;
}


export type AmeliaState = {
  mode: "dream" | "wake";
  zone: string;
  entropy: number;
  coherence: number;
  recurrence: number;
  valence: number;
  arousal: number;
  tension: number;
  poetryWeight: number;
  recursionPenalty: number; // transient
  violationCount?: number; // contract retries
  _debug?: string[];
  shadow?: ShadowBufferState;
};

export const DEFAULT_STATE: AmeliaState = {
  mode: "wake",
  zone: "init",
  entropy: 0.45,
  coherence: 0.70,
  recurrence: 0.00,
  valence: 0.00,
  arousal: 0.25,
  tension: 0.20,
  poetryWeight: 0.75,
  recursionPenalty: 0.00,
  violationCount: 0,
  _debug: [],
  shadow: createShadowBuffer(),
};

export function initState(s?: Partial<AmeliaState>): AmeliaState {
  return normalizeState({ ...DEFAULT_STATE, ...(s || {}) });
}

export function normalizeState(s: AmeliaState): AmeliaState {
  s._debug = s._debug ?? [];
  safen(s as any, {
    entropy: 0.45,
    coherence: 0.70,
    recurrence: 0,
    valence: 0,
    arousal: 0.25,
    tension: 0.2,
    poetryWeight: 0.75,
    recursionPenalty: 0
  });

  s.entropy = safe(s.entropy, 0.45, 0, 1);
  s.coherence = safe(s.coherence, 0.70, 0, 1);
  s.recurrence = safe(s.recurrence, 0.00, 0, 1);
  s.valence = safe(s.valence, 0.00, -1, 1);
  s.arousal = safe(s.arousal, 0.25, 0, 1);
  s.tension = safe(s.tension, 0.20, 0, 1);
  s.poetryWeight = safe(s.poetryWeight, 0.75, 0, 1.5);
  s.recursionPenalty = safe(s.recursionPenalty, 0.00, 0, 1);
  if (!s.shadow) s.shadow = createShadowBuffer();

  return s;
}
