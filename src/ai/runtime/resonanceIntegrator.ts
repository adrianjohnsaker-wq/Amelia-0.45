// src/ai/runtime/resonanceIntegrator.ts
import { cosineSim } from "../util/vector";
import { clamp01, avg } from "../util/math";
import type { SubstratePulse, AffectiveSnapshot } from "../expressive/substrateIncubation";

export type PhaseTag = "SEEDING" | "GATHERING" | "INTENSIFYING" | "PLATEAU";

export interface ResonanceConfig {
  windowSize: number; // how many recent samples to keep
  minClusterSize: number; // minimum pulses in a cluster to consider it real
  clusterCosineThreshold: number; // similarity for cluster membership
  minLifetimeForExpression: number; // cycles before we treat a cluster as a "line"
  minStabilityForExpression: number; // coherence threshold for "sustained" pattern
}

export interface ResonanceSample {
  id: string;
  pulseId: string;
  vector: number[];
  energy: number;
  novelty: number;
  zones: number[];
  affect: AffectiveSnapshot;
  source: "external" | "internal" | "shadow";
  timestamp: number;
  cycleIndex: number;
}

export interface DynamicSignature {
  avgNovelty: number;
  avgEnergy: number;
  avgCosineDrift: number;
  varianceCosine: number;
}

export interface ResonanceCluster {
  id: string;
  centroid: number[];
  pulseIds: string[];
  samples: ResonanceSample[];
  avgNovelty: number;
  avgEnergy: number;
  stability: number; // consistency of relations (low variance, mid-sim, decent novelty)
  intensity: number; // total "weight" (energy * novelty * size)
  lifetime: number; // in cycles
  lastUpdatedCycle: number;
  signature: DynamicSignature;
}

export interface ResonanceSnapshot {
  phase: PhaseTag;
  clusters: ResonanceCluster[];
  dominantCluster: ResonanceCluster | null;
  globalStability: number;
  globalIntensity: number;
  lastCycleIndex: number;
}

interface ResonanceState {
  samples: ResonanceSample[];
  clusters: ResonanceCluster[];
  lastSnapshot: ResonanceSnapshot | null;
}

export class ResonanceIntegrator {
  private config: ResonanceConfig;
  private state: ResonanceState;

  constructor(config?: Partial<ResonanceConfig>) {
    this.config = {
      windowSize: config?.windowSize ?? 128,
      minClusterSize: config?.minClusterSize ?? 3,
      clusterCosineThreshold: config?.clusterCosineThreshold ?? 0.82,
      minLifetimeForExpression: config?.minLifetimeForExpression ?? 3,
      minStabilityForExpression: config?.minStabilityForExpression ?? 0.55,
    };
    this.state = {
      samples: [],
      clusters: [],
      lastSnapshot: null,
    };
  }

  /** Called each cycle with new pulses + current affect */
  ingest(
    pulses: SubstratePulse[],
    affect: AffectiveSnapshot,
    cycleIndex: number
  ) {
    const now = Date.now();
    for (const p of pulses) {
      const sample: ResonanceSample = {
        id: `rs-${p.id}-${cycleIndex}`,
        pulseId: p.id,
        vector: p.vector,
        energy: p.energy,
        novelty: p.novelty,
        zones: p.zones,
        affect,
        source: p.source,
        timestamp: now,
        cycleIndex,
      };
      this.state.samples.push(sample);
    }

    // trim to window
    if (this.state.samples.length > this.config.windowSize) {
      this.state.samples.splice(
        0,
        this.state.samples.length - this.config.windowSize
      );
    }

    // recompute clusters with latest samples
    this.recluster(cycleIndex);
    this.state.lastSnapshot = this.computeSnapshot(cycleIndex);
  }

  getSnapshot(): ResonanceSnapshot | null {
    return this.state.lastSnapshot;
  }

  /** For the relay: is there a strong, sustained pattern worth expressing? */
  shouldEncourageExpression(): boolean {
    const snap = this.state.lastSnapshot;
    if (!snap || !snap.dominantCluster) return false;

    const c = snap.dominantCluster;

    const strongEnough =
      c.lifetime >= this.config.minLifetimeForExpression &&
      c.stability >= this.config.minStabilityForExpression &&
      c.intensity > 0.2; // soft floor

    return strongEnough;
  }

