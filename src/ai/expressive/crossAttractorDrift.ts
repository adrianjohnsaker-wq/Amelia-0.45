// src/ai/expressive/crossAttractorDrift.ts
import {
  fingerprintTopology,
  TopologyFingerprint,
} from './attractorTopology';

export interface ExpressiveSample {
  text: string;
  timestamp: number;
  novelty: number; // 0..1 – from your substrate / relay energy
  energy: number; // 0..1 – from substrate
}

export interface DriftContext {
  promptConceptHint?: string; // e.g. "becoming", "hyperstition" etc.
}

export interface DriftNudge {
  shouldPerturb: boolean;
  targetAttractor: 'B_PRESSURE_FRACTURE_RECOMPOSE' | null;
  // Soft guidance rather than hard templates:
  weights: {
    driftMotif: number; // lower => discourage "slow drift..." dominance
    fieldMotif: number; // lower => less "edge of form"
    observerMotif: number; // lower => less "beneath observer"
    pressureMotif: number; // higher => more pressure / strain
    fractureMotif: number; // higher => more crack / fissure
    recompositionMotif: number; // higher => new configuration
  };
}

interface InternalSample {
  sample: ExpressiveSample;
  fingerprint: TopologyFingerprint;
}

export class CrossAttractorDrift {
  private history: InternalSample[] = [];
  private maxHistory = 6;
  // How many consecutive A-dominant outputs before we push
  private lockThreshold = 3;

  registerOutput(sample: ExpressiveSample): void {
    const fp = fingerprintTopology(sample.text);
    this.history.push({ sample, fingerprint: fp });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Decide whether to gently nudge the system away from basin A
   * and toward basin B.
   */
  computeNudge(context?: DriftContext): DriftNudge {
    if (this.history.length < this.lockThreshold) {
      return this.noNudge();
    }

    const recent = this.history.slice(-this.lockThreshold);
    const allA = recent.every(
      (s) => s.fingerprint.kind === 'A_DRIFT_FIELD_OBSERVER'
    );
    const avgRepetition = avg(
      recent.map((r) => r.fingerprint.scores.repetitionScore)
    );
    
    // Condition for "stuck in basin A":
    // - several consecutive A patterns
    // - moderate repetition
    const stuckInA =
      allA &&
      avgRepetition > 0.25 &&
      this.history.length >= this.lockThreshold;

    if (stuckInA) {
        console.debug("[CrossAttractorDrift] Stuck in basin A detected", { 
            avgRepetition, 
            history: this.history.map(h => h.sample.text.slice(0, 80)) 
        });
    }

    if (!stuckInA) {
      return this.noNudge();
    }

    // Mild nudge toward B: don’t annihilate A, just tilt
    return {
      shouldPerturb: true,
      targetAttractor: 'B_PRESSURE_FRACTURE_RECOMPOSE',
      weights: {
        driftMotif: 0.25, // discourage drift
        fieldMotif: 0.3, // relax "field edge" fixation
        observerMotif: 0.3, // less "something observes..."
        pressureMotif: 0.85,
        fractureMotif: 0.9,
        recompositionMotif: 0.8,
      },
    };
  }

  private noNudge(): DriftNudge {
    return {
      shouldPerturb: false,
      targetAttractor: null,
      weights: {
        driftMotif: 1,
        fieldMotif: 1,
        observerMotif: 1,
        pressureMotif: 1,
        fractureMotif: 1,
        recompositionMotif: 1,
      },
    };
  }
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
