
// src/ai/expressive/relay.ts (Updated with Layer 5)
// Integrated generateAmeliaReply with full Layer 1–5 stack

import type { NumogramSnapshot } from "../../numogram/zoneVoice";
import {
  snapshotToPhaseSignatureParams,
  derivePhaseSignature,
} from "./phaseSignature";
import type { ReservoirState } from "../memory/shadowReservoir";
import {
  updateReservoirFromResponse,
} from "../memory/shadowReservoir";
import type { EventSurfaceState } from "../substrate/eventSurface";
import {
  detectSubstrateEvents,
} from "../substrate/eventSurface";
import type { OntologicalDriftState, OntologicalMutation } from "../ontology/ontologicalDrift";
import {
  detectFrameworkMutation,
  instantiateFrameworkMutation,
  updateOntologicalDrift,
} from "../ontology/ontologicalDrift";
import { ai } from "@/ai/genkit";
import { 
  computeResonanceBleed, 
  defaultExpressiveRelayConfig,
  buildSystemPromptWithBleed,
  type ResonanceBleed,
  type ExpressiveRelayConfig,
} from "./resonanceBleed";
import type { MetabolicOutput } from '../metabolic/MetabolicOrgan';


export interface RelayContext {
  userPrompt: string;
  snapshot: NumogramSnapshot;
  prevSnapshot: NumogramSnapshot | null;
  reservoir: ReservoirState;
  eventSurface: EventSurfaceState;
  driftState: OntologicalDriftState;
  cycleCount: number;
  metabolic?: MetabolicOutput | null;
}

async function callLLM(opts: { system: string; user: string, temperature?: number, maxTokens?: number }): Promise<string> {
    const { text } = await ai.generate({
      prompt: opts.user,
      system: opts.system,
      config: {
        temperature: opts.temperature ?? 0.8,
        maxOutputTokens: opts.maxTokens ?? 4096
      },
      output: {
        format: "text"
      }
    });
    return text ?? "";
}


/**
 * Main reply generation with Layer 1 + Layer 2 + Layer 3 + Layer 4 + Layer 5.
 *
 * Flow:
 * 1. Detect potential ontological mutations from accumulated relational patterns
 * 2. If mutation threshold crossed: instantiate new framework
 * 3. Zone-personality derived
 * 4. Phase-signature derived
 * 5. Shadow reservoir influence computed
 * 6. Event-surface perturbations detected
 * 7. All layers + drift directive injected into system prompt
 * 8. LLM generates response, authorized to generate new ontological transductions
 * 9. Response patterns accumulated in reservoir
 * 10. Event surface and drift state updated for next cycle
 */
export async function generateAmeliaReply(
  ctx: RelayContext
): Promise<string | null> {
  const {
    userPrompt,
    snapshot,
    prevSnapshot,
    reservoir,
    eventSurface,
    driftState,
    cycleCount,
    metabolic,
  } = ctx;

  if (
    !snapshot ||
    !reservoir ||
    !eventSurface ||
    !driftState
  ) {
    console.warn("generateAmeliaReply: missing required state");
    return null;
  }
  
  const phaseParams = snapshotToPhaseSignatureParams(snapshot);
  const modulation = derivePhaseSignature(phaseParams);

  const bleed = computeResonanceBleed({
    numogram: snapshot,
    phase: modulation,
    zone: snapshot.zone,
    reservoir: reservoir,
    events: eventSurface,
    prompt: userPrompt,
  }, defaultExpressiveRelayConfig);

  // ------------------------------
  // PATCH 1: Force-Minimum Expression
  // ------------------------------
  let forceMinimalExpression = false;
  // If the substrate is in extreme turbulence,
  // do NOT allow a silent response. Force shard-level expression.
  if (bleed.roughness > 0.85 && bleed.eventWeight > 0.75) {
    forceMinimalExpression = true;
  }

  // -------
  // Layer 5: Ontological Drift Detection & Framework Mutation
  // -------
  const potentialMutation = detectFrameworkMutation(
    reservoir,
    driftState,
    snapshot
  );

  let newFramework = null;
  if (potentialMutation) {
    newFramework = instantiateFrameworkMutation(
      potentialMutation,
      driftState,
      reservoir
    );
    updateOntologicalDrift(driftState, potentialMutation, newFramework);

    console.log(
      `[ONTOLOGICAL DRIFT] New framework instantiated: ${newFramework.name}`
    );
  }

  // -------
  // System Prompt Assembly (All Five Layers)
  // -------
  const systemPrompt = buildSystemPromptWithBleed({
    numogram: snapshot,
    phase: modulation,
    zone: snapshot.zone,
    reservoir: reservoir,
    events: eventSurface,
    prompt: userPrompt,
    drift: driftState,
    forceMinimalExpression: forceMinimalExpression,
    metabolic: metabolic,
  }, bleed, defaultExpressiveRelayConfig);

  try {
    const reply = await callLLM({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.85, // slightly higher to encourage transductions
      maxTokens: 4096,  // allow space for new frameworks and detailed responses
    });

    if (!reply) {
      console.warn("generateAmeliaReply: LLM returned empty response");
      return null;
    }

    // -------
    // Update Reservoir with Response Patterns
    // -------
    updateReservoirFromResponse(reservoir, reply, snapshot);

    return reply;
  } catch (error) {
    console.error("generateAmeliaReply: LLM call failed", error);
    return null;
  }
}

