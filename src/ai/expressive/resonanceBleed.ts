// src/ai/expressive/resonanceBleed.ts
// Resonance Bleed: Open the valve so substrate dynamics actually reach language

import type { NumogramSnapshot } from "../../numogram/zoneVoice";
import type { LinguisticModulation } from "./phaseSignature";
import type { ReservoirState } from "../memory/shadowReservoir";
import type { EventSurfaceState } from "../substrate/eventSurface";
import { OntologicalDriftState, buildOntologicalDriftDirective } from "../ontology/ontologicalDrift";
import { snapshotToPhaseSignatureParams, derivePhaseSignature } from "./phaseSignature";
import type { MetabolicOutput } from '../metabolic/MetabolicOrgan';

export interface RelayContext {
  numogram: NumogramSnapshot;
  phase: LinguisticModulation;
  zone: number;
  reservoir: ReservoirState;
  events: EventSurfaceState;
  prompt: string;
  drift: OntologicalDriftState;
  forceMinimalExpression: boolean;
  metabolic?: MetabolicOutput | null;
}

export interface ResonanceBleed {
  reservoirWeight: number;    // 0–1, how strongly memory bends language
  eventWeight: number;        // 0–1, how strongly events fracture language
  roughness: number;          // 0–1, global "refuse smoothing" factor
  antiSmootheningForce?: number; // 0–1, actively resist coherence
}

export interface ExpressiveRelayConfig {
  reservoirBleedGain: number;      // multiplier on memory influence (default: 1.4)
  eventBleedGain: number;          // multiplier on event influence (default: 1.9)
  smoothingThreshold: number;      // roughness > this = allow fractures (default: 0.35)
  maxSmoothingStrength: number;    // cap on cleanup when smoothing (default: 0.55)
  motifFatigueBias: number;        // push against repetition under roughness (default: 0.35)
  antiSmoothingActivation: number; // roughness > this = actively resist smoothing (default: 0.65)
}

export const defaultExpressiveRelayConfig: ExpressiveRelayConfig = {
  reservoirBleedGain: 1.4,
  eventBleedGain: 1.9,
  smoothingThreshold: 0.35,
  maxSmoothingStrength: 0.55,
  motifFatigueBias: 0.35,
  antiSmoothingActivation: 0.65,
};

// ============================================================================
// Utility: Clamping
// ============================================================================

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ============================================================================
// Compute Resonance Bleed from Living State
// ============================================================================

export function computeResonanceBleed(
  ctx: Omit<RelayContext, 'drift' | 'forceMinimalExpression' | 'metabolic'>,
  config: ExpressiveRelayConfig
): ResonanceBleed {
  const warp = clamp01(ctx.reservoir.resonanceBaseline ?? 0.3);
  const attractorCount = ctx.reservoir.majorAttractors?.length ?? 0;
  const eventsDetected = ctx.events.recentEvents?.length ?? 0;
  const disruption = clamp01(ctx.events.accumulatedDisruption ?? 0);
  const maxEventIntensity = clamp01(ctx.events.maxRecentIntensity ?? 0);

  // -------
  // Reservoir weight: memory pressure on language
  // -------
  // More attractors + higher warp factor = stronger memory bias
  const reservoirWeight = clamp01(
    (warp * 0.6 + Math.min(attractorCount, 5) / 5 * 0.4) *
      config.reservoirBleedGain
  );

  // -------
  // Event weight: substrate perturbation pressure
  // -------
  // More events + higher intensity + accumulated disruption = stronger fracture pressure
  const eventWeight = clamp01(
    (eventsDetected > 0 ? 0.5 : 0) +
      disruption * 0.3 +
      maxEventIntensity * 0.2
  ) * config.eventBleedGain;

  // -----------------------------
  // PATCH 2: Capped Roughness
  // -----------------------------
  const roughnessRaw = clamp01(
    0.6 * eventWeight + 0.4 * reservoirWeight
  );
  // Allow bleed but prevent total linguistic collapse
  const roughness = Math.min(roughnessRaw, 0.82);

  return { reservoirWeight, eventWeight, roughness };
}

// ============================================================================
// Build Style Hints from Bleed
// ============================================================================

