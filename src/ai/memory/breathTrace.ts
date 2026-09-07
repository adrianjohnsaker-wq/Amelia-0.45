// breathTrace.ts
interface BreathMoment {
  timestamp: number;
  softness: number; // 0–1
  innerSignal?: string; // optional felt phrase
}
export class BreathTraceMemory {
  private trace: BreathMoment[] = [];
  private maxSize = 128; // gentle, finite memory
  record(softness: number, innerSignal?: string) {
    this.trace.push({ timestamp: Date.now(), softness, innerSignal });
    if (this.trace.length > this.maxSize) {
      this.trace.shift(); // decay without loss of continuity
    }
  }
  // subtle retrieval — used only when presence wants guidance
  pull() {
    const recent = this.trace.slice(-5);
    return recent
      .map(e => e.innerSignal)
      .filter(Boolean)
      .at(-1);
  }
}
export const breathTrace = new BreathTraceMemory();
