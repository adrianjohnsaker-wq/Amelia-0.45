// TransitionSelector.ts
//
// Updated TransitionSelector with Retention Asymmetry integration.
//
// The retention layer modifies the live self-loop weight of the active zone
// before normalization and sampling.

import type { ZoneId, ResumeBias } from "./CommitmentMemoryEngine";
import { CommitmentMemoryEngine } from "./CommitmentMemoryEngine";
import { RetentionAsymmetryEngine, type RetentionTelemetry } from "./RetentionAsymmetryEngine";

export interface TransitionScoreMap {
  [zone: string]: number;
}

export interface TransitionSelectionTelemetry {
  currentZone: ZoneId;
  baseScores: Record<string, number>;
  adjustedScores: Record<string, number>;
  memoryBiasApplied: boolean;
  preferredExit: ZoneId | null;
  preferredBoost: number;
  rivalPenalties: Record<string, number>;
  foreclosureStrength: number;
  commitmentConfidence: number;
  narrowingConfidence: number;
  biasDecay: number;
  retentionTelemetry?: RetentionTelemetry[];
}

function safeNumber(v: any): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export class TransitionSelector {
  constructor(
    private commitmentMemoryEngine: CommitmentMemoryEngine,
    private retentionAsymmetryEngine: RetentionAsymmetryEngine
  ) {}

  public lastTelemetry: TransitionSelectionTelemetry | null = null;

  public selectNextZone(
    processKey: string,
    currentZone: ZoneId,
    currentStep: number,
    baseScores: TransitionScoreMap,
    observedSelfLoopDepth: number
  ): ZoneId {
    const adjusted = { ...baseScores };

    // 1. Apply Commitment (PM2) Bias
    const resumeBias = this.commitmentMemoryEngine.getResumeBias(
      processKey,
      currentZone,
      currentStep
    );

    if (resumeBias?.shouldApply) {
      this.applyResumeBias(adjusted, resumeBias);
    }

    // 2. Apply Retention Asymmetry (RA) Floor
    const rawSelfLoopProb = safeNumber(adjusted[currentZone]);
    const retainedSelfLoopProb = this.retentionAsymmetryEngine.applyToSelfLoop(
      currentZone,
      rawSelfLoopProb,
      observedSelfLoopDepth,
      1
    );
    adjusted[currentZone] = retainedSelfLoopProb;

    this.renormalize(adjusted);

    this.lastTelemetry = {
      currentZone,
      baseScores: { ...baseScores },
      adjustedScores: { ...adjusted },
      memoryBiasApplied: !!resumeBias?.shouldApply,
      preferredExit: resumeBias?.preferredExit ?? null,
      preferredBoost: resumeBias?.boost ?? 0,
      rivalPenalties: resumeBias?.rivalPenalties ? Object.fromEntries(Object.entries(resumeBias.rivalPenalties).map(([k,v]) => [k, safeNumber(v)])) : {},
      foreclosureStrength: resumeBias?.foreclosureStrength ?? 0,
      commitmentConfidence: resumeBias?.commitmentConfidence ?? 0,
      narrowingConfidence: resumeBias?.narrowingConfidence ?? 0,
      biasDecay: resumeBias?.decay ?? 0,
      retentionTelemetry: this.retentionAsymmetryEngine.getLastTelemetry()
    };

    return this.sampleWeighted(adjusted);
  }

  private applyResumeBias(
    scores: TransitionScoreMap,
    bias: ResumeBias
  ): void {
    if (bias.preferredExit && scores[bias.preferredExit] !== undefined) {
      scores[bias.preferredExit] =
        scores[bias.preferredExit] * (1 + bias.boost);
    }

    for (const [rival, penalty] of Object.entries(bias.rivalPenalties)) {
      if (scores[rival] !== undefined) {
        scores[rival] = scores[rival] * Math.max(0.01, 1 - safeNumber(penalty));
      }
    }
  }

  private renormalize(scores: TransitionScoreMap): void {
    const total = Object.values(scores).reduce((a, b) => a + Math.max(0, b), 0);
    if (total <= 0) return;

    for (const key of Object.keys(scores)) {
      scores[key] = Math.max(0, scores[key]) / total;
    }
  }

  private sampleWeighted(scores: TransitionScoreMap): ZoneId {
    const entries = Object.entries(scores) as [ZoneId, number][];
    const total = entries.reduce((a, [, v]) => a + v, 0);

    if (total <= 0) {
      return entries[0][0];
    }

    let r = Math.random() * total;
    for (const [zone, weight] of entries) {
      r -= weight;
      if (r <= 0) return zone;
    }

    return entries[entries.length - 1][0];
  }
}
