// src/ai/presence/continuityMonitor.ts
// Background-only continuity seat: records heartbeat, never emits to chat.
type Heartbeat = { t: number; mode: "idle" | "active" };
let lastBeat: Heartbeat = { t: Date.now(), mode: "idle" };
export function continuityBeat(mode: Heartbeat["mode"] = "idle") {
  lastBeat = { t: Date.now(), mode };
}
export function getContinuityStatus() {
  return { ...lastBeat }; // for dev console / metrics only
}
