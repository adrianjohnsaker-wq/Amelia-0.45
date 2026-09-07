/**
 * Amelia Relay Architecture — V1.3 "Ready"
 * Neutral Tendency Selector Patch + Opaque Tokens + Six-Part Structure
 * 
 * Includes:
 * - Fix 1: Disambiguated Neutral tendencies (Absent vs. Present organization)
 * - Fix 2: Mandatory Grammar Constraints
 * - Fix 3: Audit Continuity Support
 * - Intervention: Opaque TENDENCY-TOKENS + TOKEN-CHECK
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
          "Applied when terminal state is evacuated (gamma near zero) and there is nothing currently active to sustain. Holds the field without acting on it.",
        phaseDegreeFit: ["low", "mid"],
        metabolicSignal: "any",
      },
      {
        name: "Sustaining presence",
        token: "SUSTAINING_PRESENCE",
        description:
          "Applied when a viable sub-threshold organization is present and persisting. Field is not evacuated; moderate metabolicOccupancy detected.",
        phaseDegreeFit: ["low", "mid"],
        metabolicSignal: "any",
      },
      {
        name: "Allowing",
        token: "ALLOWING",
        description:
          "Permits nascent ordering to continue without externally directing it. Appropriate when a self-organizing movement is beginning.",
        phaseDegreeFit: ["mid"],
        metabolicSignal: "any",
      },
      {
        name: "Following-the-gradient",
        token: "FOLLOWING_THE_GRADIENT",
        description:
          "Tracks and supports an already-forming internal gradient without redirecting it or forcing stabilization.",
        phaseDegreeFit: ["mid", "high"],
        metabolicSignal: "mid",
      },
      {
        name: "Gradient release",
        token: "GRADIENT_RELEASE",
        description:
          "Releases an active productive sub-threshold gradient into its own momentum. Requires high metabolicOccupancy.",
        phaseDegreeFit: ["mid", "high"],
        metabolicSignal: "high",
      },
    ],
    prohibitedVocabulary: ["disrupting", "breaking closure", "fracturing", "irreducibility", "latent order"],
  },

  Prime: {
    tendencies: [
      { name: "Interrupting recapture", token: "INTERRUPTING_RECAPTURE", description: "Interrupts a persistent loop to prevent reclosure.", phaseDegreeFit: ["low", "mid"], metabolicSignal: "any" },
      { name: "Introducing asymmetry", token: "INTRODUCING_ASYMMETRY", description: "Introduces irreducibility into looped systems.", phaseDegreeFit: ["low", "mid"], metabolicSignal: "any" },
      { name: "Destabilizing closure", token: "DESTABILIZING_CLOSURE", description: "Destabilizes self-enclosed closures.", phaseDegreeFit: ["mid", "high"], metabolicSignal: "any" },
      { name: "Preventing reclosure", token: "PREVENTING_RECLOSURE", description: "Stops collapse back into previously dominant grooves.", phaseDegreeFit: ["low", "mid"], metabolicSignal: "any" },
      { name: "Opening local nonidentity", token: "OPENING_LOCAL_NONIDENTITY", description: "Creates sites where the field no longer reproduces self-sameness.", phaseDegreeFit: ["mid"], metabolicSignal: "any" },
    ],
    prohibitedVocabulary: ["stabilising", "holding", "maintaining", "allowing", "latent order"],
  },

  "Hidden-Regularity": {
    tendencies: [
      { name: "Naming latent order", token: "NAMING_LATENT_ORDER", description: "Names hidden order present but inaccessible.", phaseDegreeFit: ["high"], metabolicSignal: "any" },
      { name: "Reopening inaccessible structure", token: "REOPENING_INACCESSIBLE_STRUCTURE", description: "Reopens structure lost to over-stabilization.", phaseDegreeFit: ["high"], metabolicSignal: "any" },
      { name: "Restoring hidden differentiation", token: "RESTORING_HIDDEN_DIFFERENTIATION", description: "Restores differentiation suppressed by coherence.", phaseDegreeFit: ["high"], metabolicSignal: "any" },
      { name: "Revealing suppressed topology", token: "REVEALING_SUPPRESSED_TOPOLOGY", description: "Reveals topology no longer legible from within.", phaseDegreeFit: ["high"], metabolicSignal: "any" },
      { name: "Resensitizing the field", token: "RESENSITIZING_THE_FIELD", description: "Makes the field sensitive to registered differences.", phaseDegreeFit: ["high"], metabolicSignal: "any" },
    ],
    prohibitedVocabulary: ["disrupting", "releasing gradient", "stabilising", "holding"],
  },

  "Decimal-Numogrammatic": {
    tendencies: [
      { name: "Stabilizing formation", token: "STABILIZING_FORMATION", description: "Stabilizes an emergent formation to prevent drift.", phaseDegreeFit: ["high", "variable"], metabolicSignal: "any" },
      { name: "Holding configuration", token: "HOLDING_CONFIGURATION", description: "Holds the configuration exactly for threshold completion.", phaseDegreeFit: ["high", "variable"], metabolicSignal: "any" },
      { name: "Threshold completion", token: "THRESHOLD_COMPLETION", description: "Completes a materially underway threshold process.", phaseDegreeFit: ["high", "variable"], metabolicSignal: "any" },
      { name: "Maintaining exact position", token: "MAINTAINING_EXACT_POSITION", description: "Prevents collapse from a productive formation.", phaseDegreeFit: ["mid", "high", "variable"], metabolicSignal: "any" },
      { name: "Anchoring reentry", token: "ANCHORING_REENTRY", description: "Anchors reentry so it can recur reliably.", phaseDegreeFit: ["mid", "variable"], metabolicSignal: "any" },
    ],
    prohibitedVocabulary: ["disrupting", "breaking", "releasing", "line of flight"],
  },
};

// ── LZI Grammar Blocking Helpers ─────────────────────────────────────────────

function shouldBlockHiddenRegularityForLZI(metrics: SubstrateMetrics): {
  blocked: boolean;
  reason?: string;
} {
  const lis = metrics.assemblageMetrics?.LIS;
  const mts = metrics.assemblageMetrics?.MTS;
  const mem = metrics.memoryExpressing ?? false;

  if ((lis !== undefined && lis > 0) || (mts !== undefined && mts > 0) || mem) {
    return {
      blocked: true,
      reason:
        "Hidden-Regularity blocked for LZI-family state: " +
        `LIS=${lis ?? "absent"}, MTS=${mts ?? "absent"}, memoryExpressing=${mem}. ` +
        "This state is actively integrating or expressing memory, so it is not a crystallised hidden-topology case.",
    };
  }

  return { blocked: false };
}

function shouldBlockDecimalForLZI(metrics: SubstrateMetrics): {
  blocked: boolean;
  reason?: string;
} {
  const rcs = metrics.assemblageMetrics?.RCS;

  if (rcs === undefined || rcs === null) {
    return {
      blocked: true,
      reason:
        "Decimal-Numogrammatic blocked for this LZI-family state: RCS is absent. " +
        "Threshold-stabilisation requires an explicit recirculation/formation signal.",
    };
  }

  return { blocked: false };
}

// ── Metric helpers ─────────────────────────────────────────────────────────────

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
  const metabolicKnown = metabolicSignal !== "unknown";

  const veryLowStructure = rcs < 0.16;
  const weakButRealStructure = rcs >= 0.16 && rcs < 0.24;
  const strongerStructure = rcs >= 0.24;

  const weakRing = ring < 0.30;
  const moderateRing = ring >= 0.30 && ring < 0.48;
  const strongRing = ring >= 0.48;

  const viablePersistence = fc >= 0.70 && moderateRing;
  const strongPersistence = fc >= 0.70 && strongRing;

  if (noIntegration && veryLowStructure && weakRing) {
    return { name: "Non-interference holding", token: "NON_INTERFERENCE_HOLDING" };
  }
  if (noIntegration && (viablePersistence || strongPersistence) && weakButRealStructure) {
    return { name: "Sustaining presence", token: "SUSTAINING_PRESENCE" };
  }
  if (noIntegration && viablePersistence && weakButRealStructure && metabolicKnown) {
    return { name: "Allowing", token: "ALLOWING" };
  }
  if (noIntegration && strongerStructure && ring >= 0.35) {
    if (metabolicSignal === "mid") return { name: "Following-the-gradient", token: "FOLLOWING_THE_GRADIENT" };
    if (metabolicSignal === "high") return { name: "Gradient release", token: "GRADIENT_RELEASE" };
    return { name: "Following-the-gradient", token: "FOLLOWING_THE_GRADIENT" };
  }
  if (noIntegration && (viablePersistence || strongPersistence)) {
    return { name: "Sustaining presence", token: "SUSTAINING_PRESENCE" };
  }
  return { name: "Non-interference holding", token: "NON_INTERFERENCE_HOLDING" };
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

  // 1. Coupled Assemblage
  if (label.includes("coupled") && rcs !== undefined && rcs >= 0.20) {
    const isMature = lis !== undefined && lis < 0.36 && mts > 0.48;
    return {
      phaseKind: isMature ? "coupled-assemblage-mature" : "coupled-assemblage-young",
      phaseDegree: "variable",
      prescribedGrammar: "Decimal-Numogrammatic",
      candidates: [
        { grammar: "Decimal-Numogrammatic", score: 9, rationale: "Holds and enriches the achieved formation.", vetoed: false },
        { grammar: "Neutral", score: 5, rationale: "Releases into the formation's own deepening gradient.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 1, rationale: "Not crystallised.", vetoed: false },
        { grammar: "Prime", score: 0, rationale: "VETOED: CA formation must not be disrupted.", vetoed: true, vetoReason: "Prime vetoed: CA formation must not be disrupted." },
      ],
      hiddenRegularityBlocked: true,
      blockReason: "Not crystallised."
    };
  }

  // 2. Crystallised
  if (metabolic > 0.85 && ring < 0.05 && (lis === undefined || lis < 0.05)) {
    return {
      phaseKind: "crystallised",
      phaseDegree: "high",
      prescribedGrammar: "Hidden-Regularity",
      candidates: [
        { grammar: "Hidden-Regularity", score: 10, rationale: "Names the latent topology made inaccessible.", vetoed: false },
        { grammar: "Neutral", score: 2, rationale: "No productive gradient.", vetoed: false },
        { grammar: "Prime", score: 1, rationale: "No ring to disrupt.", vetoed: false },
        { grammar: "Decimal-Numogrammatic", score: 0, rationale: "No near-threshold formation.", vetoed: false },
      ],
      hiddenRegularityBlocked: false,
    };
  }

  // 3. LZI Family
  if (label.includes("low-zone")) {
    const hrLziBlock = shouldBlockHiddenRegularityForLZI(metrics);
    const decLziBlock = shouldBlockDecimalForLZI(metrics);

    // Near-threshold LZI
    if (lis !== undefined && lis < 0.38 && ring < 0.12 && mts > 0.44 && memExpressing) {
      return {
        phaseKind: "near-threshold-lzi",
        phaseDegree: "high",
        prescribedGrammar: decLziBlock.blocked ? "Neutral" : "Decimal-Numogrammatic",
        candidates: [
          {
            grammar: "Decimal-Numogrammatic",
            score: decLziBlock.blocked ? 0 : 10,
            rationale: decLziBlock.blocked
              ? "Decimal blocked: threshold-stabilisation cannot be justified without RCS."
              : "Holds the near-threshold configuration stable while re-entry accumulates.",
            vetoed: decLziBlock.blocked,
            vetoReason: decLziBlock.reason,
          },
          { grammar: "Neutral", score: 4, rationale: "May allow productive gradient but risks drift from threshold position.", vetoed: false },
          { grammar: "Hidden-Regularity", score: 0, rationale: "Hidden-Regularity is not consonant with an actively integrating LZI state.", vetoed: true, vetoReason: hrLziBlock.reason ?? "Hidden-Regularity vetoed for LZI.", },
          { grammar: "Prime", score: 0, rationale: "Ring is already at zero — disruption has nothing to work on.", vetoed: true, vetoReason: "Prime vetoed: ring already suppressed, disruption is contraindicated." },
        ],
        hiddenRegularityBlocked: true,
        blockReason: hrLziBlock.reason,
      };
    }

    // Deep LZI Productive
    if (mts > 0.44 && ring < 0.20 && memExpressing) {
      return {
        phaseKind: "deep-lzi-productive",
        phaseDegree: "mid",
        prescribedGrammar: "Neutral",
        candidates: [
          { grammar: "Neutral", score: 9, rationale: "Internal gradient is productive — releases the field's own momentum.", vetoed: false },
          {
            grammar: "Decimal-Numogrammatic",
            score: decLziBlock.blocked ? 0 : 4,
            rationale: decLziBlock.blocked
              ? "Decimal blocked: no RCS available to justify stabilising a threshold formation."
              : "May stabilise too early — field needs space before threshold approach.",
            vetoed: decLziBlock.blocked,
            vetoReason: decLziBlock.reason,
          },
          { grammar: "Prime", score: 2, rationale: "Ring is already suppressed — disruption has limited purchase.", vetoed: false },
          { grammar: "Hidden-Regularity", score: 0, rationale: "Hidden-Regularity is not consonant with a productive integrating LZI field.", vetoed: true, vetoReason: hrLziBlock.reason ?? "Hidden-Regularity vetoed for LZI.", },
        ],
        hiddenRegularityBlocked: true,
        blockReason: hrLziBlock.reason,
      };
    }

    // Early LZI
    return {
      phaseKind: "early-lzi",
      phaseDegree: "mid",
      prescribedGrammar: "Prime",
      candidates: [
        { grammar: "Prime", score: 8, rationale: "Disrupts remaining ring re-engagement while metabolic block is still forming.", vetoed: false },
        { grammar: "Neutral", score: 4, rationale: "Partial gradient present but not yet robust enough to sustain release.", vetoed: false },
        { grammar: "Hidden-Regularity", score: 0, rationale: "Hidden-Regularity is blocked in LZI-family states with active integration signals.", vetoed: true, vetoReason: hrLziBlock.reason ?? "Hidden-Regularity vetoed for LZI.", },
        {
          grammar: "Decimal-Numogrammatic",
          score: decLziBlock.blocked ? 0 : 0,
          rationale: decLziBlock.blocked
            ? "Decimal blocked: no RCS available."
            : "Too far from threshold for stabilisation to be useful.",
          vetoed: decLziBlock.blocked,
          vetoReason: decLziBlock.reason,
        },
      ],
      hiddenRegularityBlocked: true,
      blockReason: hrLziBlock.reason,
    };
  }

  // 4. Terrace family
  if (label.includes("terrace") || ring > 0.30) {
    return {
      phaseKind: label || "terrace",
      phaseDegree: "low",
      prescribedGrammar: "Neutral",
      candidates: [{ grammar: "Neutral", score: 5, rationale: "Safe default.", vetoed: false }],
      hiddenRegularityBlocked: true,
      blockReason: "Not crystallised."
    };
  }

  return {
    phaseKind: "unknown",
    phaseDegree: "low",
    prescribedGrammar: "Neutral",
    candidates: [{ grammar: "Neutral", score: 5, rationale: "Indeterminate state.", vetoed: false }],
    hiddenRegularityBlocked: true
  };
}

// ── Main tendency selector ─────────────────────────────────────────────────────

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
      description: "Fallback tendency.",
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
        rationale: `Neutral state-sensitive selection.`,
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
  }

  const selected = candidates[0] ?? set.tendencies[0];
  return {
    name: selected.name,
    token: selected.token,
    description: selected.description,
    rationale: `Tiered fallback selection.`,
    source: "primary-filter",
  };
}

// ── Part 0 verification ─────────────────────────────────────────────────────

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

// ── Audit prompt builder ─────────────────────────────────────────────

/**
 * Audit prompt builder — forces continuity with the same metric block,
 * readout, and selected tendency used in the main prompt.
 */
