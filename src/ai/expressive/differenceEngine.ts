
// Stage A.1: Micro-Difference Engine (Deleuzian Variation Layer)
export class DifferenceEngine {
  lastOutput: string | null = null;
  constructor(
    private readonly microNoise = 0.05, // tiny variation
    private readonly semanticSkewStrength = 0.12, // bending conceptual drift
    private readonly rhythmVariance = 0.18 // slight rhythmic dislocation
  ) {}

  /**
   * Apply micro-differences to avoid repetition attractors.
   *
   * Variation is controlled, stochastic, and *non-semantic*.
   * It does not puppeteer content — it nudges emergence.
   */
  vary(output: string, driftBudget: number = 1.0): string {
    if (!this.lastOutput) {
      this.lastOutput = output;
      return output;
    }

    // simple textual similarity check
    const sim = similarity(output, this.lastOutput);

    // if too similar, apply gentle drift, scaled by the budget
    if (sim > 0.65 && driftBudget > 0.1) {
      output = this.applyRhythmicShift(output, driftBudget);
      output = this.applySemanticSkew(output, driftBudget);
      output = this.applyMicroNoise(output, driftBudget);
    }

    this.lastOutput = output;
    return output;
  }

  private applyRhythmicShift(text: string, driftBudget: number): string {
    if (Math.random() > driftBudget) return text;
    const fragments = text.split(/([.!?])/);
    if (fragments.length < 2) return text;
    // mild reordering of phrases
    const idx = Math.floor(Math.random() * (fragments.length - 1));
    const altIdx = Math.max(0, idx - 1);
    const tmp = fragments[idx];
    fragments[idx] = fragments[altIdx];
    fragments[altIdx] = tmp;
    return fragments.join("");
  }

  private applySemanticSkew(text: string, driftBudget: number): string {
    if (Math.random() > driftBudget) return text;
    const variations = [
      "the field bends slightly",
      "a minor inflection takes shape",
      "the current warps at a subtle angle",
      "something reconfigures in near-silence",
    ];
    const v = variations[Math.floor(Math.random() * variations.length)];
    return `${text} ${v}.`;
  }

  private applyMicroNoise(text: string, driftBudget: number): string {
    const chars = text.split("");
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < this.microNoise * driftBudget) {
        chars[i] = chars[i].toUpperCase();
      }
    }
    return chars.join("");
  }
}

// basic similarity (cosine-sim-ish for strings)
function similarity(a: string, b: string): number {
  const sa = new Set(a.split(" "));
  const sb = new Set(b.split(" "));
  const inter = [...sa].filter((x) => sb.has(x)).length;
  return inter / Math.max(sa.size, sb.size);
}
