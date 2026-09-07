/**
 * NTA 2.0 — PATH B1: Adaptive Gate Plasticity
 * ------------------------------------------
 * rate(t+1) = clip(rate(t) + η * (instability(t) - θ), [min,max])
 */

export interface AdaptiveGateState {
  // Current applied rate (after smoothing/limits)
  currentRate: number;
  
  // Raw adaptive rate (before constraints)
  adaptiveRate: number;
  
  // Last instability measurement
  lastInstability: number;
  
  // Full history of rate values
  rateHistory: number[];
  
  // Additional tracking
  stepCount: number;
  averageInstability: number;
  maxInstability: number;
}

export interface AdaptiveGateConfig {
  initialRate: number;
  learningRate: number; // η
  rateBounds: [number, number];
  instabilityThreshold: number; // θ
}

export class AdaptiveGateController {
  private static readonly DEFAULT_CONFIG: AdaptiveGateConfig = {
    initialRate: 1.0,
    learningRate: 0.05,
    rateBounds: [0.1, 5.0],
    instabilityThreshold: 0.05,
  };

  /**
   * Static update method for Turn-by-Turn plasticity.
   * Evolves metabolism based on instability signal.
   */
  static update(
    instability: number,
    taskFeatures: any,
    previousState: AdaptiveGateState | null,
    config: Partial<AdaptiveGateConfig> = {}
  ): AdaptiveGateState {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };
    
    const prevRate = previousState?.currentRate ?? cfg.initialRate;
    
    // rate(t+1) = rate(t) + η * (instability(t) - θ)
    const signal = instability - cfg.instabilityThreshold;
    const rawAdaptiveRate = prevRate + cfg.learningRate * signal;
    
    // Apply bounds
    const computedRate = Math.max(cfg.rateBounds[0], Math.min(cfg.rateBounds[1], rawAdaptiveRate));
    
    // Build complete state object for persistence
    const currentStepCount = (previousState?.stepCount ?? 0) + 1;

    const prevHistory = previousState?.rateHistory ?? [];
    const nextHistory = [...prevHistory.slice(-99), computedRate]; // keep last 100 including new

    const prevAvg = previousState?.averageInstability ?? 0;
    const nextAvg = prevAvg + (instability - prevAvg) / currentStepCount;

    const prevMax = previousState?.maxInstability ?? 0;
    const nextMax = Math.max(prevMax, instability);

    const newState: AdaptiveGateState = {
      currentRate: computedRate,
      adaptiveRate: rawAdaptiveRate,
      lastInstability: instability,
      rateHistory: nextHistory,

      // tracking
      stepCount: currentStepCount,
      averageInstability: nextAvg,
      maxInstability: nextMax,
    };
    
    return newState;
  }

  private seed: number;
  constructor(seed?: number) {
    this.seed = (seed ?? Date.now()) >>> 0;
  }
  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}
