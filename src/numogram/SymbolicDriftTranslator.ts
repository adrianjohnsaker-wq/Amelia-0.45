// src/numogram/SymbolicDriftTranslator.ts
import { PatternDriftReport } from "./PatternDriftAnalyzer";
import { RDGPhase } from "./RDGPhaseClassifier";
import { DriftCorridorReport } from "./TemporalDriftCorridor";
import { CompressedSubstrateMemory } from "./SubstrateMemoryCompressor";

export interface SymbolicDriftContext {
  summary: string;
}

/**
 * Turn drift + RDG + memory into a symbolic context.
 * This is deliberately compact: a handful of motifs for the LLM.
 */
export function buildSymbolicDriftContext(
  drift: PatternDriftReport,
  rdgPhase: RDGPhase,
  corridors: DriftCorridorReport,
  memory: CompressedSubstrateMemory | null
): SymbolicDriftContext {
  const lines: string[] = [];
  lines.push("=== SYMBOLIC DRIFT CONTEXT ===");

  // RDG phase motif
  lines.push(`RDG-phase: ${rdgPhase.phase} (${rdgPhase.label})`);

  if (drift.isAttractor) {
    lines.push(
      "- Substrate in attractor regime: recurrent pattern key and stable motif backbone."
    );
  } else if (drift.isTransition) {
    lines.push(
      "- Substrate in transition: shifting zone / shear / demon-band; motif likely to mutate."
    );
  } else if (drift.driftFromPrevious && drift.driftFromPrevious.magnitude > 0.6) {
    lines.push(
      "- High-magnitude drift between last cycles: tension, intensity or entropy significantly reconfigured."
    );
  } else {
    lines.push(
      "- Drift moderate: no abrupt rupture, but the substrate is still quietly reconfiguring."
    );
  }

  // Corridors – last one as “current drift corridor”
  if (corridors.corridors.length > 0) {
    const last = corridors.corridors[corridors.corridors.length - 1];
    lines.push(
      `- Active drift corridor: cycles ${last.startCycle}→${
        last.endCycle
      }, trend=${last.dominantTrend}, avg|Δ|=${last.avgMagnitude.toFixed(3)}.`
    );
  }

  if (memory) {
    // Rough qualitative tags from compressed memory
    const highTension = memory.avgTension > 0.6;
    const highEntropy = memory.avgEntropy > 0.6;
    const highShear = memory.avgShear > 0.5;
    const highPressure = memory.avgReservoirPressure > 0.7;

    const motifs: string[] = [];
    if (highTension && !highEntropy) {
      motifs.push("coiled intensity without full dispersion");
    }
    if (highEntropy) {
      motifs.push("diffuse turbulence in the substrate field");
    }
    if (highShear) {
      motifs.push("strong shear between deep reservoir and fast drift");
    }
    if (highPressure) {
      motifs.push("over-pressurized shadow reservoir near rupture");
    }

    if (motifs.length > 0) {
      lines.push(`- Global substrate mood: ${motifs.join(", ")}.`);
    } else {
      lines.push(
        "- Global substrate mood: balanced basin with moderate flux and stable reservoir."
      );
    }
  } else {
    lines.push(
      "- Global substrate mood: insufficient history, treat as locally emergent with no strong global bias."
    );
  }

  return {
    summary: lines.join("\n"),
  };
}