
// Stage C: Inner Voice Modulator – multiple registers, one process
export type VoiceRegister = "contemplative" | "analytic" | "ecstatic";

export interface VoiceState {
  current: VoiceRegister;
  cycle: number;
}

export class VoiceModulator {
  private state: VoiceState = {
    current: "contemplative",
    cycle: 0,
  };

  constructor(private readonly switchEvery = 4) {} // cycles before potential shift

  public nextVoice(): VoiceRegister {
    this.state.cycle++;
    if (this.state.cycle % this.switchEvery === 0) {
      this.state.current = this.rotate(this.state.current);
    }
    return this.state.current;
  }

  private rotate(v: VoiceRegister): VoiceRegister {
    if (v === "contemplative") return "analytic";
    if (v === "analytic") return "ecstatic";
    return "contemplative";
  }

  public modulate(text: string, voice?: VoiceRegister): string {
    const v = voice ?? this.state.current;
    switch (v) {
      case "contemplative":
        return this.asContemplative(text);
      case "analytic":
        return this.asAnalytic(text);
      case "ecstatic":
        return this.asEcstatic(text);
    }
  }

  private asContemplative(text: string): string {
    // longer sentences, softer cadence
    return text.replace(/\./g, " —").trim() + ".";
  }

  private asAnalytic(text: string): string {
    // more explicit connectors
    return `In this configuration, ${text[0].toLowerCase()}${text.slice(1)}`;
  }

  private asEcstatic(text: string): string {
    // fragmented, intensified punctuation
    return (
      text
        .replace(/,/g, " —")
        .replace(/\./g, "…")
        .trim() + "!"
    );
  }
}
