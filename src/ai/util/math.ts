// src/ai/util/math.ts

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function avg(nums: number[]): number {
  if (!nums || nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