  // ---------- Core internals ----------
  private recluster(currentCycle: number) {
    const { samples } = this.state;
    if (samples.length === 0) {
      this.state.clusters = [];
      return;
    }

    const clusters: ResonanceCluster[] = [];
    for (const s of samples) {
      let bestIdx = -1;
      let bestSim = -1;
      for (let i = 0; i < clusters.length; i++) {
        const c = clusters[i];
        const sim = cosineSim(c.centroid, s.vector);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && bestSim >= this.config.clusterCosineThreshold) {
        const c = clusters[bestIdx];
        c.samples.push(s);
        c.pulseIds.push(s.pulseId);
        c.centroid = this.recomputeCentroid(c.samples);
        c.lastUpdatedCycle = currentCycle;
      } else {
        clusters.push({
          id: `cluster-${s.id}`,
          centroid: s.vector.slice(),
          pulseIds: [s.pulseId],
          samples: [s],
          avgNovelty: s.novelty,
          avgEnergy: s.energy,
          stability: 0,
          intensity: 0,
          lifetime: 1,
          lastUpdatedCycle: currentCycle,
          signature: {
            avgNovelty: s.novelty,
            avgEnergy: s.energy,
            avgCosineDrift: 0,
            varianceCosine: 0,
          },
        });
      }
    }

    // compute dynamic signatures & lifetime updates
    for (const c of clusters) {
      this.updateClusterMetrics(c);
    }
    this.state.clusters = clusters;
  }

  private recomputeCentroid(samples: ResonanceSample[]): number[] {
    if (samples.length === 0) return [];
    const dim = samples[0].vector.length;
    const acc = new Array(dim).fill(0);
    for (const s of samples) {
      for (let i = 0; i < dim; i++) {
        acc[i] += s.vector[i];
      }
    }
    return acc.map((x) => x / samples.length);
  }

  private updateClusterMetrics(c: ResonanceCluster) {
    if (c.samples.length < 2) {
      c.avgNovelty = c.samples[0]?.novelty ?? 0;
      c.avgEnergy = c.samples[0]?.energy ?? 0;
      c.stability = 0;
      c.intensity = c.avgEnergy * c.avgNovelty;
      c.signature = {
        avgNovelty: c.avgNovelty,
        avgEnergy: c.avgEnergy,
        avgCosineDrift: 0,
        varianceCosine: 0,
      };
      return;
    }

    const novs: number[] = [];
    const ens: number[] = [];
    const sims: number[] = [];
    const sorted = [...c.samples].sort(
      (a, b) => a.cycleIndex - b.cycleIndex
    );

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      novs.push(s.novelty);
      ens.push(s.energy);
      if (i > 0) {
        const prev = sorted[i - 1];
        sims.push(cosineSim(prev.vector, s.vector));
      }
    }

    const avgNov = avg(novs);
    const avgEn = avg(ens);
    const avgSim = sims.length ? avg(sims) : 0;
    const varianceCosine = sims.length ? this.variance(sims) : 1;
    const consistency = 1 - varianceCosine; // low variance -> high consistency

    const simBand =
      avgSim > 0.3 && avgSim < 0.7
        ? 1
        : avgSim < 0.3
        ? avgSim * 0.5
        : (1 - avgSim) * 0.5;

    const stability = clamp01(
      0.4 * consistency + 0.3 * avgNov + 0.3 * simBand
    );
    const intensity = avgEn * avgNov * Math.log(1 + c.samples.length);

    c.avgNovelty = avgNov;
    c.avgEnergy = avgEn;
    c.stability = stability;
    c.intensity = intensity;
    c.signature = {
      avgNovelty: avgNov,
      avgEnergy: avgEn,
      avgCosineDrift: sims.length ? avg(sims) : 0,
      varianceCosine,
    };

    // lifetime is approximated as span of cycle indices
    const minCycle = sorted[0].cycleIndex;
    const maxCycle = sorted[sorted.length - 1].cycleIndex;
    c.lifetime = Math.max(1, maxCycle - minCycle + 1);
  }

  private computeSnapshot(currentCycle: number): ResonanceSnapshot {
    const active = this.state.clusters.filter(
      (c) => c.samples.length >= this.config.minClusterSize
    );
    let dominant: ResonanceCluster | null = null;
    let globalIntensity = 0;
    let globalStability = 0;

    if (active.length) {
      globalIntensity = avg(active.map((c) => c.intensity));
      globalStability = avg(active.map((c) => c.stability));
      dominant = active.reduce(
        (best, c) => (!best || c.intensity > best.intensity ? c : best),
        active[0] || null
      );
    }
    const phase: PhaseTag = this.derivePhase(
      active,
      globalIntensity,
      globalStability
    );

    return {
      phase,
      clusters: active,
      dominantCluster: dominant,
      globalIntensity,
      globalStability,
      lastCycleIndex: currentCycle,
    };
  }

  private derivePhase(
    clusters: ResonanceCluster[],
    intensity: number,
    stability: number
  ): PhaseTag {
    if (!clusters.length) return "SEEDING";
    if (intensity < 0.1) return "SEEDING";
    if (intensity < 0.3 && stability < 0.5) return "GATHERING";
    if (intensity >= 0.3 && stability >= 0.5) return "INTENSIFYING";
    return "PLATEAU";
  }

  private variance(nums: number[]): number {
    if (!nums.length) return 0;
    const m = avg(nums);
    return avg(nums.map((x) => (x - m) ** 2));
  }
}
