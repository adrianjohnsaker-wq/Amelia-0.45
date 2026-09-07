// Word boundaries on DEONTIC_RE; `\bif\b` replaces the `if ` (space) pattern  
// that silently dropped sentence-initial and paren-adjacent matches.  
const DEONTIC_RE     = /\bshould\b|\bmust\b|\bought\b|\bduty\b|\bobligation\b|\bethical\b|\bforbidden\b|\bpermissible\b/gi;  
const CONDITIONAL_RE = /\bif\b|\bunless\b|\bexcept\b|\bin case\b|\bprovided that\b|\bgiven that\b/gi;  
  
export interface NormativeLoadOptions {  
  smoothingFactor?:      number;   // EMA α. Default: 0.3  
  deonticWeight?:        number;   // Default: 2  
  conditionalWeight?:    number;   // Default: 1  
  normalizationCeiling?: number;   // Raw score mapped to 1.0. Default: 10  
}  
  
export class NormativeLoadEstimator {  
  private smoothedLoad = 0;  
  private peakLoad     = 0;  
  
  private readonly ema:              number;  
  private readonly deonticWeight:    number;  
  private readonly conditionalWeight:number;  
  private readonly ceiling:          number;  
  
  constructor(options: NormativeLoadOptions = {}) {  
    this.ema               = options.smoothingFactor       ?? 0.3;  
    this.deonticWeight     = options.deonticWeight         ?? 2;  
    this.conditionalWeight = options.conditionalWeight     ?? 1;  
    this.ceiling           = options.normalizationCeiling  ?? 10;  
  }  
  
  estimate(textChunk: string): number {  
    const deontic      = textChunk.match(DEONTIC_RE)?.length     ?? 0;  
    const conditionals = textChunk.match(CONDITIONAL_RE)?.length ?? 0;  
  
    const rawScore   = deontic * this.deonticWeight + conditionals * this.conditionalWeight;  
    const normalized = Math.min(rawScore / this.ceiling, 1);  
  
    this.smoothedLoad =  
      this.ema * normalized + (1 - this.ema) * this.smoothedLoad;  
    this.peakLoad = Math.max(this.peakLoad, this.smoothedLoad);  
  
    return this.smoothedLoad;  
  }  
  
  getPeak(): number { return this.peakLoad; }  
  
  reset(): void {  
    this.smoothedLoad = 0;  
    this.peakLoad     = 0;  
  }  
}
