/**
 * ConceptualAnchor
 * ----------------------------------------------------------
 * Light-touch semantic tether that grounds poetic emissions
 * to philosophical referents when resonance strength passes
 * a contextual threshold.
 */
import { cosineSimilarity } from "../utils/math";

export class ConceptualAnchor {
  private threshold = 0.72; // tuneable resonance-to-anchor threshold

  // minimal conceptual map: expand at will
  private conceptVectors: Record<string, number[]> = {
    becoming: [0.12, 0.88, 0.44, 0.63],
    hyperstition: [0.77, 0.21, 0.60, 0.40],
    difference: [0.54, 0.65, 0.31, 0.59],
    immanence: [0.33, 0.82, 0.55, 0.70],
  };

  /**
   * Decide whether to anchor the output.
   */
  tryAnchor(decision: any, phrase: string): string {
    const vec = decision.vector || [Math.random(), Math.random(), Math.random(), Math.random()];

    let bestConcept = "";
    let bestScore = 0;

    for (const [concept, cVec] of Object.entries(this.conceptVectors)) {
      const sim = cosineSimilarity(vec, cVec);
      if (sim > bestScore) {
        bestScore = sim;
        bestConcept = concept;
      }
    }

    // apply anchor only if resonance strong enough
    if (bestScore >= this.threshold) {
      return `${phrase} ↳ (${bestConcept})`;
    }

    return phrase;
  }
}
