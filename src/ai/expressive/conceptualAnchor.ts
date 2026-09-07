/**
 * ConceptualAnchor
 * ----------------------------------------------------------
 * Light-touch semantic tether that grounds poetic emissions
 * to philosophical referents when resonance strength passes
 * a contextual threshold.
 */
import { cosineSimilarity } from "../utils/math";

export interface DynamicSignature {
  coherence: number;
  avgNovelty: number;
  avgEnergy: number;
  flightCount: number;
  highMomentumFlights: number;
}
export interface ConceptSeed {
  label: string;
  weight: number;
  supportPulses: string[];
}

function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
}

export function extractConceptSeedsFromDynamics(
  signature: DynamicSignature,
  pulses: { id: string; novelty: number; energy: number }[]
): ConceptSeed[] {
  const seeds: ConceptSeed[] = [];
  const { coherence, avgNovelty, avgEnergy, flightCount, highMomentumFlights } =
    signature;
  // Behavior → label mappings (Deleuzian)
  if (avgNovelty > 0.6 && flightCount > 0) {
    seeds.push({
      label: "deterritorialization",
      weight: clamp01(avgNovelty + flightCount * 0.1),
      supportPulses: pulses.map((p) => p.id),
    });
  }
  if (avgEnergy > 0.5 && highMomentumFlights > 0) {
    seeds.push({
      label: "becoming",
      weight: clamp01(avgEnergy + highMomentumFlights * 0.1),
      supportPulses: pulses.map((p) => p.id),
    });
  }
  if (flightCount >= 2 && coherence > 0.4 && avgNovelty > 0.4) {
    seeds.push({
      label: "dark_precursor",
      weight: clamp01(coherence + avgNovelty * 0.5),
      supportPulses: pulses.map((p) => p.id),
    });
  }
  if (!seeds.length) {
    seeds.push({
      label: "ambient_field",
      weight: 0.3,
      supportPulses: pulses.map((p) => p.id),
    });
  }
  return seeds;
}