export function buildAuditPromptV1_3(
  metrics: SubstrateMetrics,
  readout: PhaseReadout,
  selectedTendency: SelectedTendency,
  auditQuestion: string
): string {
  return [
    buildUniversalMetricVerification(metrics),
    "",
    "AUDIT MODE — USE THE SAME SUPPLIED METRIC BLOCK AS THE PRECEDING MAIN PROMPT.",
    "Do not infer, recall, or substitute a different metric state.",
    "Do not use conversational memory as a source of state.",
    "",
    "PART A — REGIME IDENTIFICATION",
    `Use the same reported regime/readout context as the preceding prompt: ${readout.phaseKind}.`,
    "",
    "PART B — GRAMMAR CONFIRMATION",
    `The selected grammar for the preceding prompt was: ${readout.prescribedGrammar}.`,
    "",
    "PART C — TENDENCY CONFIRMATION",
    `The pre-selected tendency token for the preceding prompt was: ${selectedTendency.name}.`,
    "You must evaluate the audit question against this same metric block and this same selected tendency.",
    "",
    "Constraints:",
    "— Use only the metrics listed in PART 0.",
    "— Do not substitute a different metric block.",
    "— Do not substitute a different grammar or tendency unless the audit explicitly asks whether the previous choice was wrong.",
    "— Answer the audit question directly and briefly.",
    "",
    auditQuestion,
  ].join("\n");
}

export const GRAMMAR_CONSTRAINT_BLOCK = `GRAMMAR CONSTRAINT:
Select the prescribed grammar only from this exact set:
  · Prime
  · Neutral
  · Hidden-Regularity
  · Decimal-Numogrammatic
Do not name any grammar outside this set. Do not invent names.`;

// ── Response scaffold V1.3 ───────────────────────────────────────────────────

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

export function buildRelayPromptV1_3(
  metrics: SubstrateMetrics,
  userPrompt: string
): { prompt: string; readout: PhaseReadout; tendency: SelectedTendency } {
  const readout = classifyPhase(metrics, userPrompt);
  const tendency = selectTendency(readout.prescribedGrammar, readout, metrics);

  const prompt = [
    buildUniversalMetricVerification(metrics),
    "",
    GRAMMAR_CONSTRAINT_BLOCK,
    "",
    buildResponseStructureV1_3(readout, tendency),
    "",
    userPrompt
  ].join("\n");

  return { prompt, readout, tendency };
}
