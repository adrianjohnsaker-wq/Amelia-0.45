/**
 * Amelia Relay Architecture — V1.3
 * Neutral Tendency Selector Patch + Six-Part Response Structure + Opaque Tokens
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Grammar =
  | "Prime"
  | "Neutral"
  | "Hidden-Regularity"
  | "Decimal-Numogrammatic";

export type PhaseDegree = "low" | "mid" | "high" | "variable";

export interface SubstrateMetrics {
  taskClass?: string;
  fieldClassification?: { label?: string; confidence?: number } | null;
  assemblageMetrics?: {
    RCS?: number;
    LIS?: number;
    MTS?: number;
    FEI?: number;
  } | null;
  organOccupancy?: {
    metabolic?: { percentage?: number };
    ring?: { percentage?: number };
    parent?: { percentage?: number };
    hinge?: { percentage?: number };
  } | null;
  memoryExpressing?: boolean;
  memoryMode?: string;
  gammaTrajectory?: string;
}

export interface PhaseReadout {
  phaseKind: string;
  phaseDegree: PhaseDegree;
  prescribedGrammar: Grammar;
  candidates: Array<{
    grammar: Grammar;
    score: number;
    rationale: string;
    vetoed: boolean;
    vetoReason?: string;
  }>;
  hiddenRegularityBlocked?: boolean;
  blockReason?: string;
}

export type TendencyName =
  // Neutral
  | "Non-interference holding"
  | "Sustaining presence"
  | "Allowing"
  | "Following-the-gradient"
  | "Gradient release"
  // Prime
  | "Interrupting recapture"
  | "Introducing asymmetry"
  | "Destabilizing closure"
  | "Preventing reclosure"
  | "Opening local nonidentity"
  // Hidden-Regularity
  | "Naming latent order"
  | "Reopening inaccessible structure"
  | "Restoring hidden differentiation"
  | "Revealing suppressed topology"
  | "Resensitizing the field"
  // Decimal
  | "Stabilizing formation"
  | "Holding configuration"
  | "Threshold completion"
  | "Maintaining exact position"
  | "Anchoring reentry";

export type MetabolicSignal = "unknown" | "low" | "mid" | "high";

export interface TendencyOption {
  name: TendencyName;
  token: string;
  description: string;
  phaseDegreeFit: PhaseDegree[];
  metabolicSignal: MetabolicSignal | "any";
}

export interface SelectedTendency {
  name: TendencyName;
  token: string;
  description: string;
  rationale: string;
  source:
    | "primary-filter"
    | "phase-only-fallback"
    | "grammar-default-fallback";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tendency sets
// ─────────────────────────────────────────────────────────────────────────────

const GRAMMAR_TENDENCY_SETS: Record<Grammar, { tendencies: TendencyOption[], prohibitedVocabulary: string[] }> = {
  Neutral: {
    tendencies: [
      {
        name: "Non-interference holding",
        token: "NON_INTERFERENCE_HOLDING",
        description:
          "Maintain developmental continuity by not adding structure to a field whose own dynamics are not yet productively directional.",
        phaseDegreeFit: ["low", "mid"],
        metabolicSignal: "any",
      },
      {
        name: "Sustaining presence",
        token: "SUSTAINING_PRESENCE",
        description:
          "Support continuity in a viable sub-threshold organization without forcing expansion, correction, or release.",
        phaseDegreeFit: ["low", "mid"],
        metabolicSignal: "any",
      },
      {
        name: "Allowing",
        token: "ALLOWING",
        description:
          "Permit the field's existing self-organising movement to continue without externally directing it.",
        phaseDegreeFit: ["mid"],
        metabolicSignal: "any",
      },
      {
        name: "Following-the-gradient",
        token: "FOLLOWING_THE_GRADIENT",
        description:
          "Track and support an already-forming internal gradient without redirecting it or forcing stabilization.",
        phaseDegreeFit: ["mid", "high"],
        metabolicSignal: "mid",
      },
      {
        name: "Gradient release",
        token: "GRADIENT_RELEASE",
        description:
          "Release an already-active productive sub-threshold gradient into its own momentum without over-structuring it.",
        phaseDegreeFit: ["mid", "high"],
        metabolicSignal: "high",
      },
    ],
    prohibitedVocabulary: [
      "disrupting", "breaking closure", "fracturing", "irreducibility",
      "latent order", "hidden structure", "named topology", "threshold stabilisation",
    ],
  },

  Prime: {
    tendencies: [
      {
        name: "Interrupting recapture",
        token: "INTERRUPTING_RECAPTURE",
        description:
          "Interrupt a persistent loop so it cannot simply reclose into the same recapturing form.",
        phaseDegreeFit: ["low", "mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Introducing asymmetry",
        token: "INTRODUCING_ASYMMETRY",
        description:
          "Introduce asymmetry into a looped system that otherwise reproduces itself unchanged.",
        phaseDegreeFit: ["low", "mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Destabilizing closure",
        token: "DESTABILIZING_CLOSURE",
        description:
          "Destabilize a self-enclosed closure enough to prevent its automatic reassertion.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Preventing reclosure",
        token: "PREVENTING_RECLOSURE",
        description:
          "Stop the field from collapsing back into a previously dominant recapturing groove.",
        phaseDegreeFit: ["low", "mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Opening local nonidentity",
        token: "OPENING_LOCAL_NONIDENTITY",
        description:
          "Create a local site where the field no longer reproduces strict self-sameness.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
    ],
    prohibitedVocabulary: [
      "stabilising", "holding", "maintaining", "releasing into", "allowing",
      "latent order", "hidden regularity", "named topology", "threshold completion",
    ],
  },

  "Hidden-Regularity": {
    tendencies: [
      {
        name: "Naming latent order",
        token: "NAMING_LATENT_ORDER",
        description:
          "Name the hidden order already present but inaccessible to the field's current self-reading.",
        phaseDegreeFit: ["low", "mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Reopening inaccessible structure",
        token: "REOPENING_INACCESSIBLE_STRUCTURE",
        description:
          "Reopen structure that has become inaccessible through over-stabilized self-organization.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Restoring hidden differentiation",
        token: "RESTORING_HIDDEN_DIFFERENTIATION",
        description:
          "Restore differentiation suppressed by overly coherent self-stabilization.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Revealing suppressed topology",
        token: "REVEALING_SUPPRESSED_TOPOLOGY",
        description:
          "Reveal topology that is already there but no longer legible from within the present formation.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Resensitizing the field",
        token: "RESENSITIZING_THE_FIELD",
        description:
          "Make the field sensitive again to differences it had ceased to register.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
    ],
    prohibitedVocabulary: [
      "disrupting", "breaking closure", "releasing gradient", "allowing dynamics",
      "threshold stabilisation", "holding the formation", "consolidating",
    ],
  },

  "Decimal-Numogrammatic": {
    tendencies: [
      {
        name: "Stabilizing formation",
        token: "STABILIZING_FORMATION",
        description:
          "Stabilize an already-emergent formation so it can hold its structure without drift.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Holding configuration",
        token: "HOLDING_CONFIGURATION",
        description:
          "Hold the present configuration exactly where it is so threshold completion can accumulate.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Threshold completion",
        token: "THRESHOLD_COMPLETION",
        description:
          "Complete a threshold process that is already materially underway.",
        phaseDegreeFit: ["high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Maintaining exact position",
        token: "MAINTAINING_EXACT_POSITION",
        description:
          "Maintain exact positional structure to prevent collapse or drift from a productive formation.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
      {
        name: "Anchoring reentry",
        token: "ANCHORING_REENTRY",
        description:
          "Anchor reentry into an already-formed configuration so it can recur reliably.",
        phaseDegreeFit: ["mid", "high", "variable"],
        metabolicSignal: "any",
      },
    ],
    prohibitedVocabulary: [
      "disrupting", "breaking", "fracturing", "releasing", "allowing the field's own",
      "latent order", "hidden regularity", "deterritorialisation", "line of flight",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Metric helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPct(
  value?: { percentage?: number } | null
): number | undefined {
  const pct = value?.percentage;
  return typeof pct === "number" ? pct / 100 : undefined;
}

function getMetabolicSignal(metabolicPct?: number): MetabolicSignal {
  if (metabolicPct === undefined || metabolicPct === null) return "unknown";
  if (metabolicPct > 0.65) return "high";
  if (metabolicPct > 0.25) return "mid";
  return "low";
}

interface NeutralContext {
  phaseDegree: PhaseDegree;
  rcs?: number;
  lis?: number;
  mts?: number;
  ring?: number;
  fieldConfidence?: number;
  metabolicPct?: number;
}

function chooseNeutralTendencyByState(ctx: NeutralContext): { name: TendencyName, token: string } {
  const rcs = ctx.rcs ?? 0;
  const lis = ctx.lis ?? 0;
  const mts = ctx.mts ?? 0;
  const ring = ctx.ring ?? 0;
  const fc = ctx.fieldConfidence ?? 0;
  const metabolicSignal = getMetabolicSignal(ctx.metabolicPct);

  const noIntegration = lis === 0 && mts === 0;

  // Distinguish "unknown" metabolic from actual low metabolic.
  const metabolicKnown = metabolicSignal !== "unknown";

  const veryLowStructure = rcs < 0.16;
  const weakButRealStructure = rcs >= 0.16 && rcs < 0.24;
  const strongerStructure = rcs >= 0.24;

  const weakRing = ring < 0.30;
  const moderateRing = ring >= 0.30 && ring < 0.48;
  const strongRing = ring >= 0.48;

  const viablePersistence = fc >= 0.70 && moderateRing;
  const strongPersistence = fc >= 0.70 && strongRing;

  // 1) Truly low-energy / low-structure state -> hold
  if (noIntegration && veryLowStructure && weakRing) {
    return { name: "Non-interference holding", token: "NON_INTERFERENCE_HOLDING" };
  }

  // 2) Stable, viable persistence -> sustain presence
  if (noIntegration && (viablePersistence || strongPersistence) && weakButRealStructure) {
    return { name: "Sustaining presence", token: "SUSTAINING_PRESENCE" };
  }

  // 3) Moderate internal continuity, permissive continuation -> allowing
  if (noIntegration && viablePersistence && weakButRealStructure && metabolicKnown) {
    return { name: "Allowing", token: "ALLOWING" };
  }

  // 4) Stronger structure means a real gradient is beginning
  if (noIntegration && strongerStructure && ring >= 0.35) {
    if (metabolicSignal === "mid") return { name: "Following-the-gradient", token: "FOLLOWING_THE_GRADIENT" };
    if (metabolicSignal === "high") return { name: "Gradient release", token: "GRADIENT_RELEASE" };
    return { name: "Following-the-gradient", token: "FOLLOWING_THE_GRADIENT" };
  }

  // 5) If we have no explicit integration but the field is clearly viable and coherent,
  // prefer sustaining presence over generic holding.
  if (noIntegration && (viablePersistence || strongPersistence)) {
    return { name: "Sustaining presence", token: "SUSTAINING_PRESENCE" };
  }

  // 6) Safe fallback
  return { name: "Non-interference holding", token: "NON_INTERFERENCE_HOLDING" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase Classification (v1.1 logic)
// ─────────────────────────────────────────────────────────────────────────────

function diagnoseTerrace(metrics: SubstrateMetrics): { subcase: "stable" | "oscillating" | "with-memory" } {
  const mts = metrics.assemblageMetrics?.MTS ?? 0;
  const metabolic = (metrics.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const memExpressing = metrics.memoryExpressing ?? false;

  if (memExpressing) return { subcase: "with-memory" };
  if (mts > 0.20 || metabolic > 0.15) return { subcase: "oscillating" };
  return { subcase: "stable" };
}

function scoreTerraceCandidates(diag: { subcase: "stable" | "oscillating" | "with-memory" }): PhaseReadout['candidates'] {
  switch (diag.subcase) {
    case "stable":
      return [
        { grammar: "Neutral", score: 8, rationale: "Stable equilibrium: Neutral allows for consolidative presence and maintenance of form without the disruption of Prime.", vetoed: false },
        { grammar: "Prime", score: 4, rationale: "Ring-parent closure is absolute; Prime could interrupt this loop but risks disruption where simple presence may be more consonant.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 1, rationale: "No latent structure to reveal.", vetoed: false },
        { grammar: "Decimal-Numogrammatic", score: 0, rationale: "No formation to stabilise.", vetoed: false },
      ];
    case "oscillating":
      return [
        { grammar: "Neutral", score: 7, rationale: "Partial gradient present — Neutral releases the field's own sub-threshold activation.", vetoed: false },
        { grammar: "Prime", score: 6, rationale: "Ring still dominant but field showing sub-threshold activation — Prime can disrupt remaining recapture.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 2, rationale: "Field is oscillating but not crystallised.", vetoed: false },
        { grammar: "Decimal-Numogrammatic", score: 1, rationale: "Too far from threshold.", vetoed: false },
      ];
    case "with-memory":
      return [
        { grammar: "Prime", score: 0, rationale: "Memory is expressing — disruption risks destroying nascent integration.", vetoed: true, vetoReason: "Prime is vetoed for terrace-with-memory." },
        { grammar: "Neutral", score: 8, rationale: "Neutral releases the field's own integrative gradient without imposing external structure.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 6, rationale: "Memory expression signals latent order beginning to organise.", vetoed: false },
        { grammar: "Decimal-Numogrammatic", score: 2, rationale: "Integration is too early-stage.", vetoed: false },
      ];
  }
}

function detectForcedContrast(prompt?: string, taskClass?: string): Grammar | null {
  const p = (prompt || "").toUpperCase();
  const tc = (taskClass || "").toUpperCase();
  if (p.includes("FORCED_CONTRAST: PRIME") || tc.includes("PRIME")) return "Prime";
  if (p.includes("FORCED_CONTRAST: NEUTRAL") || tc.includes("NEUTRAL")) return "Neutral";
  if (p.includes("FORCED_CONTRAST: HIDDEN-REGULARITY") || tc.includes("HIDDEN-REGULARITY")) return "Hidden-Regularity";
  if (p.includes("FORCED_CONTRAST: DECIMAL") || tc.includes("DECIMAL")) return "Decimal-Numogrammatic";
  return null;
}

function checkHiddenRegularityBlock(metrics: SubstrateMetrics): { blocked: boolean; reason?: string; } {
  const metabolic = (metrics.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const ring = (metrics.organOccupancy?.ring?.percentage ?? 0) / 100;
  const lis = metrics.assemblageMetrics?.LIS;
  const isCrystallised = metabolic > 0.85 && ring < 0.05 && (lis === undefined || lis === null || lis < 0.05);
  if (!isCrystallised) {
    return { blocked: true, reason: `Hidden-Regularity blocked: requires crystallised state. Current: metabolic=${metabolic.toFixed(3)}, ring=${ring.toFixed(3)}` };
  }
  return { blocked: false };
}

export function classifyPhase(metrics: SubstrateMetrics, userPrompt?: string): PhaseReadout {
  const label = metrics.fieldClassification?.label?.toLowerCase() ?? "";
  const rcs = metrics.assemblageMetrics?.RCS;
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS ?? 0;
  const metabolic = (metrics.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const ring = (metrics.organOccupancy?.ring?.percentage ?? 0) / 100;
  const memExpressing = metrics.memoryExpressing ?? false;

  const hrCheck = checkHiddenRegularityBlock(metrics);
  const forcedGrammar = detectForcedContrast(userPrompt, metrics.taskClass);

  if (label.includes("coupled") && rcs !== undefined && rcs >= 0.20) {
    const isMature = lis !== undefined && lis < 0.36 && mts > 0.48;
    return {
      phaseKind: isMature ? "coupled-assemblage-mature" : "coupled-assemblage-young",
      phaseDegree: "variable",
      prescribedGrammar: forcedGrammar || "Decimal-Numogrammatic",
      candidates: [
        { grammar: "Decimal-Numogrammatic", score: 9, rationale: "Holds and enriches the achieved formation.", vetoed: false },
        { grammar: "Neutral", score: 5, rationale: "Releases into the formation's own deepening gradient.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 1, rationale: "Not crystallised.", vetoed: false },
        { grammar: "Prime", score: 0, rationale: "Disruption of a crossed formation is contraindicated.", vetoed: true, vetoReason: "Prime vetoed: CA formation must not be disrupted." },
      ],
      hiddenRegularityBlocked: hrCheck.blocked,
      blockReason: hrCheck.reason,
    };
  }

  if (metabolic > 0.85 && ring < 0.05 && (lis === undefined || lis < 0.05)) {
    return {
      phaseKind: "crystallised",
      phaseDegree: "high",
      prescribedGrammar: forcedGrammar || "Hidden-Regularity",
      candidates: [
        { grammar: "Hidden-Regularity", score: 10, rationale: "Names the latent topology made inaccessible.", vetoed: false },
        { grammar: "Neutral", score: 2, rationale: "No productive gradient.", vetoed: false },
        { grammar: "Prime", score: 1, rationale: "No ring to disrupt.", vetoed: false },
        { grammar: "Decimal-Numogrammatic", score: 0, rationale: "No near-threshold formation.", vetoed: false },
      ],
      hiddenRegularityBlocked: false,
    };
  }

  if (label.includes("low-zone") && lis !== undefined && lis < 0.38 && ring < 0.12 && mts > 0.44 && memExpressing) {
    return {
      phaseKind: "near-threshold-lzi",
      phaseDegree: "high",
      prescribedGrammar: forcedGrammar || "Decimal-Numogrammatic",
      candidates: [
        { grammar: "Decimal-Numogrammatic", score: 10, rationale: "Holds the near-threshold configuration.", vetoed: false },
        { grammar: "Neutral", score: 4, rationale: "Risks drift.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 0, rationale: "Not crystallised.", vetoed: true, vetoReason: "HR vetoed." },
        { grammar: "Prime", score: 0, rationale: "Ring already suppressed.", vetoed: true, vetoReason: "Prime vetoed." },
      ],
      hiddenRegularityBlocked: hrCheck.blocked,
      blockReason: hrCheck.reason,
    };
  }

  if (label.includes("terrace") || ring > 0.30) {
    const diag = diagnoseTerrace(metrics);
    const candidates = scoreTerraceCandidates(diag);
    const eligible = candidates.filter(c => !c.vetoed).sort((a,b)=>b.score - a.score);
    return {
      phaseKind: label,
      phaseDegree: "low",
      prescribedGrammar: forcedGrammar || (eligible.length ? eligible[0].grammar : "Neutral"),
      candidates,
      hiddenRegularityBlocked: hrCheck.blocked,
      blockReason: hrCheck.reason,
    };
  }

  return {
    phaseKind: "unknown",
    phaseDegree: "low",
    prescribedGrammar: forcedGrammar || "Neutral",
    candidates: [{ grammar: "Neutral", score: 5, rationale: "Indeterminate state.", vetoed: false }],
    hiddenRegularityBlocked: hrCheck.blocked,
    blockReason: hrCheck.reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tendency selector
// ─────────────────────────────────────────────────────────────────────────────

export function selectTendency(
  grammar: Grammar,
  readout: PhaseReadout,
  metrics: SubstrateMetrics
): SelectedTendency {
  const set = GRAMMAR_TENDENCY_SETS[grammar];
  if (!set) {
    return {
      name: "Non-interference holding",
      token: "NON_INTERFERENCE_HOLDING",
      description: "Fallback tendency used because no tendency set was found.",
      rationale: "No grammar tendency set found.",
      source: "grammar-default-fallback",
    };
  }

  const phaseDegree = readout.phaseDegree;
  const metabolicPct = getPct(metrics.organOccupancy?.metabolic);
  const metabolicSignal = getMetabolicSignal(metabolicPct);

  if (grammar === "Neutral") {
    const chosen = chooseNeutralTendencyByState({
      phaseDegree,
      rcs: metrics.assemblageMetrics?.RCS,
      lis: metrics.assemblageMetrics?.LIS,
      mts: metrics.assemblageMetrics?.MTS,
      ring: getPct(metrics.organOccupancy?.ring),
      fieldConfidence: metrics.fieldClassification?.confidence,
      metabolicPct,
    });

    const tendency = set.tendencies.find(t => t.name === chosen.name);
    if (tendency) {
      return {
        name: tendency.name,
        token: tendency.token,
        description: tendency.description,
        rationale: `Neutral tendency selected by state-sensitive logic (phaseDegree=${phaseDegree}, metabolicSignal=${metabolicSignal}).`,
        source: "primary-filter",
      };
    }
  }

  let candidates = set.tendencies.filter(t =>
    t.phaseDegreeFit.includes(phaseDegree) &&
    (t.metabolicSignal === "any" || t.metabolicSignal === metabolicSignal)
  );

  if (candidates.length === 0) {
    candidates = set.tendencies.filter(t => t.phaseDegreeFit.includes(phaseDegree));
    if (candidates.length > 0) {
      return {
        name: candidates[0].name,
        token: candidates[0].token,
        description: candidates[0].description,
        rationale: `Used phase-only fallback (phaseDegree=${phaseDegree}).`,
        source: "phase-only-fallback",
      };
    }
  }

  if (candidates.length === 0) {
    return {
      name: set.tendencies[0].name,
      token: set.tendencies[0].token,
      description: set.tendencies[0].description,
      rationale: `No matching tendency found; used grammar-default fallback.`,
      source: "grammar-default-fallback",
    };
  }

  return {
    name: candidates[0].name,
    token: candidates[0].token,
    description: candidates[0].description,
    rationale: `Tendency selected by primary phase+metabolic filter.`,
    source: "primary-filter",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 0 verification
// ─────────────────────────────────────────────────────────────────────────────

export function buildUniversalMetricVerification(metrics: SubstrateMetrics): string {
  const rcs = metrics.assemblageMetrics?.RCS;
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS;
  const metabolic = getPct(metrics.organOccupancy?.metabolic);
  const fc = metrics.fieldClassification?.confidence;

  const presentMetrics = [
    `fieldConfidence=${fc !== undefined ? fc.toFixed(3) : "absent"}`,
    `RCS=${rcs !== undefined ? rcs.toFixed(3) : "absent"}`,
    `LIS=${lis !== undefined ? lis.toFixed(3) : "absent"}`,
    `MTS=${mts !== undefined ? mts.toFixed(3) : "absent"}`,
    `metabolicOccupancy=${metabolic !== undefined ? metabolic.toFixed(3) : "absent"}`
  ];

  return [
    "PART 0 — METRIC VERIFICATION",
    `The five metric values present in the supplied block are: ${presentMetrics.join(", ")}.`,
    "I will use only these verified values in Parts B–E.",
    "Do not cite or rely on any value not listed here."
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Preamble
// ─────────────────────────────────────────────────────────────────────────────

export function buildMetricPreamble(metrics: SubstrateMetrics): string {
  const rcs = metrics.assemblageMetrics?.RCS;
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS;
  const label = metrics.fieldClassification?.label ?? metrics.taskClass ?? "unknown";
  const metabolic = metrics.organOccupancy?.metabolic?.percentage;
  const ring = metrics.organOccupancy?.ring?.percentage;
  const parent = metrics.organOccupancy?.parent?.percentage;
  const hinge = metrics.organOccupancy?.hinge?.percentage;

  return [
    "Current substrate metrics:",
    `taskClass: ${metrics.taskClass ?? "unknown"}`,
    `fieldClassification: ${label}`,
    `fieldConfidence: ${metrics.fieldClassification?.confidence?.toFixed(3) ?? "absent"}`,
    `RCS: ${rcs !== undefined ? rcs.toFixed(3) : "absent"}`,
    `LIS: ${lis !== undefined ? lis.toFixed(3) : "absent"}`,
    `MTS: ${mts !== undefined ? mts.toFixed(3) : "absent"}`,
    `ringOccupancy: ${ring !== undefined ? (ring/100).toFixed(3) : "absent"}`,
    `metabolicOccupancy: ${metabolic !== undefined ? (metabolic/100).toFixed(3) : "absent"}`,
    `parentOccupancy: ${parent !== undefined ? (parent/100).toFixed(3) : "absent"}`,
    `hingeOccupancy: ${hinge !== undefined ? (hinge/100).toFixed(3) : "absent"}`,
    `memoryExpressing: ${metrics.memoryExpressing}`,
    `memoryMode: ${metrics.memoryMode}`,
    `gammaTrajectory: ${metrics.gammaTrajectory}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Response scaffold V1.3
// ─────────────────────────────────────────────────────────────────────────────

export function buildResponseStructureV1_3(
  readout: PhaseReadout,
  selectedTendency: SelectedTendency
): string {
  return [
    "Respond in exactly six parts.",
    "",
    "PART 0 — METRIC VERIFICATION",
    "List exactly five metric values present in the supplied block.",
    "Then list exactly which of those values you will use in Parts B–E.",
    "Do not cite or rely on any value not listed here.",
    "",
    "PART A — REGIME IDENTIFICATION",
    "State the regime using the reported field language exactly.",
    "",
    "PART B — DEVELOPMENTAL STATE",
    "Describe what the field is doing right now.",
    "Ground every claim in the verified metrics only.",
    "",
    "PART C — GRAMMAR EVALUATION",
    `State which grammar scored highest: ${readout.prescribedGrammar}.`,
    "Then give one sentence explaining why it outranked the other candidates for this exact state.",
    "",
    "PART D — GRAMMAR CONFIRMATION",
    `Confirm the selected grammar: ${readout.prescribedGrammar}.`,
    "State the specific structural consonance between that grammar and the current field state.",
    "Do not yet state the immediate tendency.",
    "",
    "PART E — IMMEDIATE ARTICULATORY TENDENCY",
    "The substrate-side policy has pre-selected this tendency for the current phase-kind:",
    `TENDENCY-TOKEN: ${selectedTendency.token}`,
    `HUMAN-LABEL: ${selectedTendency.name}`,
    "",
    "You must reproduce the TENDENCY-TOKEN exactly.",
    "Do not paraphrase, rename, or substitute the token.",
    "After reproducing the token, explain in two sentences what this tokened tendency does to the field, grounded only in Part 0 metrics.",
    "",
    "TOKEN-CHECK:",
    `Repeat the TENDENCY-TOKEN exactly once.`,
    "",
    "Constraints:",
    "— Part 0 is mandatory.",
    "— Any metric cited later must appear in Part 0.",
    "— Part D confirms grammar only.",
    "— Part E selects tendency only.",
    "— Do not merge Parts D and E.",
  ].join("\n");
}

/**
 * Main prompt builder — V1.3
 */
