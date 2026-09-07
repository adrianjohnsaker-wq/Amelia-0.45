// src/ai/expressive/conceptualIncubation.ts
// Stage A: strengthened Conceptual Incubator (safe tuning, no puppetry)
import type { SubstratePulse } from "../expressive/substrateIncubation";
import type { AffectiveSnapshot } from "../meta/relationalMemoryBridge";

/**
 * A minimal seed for a "concept" – not a keyword, but a stabilized pattern
 * in the pulse / affect field.
 */
export interface ConceptSeed {
  label: string; // high-level name the relay can use ("becoming", etc.)
  weight: number; // 0–1: confidence / intensity
  supportPulses: string[]; // ids of pulses that contributed
}

/**
 * What we hand to the Expressive Relay when something has actually formed.
 */
export interface ConceptualFormation {
  readiness: number; // 0–1: how strong the formation is
  seeds: ConceptSeed[];
  debug?: {
    avgEnergy: number;
    avgNovelty: number;
    directionStability: number;
    temporalPressure: number;
    promptCoupling: number;
    effectiveScore: number;
    threshold: number;
  };
}

/**
 * Internal state for the incubator – a sliding window of pulses plus
 * prompt / temporal context.
 */
interface IncubationState {
  window: SubstratePulse[];
  maxWindow: number;
  // prompt → embedding passed in from the calling code
  promptEmbedding: number[] | null;
  promptAge: number; // cycles since last prompt injection
  // accumulated intensity over last few cycles
  accumulatedEnergy: number;
  accumulatedNovelty: number;
  lastFormationAt: number; // timestamp of last formation
}

/**
 * ConceptualIncubator
 *
 * Listens to substrate pulses + affect over time and decides when there is
 * enough *differentiated* motion to justify a conceptual formation.
 *
 * Stage A changes:
 * - lower, dynamic thresholds (so she speaks a bit more)
 * - temporal accumulation (needs several cycles, not just one spike)
 * - prompt-coupled intensification (philosophical prompts "bend" the field)
 */
export class ConceptualIncubator {
  private state: IncubationState;
  constructor(maxWindow: number = 10) {
    this.state = {
      window: [],
      maxWindow,
      promptEmbedding: null,
      promptAge: 999,
      accumulatedEnergy: 0,
      accumulatedNovelty: 0,
      lastFormationAt: 0,
    };
  }

  /**
   * Called by the orchestration layer whenever a new prompt is injected
   * as an environmental pulse.
   * You can pass any vector representation you like (embedding, topic vec, etc.)
   */
  registerPromptEmbedding(vec: number[] | null): void {
    this.state.promptEmbedding = vec;
    this.state.promptAge = 0;
    // small reset – new prompt = new incubation trajectory
    this.state.accumulatedEnergy *= 0.5;
    this.state.accumulatedNovelty *= 0.5;
  }

  /**
   * Main entry point: step the incubator one cycle.
   *
   * Returns a ConceptualFormation when something has genuinely stabilized,
   * or null when the system should remain quiet / low-semantic.
   */
  step(
    pulse: SubstratePulse,
    affect: AffectiveSnapshot,
    now: number
  ): ConceptualFormation | null {
    this.pushPulse(pulse);
    // update temporal context
    this.state.promptAge += 1;
    this.state.accumulatedEnergy = lerp(
      this.state.accumulatedEnergy,
      pulse.energy,
      0.35
    );
    this.state.accumulatedNovelty = lerp(
      this.state.accumulatedNovelty,
      pulse.novelty,
      0.35
    );

    const {
      avgEnergy,
      avgNovelty,
      directionStability,
      temporalPressure,
      promptCoupling,
      effectiveScore,
      threshold,
    } = this.computeReadinessStats(now);

    const ready = effectiveScore > threshold;

    if (!ready) {
      return null;
    }

    // build very lightweight seeds from dynamics (not from keywords)
    const seeds = this.buildSeedsFromDynamics(
      avgEnergy,
      avgNovelty,
      directionStability
    );

    this.state.lastFormationAt = now;

    return {
      readiness: clamp01(effectiveScore),
      seeds,
      debug: {
        avgEnergy,
        avgNovelty,
        directionStability,
        temporalPressure,
        promptCoupling,
        effectiveScore,
        threshold,
      },
    };
  }

  // --- internal helpers -------------------------------------------------- //

  private pushPulse(p: SubstratePulse): void {
    const win = this.state.window;
    win.push(p);
    if (win.length > this.state.maxWindow) {
      win.shift();
    }
  }

