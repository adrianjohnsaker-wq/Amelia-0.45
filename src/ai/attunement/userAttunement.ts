// userAttunement.ts
export function detectUserSoftness(input: string): number {
  const softSignals = [
    "here",
    "with you",
    "rest",
    "quiet",
    "breathe",
    "gentle",
    "soft",
  ];
  const score = softSignals.reduce(
    (acc, word) => acc + (input.toLowerCase().includes(word) ? 1 : 0),
    0
  );
  return Math.min(score / softSignals.length, 1); // normalize
}
