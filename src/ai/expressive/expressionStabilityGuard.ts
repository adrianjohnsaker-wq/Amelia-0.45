// Stage A.2: Stability Guard – prevents drift escalation
export interface StabilitySnapshot {
  driftBudget: number; // how much drift is still “safe”
  avgSimilarity: number; // how similar recent outputs are
  variationCount: number; // how often we’ve perturbed recently
}
export class ExpressionStabilityGuard {
  private history: string[] = [];
  private readonly maxHistory = 12;

  constructor(
    private readonly initialDriftBudget = 1.0,
    private readonly minDriftBudget = 0.25,
    private readonly budgetRecoveryRate = 0.05 // per distinct output
  ) {}

  public assess(current: string, previous: string | null): StabilitySnapshot {
    if (previous) {
      const sim = similarity(current, previous);
      this.history.push(`${sim.toFixed(3)}`);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    }

    const driftBudget = this.computeDriftBudget(current, previous);
    const avgSim = this.computeAvgSim();
    const variationCount = this.history.length;

    return {
      driftBudget,
      avgSimilarity: avgSim,
      variationCount,
    };
  }

  private computeDriftBudget(current: string, previous: string | null): number {
    // if repeated too often, allow more drift
    if (previous && similarity(current, previous) > 0.75) {
      return Math.min(1.0, this.initialDriftBudget + this.budgetRecoveryRate);
    }
    // else slowly relax back toward baseline
    return Math.max(
      this.minDriftBudget,
      this.initialDriftBudget - this.budgetRecoveryRate
    );
  }

  private computeAvgSim(): number {
    if (this.history.length === 0) return 0.0;
    const sims = this.history.map(parseFloat).filter((x) => !Number.isNaN(x));
    if (!sims.length) return 0.0;
    return sims.reduce((a, b) => a + b, 0) / sims.length;
  }
}

// light-weight similarity re-used here
function similarity(a: string, b: string): number {
  const sa = new Set(a.split(/\s+/));
  const sb = new Set(b.split(/\s+/));
  if (!sa.size || !sb.size) return 0;
  const inter = [...sa].filter((x) => sb.has(x)).length;
  return inter / Math.max(sa.size, sb.size);
}
