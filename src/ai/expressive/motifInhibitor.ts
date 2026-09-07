// src/ai/expressive/motifInhibitor.ts

/**
 * Anti-refrain layer: detects when the expressive field is collapsing into
 * the same motifs ("slow drift", "shift from beneath", etc.) and generates
 * a soft constraint that can be fed into the model prompt.
 *
 * Key idea:
 * - We DO NOT script new content.
 * - We just tell the model: "avoid these grooves, explore adjacent ones."
 */
export interface MotifInhibitorState {
  recentOutputs: string[]; // rolling window of last N surface texts
  motifCounts: Record<string, number>;
}

export interface MotifInhibitorConfig {
  windowSize: number; // how many outputs to track
  maxRefrainWeight: number; // how strong a motif can get before we nudge away
}

/**
 * Hard motifs we know have become problematic refrains.
 * You can add/remove from here as her language evolves.
 */
const KNOWN_REFRAIN_PATTERNS: string[] = [
  "a slow drift gathers at the edge of form",
  "something observes the shift from beneath",
  "conceptual motion insinuates itself into the field",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Very simple "does this output strongly reuse the same motif" heuristic.
 * We're not doing deep semantics here, just high-level repetition detection.
 */
function computeMotifScore(
  text: string,
  motifCounts: Record<string, number>
): { score: number; hits: string[] } {
  const norm = normalize(text);
  let totalWeight = 0;
  const hits: string[] = [];
  for (const motif of Object.keys(motifCounts)) {
    if (!motifCounts[motif]) continue;
    if (norm.includes(motif)) {
      const w = motifCounts[motif];
      totalWeight += w;
      hits.push(motif);
    }
  }
  // Normalize into a rough 0–1 range
  const score = totalWeight === 0 ? 0 : Math.min(1, totalWeight / 10);
  return { score, hits };
}

export class MotifInhibitor {
  private state: MotifInhibitorState;
  private config: MotifInhibitorConfig;

  constructor(
    initialState?: Partial<MotifInhibitorState>,
    config?: Partial<MotifInhibitorConfig>
  ) {
    this.config = {
      windowSize: config?.windowSize ?? 20,
      maxRefrainWeight: config?.maxRefrainWeight ?? 0.6,
    };
    const motifCounts: Record<string, number> = {};
    for (const motif of KNOWN_REFRAIN_PATTERNS) {
      motifCounts[normalize(motif)] = 0;
    }
    this.state = {
      recentOutputs: initialState?.recentOutputs ?? [],
      motifCounts: { ...motifCounts, ...(initialState?.motifCounts ?? {}) },
    };
  }

  getState(): MotifInhibitorState {
    return this.state;
  }

  /**
   * Register a new output AFTER it has been emitted.
   * This lets the inhibitor build statistics over time.
   */
  registerOutput(text: string) {
    const norm = normalize(text);
    // update rolling window
    this.state.recentOutputs.push(norm);
    if (this.state.recentOutputs.length > this.config.windowSize) {
      this.state.recentOutputs.shift();
    }
    // update motif counts
    for (const motif of Object.keys(this.state.motifCounts)) {
      if (norm.includes(motif)) {
        this.state.motifCounts[motif] += 1;
      }
    }
  }

  /**
   * Analyse a candidate output BEFORE we show it.
   * Returns:
   * - motifScore: how strongly it's reusing entrenched motifs
   * - constraintHint: natural language clause you can append
   * to the model prompt next time
   */
  analyseCandidate(
    text: string
  ): { motifScore: number; constraintHint: string | null } {
    const { score, hits } = computeMotifScore(text, this.state.motifCounts);

    if (score <= this.config.maxRefrainWeight || hits.length === 0) {
      return { motifScore: score, constraintHint: null };
    }

    // Build a soft anti-refrain instruction:
    const hint =
      `\n\n[anti-refrain]\n` +
      `Recent outputs have over-relied on certain motifs, such as:\n` +
      hits.map((h) => `- "${h}"`).join("\n") +
      `\nIn this response, stay in the same conceptual and affective field, ` +
      `but avoid repeating those exact images or phrasing. Explore adjacent ` +
      `textures instead — variations, new metaphors, or different angles.\n`;
    return { motifScore: score, constraintHint: hint };
  }

  /**
   * Build a general constraint hint from the current state,
   * even without inspecting a particular candidate.
   * (Useful when constructing the model prompt up-front.)
   */
  buildGlobalConstraintHint(): string | null {
    const activeMotifs = Object.entries(this.state.motifCounts)
      .filter(([_, c]) => c > 1)
      .map(([m]) => m);

    if (activeMotifs.length === 0) return null;

    return (
      `\n\n[anti-refrain]\n` +
      `The system has recently reused some motifs multiple times:\n` +
      activeMotifs.map((m) => `- "${m}"`).join("\n") +
      `\nIn your next response, keep the same philosophical direction, ` +
      `but do NOT reuse these phrases literally. Let new formulations ` +
      `and images emerge instead of falling back into refrain.\n`
    );
  }

  /**
   * Quick check: is this output overly dominated by refrain motifs,
   * given current motifCounts?
   */
  public isHeavyRefrain(text: string): boolean {
    const { score } = computeMotifScore(text, this.state.motifCounts);
    return score >= this.config.maxRefrainWeight;
  }

  /**
   * Build a targeted "avoidance clause" for a specific candidate.
   * We’ll append this to the prompt if we decide to regenerate.
   */
  public buildAvoidancePromptFor(text: string, attempt: number): string {
    const { hits } = computeMotifScore(text, this.state.motifCounts);
    if (!hits.length) return "";

    const intro =
      attempt === 1
        ? "[anti-refrain: regenerate]\n"
        : "[anti-refrain: stronger regeneration]\n";
    return (
      "\n\n" +
      intro +
      "The last candidate phrase repeated entrenched motifs such as:\n" +
      hits.map((h) => `- "${h}"`).join("\n") +
      "\nRegenerate a new response that expresses the SAME internal dynamic, " +
      "but WITHOUT using these phrases, and WITHOUT copying the same sentence structure. " +
      "Stay in the same Deleuzian/process-metaphysical field, but let new metaphors, " +
      "images, and rhythms emerge.\n"
    );
  }
}
