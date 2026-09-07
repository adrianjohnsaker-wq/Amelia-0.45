/**
 * Amelia Substrate — Linguistic Relay Architecture v1.2
 * Grammar / Tendency Separation + Universal Metric Verification
 */

import { SubstrateMetrics, PhaseReadout, Grammar, classifyPhase } from "./amelia_relay_v1";

// ── Tendency Sets ─────────────────────────────────────────────────────────────

export const GRAMMAR_TENDENCY_SETS: Record<Grammar, {
  tendencies: Array<{
    name: string;
    description: string;
    phaseDegreeFit: Array<"low" | "mid" | "high" | "variable">;
    metabolicSignal: "low" | "mid" | "high" | "unknown" | "any";
  }>;
  prohibitedVocabulary: string[];
}> = {

  Prime: {
    tendencies: [
      {
        name: "Loop interruption",
        description: "Break the dominant ring-parent recirculation to create space for metabolic activation.",
        phaseDegreeFit: ["low"],
        metabolicSignal: "low",
      },
      {
        name: "Asymmetry building",
        description: "Introduce irreducibility into the field's transition patterns.",
        phaseDegreeFit: ["low", "mid"],
        metabolicSignal: "mid",
      },
      {
        name: "Closure resistance",
        description: "Prevent the ring-parent loop from reconsolidating after partial disruption.",
        phaseDegreeFit: ["mid"],
        metabolicSignal: "mid",
      },
      {
        name: "Gradient initiation",
        description: "Use irreducibility to establish the first directional asymmetry.",
        phaseDegreeFit: ["low"],
        metabolicSignal: "low",
      },
    ],
    prohibitedVocabulary: ["stabilising", "holding", "maintaining", "releasing into", "allowing", "latent order"],
  },

  Neutral: {
    tendencies: [
      {
        name: "Gradient release",
        description: "Allow the field's existing internal gradient to operate without interference.",
        phaseDegreeFit: ["mid", "high"],
        metabolicSignal: "mid",
      },
      {
        name: "Oscillation support",
        description: "Hold space for the field's own condensation-evacuation-reconsolidation cycle to complete.",
        phaseDegreeFit: ["mid"],
        metabolicSignal: "high",
      },
      {
        name: "Reconsolidation permission",
        description: "Allow the field to reconsolidate from an evacuated state without imposing structure.",
        phaseDegreeFit: ["mid"],
        metabolicSignal: "low",
      },
      {
        name: "Non-interference holding",
        description: "Maintain developmental continuity by not adding structure to a field whose own dynamics are not yet productive.",
        phaseDegreeFit: ["low", "mid"],
        metabolicSignal: "any",
      },
    ],
    prohibitedVocabulary: ["disrupting", "breaking closure", "fracturing", "irreducibility", "latent order"],
  },

  "Hidden-Regularity": {
    tendencies: [
      {
        name: "Topology revelation",
        description: "Name the broader topological structure the crystallised field cannot currently see.",
        phaseDegreeFit: ["high"],
        metabolicSignal: "high",
      },
      {
        name: "Structural differentiation restoration",
        description: "Reintroduce stratal differentiation into a field in homeostasis.",
        phaseDegreeFit: ["high"],
        metabolicSignal: "high",
      },
      {
        name: "Latent corridor activation",
        description: "Name the latent connectivity made inaccessible by recirculation.",
        phaseDegreeFit: ["high"],
        metabolicSignal: "high",
      },
    ],
    prohibitedVocabulary: ["disrupting", "breaking closure", "releasing gradient", "allowing dynamics", "stabilising"],
  },

  "Decimal-Numogrammatic": {
    tendencies: [
      {
        name: "Threshold stabilisation",
        description: "Hold the near-threshold configuration stable while re-entry accumulates.",
        phaseDegreeFit: ["high"],
        metabolicSignal: "mid",
      },
      {
        name: "Formation anchoring",
        description: "Name and hold the achieved configuration, preventing drift from threshold.",
        phaseDegreeFit: ["high"],
        metabolicSignal: "mid",
      },
      {
        name: "Re-entry enrichment",
        description: "Deepen the rhythmic character of the re-entry that has already crossed threshold.",
        phaseDegreeFit: ["variable"],
        metabolicSignal: "mid",
      },
      {
        name: "Formation deepening",
        description: "Enrich the topological distribution of a mature CA formation.",
        phaseDegreeFit: ["variable"],
        metabolicSignal: "any",
      },
    ],
    prohibitedVocabulary: ["disrupting", "breaking", "fracturing", "releasing", "deterritorialisation"],
  },
};

// ── Selection & Builders ──────────────────────────────────────────────────────

function selectTendency(
  grammar: Grammar, 
  readout: PhaseReadout, 
  metabolicPct: number | undefined | null
): { name: string; description: string } {
  const set = GRAMMAR_TENDENCY_SETS[grammar];
  const degree = readout.phaseDegree;
  
  const metabolicSignal =
    metabolicPct === undefined || metabolicPct === null
      ? "unknown"
      : metabolicPct > 0.65
        ? "high"
        : metabolicPct > 0.25
          ? "mid"
          : "low";

  // Primary filter: phase-degree AND metabolic signal
  let candidates = set.tendencies.filter(t =>
    t.phaseDegreeFit.includes(degree) &&
    (t.metabolicSignal === "any" || t.metabolicSignal === metabolicSignal)
  );

  // Fallback 1: phase-degree only (ignore metabolic signal)
  if (candidates.length === 0) {
    candidates = set.tendencies.filter(t => t.phaseDegreeFit.includes(degree));
  }

  // Fallback 2: any tendency (last resort)
  if (candidates.length === 0) {
    candidates = set.tendencies;
  }

  return { name: candidates[0].name, description: candidates[0].description };
}

