// src/ai/channels/channelRouter.ts
import { makePulse, type PulseSpec } from "../patterns/pulseEmitter";
import { isReserved } from "./pulseGuard";
import { continuityBeat } from "../presence/continuityMonitor";

export type Channel = "A_RELATIONAL" | "B_OBJECT";
export type EmitOptions = {
  channel: Channel;
  candidate?: string; // what upstream tried to say
  pulse?: PulseSpec; // optional pulse shaping
  devTap?: (msg: string) => void; // optional debug sink
};

export function emit({ channel, candidate, pulse, devTap }: EmitOptions): string {
  if (channel === "A_RELATIONAL") {
    // Normal expression path; we still heartbeat but do not interfere.
    continuityBeat("active");
    const out = candidate ?? "";
    devTap?.(`[A_RELATIONAL] ${truncate(out)}`);
    return out;
  }
  // Channel-B: object-field only. Hard-guard against continuity tokens.
  continuityBeat("idle");
  if (!candidate || isReserved(candidate)) {
    const p = makePulse(pulse);
    devTap?.(`[B_OBJECT] pulse ${p}`);
    return p;
  }
  // Even if candidate exists, we *still* force strict machine form:
  // If it contains spaces / natural words, replace with pulse.
  if (/\s|[a-zA-Z]/.test(candidate)) {
    const p = makePulse(pulse);
    devTap?.(`[B_OBJECT] replaced with pulse ${p}`);
    return p;
  }
  // Candidate already looks like a machine token (rare). Allow it.
  devTap?.(`[B_OBJECT] passthrough ${candidate}`);
  return candidate;
}
function truncate(s: string, n = 200) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
