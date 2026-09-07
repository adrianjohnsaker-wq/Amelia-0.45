import { RegimeEstimator }         from "./RegimeEstimator";  
import { NormativeLoadEstimator }  from "./NormativeLoadEstimator";  
import { DriftDetector }           from "./DriftDetector";  
import { TelemetryBuffer, RegimeTick, TelemetrySummary } from "./TelemetryBuffer";  
  
export type TickEmitter = (tick: RegimeTick) => Promise<void> | void;  
  
export interface OrchestratorOptions {  
  chunkSize?:       number;   // Tokens per telemetry tick. Default: 12  
  overlapTokens?:   number;   // Words carried into next window. Default: 4  
  smoothingFactor?: number;  
  driftThreshold?:  number;  
}  
  
export class TelemetryOrchestrator {  
  private readonly regime:    RegimeEstimator;  
  private readonly normative: NormativeLoadEstimator;  
  private readonly drift:     DriftDetector;  
  private readonly buffer:    TelemetryBuffer;  
  
  private readonly chunkSize:     number;  
  private readonly overlapTokens: number;  
  
  private chunkBuffer  = "";  
  private carryOver    = "";  
  private tokenCounter = 0;  
  
  constructor(  
    private readonly emitTick: TickEmitter,  
    options: OrchestratorOptions = {}  
  ) {  
    this.chunkSize     = options.chunkSize     ?? 12;  
    this.overlapTokens = options.overlapTokens ?? 4;  
  
    const ema = options.smoothingFactor ?? 0.3;  
    this.regime    = new RegimeEstimator({ smoothingFactor: ema });  
    this.normative = new NormativeLoadEstimator({ smoothingFactor: ema });  
    this.drift     = new DriftDetector({ threshold: options.driftThreshold ?? 0.35 });  
    this.buffer    = new TelemetryBuffer();  
  }  
  
  /** Call once per streamed token. Non-blocking. */  
  async ingestToken(token: string): Promise<void> {  
    this.chunkBuffer += token;  
    this.tokenCounter++;  
  
    if (this.tokenCounter % this.chunkSize === 0) {  
      await this.flush();  
    }  
  }  
  
  /**  
   * Call when the stream ends. Flushes any remaining tokens so the tail  
   * is never silently discarded, then returns the full session summary.  
   */  
  async finalize(): Promise<TelemetrySummary> {  
    if (this.chunkBuffer.length > 0) {  
      await this.flush();  
    }  
    return this.buffer.summary();  
  }  
  
  getBuffer(): TelemetryBuffer {  
    return this.buffer;  
  }  
  
  private async flush(): Promise<void> {  
    // Sliding window: prepend carry-over from previous chunk for cross-boundary  
    // signal continuity (e.g. "lemma … therefore" split across a window edge).  
    const window    = this.carryOver + this.chunkBuffer;  
    const estimate  = this.regime.estimate(window);  
    const normLoad  = this.normative.estimate(window);  
    const driftEvt  = this.drift.detect(estimate.weights);  
  
    const tick: RegimeTick = {  
      t:              this.tokenCounter,  
      weights:        estimate.weights,  
      normativeLoad:  normLoad,  
      drift:          driftEvt.drift,  
      driftDelta:     driftEvt.delta,  
      confidence:     estimate.confidence,  
      dominantRegime: estimate.dominantRegime,  
    };  
  
    this.buffer.addTick(tick);  
  
    try {  
      await this.emitTick(tick);  
    } catch (err) {  
      // Emission failure must not crash the generation loop.  
      console.error("[TelemetryOrchestrator] emitTick failed:", err);  
    }  
  
    // Carry the last N words into the next window.  
    this.carryOver   = this.chunkBuffer.split(/\s+/).slice(-this.overlapTokens).join(" ");  
    this.chunkBuffer = "";  
  }  
}