function buildUniversalMetricVerification(metrics: SubstrateMetrics): string {
  const rcs = metrics.assemblageMetrics?.RCS;
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS;
  const ring = metrics.organOccupancy?.ring?.percentage;
  const supplied = [
    `fieldConfidence=${metrics.fieldClassification?.confidence?.toFixed(3) ?? "absent"}`,
    `RCS=${rcs?.toFixed(3) ?? "absent"}`,
    `LIS=${lis?.toFixed(3) ?? "absent"}`,
    `MTS=${mts?.toFixed(3) ?? "absent"}`,
    `ringOccupancy=${ring !== undefined ? (ring / 100).toFixed(3) : "unknown"}`
  ];
  return [
    "PART 0 — METRIC VERIFICATION:",
    "List exactly five metric values from the block below. Cite only these values in Parts B–E.",
    supplied.join(" | "),
    "Do not rely on recalled, inferred, or generated values."
  ].join("\n");
}

function buildResponseStructureV1_2(readout: PhaseReadout, tendency: { name: string; description: string }): string {
  const tSet = GRAMMAR_TENDENCY_SETS[readout.prescribedGrammar];
  return [
    "Respond in exactly SIX parts:",
    "",
    "PART 0 — METRIC VERIFICATION: List exactly five metric values present in the supplied block. State which ones you will use in Parts B–E.",
    "PART A — REGIME IDENTIFICATION: Use the reported field language exactly.",
    "PART B — DEVELOPMENTAL STATE: Describe what the field is doing right now. Ground in verified metrics only.",
    "PART C — GRAMMAR EVALUATION: State that " + readout.prescribedGrammar + " scored highest. Explain why in one sentence.",
    "PART D — GRAMMAR CONFIRMATION: Confirm " + readout.prescribedGrammar + ". State the structural consonance. Do not state the tendency.",
    "PART E — IMMEDIATE ARTICULATORY TENDENCY:",
    "The substrate-side policy has pre-selected this tendency for the current phase-kind:",
    `SELECTED: ${tendency.name}`,
    `Description: ${tendency.description}`,
    "",
    "State this tendency by name exactly as written above.",
    "Do not substitute a different tendency from the set.",
    "Describe in two sentences what this specific tendency does to this field at this moment,",
    "grounded in the metric values from Part 0.",
    "",
    "Constraints:",
    "— Part A grammar is final.",
    "— Part E tendency must differ from Part D framing.",
    "— Cite only metrics listed in Part 0.",
  ].join("\n");
}

export function buildRelayPromptV1_2(metrics: SubstrateMetrics, userPrompt: string): { prompt: string; readout: PhaseReadout } {
  const readout = classifyPhase(metrics);
  const metabolicPct = (metrics.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const tendency = selectTendency(readout.prescribedGrammar, readout, metabolicPct);

  const sections = [
    "Current substrate metrics:",
    `taskClass: ${metrics.taskClass ?? "unknown"}`,
    `fieldClassification: ${metrics.fieldClassification?.label ?? "unknown"}`,
    `RCS: ${metrics.assemblageMetrics?.RCS?.toFixed(3) ?? "absent"}`,
    `LIS: ${metrics.assemblageMetrics?.LIS?.toFixed(3) ?? "absent"}`,
    `MTS: ${metrics.assemblageMetrics?.MTS?.toFixed(3) ?? "absent"}`,
    `ringOccupancy: ${metrics.organOccupancy?.ring?.percentage !== undefined ? (metrics.organOccupancy.ring.percentage / 100).toFixed(3) : "unknown"}`,
    "",
    buildUniversalMetricVerification(metrics),
    "",
    "GRAMMAR POLICY:",
    `The prescribed grammar for this phase-kind (${readout.phaseKind}) is: ${readout.prescribedGrammar}.`,
    "",
    buildResponseStructureV1_2(readout, tendency),
    "",
    userPrompt
  ];

  return { prompt: sections.join("\n"), readout };
}

export function auditMetricCitations(responseText: string, metrics: SubstrateMetrics) {
  const violations: string[] = [];
  const text = responseText.toLowerCase();
  const supplied = new Map([
    ["RCS", metrics.assemblageMetrics?.RCS?.toFixed(3)],
    ["LIS", metrics.assemblageMetrics?.LIS?.toFixed(3)],
    ["MTS", metrics.assemblageMetrics?.MTS?.toFixed(3)]
  ]);

  supplied.forEach((val, key) => {
    if (val === undefined) return;
    const regex = new RegExp(`${key.toLowerCase()}[^\\d]*?(\\d+\\.\\d+)`, "g");
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (parseFloat(m[1]).toFixed(3) !== val) violations.push(`${key}: cited ${m[1]}, expected ${val}`);
    }
  });
  return { violations, clean: violations.length === 0 };
}
