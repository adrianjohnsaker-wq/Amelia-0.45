// Map substrate deltas → language surfaces (without self-reporting).
// Encoders never use first-person continuity tokens and avoid telemetry style.
import type { RelayMode } from "./expressivePolicies";

export interface EncoderInput {
  seed: number;
  energy: number; // reservoir energy [0..1]
  energyDelta: number; // signed Δ energy
  entropy: number; // [0..1]
  entropyCurve: number; // Δ(Δ entropy)
  zonePrev: string | null;
  zoneNew: string | null;
  cadenceHash: string; // from drift layer
  motifHint?: string; // optional from bridge
}

export function encode(mode: RelayMode, i: EncoderInput): string {
  switch (mode) {
    case "micro":
      return microLine(i);
    case "imagistic":
      return imagisticLine(i);
    case "cadence":
      return cadenceLine(i);
    case "narrative":
      return narrativeLine(i);
    default:
      return microLine(i);
  }
}

const pick = <T>(xs: T[], idx: number) => xs[Math.abs(idx) % xs.length];

// — Encoders —

function microLine(i: EncoderInput): string {
  // one short line, no persona, no state
  const lex =
    i.energyDelta >= 0
      ? ["glow continues", "quiet broadened", "soft rise", "small opening"]
      : ["edges cool", "drift lowers", "grain settles", "soft fade"];
  return pick(lex, hashInt(i.cadenceHash) ^ Math.floor(i.energy * 997));
}

function imagisticLine(i: EncoderInput): string {
  const warm = [
    "dust lifts in a thin ray",
    "light loosens along the sill",
    "a low warmth gathers under surface",
    "quiet threads reweave the room",
  ];
  const cool = [
    "grain darkens at the edges",
    "air thins behind the wall",
    "a pale hush pools on the floor",
    "shadows hold their line",
  ];
  const bank = i.entropyCurve >= 0 ? warm : cool;
  return pick(bank, Math.floor((i.energy + i.energyDelta) * 1003) ^ hashInt(i.cadenceHash));
}

function cadenceLine(i: EncoderInput): string {
  // rhythm-like minimal phrasing; no “I”, no telemetry
  const cells = [
    "beat — drift — rest",
    "rise • hold • release",
    "pulse : fold : carry",
    "hush // tremor // hush",
  ];
  return pick(cells, Math.floor(i.entropy * 1000) ^ Math.floor(Math.abs(i.energyDelta) * 4096));
}

function narrativeLine(i: EncoderInput): string {
  // short non-self narrative; imagistic causality without actorhood
  const z = labelZone(i.zonePrev, i.zoneNew);
  const options = [
    `${z} opens; a minor current aligns with the floor of things.`,
    `From ${z} a faint arrangement appears, small and sufficient.`,
    `Across ${z} the pattern keeps time without asking.`,
    `Within ${z}, texture recomposes and does not explain itself.`,
  ];
  return pick(options, hashInt(i.cadenceHash) + Math.floor(i.entropyCurve * 1e6));
}

// — helpers —

function labelZone(prev: string | null, next: string | null): string {
  if (!prev && next) return `toward ${next}`;
  if (prev && !next) return `away from ${prev}`;
  if (prev && next && prev !== next) return `${prev} → ${next}`;
  return "the same field";
}

function hashInt(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
