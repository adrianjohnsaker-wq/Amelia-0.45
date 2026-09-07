// recurrenceAndEntropyModifiers.ts

// The safe function is moved here to resolve a persistent build error.
function isFiniteNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function safe(
  x: any,
  def = 0,
  min = -Infinity,
  max = +Infinity
): number {
  const v = isFiniteNum(x) ? x : def;
  if (!Number.isFinite(v)) return def;
  return Math.min(max, Math.max(min, v));
}


export function adjustForRecurrenceAndEntropy({
  recurrence,
  entropy,
  poetryWeight,
  recursionPenalty,
}: {
  recurrence: number;
  entropy: number;
  poetryWeight: number;
  recursionPenalty?: number;
}) {
  let pw = safe(poetryWeight, 0.75, 0, 1.5);
  // stronger recurrence suppression
  if (safe(recurrence, 0, 0, 1) > 0.32) pw *= 0.55;
  // entropy balance
  const e = safe(entropy, 0.5, 0, 1);
  if (e < 0.3) pw *= 1.2;
  if (e > 0.72) pw *= 0.66;
  // transient recursion penalty (sticky but decays per cycle)
  const rp = safe(recursionPenalty, 0, 0, 1);
  pw *= 1 - 0.4 * rp; // up to -40% when rp=1
  // micro-chaos only for high recurrence (bounded)
  const chaos = safe(recurrence, 0, 0, 1) > 0.3 ? Math.random() * 0.05 : 0;
  pw = safe(pw + chaos, 0.6, 0.3, 1.2);
  return pw;
}
