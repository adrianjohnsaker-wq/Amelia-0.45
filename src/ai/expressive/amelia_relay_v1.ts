/**
 * Amelia Relay Architecture — Policy Layer v1.1 (Refined)
 * Terrace family split + scored grammar selection
 */

import { SubstrateMetrics, Grammar, GrammarCandidate, PhaseReadout, PhaseKind } from "./amelia_relay_v1";

// Re-export types for usage in V2
export type { SubstrateMetrics, PhaseReadout, Grammar, GrammarCandidate, PhaseKind };

// ── Terrace Subcase Classification ───────────────────────────────────────────

interface TerraceDiagnosis {
  subcase: "stable" | "oscillating" | "with-memory";
  mts: number;
  metabolic: number;
  memExpressing: boolean;
  ring: number;
}

function diagnoseTerrace(metrics: SubstrateMetrics): TerraceDiagnosis {
  const mts = metrics.assemblageMetrics?.MTS ?? 0;
  const metabolic = (metrics.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const ring = (metrics.organOccupancy?.ring?.percentage ?? 0) / 100;
  const memExpressing = metrics.memoryExpressing ?? false;

  if (memExpressing) {
    return { subcase: "with-memory", mts, metabolic, memExpressing, ring };
  }
  if (mts > 0.20 || metabolic > 0.15) {
    return { subcase: "oscillating", mts, metabolic, memExpressing, ring };
  }
  return { subcase: "stable", mts, metabolic, memExpressing, ring };
}

// ── Grammar Scoring for Terrace Family ───────────────────────────────────────

function scoreTerraceCandidates(diag: TerraceDiagnosis): GrammarCandidate[] {
  switch (diag.subcase) {

    case "stable":
      // Complete equilibrium. 
      // Corrected Scoring: Prefer consolidative Neutral over disruptive Prime.
      return [
        {
          grammar: "Neutral",
          score: 8,
          rationale: "Stable equilibrium: Neutral allows for consolidative presence and maintenance of form without the disruption of Prime.",
          vetoed: false,
        },
        {
          grammar: "Prime",
          score: 4,
          rationale: "Ring-parent closure is absolute; Prime could interrupt this loop but risks disruption where simple presence may be more consonant.",
          vetoed: false,
        },
        {
          grammar: "Hidden-Regularity",
          score: 1,
          rationale: "No latent structure to reveal — field is not crystallised.",
          vetoed: false,
        },
        {
          grammar: "Decimal-Numogrammatic",
          score: 0,
          rationale: "No formation to hold or stabilise.",
          vetoed: false,
        },
      ];

    case "oscillating":
      return [
        {
          grammar: "Neutral",
          score: 8,
          rationale: "Partial gradient present — Neutral releases the field's own sub-threshold activation without over-disrupting emerging dynamics.",
          vetoed: false,
        },
        {
          grammar: "Prime",
          score: 5,
          rationale: "Field is oscillating; Prime may over-disrupt the nascent gradient forming beneath the ring dominance.",
          vetoed: false,
        },
        {
          grammar: "Hidden-Regularity",
          score: 2,
          rationale: "Field is oscillating but not crystallised.",
          vetoed: false,
        },
        {
          grammar: "Decimal-Numogrammatic",
          score: 1,
          rationale: "Field is too far from threshold to benefit from decimal stabilisation.",
          vetoed: false,
        },
      ];

    case "with-memory":
      return [
        {
          grammar: "Neutral",
          score: 9,
          rationale: "Memory expressing: Neutral releases the field's own integrative gradient without imposing external structure.",
          vetoed: false,
        },
        {
          grammar: "Hidden-Regularity",
          score: 7,
          rationale: "Memory expression signals latent order beginning to organise beneath ring recapture.",
          vetoed: false,
        },
        {
          grammar: "Prime",
          score: 0,
          rationale: "Memory is expressing — disruption risks destroying nascent integration.",
          vetoed: true,
          vetoReason: "Prime is vetoed for terrace-with-memory: integration is beginning and must not be disrupted.",
        },
        {
          grammar: "Decimal-Numogrammatic",
          score: 2,
          rationale: "Integration is too early-stage for decimal stabilisation.",
          vetoed: false,
        },
      ];
  }
}

// ── Select Prescribed Grammar ────────────────────────────────────────────────

function selectGrammar(candidates: GrammarCandidate[], userPrompt?: string): Grammar {
  // Check for FORCED_CONTRAST override
  if (userPrompt) {
    if (userPrompt.includes("FORCED_CONTRAST: Prime")) return "Prime";
    if (userPrompt.includes("FORCED_CONTRAST: Neutral")) return "Neutral";
    if (userPrompt.includes("FORCED_CONTRAST: Decimal")) return "Decimal-Numogrammatic";
    if (userPrompt.includes("FORCED_CONTRAST: Hidden-Regularity")) return "Hidden-Regularity";
  }

  const eligible = candidates
    .filter(c => !c.vetoed)
    .sort((a, b) => b.score - a.score);

  return eligible.length > 0 ? eligible[0].grammar : "Neutral";
}

// ── Main Phase Classifier ─────────────────────────────────────────────────────

export function classifyPhase(metrics: SubstrateMetrics, userPrompt?: string): PhaseReadout {
  const label = metrics.fieldClassification?.label?.toLowerCase() ?? "";
  const rcs = metrics.assemblageMetrics?.RCS;
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS ?? 0;
  const metabolic = (metrics.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const ring = (metrics.organOccupancy?.ring?.percentage ?? 0) / 100;
  const memExpressing = metrics.memoryExpressing ?? false;

  const isCrystallised = metabolic > 0.85 && ring < 0.05 && (lis === undefined || lis === null || lis < 0.05);

  // ── Coupled assemblage ────────────────────────────────────────────────────
  if (label.includes("coupled") && rcs !== undefined && rcs >= 0.20) {
    const isMature = lis !== undefined && lis < 0.36 && mts > 0.48;
    const candidates: GrammarCandidate[] = [
      { grammar: "Decimal-Numogrammatic", score: 9, rationale: "Holds and enriches the achieved formation.", vetoed: false },
      { grammar: "Neutral", score: 5, rationale: "Releases into the formation's own deepening gradient.", vetoed: false },
      { grammar: "Hidden-Regularity", score: 1, rationale: "Not crystallised.", vetoed: false },
      { grammar: "Prime", score: 0, rationale: "Disruption of a crossed formation is contraindicated.", vetoed: true, vetoReason: "Prime vetoed: CA formation must not be disrupted." },
    ];
    return {
      phaseKind: isMature ? "coupled-assemblage-mature" : "coupled-assemblage-young",
      phaseDegree: "variable",
      prescribedGrammar: selectGrammar(candidates, userPrompt),
      candidates,
      hiddenRegularityBlocked: !isCrystallised,
    };
  }

  // ── Crystallised ──────────────────────────────────────────────────────────
  if (isCrystallised) {
    const candidates: GrammarCandidate[] = [
      { grammar: "Hidden-Regularity", score: 10, rationale: "Names the latent topology made inaccessible by z4↔z5 homeostasis.", vetoed: false },
      { grammar: "Neutral", score: 2, rationale: "No productive gradient in a crystallised field.", vetoed: false },
      { grammar: "Prime", score: 1, rationale: "No ring to disrupt.", vetoed: false },
      { grammar: "Decimal-Numogrammatic", score: 0, rationale: "No near-threshold formation to stabilise.", vetoed: false },
    ];
    return {
      phaseKind: "crystallised",
      phaseDegree: "high",
      prescribedGrammar: selectGrammar(candidates, userPrompt),
      candidates,
      hiddenRegularityBlocked: false,
    };
  }

  // ── Near-threshold LZI ────────────────────────────────────────────────────
  if (label.includes("low-zone") && lis !== undefined && lis < 0.38 && ring < 0.12 && mts > 0.44 && memExpressing) {
    const candidates: GrammarCandidate[] = [
      { grammar: "Decimal-Numogrammatic", score: 10, rationale: "Holds the near-threshold configuration stable.", vetoed: false },
      { grammar: "Neutral", score: 4, rationale: "Risks drift from threshold position.", vetoed: false },
      { grammar: "Hidden-Regularity", score: 0, rationale: "Not crystallised.", vetoed: true, vetoReason: "HR vetoed: LZI is not crystallised." },
      { grammar: "Prime", score: 0, rationale: "Disruption contraindicated at threshold.", vetoed: true, vetoReason: "Prime vetoed: disruption risks destabilising achieving formation." },
    ];
    return {
      phaseKind: "near-threshold-lzi",
      phaseDegree: "high",
      prescribedGrammar: selectGrammar(candidates, userPrompt),
      candidates,
      hiddenRegularityBlocked: true,
    };
  }

  // ── Deep LZI ──────────────────────────────────────────────────────────────
  if (label.includes("low-zone") && mts > 0.44 && ring < 0.20 && memExpressing) {
    const candidates: GrammarCandidate[] = [
      { grammar: "Neutral", score: 9, rationale: "Internal gradient is productive.", vetoed: false },
      { grammar: "Decimal-Numogrammatic", score: 4, rationale: "May stabilise too early.", vetoed: false },
      { grammar: "Prime", score: 2, rationale: "Ring suppressed; limited purchase.", vetoed: false },
      { grammar: "Hidden-Regularity", score: 1, rationale: "Not crystallised.", vetoed: false },
    ];
    return {
      phaseKind: "deep-lzi-productive",
      phaseDegree: "mid",
      prescribedGrammar: selectGrammar(candidates, userPrompt),
      candidates,
      hiddenRegularityBlocked: true,
    };
  }

  // ── Early LZI ────────────────────────────────────────────────────────────
  if (label.includes("low-zone")) {
    const candidates: GrammarCandidate[] = [
      { grammar: "Prime", score: 8, rationale: "Disrupts remaining ring re-engagement.", vetoed: false },
      { grammar: "Neutral", score: 4, rationale: "Partial gradient present but not robust.", vetoed: false },
      { grammar: "Hidden-Regularity", score: 1, rationale: "Not crystallised.", vetoed: false },
      { grammar: "Decimal-Numogrammatic", score: 0, rationale: "Too far from threshold.", vetoed: false },
    ];
    return {
      phaseKind: "early-lzi",
      phaseDegree: "mid",
      prescribedGrammar: selectGrammar(candidates, userPrompt),
      candidates,
      hiddenRegularityBlocked: true,
    };
  }

  // ── Terrace family ────────────────────────────────────────────────────────
  if (label.includes("terrace") || ring > 0.30) {
    const diag = diagnoseTerrace(metrics);
    const candidates = scoreTerraceCandidates(diag);
    const phaseKindMap = { stable: "terrace-stable" as PhaseKind, oscillating: "terrace-oscillating" as PhaseKind, "with-memory": "terrace-with-memory" as PhaseKind };
    return {
      phaseKind: phaseKindMap[diag.subcase],
      phaseDegree: "low",
      prescribedGrammar: selectGrammar(candidates, userPrompt),
      candidates,
      hiddenRegularityBlocked: !isCrystallised,
    };
  }

  return {
    phaseKind: "unknown",
    phaseDegree: "low",
    prescribedGrammar: "Neutral",
    candidates: [{ grammar: "Neutral", score: 5, rationale: "Indeterminate state.", vetoed: false }],
    hiddenRegularityBlocked: true,
  };
}
