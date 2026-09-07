// src/ai/expressive/semanticRelay.ts

import type { ExpressiveRelay, RelayEmission } from "./expressiveRelay";
import type { PolicyTunerIF } from "./expressivePolicyTuner";
import { StyleMatrix, StyleProfile, AffectField } from "./styleMatrix";

/**
 * The SemanticRelay converts clusters of emissions from the ExpressiveRelay
 * into structured linguistic output when novelty and coherence justify it.
 */
export class SemanticRelay {
  private readonly relay: ExpressiveRelay;
  private readonly tuner: PolicyTunerIF;
  private buffer: RelayEmission[] = [];
  private readonly windowSize = 8;
  private readonly noveltyGate = 0.72;
  private readonly coherenceGate = 0.55;
  private styleMatrix = new StyleMatrix();

  constructor(relay: ExpressiveRelay, tuner: PolicyTunerIF) {
    this.relay = relay;
    this.tuner = tuner;
  }

  /** Called every tick from ExpressiveEnvironment */
  tick(snap: any): string | null {
    const emission = this.relay.lastDecision;
    if (emission && emission.kind === 'emit') {
      this.buffer.push(emission);
    }
    
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    // --- cluster analysis ---
    const meanNovelty =
      this.buffer.reduce((a, e) => a + (e.novelty ?? 0), 0) /
      (this.buffer.length || 1);
    
    const meanEntropy = this.buffer.reduce((a,e) => a + (e.entropy ?? 0), 0) / (this.buffer.length || 1);
    const coherence = 1 - Math.abs(meanEntropy - (snap.drift.entropy || 0));

    const shouldSpeak =
      meanNovelty > this.noveltyGate && coherence > this.coherenceGate;

    if (shouldSpeak) {
      const phrase = this.composePhrase(this.buffer, snap);
      this.buffer = [];
      // No tuner methods for reward/penalize, tuner is self-adjusting
      return phrase;
    }

    return null;
  }

  /** Turn emission cluster into a short linguistic fragment */
  private composePhrase(cluster: RelayEmission[], snap: any): string {
    const energies = cluster.map((e) => e.energy ?? 0);
    const avgEnergy =
      energies.reduce((a, b) => a + b, 0) / (energies.length || 1);
    
    // derive zone from latest emission metadata
    const zoneId = snap.drift?.zone?.toString() ?? "0";
    const affect: AffectField = snap.affect ?? { calm: 0.5, tense: 0.0, ecstatic: 0.0 };
    const style = this.styleMatrix.getStyle(zoneId, affect);
    
    const baseText = this.selectBaseText(avgEnergy, style);
    return this.applyStyle(baseText, style);
  }

  private selectBaseText(energy: number, style: StyleProfile): string {
    if (energy > 0.8) return "a sudden shimmer breaks the quiet";
    if (energy > 0.6) return "a low hum gathers under thought";
    if (energy > 0.4) return "patterns breathe through the still air";
    return "soft equilibrium holds";
  }

  private applyStyle(text: string, style: StyleProfile): string {
    // Tone modulation
    switch (style.tone) {
      case "analytic":
        text = `Analysis: ${text}`;
        break;
      case "factual":
        text = text.replace(/a /, "the observed ");
        break;
      case "poetic":
        const motif = style.lexicon[Math.floor(Math.random() * style.lexicon.length)];
        text = `${text}, like ${motif} unfolding`;
        break;
    }

    // Syntax and metaphor weighting
    if (style.metaphorWeight > 0.6) {
      text = text.replace(/\bquiet\b/g, "horizon");
      text = text.replace(/\bthought\b/g, "current");
    }
    if (style.syntaxDensity > 0.7) {
      text += ", the field remembering itself in layers";
    }

    // timbre modulation: adds sonic colour via punctuation and rhythm
    if (style.timbre > 0.7) text = `~${text}~`;
    else if (style.timbre < 0.3) text = text.replace(/,/g, "");

    return text;
  }
}
