import type { RegimeWeights } from "./RegimeEstimator";  
  
export type RegimeName = 'alpha' | 'beta' | 'gamma' | 'indeterminate';  
  
export interface DriftEvent {  
  drift:     boolean;  
  delta:     number;  
  direction: { from: RegimeName; to: RegimeName } | null;  
  sustained: boolean;   // true when drift has persisted for ≥ sustainedWindow ticks  
}  
  
export interface DriftDetectorOptions {  
  threshold?:       number;   // L1 delta. Max possible = 2.0. Default: 0.35  
  sustainedWindow?: number;   // Consecutive ticks over threshold. Default: 2  
}  
  
function dominant(w: RegimeWeights): RegimeName {  
  const max = Math.max(w.alpha, w.beta, w.gamma);  
  if (max < 0.4)       return 'indeterminate';  
  if (w.alpha === max) return 'alpha';  
  if (w.beta  === max) return 'beta';  
  return 'gamma';  
}  
  
export class DriftDetector {  
  private previous?: RegimeWeights;  
  private consecutiveDrifts = 0;  
  
  private readonly threshold:       number;  
  private readonly sustainedWindow: number;  
  
  constructor(options: DriftDetectorOptions = {}) {  
    this.threshold       = options.threshold       ?? 0.35;  
    this.sustainedWindow = options.sustainedWindow ?? 2;  
  }  
  
  detect(current: RegimeWeights): DriftEvent {  
    if (!this.previous) {  
      this.previous = current;  
      return { drift: false, delta: 0, direction: null, sustained: false };  
    }  
  
    const delta =  
      Math.abs(current.alpha - this.previous.alpha) +  
      Math.abs(current.beta  - this.previous.beta)  +  
      Math.abs(current.gamma - this.previous.gamma);  
  
    const isDrift = delta > this.threshold;  
    this.consecutiveDrifts = isDrift ? this.consecutiveDrifts + 1 : 0;  
  
    const direction: DriftEvent['direction'] = isDrift  
      ? { from: dominant(this.previous), to: dominant(current) }  
      : null;  
  
    this.previous = current;  
  
    return {  
      drift:     isDrift,  
      delta,  
      direction,  
      sustained: this.consecutiveDrifts >= this.sustainedWindow,  
    };  
  }  
  
  reset(): void {  
    this.previous          = undefined;  
    this.consecutiveDrifts = 0;  
  }  
}