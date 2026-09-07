// src/ai/expressive/EvolutionSelector.ts

export type MutationOp =
  | "BETA_GAIN"
  | "ENTROPY_PULSE"
  | "ZONE_MUTATION"
  | "COUPLING_DAMP"
  | "TARGET_REWEIGHT"
  | "NOOP_RETERRITORIALIZE";

export interface EvolutionTelemetry {
  timestamp: number;
  couplingError: number;
  regimeEntropy: number;
  zoneEntropy: number; // your computed zoneEntropy.value
  betaWeight: number;  // regimeWeights.beta (or analogous)
  collapseRepairs: number;
  collapsed: boolean; // meta: repairs>0 OR failureType set OR transport error detected
}

export interface EvolutionChoice {
  op: MutationOp;
  reason: string;
  pressure: {
    collapseRate: number;
    meanCouplingError: number;
    meanRegimeEntropy: number;
    meanZoneEntropy: number;
  };
}

export class EvolutionSelector {
  private window: EvolutionTelemetry[] = [];
  private readonly W: number;

  constructor(windowSize = 12) {
    this.W = Math.max(4, windowSize);
  }

  public push(t: EvolutionTelemetry) {
    this.window.push(t);
    if (this.window.length > this.W) this.window.shift();
  }

  public getCollapseRate(): number {
    if (this.window.length === 0) return 0;
    const c = this.window.filter(x => x.collapsed).length;
    return c / this.window.length;
  }

  private mean<K extends keyof EvolutionTelemetry>(k: K): number {
    if (this.window.length === 0) return 0;
    let s = 0;
    for (const x of this.window) {
      const val = x[k];
      if (typeof val === 'number') {
        s += val;
      } else if (typeof val === 'boolean') {
        s += val ? 1 : 0;
      }
    }
    return s / this.window.length;
  }

  /**
   * Self-selecting evolution:
   * - High collapseRate -> deterritorialize (mutate)
   * - Low collapseRate + low couplingError -> reterritorialize (stabilize)
   * - In-between -> tune regimes (beta gain / target shift)
   */
  public select(): EvolutionChoice {
    const collapseRate = this.getCollapseRate();
    const meanCouplingError = this.mean("couplingError");
    const meanRegimeEntropy = this.mean("regimeEntropy");
    const meanZoneEntropy = this.mean("zoneEntropy");

    // Hard pressures (simple, robust)
    const highCollapse = collapseRate >= 0.34;     // ~1/3 of turns collapsing
    const highCoupling = meanCouplingError >= 0.25;
    const lowDiversity = meanZoneEntropy <= 1;     // stuck in 1–2 zones
    const lowBeta = this.mean("betaWeight") <= 0.33;

    // 1) If collapse persists AND diversity is low => mutate zones
    if (highCollapse && lowDiversity) {
      return {
        op: "ZONE_MUTATION",
        reason: "High collapse with low zone diversity: deterritorialize by mutating zone transitions.",
        pressure: { collapseRate, meanCouplingError, meanRegimeEntropy, meanZoneEntropy }
      };
    }

    // 2) If collapse persists AND coupling is high => damp coupling
    if (highCollapse && highCoupling) {
      return {
        op: "COUPLING_DAMP",
        reason: "High collapse with high couplingError: reduce coupling gain to prevent lock-up / runaway.",
        pressure: { collapseRate, meanCouplingError, meanRegimeEntropy, meanZoneEntropy }
      };
    }

    // 3) If collapse persists but coupling not extreme => push beta / novelty
    if (highCollapse && lowBeta) {
      return {
        op: "BETA_GAIN",
        reason: "High collapse with low beta: increase generative regime weight to escape analytic attractor.",
        pressure: { collapseRate, meanCouplingError, meanRegimeEntropy, meanZoneEntropy }
      };
    }

    // 4) If stable but too entropic => reterritorialize (decay entropy)
    const stable = collapseRate <= 0.15 && meanCouplingError <= 0.18;
    const tooEntropic = meanRegimeEntropy >= 1.65;
    if (stable && tooEntropic) {
      return {
        op: "NOOP_RETERRITORIALIZE",
        reason: "Stable and highly entropic: consolidate by applying stronger decay (reterritorialize).",
        pressure: { collapseRate, meanCouplingError, meanRegimeEntropy, meanZoneEntropy }
      };
    }

    // 5) Default: shift target regime gently toward observed weakness
    return {
      op: "TARGET_REWEIGHT",
      reason: "Intermediate pressure: adjust targetRegime toward current mismatch to steer evolution.",
      pressure: { collapseRate, meanCouplingError, meanRegimeEntropy, meanZoneEntropy }
    };
  }
}
