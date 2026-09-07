
export interface SemanticTrace {
  vector: number[];
  intensity: number;
  timestamp: number;
}
export class DissipativeSemanticField {
  private traces: SemanticTrace[] = [];
  addTrace(vec: number[], intensity: number) {
    this.traces.push({ vector: vec, intensity, timestamp: Date.now() });
     if (this.traces.length > 50) { // Limit traces to avoid unbounded growth
      this.traces.shift();
    }
  }
  /**
   * Returns a modulation vector that *discourages* repetition * while allowing faint continuity.
   */
  getDissipationVector(): number[] {
    const now = Date.now();
    const decay = 0.00005;
    let mod = new Array(32).fill(0); // Match embedding vector length
    for (const t of this.traces) {
      const age = now - t.timestamp;
      const w = t.intensity * Math.exp(-decay * age);
      // subtract old directions
      for (let i = 0; i < mod.length; i++) {
        if (t.vector && t.vector[i]) {
            mod[i] -= w * t.vector[i];
        }
      }
    }
    return mod;
  }
}