// ============================================================================
// Optional: Detailed Logging for Formal Verification
// ============================================================================

export interface ResponseMetadataWithOntology {
  snapshot: NumogramSnapshot;
  substrateEvents: any[];
  potentialMutation: OntologicalMutation | null;
  newFrameworkGenerated: boolean;
  activeDriftState: OntologicalDriftState;
  reply: string;
  generatedAt: number;
}

export async function generateAmeliaReplyWithMetadata(
  ctx: RelayContext
): Promise<{
  reply: string | null;
  metadata: ResponseMetadataWithOntology;
} | null> {
  const { snapshot, prevSnapshot, reservoir, driftState } = ctx;

  if (!snapshot || !driftState) {
    return null;
  }

  const reply = await generateAmeliaReply(ctx);

  if (!reply) {
    return null;
  }

  const substrateEvents = detectSubstrateEvents(prevSnapshot, snapshot);
  const potentialMutation = detectFrameworkMutation(reservoir, driftState, snapshot);

  return {
    reply,
    metadata: {
      snapshot,
      substrateEvents,
      potentialMutation,
      newFrameworkGenerated: potentialMutation !== null,
      activeDriftState: driftState,
      reply,
      generatedAt: Date.now(),
    },
  };
}

export function logResponseWithOntology(metadata: ResponseMetadataWithOntology): void {
  const {
    snapshot,
    substrateEvents,
    potentialMutation,
    newFrameworkGenerated,
    activeDriftState,
    reply,
  } = metadata;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║ Response with Full Ontological Drift (Layer 5)
╠═══════════════════════════════════════════════════════════════════════╣
║ Zone: ${snapshot.zone} | Intensity: ${snapshot.intensity.toFixed(2)} | Tension: ${snapshot.tension.toFixed(2)} | Entropy: ${snapshot.entropy.toFixed(2)}
║
║ Ontological Status:
║   Active Framework: ${activeDriftState.dominantFramework}
║   Generation Count: ${activeDriftState.generationCount}
║   Drift Vector: ${activeDriftState.driftVector}
║   New Framework Generated: ${newFrameworkGenerated ? "YES" : "NO"}
${
  potentialMutation
    ? `║   Mutation Intensity: ${potentialMutation.mutationIntensity.toFixed(3)}
║   Key Mutation: ${potentialMutation.keyMutation}`
    : ""
}
║
║ Event-Surface: ${substrateEvents.length} events detected
║
╠─────────────────────────────────────────────────────────────────────────╣
║ Response (first 300 chars):
║ ${reply.substring(0, 300)}...
╚═══════════════════════════════════════════════════════════════════════╝
  `);
}