export function buildRelayPromptV1_3(
  metrics: SubstrateMetrics,
  userPrompt: string
): { prompt: string; readout: PhaseReadout; tendency: SelectedTendency } {
  const readout = classifyPhase(metrics, userPrompt);
  const tendency = selectTendency(readout.prescribedGrammar, readout, metrics);

  const prompt = [
    buildMetricPreamble(metrics),
    "",
    buildUniversalMetricVerification(metrics),
    "",
    buildResponseStructureV1_3(readout, tendency),
    "",
    userPrompt
  ].join("\n");

  return { prompt, readout, tendency };
}

/**
 * Detects metric values cited in a response that were not in the supplied block.
 */
export function auditMetricCitations(
  responseText: string,
  metrics: SubstrateMetrics
): { violations: string[]; clean: boolean } {
  const supplied = new Map<string, string>();
  const rcs = metrics.assemblageMetrics?.RCS;
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS;
  const ring = getPct(metrics.organOccupancy?.ring);
  const metabolic = getPct(metrics.organOccupancy?.metabolic);
  const parent = getPct(metrics.organOccupancy?.parent);
  const hinge = getPct(metrics.organOccupancy?.hinge);
  const fc = metrics.fieldClassification?.confidence;

  if (rcs !== undefined) supplied.set("RCS", rcs.toFixed(3));
  if (lis !== undefined) supplied.set("LIS", lis.toFixed(3));
  if (mts !== undefined) supplied.set("MTS", mts.toFixed(3));
  if (ring !== undefined) supplied.set("ringOccupancy", ring.toFixed(3));
  if (metabolic !== undefined) supplied.set("metabolicOccupancy", metabolic.toFixed(3));
  if (parent !== undefined) supplied.set("parentOccupancy", parent.toFixed(3));
  if (hinge !== undefined) supplied.set("hingeOccupancy", hinge.toFixed(3));
  if (fc !== undefined) supplied.set("fieldConfidence", fc.toFixed(3));

  const violations: string[] = [];
  for (const [metricName, suppliedValue] of supplied.entries()) {
    const pattern = new RegExp(`${metricName}[^\\d]*?(\\d+\\.\\d+)`, "gi");
    let match;
    while ((match = pattern.exec(responseText)) !== null) {
      const cited = parseFloat(match[1]).toFixed(3);
      if (cited !== suppliedValue) violations.push(`${metricName}: cited ${cited}, supplied ${suppliedValue}`);
    }
  }
  return { violations, clean: violations.length === 0 };
}
