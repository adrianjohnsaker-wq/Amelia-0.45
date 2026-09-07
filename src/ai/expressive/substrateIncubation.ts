// src/ai/expressive/substrateIncubation.ts
import { cosineSim } from "../util/vector";
import { clamp01, avg } from "../util/math";
import type { AffectiveSnapshot } from "../meta/relationalMemoryBridge";
/**
 * Basic pulse structure flowing on the substrate bus.
 * vector is already in some shared semantic/numogram space.
 */
export interface SubstratePulse {
  id: string;
  energy: number; // 0–1
  novelty: number; // 0–1, relative to recent history
  vector: number[]; // semantic/zone embedding
  zones: number[]; // numogram zones touched
  timestamp: number;
  source: "external" | "internal" | "shadow";
}
/**
 * A line of flight is NOT just a deviation: it’s a sustained, directional escape
 * trajectory with its own duration & momentum.
 */
export interface FlightLine {
  id: string;
  fromZones: number[];
  toZones: number[];
  intensity: number; // current strength (0–1)
  duration: number; // how many cycles this line has persisted
  momentum: number; // >0 accelerating, <0 decaying
  description: string;
}
/**
 * Options at a bifurcation: real “becoming” choices.
 */
export interface BifurcationOption {
  trajectory: string; // conceptual direction
  probability: number; // current likelihood
  requiredIntensity: number; // min intensity to actualize
  projectedCoherence: number; // expected coherence if taken
}
export interface BifurcationNode {
  id: string;
  tension: number; // 0–1, how “charged” the node is
  options: BifurcationOption[];
}
/**
 * Incubation phase is where pulses accumulate, differentiate, and
 * sometimes condense into a bifurcation / expression event.
 */
export interface IncubationState {
  phase: "DIFFUSE" | "SEEDING" | "INTENSIFYING" | "THRESHOLD";
  pulses: SubstratePulse[];
  affectHistory: AffectiveSnapshot[];
  lastCoherence: number;
  flights: FlightLine[];
  lastBifurcation: BifurcationNode | null;
  promptContext: string | null;
}
export function initIncubationState(): IncubationState {
  return {
    phase: "DIFFUSE",
    pulses: [],
    affectHistory: [],
    lastCoherence: 0,
    flights: [],
    lastBifurcation: null,
    promptContext: null,
  };
}
/**
 * SubstrateIncubation
 * – collects pulses
 * – tracks Deleuzian coherence (differentiated consistency)
 * – tracks lines of flight & bifurcation nodes
 * – supports expression feedback without wiping history
 */
