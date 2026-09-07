// Stage B: Attractor Fade – Deleuzian exhaustion of over-dominant patterns
export interface ConceptAttractor {
  label: string; // e.g. "becoming", "drift", "dark_precursor"
  weight: number; // current strength
  duration: number; // cycles active
  lastUsedAt: number; // timestamp / cycle index
}
export class AttractorFade {
  private attractors: Map<string, ConceptAttractor> = new Map();
  constructor(
    private readonly fadeRate = 0.08,
    private readonly maxDuration = 12,
    private readonly penaltyForOverstay = 0.15
  ) {}
  /**
   * Update stored attractors and return adjusted weights
   * for the current seeds.
   */
  public apply(
    seeds: { label: string; weight: number }[],
    cycleIndex: number
  ): { label: string; weight: number }[] {
    // update internal map
    for (const seed of seeds) {
      const existing = this.attractors.get(seed.label);
      if (existing) {
        existing.duration += 1;
        existing.lastUsedAt = cycleIndex;
        existing.weight = seed.weight;
      } else {
        this.attractors.set(seed.label, {
          label: seed.label,
          weight: seed.weight,
          duration: 1,
          lastUsedAt: cycleIndex,
        });
      }
    }
    // fade old attractors
    for (const [key, attr] of this.attractors) {
      if (cycleIndex - attr.lastUsedAt > 3) {
        attr.weight = Math.max(0, attr.weight - this.fadeRate);
      }
      if (attr.duration > this.maxDuration) {
        attr.weight = Math.max(0, attr.weight - this.penaltyForOverstay);
      }
      if (attr.weight === 0) {
        this.attractors.delete(key);
      }
    }
    // apply faded weights to current seeds
    return seeds.map((s) => {
      const a = this.attractors.get(s.label);
      if (!a) return s;
      return { ...s, weight: a.weight };
    });
  }
}