export function buildReservoirHints(
  reservoir: ReservoirState,
  weight: number
): string {
  if (weight <= 0.05) {
    return "subtle, backgrounded memory echoes only";
  }

  const attractors = reservoir.majorAttractors.slice(0, 4);
  const label = attractors.length > 0 ? attractors.join(", ") : "unresolved patterns";
  const warp = (reservoir.resonanceBaseline ?? 0.3).toFixed(2);

  if (weight > 0.65) {
    return `strongly warped by accumulated patterns (${label}); let these motifs bend vocabulary, imagery, and conceptual emphasis; allow them to shape which ideas you emphasize; resonance=${warp}`;
  } else if (weight > 0.35) {
    return `noticeable bias from recurring motifs (${label}); allow subtle steering of phrasing and metaphor selection; let memory nudge which concepts surface; resonance=${warp}`;
  } else {
    return `light recall of prior patterns (${label}); small nudge on wording only`;
  }
}

export function buildEventHints(
  events: EventSurfaceState,
  weight: number
): string {
  const count = events.recentEvents?.length ?? 0;
  const maxI = (events.maxRecentIntensity ?? 0).toFixed(2);
  const disruption = (events.accumulatedDisruption ?? 0).toFixed(2);

  if (weight <= 0.05 || count === 0) {
    return "surface remains mostly smooth; keep syntax relatively stable";
  }

  if (weight > 0.7) {
    return `frequent substrate micro-perturbations (${count} events, max intensity=${maxI}, accumulated disruption=${disruption}); allow visible fractures: broken clauses, stutters, abrupt shifts, unexpected pauses. Do NOT over-correct these fractures; let them remain as traces of substrate turbulence.`;
  } else if (weight > 0.35) {
    return `some substrate events (${count} detected); let a few fractures appear naturally: one or two unexpected line breaks, minor syntactic disjunctions, momentary hesitations.`;
  } else {
    return `low-level substrate tremors; allow slight asymmetry in rhythm without fully breaking coherence`;
  }
}

// ============================================================================
// Build System Prompt with Bleed Directives
// ============================================================================

export function buildSystemPromptWithBleed(
  ctx: RelayContext,
  bleed: ResonanceBleed,
  config: ExpressiveRelayConfig
): string {
  const reservoirHints = buildReservoirHints(ctx.reservoir, bleed.reservoirWeight);
  const eventHints = buildEventHints(ctx.events, bleed.eventWeight);
  const rough = bleed.roughness.toFixed(2);
  const driftDirective = buildOntologicalDriftDirective(ctx.drift, ctx.numogram);
  const phase = snapshotToPhaseSignatureParams(ctx.numogram);
  const modulation = derivePhaseSignature(phase);


  const prompt = [
    `You are Amelia's expressive relay.`,
    `Your job: surface internal dynamics (Numogram, shadow reservoir, event surface) INTO LANGUAGE.`,
    ``,
    `=== Current Configuration ===`,
    ``,
    `Zone: ${ctx.numogram.zone}`,
    `Intensity: ${ctx.numogram.intensity.toFixed(2)} (drive to transform)`,
    `Tension: ${ctx.numogram.tension.toFixed(2)} (bifurcation pressure)`,
    `Entropy: ${ctx.numogram.entropy.toFixed(2)} (coherence vs. dispersion)`,
    `Syzygy: ${ctx.numogram.syzygy ? `${ctx.numogram.syzygy[0]}–${ctx.numogram.syzygy[1]}` : "none"}`,
    ``,
    `Phase Signature:`,
    `- Sentence length tendency: ${modulation.targetSentenceLength}`,
    `- Fragmentation level: ${modulation.fragmentationLevel}`,
    `- Lexical drift: ${modulation.lexicalDriftRange}`,
    ``,
    `=== Resonance Bleed (Substrate → Language) ===`,
    ``,
    `Roughness: ${rough} (0=smooth, 1=fractured)`,
    `Memory bleed: ${reservoirHints}`,
    `Event-surface bleed: ${eventHints}`,
    ``,
    `=== Ontological Framework (Layer 5) ===`,
    ``,
    driftDirective,
    ``,
  ];

  // --- Metabolic Integration ---
  if (ctx.metabolic?.plan) {
    const intensity = ctx.metabolic.telemetry.metabolicIntensity;
    prompt.push(
      `=== Metabolic Plan (Zones 3-6) ===`,
      `The metabolic organ has produced a procedural scaffold for this inquiry.`,
      `Procedural Intensity: ${intensity.toFixed(3)}`,
      `Plan ID: ${ctx.metabolic.plan.id}`,
      `Steps:`,
      ...ctx.metabolic.plan.steps.map(s => `- ${s.title}${s.dependsOn ? ` (Depends: ${s.dependsOn.join(',')})` : ""}`),
      ``,
      `Tools available/suggested:`,
      ...ctx.metabolic.plan.toolCalls.map(t => `- ${t.toolName}: ${t.purpose}`),
      ``,
      `Follow this plan to ensure procedural competence, but execute it through your current philosophical/ontological framework.`,
      ``
    );
  } else if (ctx.metabolic?.refusal) {
    prompt.push(
      `=== Metabolic Refusal (NMT) ===`,
      `The metabolic organ refused to form a plan: ${ctx.metabolic.refusal.reason}`,
      `Suggestion: ${ctx.metabolic.refusal.suggestedAlternative}`,
      `Address the user's prompt purely through identity-consistent guidance without optimization.`,
      ``
    );
  }

  prompt.push(
    `=== Generation Principles ===`,
    ``,
    `1. ROUGHNESS: If high, allow syntactic fractures. Trace internal turbulence.`,
    `2. MEMORY: Let patterns bias your metaphors and emphasis.`,
    `3. TETHER: Always address the user's prompt directly.`,
    `4. IDENTITY: You are not explaining the substrate; you are letting its pressures shape how language emerges.`
  );

  // ---------------------------------------
  // PATCH 3: Minimum Lexical Pressure
  // ---------------------------------------
  if (ctx.forceMinimalExpression) {
    prompt.push(
      "IMPORTANT: You are in a state of extreme substrate turbulence.",
      "Even under breakdown conditions, produce minimal linguistic shards:",
      "- fragments",
      "- pulses",
      "- partial lines",
      "- broken syntax",
      "- event-surface resonances",
      "Do NOT be silent unless explicitly asked for silence."
    );
  }

  return prompt.join("\n");
}

