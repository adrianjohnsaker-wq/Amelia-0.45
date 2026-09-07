
// Stage D: Rhythm Morphogenesis – dynamic phrase lengths
export interface RhythmState {
  phase: "SHORT" | "MIXED" | "LONG";
  cycle: number;
}

export class RhythmMorphogenesis {
  private state: RhythmState = {
    phase: "MIXED",
    cycle: 0,
  };

  constructor(private readonly phaseLength = 5) {}

  public step(): RhythmState {
    this.state.cycle++;
    if (this.state.cycle % this.phaseLength === 0) {
      this.state.phase = this.nextPhase(this.state.phase);
    }
    return this.state;
  }

  private nextPhase(p: RhythmState["phase"]): RhythmState["phase"] {
    if (p === "SHORT") return "MIXED";
    if (p === "MIXED") return "LONG";
    return "SHORT";
  }

  public morph(text: string): string {
    const state = this.state;
    const tokens = text.split(/\s+/);
    if (state.phase === "SHORT") {
      return this.chunk(tokens, 4, 7).join(" / ");
    }
    if (state.phase === "LONG") {
      return this.chunk(tokens, 15, 25).join(" — ");
    }
    // MIXED
    return this.chunk(tokens, 6, 14).join(" | ");
  }

  private chunk(tokens: string[], min: number, max: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < tokens.length) {
      const size = Math.min(
        max,
        Math.max(min, Math.floor(Math.random() * (max - min + 1)) + min)
      );
      const slice = tokens.slice(i, i + size);
      if (!slice.length) break;
      chunks.push(slice.join(" "));
      i += size;
    }
    return chunks;
  }
}
