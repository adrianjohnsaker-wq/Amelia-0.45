// Regex compiled once at module load — never reconstructed per call.  
// Bare `=` removed; replaced with `:=` (formal assignment).  
// `\b` word boundaries added throughout to avoid partial matches.  
const METABOLIC_RE   = /\blet\b|\bassume\b|\btherefore\b|\blemma\b|\btheorem\b|\bproof\b|[∀∃⇒⟹≡≠≤≥]|:=/gi;  
const PHILOSOPH_RE   = /\bemergent\b|\bflux\b|\bbecoming\b|\brelational\b|\bontology\b|\bprocess\b|\bdialectical\b|\bphenomenological\b/gi;  
const DEONTIC_RE     = /\bshould\b|\bmust\b|\bmay\b|\bought\b|\bobligation\b|\bpermitted\b|\bforbidden\b|\bduty\b/gi;  
  
export interface RegimeWeights {  
  readonly alpha: number;  
  readonly beta:  number;  
  readonly gamma: number;  
}  
  
export interface RegimeEstimate {  
  weights:        RegimeWeights;  
  confidence:     number;           // 1 = single dominant regime; 0 = maximally mixed  
  dominantRegime: 'alpha' | 'beta' | 'gamma' | 'indeterminate';  
}  
  
export interface RegimeEstimatorOptions {  
  smoothingFactor?: number;         // EMA α; 0–1, higher = more reactive. Default: 0.3  
}  
  
/** Normalized Shannon entropy over the three weights → [0, 1]. */  
function normalizedEntropy(w: RegimeWeights): number {  
  const vals = [w.alpha, w.beta, w.gamma].filter(v => v > 0);  
  if (vals.length === 0) return 1;  
  const H = -vals.reduce((sum, p) => sum + p * Math.log2(p), 0);  
  return H / Math.log2(3);           // max entropy for 3 categories ≈ 1.585 bits  
}  
  
export class RegimeEstimator {  
  private smoothed: RegimeWeights = { alpha: 0, beta: 0, gamma: 0 };  
  private hasData = false;  
  private readonly ema: number;  
  
  constructor(options: RegimeEstimatorOptions = {}) {  
    this.ema = options.smoothingFactor ?? 0.3;  
  }  
  
  estimate(textChunk: string): RegimeEstimate {  
    const metabolic     = textChunk.match(METABOLIC_RE)?.length  ?? 0;  
    const philosophical = textChunk.match(PHILOSOPH_RE)?.length  ?? 0;  
    const deontic       = textChunk.match(DEONTIC_RE)?.length    ?? 0;  
  
    // Design decision: gamma (hybrid) only fires when deontic co-occurs with  
    // formal notation (deontic logic, formalized ethics). Pure deontic without  
    // formal context is treated as philosophical discourse (beta) rather than  
    // silently dropped — which was the original bug.  
    const alpha         = metabolic;  
    const betaRaw       = philosophical + (metabolic === 0 ? deontic : 0);  
    const gamma         = metabolic > 0 && deontic > 0 ? deontic : 0;  
    const total         = alpha + betaRaw + gamma || 1;  
  
    const raw: RegimeWeights = {  
      alpha: alpha    / total,  
      beta:  betaRaw  / total,  
      gamma: gamma    / total,  
    };  
  
    // EMA smoothing — prevents single-token noise from dominating the output.  
    const a = this.ema;  
    const smoothed: RegimeWeights = this.hasData  
      ? {  
          alpha: a * raw.alpha + (1 - a) * this.smoothed.alpha,  
          beta:  a * raw.beta  + (1 - a) * this.smoothed.beta,  
          gamma: a * raw.gamma + (1 - a) * this.smoothed.gamma,  
        }  
      : raw;  
  
    this.smoothed = smoothed;  
    this.hasData  = true;  
  
    const confidence  = 1 - normalizedEntropy(smoothed);  
    const max         = Math.max(smoothed.alpha, smoothed.beta, smoothed.gamma);  
    const dominantRegime =  
      confidence < 0.2        ? 'indeterminate'  
      : smoothed.alpha === max ? 'alpha'  
      : smoothed.beta  === max ? 'beta'  
      :                          'gamma';  
  
    return { weights: smoothed, confidence, dominantRegime };  
  }  
  
  reset(): void {  
    this.smoothed = { alpha: 0, beta: 0, gamma: 0 };  
    this.hasData  = false;  
  }  
}