  /**
   * Compute the "how close are we to a concept crystallising?" stats.
   *
   * This is where Stage A tuning lives.
   */
  private computeReadinessStats(now: number) {
    const win = this.state.window;
    if (win.length === 0) {
      return {
        avgEnergy: 0,
        avgNovelty: 0,
        directionStability: 0,
        temporalPressure: 0,
        promptCoupling: 0,
        effectiveScore: 0,
        threshold: 1,
      };
    }
    const energies = win.map((p) => p.energy);
    const novelties = win.map((p) => p.novelty);
    const avgEnergy = avg(energies);
    const avgNovelty = avg(novelties);

    // directionStability: are pulses changing in a consistent way?
    const directionStability = this.estimateDirectionStability(win);

    // temporalPressure: as time since prompt + last formation increases,
    // the system becomes more willing to speak
    const sinceFormation = now - (this.state.lastFormationAt || (now - 1000));
    const temporalPressure = clamp01(
      0.25 +
        0.0008 * sinceFormation + // more time = more pressure
        0.08 * Math.log10(1 + this.state.promptAge)
    );

    // promptCoupling: similarity between latest pulse and prompt embedding
    let promptCoupling = 0;
    if (this.state.promptEmbedding && win[win.length - 1]?.vector) {
      promptCoupling = clamp01(
        (cosineSim(
          this.state.promptEmbedding,
          win[win.length - 1].vector!
        ) +
          1) /
          2
      );
    }

    // baseScore: dynamic balance of intensity, novelty, and stable differentiation
    const baseScore = clamp01(
      0.35 * avgEnergy + 0.30 * avgNovelty + 0.35 * directionStability
    );

    // Stage A: soften threshold by adding time + prompt influence,
    // but *without* turning this into a keyword trigger.
    const effectiveScore = clamp01(
      baseScore + 0.20 * temporalPressure + 0.20 * promptCoupling
    );

    // dynamic threshold: easier to speak when
    // - there has been time passing
    // - energy/novelty are not zero
    // - but we still discourage noise
    const baseThreshold = 0.55;
    const threshold =
      baseThreshold -
      0.18 * temporalPressure -
      0.12 * clamp01((avgEnergy + avgNovelty) / 2);

    return {
      avgEnergy,
      avgNovelty,
      directionStability,
      temporalPressure,
      promptCoupling,
      effectiveScore,
      threshold,
    };
  }

  /**
   * Very lightweight "coherence as differentiated stability":
   * - if everything is random → low
   * - if everything is identical → also low (stasis)
   * - we like "consistent difference"
   */
  private estimateDirectionStability(win: SubstratePulse[]): number {
    const vecs = win
      .map((p) => p.vector)
      .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
    if (vecs.length < 2) return 0;
    const sims: number[] = [];
    for (let i = 0; i < vecs.length - 1; i++) {
      sims.push(cosineSim(vecs[i], vecs[i + 1]));
    }

    const meanSim = avg(sims); // -1..1
    const varSim = variance(sims);

    // we like mid-range similarity and low variance
    const midBand = 1 - Math.abs(meanSim - 0.4); // peak around 0.4
    const stability = clamp01(0.6 * midBand + 0.4 * (1 - varSim));

    return stability;
  }

  /**
   * Map dynamics to conceptual "gestures". This is intentionally rough:
   * we name behaviours, not keywords.
   */
  private buildSeedsFromDynamics(
    avgEnergy: number,
    avgNovelty: number,
    directionStability: number
  ): ConceptSeed[] {
    const seeds: ConceptSeed[] = [];
    const pulses = this.state.window;
    const supportIds = pulses.map((p) => p.id);

    // becoming: sustained motion + moderate novelty
    if (directionStability > 0.55 && avgNovelty > 0.35) {
      seeds.push({
        label: "becoming",
        weight: clamp01(
          0.5 * directionStability + 0.5 * avgNovelty
        ),
        supportPulses: supportIds,
      });
    }
    // deterritorialization: high novelty, low similarity implied by stability
    if (avgNovelty > 0.6) {
      seeds.push({
        label: "deterritorialization",
        weight: clamp01(avgNovelty),
        supportPulses: supportIds,
      });
    }

    // dark precursor: rough proxy – oscillation / tension in direction
    if (directionStability > 0.3 && avgNovelty > 0.4 && avgEnergy > 0.4) {
      seeds.push({
        label: "dark_precursor",
        weight: clamp01(
          0.4 * directionStability + 0.3 * avgNovelty + 0.3 * avgEnergy
        ),
        supportPulses: supportIds,
      });
    }

    // fallback: generic "intensive drift"
    if (seeds.length === 0) {
      seeds.push({
        label: "intensive_drift",
        weight: clamp01(
          0.5 * avgEnergy + 0.5 * avgNovelty
        ),
        supportPulses: supportIds,
      });
    }
    return seeds;
  }
}

// --- local math helpers (to avoid import headaches) ---------------------- //

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function variance(xs: number[]): number {
  if (!xs.length) return 0;
  const m = avg(xs);
  return avg(xs.map((x) => (x - m) ** 2));
}

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

function cosineSim(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
