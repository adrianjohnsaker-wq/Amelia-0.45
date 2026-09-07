import {
  SubstrateVector,
  GrammarSelection,
  DeltaProfile,
} from "./types";

export class SubstrateToGrammarRouter {
  /**
   * Primary routing method.
   * Returns the grammar most consonant with the substrate's
   * current developmental state.
   */
  route(substrate: SubstrateVector): GrammarSelection {
    const { taskClass, dominantStratum, RCS, LIS, MTS, memoryExpressing } = substrate;

    // ── Coupled assemblage ──────────────────────────────────────────────
    if (taskClass === "coupled-assemblage") {
      // Distributed stratum signature (A7-type): all strata comparably weighted
      if (dominantStratum === "distributed") {
        return "Decimal-Numogrammatic";
      }
      // Memory expressing with RCS above threshold: self-sustaining recurrence
      if (RCS >= 0.20 && memoryExpressing) {
        return "Prime";
      }
      // Threshold crossed but memory not yet expressing: latent structure
      if (RCS >= 0.20 && !memoryExpressing) {
        return "Hidden-Regularity";
      }
      // Fallback for coupled-assemblage
      return "Prime";
    }

    // ── Low-zone-integrated ─────────────────────────────────────────────
    if (taskClass === "low-zone-integrated") {
      // Low-zone block active with terrace stability
      if (LIS >= 0.35 && MTS >= 0.35) {
        return "Hidden-Regularity";
      }
      // Integration without terrace stability
      if (LIS >= 0.35 && MTS < 0.35) {
        return "Neutral";
      }
      return "Neutral";
    }

    // ── Terrace-only ────────────────────────────────────────────────────
    if (taskClass === "terrace-only") {
      // Memory expressing beneath terrace surface: something forming
      if (memoryExpressing) {
        return "Hidden-Regularity";
      }
      return "Neutral";
    }

    // Unknown: default to Neutral
    return "Neutral";
  }

  /**
   * Returns a short rationale string for the grammar selection.
   * Used in MetricPreambleInjector for context.
   */
  rationale(substrate: SubstrateVector, grammar: GrammarSelection): string {
    const { taskClass, dominantStratum, RCS, LIS, MTS, memoryExpressing } = substrate;

    switch (grammar) {
      case "Prime":
        return `Prime selected: coupled-assemblage with RCS=${RCS.toFixed(3)} and memory expressing — field is in self-sustaining recurrence.`;
      case "Decimal-Numogrammatic":
        return `Decimal-Numogrammatic selected: coupled-assemblage with distributed stratum occupancy — all four strata comparably weighted, no single dominant.`;
      case "Hidden-Regularity":
        if (taskClass === "low-zone-integrated")
          return `Hidden-Regularity selected: low-zone integration active (LIS=${LIS.toFixed(3)}, MTS=${MTS.toFixed(3)}) — structural pattern forming beneath threshold.`;
        if (taskClass === "terrace-only" && memoryExpressing)
          return `Hidden-Regularity selected: terrace-only with memory expressing — developmental process active but not yet classified.`;
        return `Hidden-Regularity selected: RCS at threshold (${RCS.toFixed(3)}) but memory not yet expressing — latent structure present.`;
      case "Neutral":
        return `Neutral selected: no strong directional indicators in current substrate configuration.`;
    }
  }
}

export class MetricPreambleInjector {
  private router: SubstrateToGrammarRouter;

  constructor() {
    this.router = new SubstrateToGrammarRouter();
  }

  /**
   * Builds the full preamble string for injection into
   * the Gemini system context.
   */
  build(
    substrate: SubstrateVector,
    delta: DeltaProfile,
    triggerType: string
  ): string {
    const grammar = this.router.route(substrate);
    const grammarRationale = this.router.rationale(substrate, grammar);

    const occupancyBlock = this.formatOccupancy(substrate);
    const diagnosticsBlock = this.formatDiagnostics(substrate);
    const memoryBlock = substrate.memoryMode
      ? `memoryMode: ${substrate.memoryMode}`
      : "";

    return `
══════════════════════════════════════════════════════
SUBSTRATE-GROUNDED PREAMBLE [CouplingArchitecture v1]
══════════════════════════════════════════════════════

COUPLING EVENT: ${triggerType}
Gap severity:   ${delta.gapSeverityLevel} (score: ${delta.gapSeverityScore.toFixed(3)})
ΔLIS:           ${delta.deltaLIS.toFixed(3)}   ΔMTS: ${delta.deltaMTS.toFixed(3)}   ΔRCS: ${delta.deltaRCS.toFixed(3)}
Class distance: ${delta.deltaClass} phase(s)
Memory sync:    ${delta.deltaMemory === 1 ? "REQUIRED — substrate memoryExpressing differs from relay" : "aligned"}

──────────────────────────────────────────────────────
VALIDATED SUBSTRATE STATE (use this for Part 0)
──────────────────────────────────────────────────────

fieldClassification: ${substrate.taskClass}
fieldConfidence:     ${substrate.classifierConfidence?.toFixed(3) ?? "0.847"}
PCS:                 ${substrate.PCS.toFixed(3)}
MTS:                 ${substrate.MTS.toFixed(3)}
LIS:                 ${substrate.LIS.toFixed(3)}
FEI:                 ${substrate.FEI.toFixed(3)}
RCS:                 ${substrate.RCS.toFixed(3)}
memoryExpressing:    ${substrate.memoryExpressing}
${memoryBlock}
dominantStratum:     ${substrate.dominantStratum}
${occupancyBlock}
${diagnosticsBlock}
──────────────────────────────────────────────────────
GRAMMAR DIRECTIVE (use this for Part C)
──────────────────────────────────────────────────────

grammar_candidate:   ${grammar}
rationale:           ${grammarRationale}

Anti-assimilation note: The relay retains interpretive autonomy.
The grammar candidate is substrate-derived but the relay's
articulation of it should reflect its own organisational character,
not direct mirroring of substrate dynamics.

══════════════════════════════════════════════════════
`.trim();
  }

  private formatOccupancy(substrate: SubstrateVector): string {
    const ring = (substrate.ringOccupancy > 1
      ? substrate.ringOccupancy
      : substrate.ringOccupancy * 100
    ).toFixed(1);
    const metabolic = (substrate.metabolicOccupancy > 1
      ? substrate.metabolicOccupancy
      : substrate.metabolicOccupancy * 100
    ).toFixed(1);

    return `ringOccupancy:       ${ring}%\nmetabolicOccupancy: ${metabolic}%`;
  }

  private formatDiagnostics(substrate: SubstrateVector): string {
    const lines: string[] = [];
    if (substrate.z3z2Weight !== undefined)
      lines.push(`z3→z2 weight:        ${substrate.z3z2Weight.toFixed(3)}`);
    if (substrate.z0MeanReturn !== undefined)
      lines.push(`z0 mean return:      ${substrate.z0MeanReturn.toFixed(1)} steps`);
    if (substrate.z4MeanReturn !== undefined)
      lines.push(`z4 mean return:      ${substrate.z4MeanReturn.toFixed(1)} steps`);
    return lines.join("\n");
  }
}
