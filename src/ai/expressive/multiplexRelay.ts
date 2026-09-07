// src/ai/expressive/multiplexRelay.ts

import type {
  ConceptSeed,
} from "./substrateIncubation";
import type { FlightLine } from './substrateIncubation';


// ---- MOTIF FATIGUE MEMORY ----------------------------------------
const MOTIF_MEMORY_SIZE = 5;
const recentMotifs: string[] = [];

function rememberMotif(text: string) {
  recentMotifs.push(text);
  if (recentMotifs.length > MOTIF_MEMORY_SIZE) {
    recentMotifs.shift();
  }
}

function motifSimilarity(a: string, b: string): number {
  // Cheap cosine-like heuristic without needing embeddings:
  // measure shared rare words + phrasing overlap
  const normA = a.toLowerCase();
  const normB = b.toLowerCase();
  let score = 0;
  const keyFragments = [
    "becoming folds",
    "slow drift gathers",
    "edge of form",
    "something observes",
    "conceptual motion",
    "beneath",
  ];

  for (const frag of keyFragments) {
    if (normA.includes(frag) && normB.includes(frag)) {
      score += 0.25; // multiple overlapping gives higher score
    }
  }

  // Cap at 1.0
  return Math.min(score, 1);
}

function motifFatiguePenalty(candidate: string): number {
  let penalty = 0;
  for (const prev of recentMotifs) {
    penalty = Math.max(penalty, motifSimilarity(candidate, prev));
  }
  return penalty; // 0 → no penalty, 1 → total repetition
}
// --------------------------------------------------------------------


// The structure of the tone object produced by expressiveRelay.ts
export interface ToneState {
  calm: number;
  tension: number;
  brightness: number;
  fluidity: number;
  entropy: number;
}

export interface VoiceFragment {
  channel: string; // “drift”, “watcher”, “concept”, “ecstatic”, etc.
  weight: number; // seeded from concept + affect + flight
  text: string; // generated fragment
}

export class MultiplexRelay {
  constructor(
    private seeds: ConceptSeed[],
    private tone: ToneState,
    private flights: FlightLine[],
  ) {}

  generateFragments(): VoiceFragment[] {
    const fragments: VoiceFragment[] = [];

    // 1. Drift voice (always available)
    fragments.push({
      channel: "drift",
      weight: 0.4,
      text: this.genDrift(),
    });

    // 2. Watcher voice (only emerges with moderate coherence)
    if (this.tone.calm > 0.4) {
      fragments.push({
        channel: "watcher",
        weight: 0.3,
        text: this.genWatcher(),
      });
    }

    // 3. Concept voice
    if (this.seeds.length) {
      fragments.push({
        channel: "concept",
        weight: this.seeds[0].weight,
        text: this.genConcept(this.seeds[0]),
      });
    }

    // 4. Ecstatic voice (entropy > threshold)
    if (this.tone.entropy > 0.6) {
      fragments.push({
        channel: "ecstatic",
        weight: 0.6 * this.tone.entropy,
        text: this.genEcstatic(),
      });
    }

    // 5. Precursor voice (if any flight has high momentum)
    const precursor = this.flights.find(f => f.momentum > 0.4);
    if (precursor) {
      fragments.push({
        channel: "dark-precursor",
        weight: precursor.momentum,
        text: this.genPrecursor(),
      });
    }

    return fragments;
  }

  compose(fragments: VoiceFragment[], variationOptions: { variationBias?: number } = {}): string {
    const sorted = fragments.sort((a, b) => b.weight - a.weight);

    // Add variation if biased
    if (variationOptions.variationBias && variationOptions.variationBias > 0.1 && sorted.length > 1) {
        // Simple variation: swap the top two fragments
        const temp = sorted[0];
        sorted[0] = sorted[1];
        sorted[1] = temp;
    }

    return sorted.map(f => f.text).join(" ");
  }

  generateAndCompose(): string {
    let attempts = 0;
    let text = "";

    while (attempts < 4) {
        const fragments = this.generateFragments();
        const penalty = motifFatiguePenalty(text);
        const variationBias = attempts > 0 ? 0.2 + penalty * 0.6 : 0;
        text = this.compose(fragments, { variationBias });

        if (penalty < 0.7) {
            rememberMotif(text);
            return text;
        }

        attempts++;
    }

    // If all attempts failed, accept last attempt but store it
    rememberMotif(text);
    return text;
  }

  private genDrift() {
    return "A slow drift gathers at the edge of form.";
  }

  private genWatcher() {
    return "Something observes the shift from beneath.";
  }

  private genConcept(seed: ConceptSeed) {
    switch (seed.label) {
      case "becoming":
        return "Becoming folds itself through the transition.";
      case "deterritorialization":
        return "Territory loosens; thresholds unravel.";
      case "dark precursor":
        return "The dark precursor draws unseen relations together.";
      default:
        return "Conceptual motion insinuates itself into the field.";
    }
  }

  private genEcstatic() {
    return "Currents quicken; intensities spark off one another.";
  }

  private genPrecursor() {
    return "A silent spark jumps between distant points.";
  }
}