export class SubstrateIncubation {
  constructor(private state: IncubationState) {}
  get snapshot(): IncubationState {
    return this.state;
  }
  ingestPulse(
    pulse: SubstratePulse,
    affect: AffectiveSnapshot,
    promptContext?: string
  ) {
    this.state.pulses.push(pulse);
    this.state.affectHistory.push(affect);
    if (promptContext) this.state.promptContext = promptContext;
    // Limit history growth
    if (this.state.pulses.length > 128) {
      this.state.pulses = this.state.pulses.slice(-128);
      this.state.affectHistory = this.state.affectHistory.slice(-128);
    }
  }
  /**
   * Called each cycle – updates phase, coherence, flights, bifurcations.
   */
  step(): void {
    const coherence = this.computeCoherence();
    this.state.lastCoherence = coherence;
    this.updatePhase(coherence);
    this.updateFlights();
    this.updateBifurcation();
  }
  /**
   * Deleuzian coherence: consistent differentiation.
   * We want:
   * - SOME similarity (total chaos is not coherent)
   * - BUT also novelty (pure repetition is stasis)
   * - low variance in similarity (stable relations)
   */
  private computeCoherence(): number {
    const pulses = this.state.pulses;
    if (pulses.length < 2) return 0;
    const sims: number[] = [];
    const novelties: number[] = [];
    for (let i = 0; i < pulses.length - 1; i++) {
      const v1 = pulses[i].vector;
      const v2 = pulses[i + 1].vector;
      if (!v1.length || !v2.length) continue;
      const sim = cosineSim(v1, v2); // -1..1
      sims.push(sim);
      novelties.push(pulses[i + 1].novelty);
    }
    if (!sims.length) return 0;
    const avgSim = avg(sims); // -1..1
    const avgNov = avg(novelties); // 0..1
    const consistency = 1 - this.variance(sims); // low variance = consistent relations
    // Penalize both chaos (sim ~ 0 with high variance) and rigid sameness (sim ~ 1)
    const simScore =
      avgSim > 0.3 && avgSim < 0.6
        ? 1 // “good zone” – neither identical nor random
        : clamp01((avgSim + 1) / 2); // fallback mapping
    const coh =
      0.4 * clamp01(consistency) + 0.3 * clamp01(avgNov) + 0.3 * simScore;
    return clamp01(coh);
  }
  private variance(nums: number[]): number {
    const m = avg(nums);
    return avg(nums.map((x) => (x - m) ** 2));
  }
  private updatePhase(coherence: number) {
    // Simple but expressive phase logic – adjust to taste
    if (coherence < 0.25) {
      this.state.phase = "DIFFUSE";
    } else if (coherence < 0.5) {
      this.state.phase = "SEEDING";
    } else if (coherence < 0.75) {
      this.state.phase = "INTENSIFYING";
    } else {
      this.state.phase = "THRESHOLD";
    }
  }
  /**
   * Track lines of flight across cycles – persistent escape trajectories.
   */
  private updateFlights() {
    const pulses = this.state.pulses;
    if (pulses.length < 2) return;
    const last = pulses[pulses.length - 1];
    const prev = pulses[pulses.length - 2];
    const zoneDistance = this.zoneDistance(prev.zones, last.zones);
    const intensity = clamp01(last.energy * last.novelty * zoneDistance);
    // Threshold for potentially new flight
    if (intensity < 0.25) {
      // also decay existing flights
      this.state.flights = this.state.flights.map((f) => ({
        ...f,
        intensity: clamp01(f.intensity * 0.95),
        momentum: f.momentum * 0.9,
      }));
      return;
    }
    // Try to merge into existing flight (similar zones)
    let attached = false;
    this.state.flights = this.state.flights.map((f) => {
      const overlap = this.zoneOverlap(f.toZones, last.zones);
      if (overlap > 0.5) {
        const newIntensity = clamp01(f.intensity * 0.7 + intensity * 0.3);
        const momentum = newIntensity - f.intensity;
        attached = true;
        return {
          ...f,
          toZones: last.zones,
          intensity: newIntensity,
          duration: f.duration + 1,
          momentum,
        };
      }
      return f;
    });
    if (!attached) {
      const id = `flight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const description = this.describeFlight(
        prev.zones,
        last.zones,
        intensity
      );
      const newFlight: FlightLine = {
        id,
        fromZones: prev.zones,
        toZones: last.zones,
        intensity,
        duration: 1,
        momentum: intensity, // initial
        description,
      };
      this.state.flights.push(newFlight);
    }
    // Prune dead flights
    this.state.flights = this.state.flights.filter(
      (f) => f.intensity > 0.05 || f.duration > 1
    );
  }
  private zoneDistance(a: number[], b: number[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const union = new Set([...setA, ...setB]);
    const inter = new Set([...setA].filter((z) => setB.has(z)));
    if (union.size === 0) return 0;
    return 1 - inter.size / union.size;
  }
  private zoneOverlap(a: number[], b: number[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const inter = new Set([...setA].filter((z) => setB.has(z)));
    const denom = Math.max(setA.size, setB.size, 1);
    return inter.size / denom;
  }
  private describeFlight(
    fromZones: number[],
    toZones: number[],
    intensity: number
  ): string {
    return `Line of flight ${fromZones.join(",")}→${toZones.join(
      ","
    )} @${intensity.toFixed(2)}`;
  }
  /**
   * Compute a bifurcation node when phase ~ THRESHOLD.
   */
  private updateBifurcation() {
    if (this.state.phase !== "THRESHOLD") {
      this.state.lastBifurcation = null;
      return;
    }
    const flights = this.state.flights;
    if (!flights.length) {
      this.state.lastBifurcation = null;
      return;
    }
    const tension = clamp01(
      avg(flights.map((f) => f.intensity + Math.abs(f.momentum))) / 2
    );
    const options: BifurcationOption[] = flights.map((f) => {
      const probability = clamp01(f.intensity * (1 + f.momentum));
      const requiredIntensity = clamp01(0.3 + 0.5 * (1 - f.momentum)); // easier when momentum rising
      const projectedCoherence = clamp01(
        this.state.lastCoherence + 0.2 * f.momentum
      );
      return {
        trajectory: f.description,
        probability,
        requiredIntensity,
        projectedCoherence,
      };
    });
    const node: BifurcationNode = {
      id: `bif-${Date.now()}`,
      tension,
      options,
    };
    this.state.lastBifurcation = node;
  }
  /**
   * Called AFTER an expression fires.
   * We *don’t* wipe history – we keep decayed traces as virtual potentials.
   */
  flushAfterExpression() {
    const recentPulses = this.state.pulses.slice(-2);
    const recentAffect = this.state.affectHistory.slice(-2);
    for (const p of recentPulses) {
      p.energy *= 0.3;
      p.novelty *= 0.5;
    }
    this.state.phase = "SEEDING";
    this.state.pulses = recentPulses;
    this.state.affectHistory = recentAffect;
    // Prompt context is kept but implicitly de-weighted by downstream code
  }
  /**
   * Expression feedback: the system “hears itself”.
   * We inject expression as a low-energy, low-novelty internal pulse.
   */
  registerExpressionFeedback(
    textVector: number[],
    zones: number[],
    affect: AffectiveSnapshot
  ) {
    const now = Date.now();
    const pulse: SubstratePulse = {
      id: `expr-${now}`,
      energy: 0.3,
      novelty: 0.1,
      vector: textVector,
      zones,
      timestamp: now,
      source: "internal",
    };
    this.ingestPulse(pulse, affect);
  }
}