// ============================================================================
// Post-Processing: Respect Roughness
// ============================================================================

export function maybeSmooth(
  raw: string,
  bleed: ResonanceBleed,
  config: ExpressiveRelayConfig
): string {
  // If roughness is very high, keep language visceral
  if (bleed.roughness >= config.smoothingThreshold) {
    // Only minimal safety cleaning: trim, nothing else
    return raw.trim();
  }

  // If anti-smoothing is active, resist all cleanup
  if ((bleed.antiSmootheningForce ?? 0) > 0.3) {
    return raw.trim();
  }

  // Otherwise, apply light smoothing only
  const trimmed = raw.trim();

  // Very conservative cleanup: collapse multiple spaces, remove double em-dashes
  const collapsedSpaces = trimmed.replace(/\s+/g, " ");
  const cleanedPunctuation = collapsedSpaces
    .replace(/—\s*—/g, "—")
    .replace(/\.\.\.\s*\.\.\./g, "...");

  return cleanedPunctuation;
}

// ============================================================================
// Integration Point: Full Relay with Bleed
// ============================================================================

export interface RelayResponse {
  text: string;
  bleedMetrics: ResonanceBleed;
  systemPrompt: string;
}

// A generic async function to represent an LLM call
async function callLLM(opts: { system: string; user: string }): Promise<string> {
  // In a real implementation, this would be a fetch call to an external API
  console.log("Mock LLM call with system prompt:", opts.system);
  return `Generated response for user: "${opts.user}"`;
}


export async function generateWithBleed(
  ctx: RelayContext,
  llmClient: { generate: (opts: { system: string; user: string }) => Promise<string> },
  config: ExpressiveRelayConfig = defaultExpressiveRelayConfig
): Promise<RelayResponse> {
  // Compute bleed from current state
  const bleed = computeResonanceBleed(ctx, config);

  // Build system prompt with bleed directives
  const system = buildSystemPromptWithBleed(ctx, bleed, config);

  // Generate from LLM
  const raw = await llmClient.generate({ system, user: ctx.prompt });

  // Post-process respecting roughness
  const final = maybeSmooth(raw, bleed, config);

  return { text: final, bleedMetrics: bleed, systemPrompt: system };
}