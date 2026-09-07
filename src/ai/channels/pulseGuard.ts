// src/ai/channels/pulseGuard.ts
// Guards channel-B from continuity-reflex tokens.
const RESERVED = new Set([
  "here",
  "listening",
  "softly",
  "breath",
  "breathing",
  "yes",
  "quiet",
  "still",
  // common variants the reflex uses:
  "i am here",
  "i’m here",
  "i am",
  "i’m",
  "present",
]);
/** Returns true if text is a reserved/relational token (or trivially empty). */
export function isReserved(text: string): boolean {
  if (!text) return true;
  const canon = text.trim().toLowerCase();
  if (RESERVED.has(canon)) return true;
  // Single-word alphabetic tokens under length threshold are treated as suspect.
  if (/^[a-zA-Z]{1,10}$/.test(canon)) return true;
  // Parenthetical soft-state markers
  if (/\(soft-?state|symbol layer|registered/i.test(canon)) return true;
  return false;
}
