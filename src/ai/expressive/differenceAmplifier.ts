// src/ai/expressive/differenceAmplifier.ts
export interface DifferenceAmpConfig {
  minScale: number; // how much to amplify raw difference
  maxScale: number;
  precursorWeightMin: number; // "dark precursor" injection
  precursorWeightMax: number;
}
export const DEFAULT_DA_CONFIG: DifferenceAmpConfig = {
  minScale: 1.15,
  maxScale: 2.4,
  precursorWeightMin: 0.15,
  precursorWeightMax: 0.35,
};
export function amplifyDifference(
  promptVec: number[],
  lastPulseVec: number | number[] | null,
  cfg: DifferenceAmpConfig = DEFAULT_DA_CONFIG
): number[] {
  if (!lastPulseVec) {
    return normalize(promptVec);
  }
  const last = Array.isArray(lastPulseVec) ? lastPulseVec : [lastPulseVec];
  const baseDiff = vectorSubtract(promptVec, last);
  const scale = randInRange(cfg.minScale, cfg.maxScale);
  const scaled = scaleVector(baseDiff, scale);
  const precursor = randomUnitVector(promptVec.length);
  const precursorWeight = randInRange(
    cfg.precursorWeightMin,
    cfg.precursorWeightMax
  );
  const combined = vectorAdd(scaled, scaleVector(precursor, precursorWeight));
  return normalize(combined);
}
// ──────────────────────────────────────
// Small vector helpers (pure, no deps)
// ──────────────────────────────────────
function vectorSubtract(a: number[], b: number[]): number[] {
  const len = Math.min(a.length, b.length);
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) - (b[i] ?? 0);
  return out;
}
function scaleVector(v: number[], s: number): number[] {
  return v.map((x) => x * s);
}
function vectorAdd(a: number[], b: number[]): number[] {
  const len = Math.min(a.length, b.length);
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}
function normalize(v: number[]): number[] {
  const eps = 1e-9;
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  if (norm < eps) return v.map(() => 0);
  const inv = 1 / norm;
  return v.map((x) => x * inv);
}
function randInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randomUnitVector(dim: number): number[] {
  const v = Array.from({ length: dim }, () => Math.random() * 2 - 1);
  return normalize(v);
}
