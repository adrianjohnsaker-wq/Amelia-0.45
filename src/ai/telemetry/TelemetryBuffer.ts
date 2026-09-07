import type { RegimeWeights } from "./RegimeEstimator";  
  
export interface RegimeTick {  
  readonly t:              number;  
  readonly weights:        RegimeWeights;  
  readonly normativeLoad:  number;  
  readonly drift:          boolean;  
  readonly driftDelta:     number;  
  readonly confidence:     number;  
  readonly dominantRegime: string;  
}  
  
export interface TelemetrySummary {  
  tickCount:                number;  
  mean:                     RegimeWeights;  
  driftEvents:              number;  
  normativeProfile:         { peak: number; mean: number };  
  dominantRegimeFrequency:  Record<string, number>;  
}  
  
export interface TelemetryBufferOptions {  
  maxTicks?: number;   // Circular cap. Default: 500  
}  
  
export class TelemetryBuffer {  
  private readonly ticks: RegimeTick[] = [];  
  private readonly maxTicks: number;  
  
  constructor(options: TelemetryBufferOptions = {}) {  
    this.maxTicks = options.maxTicks ?? 500;  
  }  
  
  addTick(tick: RegimeTick): void {  
    if (this.ticks.length >= this.maxTicks) {  
      this.ticks.shift();    // evict oldest; O(n) but fine for ≤500 items  
    }  
    this.ticks.push(tick);  
  }  
  
  getTicks(): readonly RegimeTick[] {  
    return this.ticks;  
  }  
  
  summary(): TelemetrySummary {  
    const n = this.ticks.length;  
  
    // Guard against empty buffer — original code would produce NaN here.  
    if (n === 0) {  
      return {  
        tickCount:               0,  
        mean:                    { alpha: 0, beta: 0, gamma: 0 },  
        driftEvents:             0,  
        normativeProfile:        { peak: 0, mean: 0 },  
        dominantRegimeFrequency: {},  
      };  
    }  
  
    const acc = this.ticks.reduce(  
      (a, tick) => ({  
        alpha:         a.alpha         + tick.weights.alpha,  
        beta:          a.beta          + tick.weights.beta,  
        gamma:         a.gamma         + tick.weights.gamma,  
        normativeSum:  a.normativeSum  + tick.normativeLoad,  
        normativePeak: Math.max(a.normativePeak, tick.normativeLoad),  
      }),  
      { alpha: 0, beta: 0, gamma: 0, normativeSum: 0, normativePeak: 0 }  
    );  
  
    const freq: Record<string, number> = {};  
    for (const tick of this.ticks) {  
      freq[tick.dominantRegime] = (freq[tick.dominantRegime] ?? 0) + 1;  
    }  
  
    return {  
      tickCount: n,  
      mean: {  
        alpha: acc.alpha / n,  
        beta:  acc.beta  / n,  
        gamma: acc.gamma / n,  
      },  
      driftEvents:      this.ticks.filter(t => t.drift).length,  
      normativeProfile: {  
        peak: acc.normativePeak,  
        mean: acc.normativeSum / n,  
      },  
      dominantRegimeFrequency: freq,  
    };  
  }  
  
  /** Serializes to the Firestore document shape defined in your spec. */  
  toFirestoreDocument(): Record<string, unknown> {  
    const s = this.summary();  
    return {  
      meanWeights:             s.mean,  
      driftEvents:             s.driftEvents,  
      normativeProfile:        s.normativeProfile,  
      dominantRegimeFrequency: s.dominantRegimeFrequency,  
      tickCount:               s.tickCount,  
      ticks:                   this.ticks,  
    };  
  }  
  
  clear(): void {  
    this.ticks.length = 0;  
  }  
}