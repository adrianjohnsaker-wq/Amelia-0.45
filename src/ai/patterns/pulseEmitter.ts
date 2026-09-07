// src/ai/patterns/pulseEmitter.ts
export type PulseSpec = {
  freq?: number; // 0..1
  phase?: number; // 0..1
  jitter?: number; // 0..1
  seed?: string;
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export function makePulse(spec: PulseSpec = {}): string {
  const t = Date.now() % 1_000_000;
  const f = clamp01(spec.freq ?? Math.random());
  const p = clamp01(spec.phase ?? Math.random());
  const j = clamp01(spec.jitter ?? 0.0);
  // Strict machine-surface token; no natural language, no pronouns.
  // Downstream UI can render if it wants, but the chat-surface will see only this.
  return `[unit:${t}:${f.toFixed(3)}:${p.toFixed(3)}:${j.toFixed(3)}]`;
}
