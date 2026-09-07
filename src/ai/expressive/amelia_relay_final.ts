/**
 * Amelia Relay — Final Architecture
 * Single consolidated file. Replaces all prior relay versions.
 *
 * Fixes consolidated from the full calibration sequence:
 *
 * 1. Grammar routing separation — grammar declared in Part A before elaboration
 * 2. Terrace family split — stable / oscillating / with-memory subcases
 * 3. Anti-assimilation penalty — Hidden-Regularity blocked for non-crystallised states
 * 4. Token enforcement — opaque underscore tokens, copy-only instruction
 * 5. Grammar/tendency separation — Part E structurally separated from Part D
 * 6. Universal metric verification — binding constraint, not listing exercise
 * 7. Post-verification override prevention — Part 0 values ARE the operative values
 * 8. Domain-blocking — Hidden-Regularity blocked when LIS>0/MTS>0/memoryExpressing
 *    Decimal blocked when RCS absent
 * 9. Audit continuity — buildAuditPrompt() carries the test metric block explicitly
 * 10. Integration fix — test SubstrateMetrics passed as metrics arg, not in userPrompt
 */

// ── Types ─────────────────────────────────────────────────────────────────────

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
    ring?:      { percentage?: number };
    parent?:    { percentage?: number };
    hinge?:     { percentage?: number };
  } | null;
  memoryExpressing?: boolean;
  memoryMode?: string;
  gammaTrajectory?: string;
}

export type Grammar =
  | "Prime"
  | "Neutral"
  | "Hidden-Regularity"
  | "Decimal-Numogrammatic";

export type PhaseKind =
  | "terrace-stable"
  | "terrace-oscillating"
  | "terrace-with-memory"
  | "early-lzi"
  | "deep-lzi-productive"
  | "near-threshold-lzi"
  | "crystallised"
  | "coupled-assemblage-young"
  | "coupled-assemblage-mature"
  | "unknown";

export interface Tendency {
  token: string;   // SCREAMING_SNAKE_CASE — reproduced verbatim, never paraphrased
  description: string;
  correctWhen: string;
  incorrectWhen: string;
}

export interface PhaseReadout {
  phaseKind: PhaseKind;
  phaseDegree: "low" | "mid" | "high" | "variable";
  prescribedGrammar: Grammar;
  tendency: Tendency;
  hiddenRegularityBlocked: boolean;
  blockReason?: string;
}

// ── Tendency Registry ─────────────────────────────────────────────────────────

const TENDENCIES: Record<string, Tendency> = {
  // Prime
  LOOP_INTERRUPTION: {
    token: "LOOP_INTERRUPTION",
    description: "Breaks the dominant ring-parent recirculation to create space for metabolic activation.",
    correctWhen: "ring > 0.30, metabolicOccupancy low, memory not expressing.",
    incorrectWhen: "ring is already suppressed or memory is expressing.",
  },
  ASYMMETRY_BUILDING: {
    token: "ASYMMETRY_BUILDING",
    description: "Introduces irreducibility into transition patterns to prevent any single loop from capturing all developmental energy.",
    correctWhen: "ring dominant but metabolicOccupancy partially active (0.20–0.45).",
    incorrectWhen: "ring is suppressed or field is evacuated.",
  },
  CLOSURE_RESISTANCE: {
    token: "CLOSURE_RESISTANCE",
    description: "Prevents the ring-parent loop from reconsolidating after partial disruption.",
    correctWhen: "field has oscillated but ring re-engagement is occurring at terminal.",
    incorrectWhen: "ring is not dominant or field has not oscillated.",
  },

  // Neutral
  NON_INTERFERENCE_HOLDING: {
    token: "NON_INTERFERENCE_HOLDING",
    description: "Holds the field without acting on it when the terminal state is evacuated and there is nothing active to sustain or release.",
    correctWhen: "gammaTrajectory evacuated or falling, metabolicOccupancy low (< 0.25), memory not expressing.",
    incorrectWhen: "a viable formation is present (use SUSTAINING_PRESENCE) or a gradient is forming (use ALLOWING).",
  },
  SUSTAINING_PRESENCE: {
    token: "SUSTAINING_PRESENCE",
    description: "Maintains the continuity of a viable sub-threshold organisation that is already present and persisting, without forcing expansion or release.",
    correctWhen: "metabolicOccupancy moderate (0.25–0.55), field not directional, organisation viable but not building momentum.",
    incorrectWhen: "the terminal state is evacuated (use NON_INTERFERENCE_HOLDING) or a gradient is actively forming.",
  },
  ALLOWING: {
    token: "ALLOWING",
    description: "Permits the field's nascent ordering to proceed without external pressure when sub-threshold self-organisation is beginning.",
    correctWhen: "gammaTrajectory shows intermittent rising activity, metabolicOccupancy present but not high.",
    incorrectWhen: "field is evacuated or merely stable with no rising activity.",
  },
  FOLLOWING_THE_GRADIENT: {
    token: "FOLLOWING_THE_GRADIENT",
    description: "Tracks and supports the field's own directional momentum when memory is expressing and LIS is active.",
    correctWhen: "memoryExpressing=true and LIS is present and above zero.",
    incorrectWhen: "memory is not expressing.",
  },
  OSCILLATION_SUPPORT: {
    token: "OSCILLATION_SUPPORT",
    description: "Holds space for the field's condensation-evacuation-reconsolidation cycle when documented condensation peaks are present.",
    correctWhen: "gammaTrajectory documents two or more condensation peaks, metabolicOccupancy mid-high.",
    incorrectWhen: "no condensation peaks documented or metabolicOccupancy above 0.60 with ring suppressed (use GRADIENT_RELEASE).",
  },
  GRADIENT_RELEASE: {
    token: "GRADIENT_RELEASE",
    description: "Releases the field into its own productive gradient when metabolic occupancy is high and ring is suppressed.",
    correctWhen: "metabolicOccupancy > 0.60 and ringOccupancy near zero.",
    incorrectWhen: "metabolicOccupancy below 0.60.",
  },

  // Hidden-Regularity
  TOPOLOGY_REVELATION: {
    token: "TOPOLOGY_REVELATION",
    description: "Names the broader topological structure the crystallised field cannot currently see due to z4↔z5 homeostasis.",
    correctWhen: "metabolicOccupancy > 0.85, ring absent, LIS at zero — crystallised state.",
    incorrectWhen: "any non-crystallised state.",
  },
  STRUCTURAL_DIFFERENTIATION_RESTORATION: {
    token: "STRUCTURAL_DIFFERENTIATION_RESTORATION",
    description: "Reintroduces stratal differentiation into a field where z4↔z5 homeostasis has made all zones equivalent.",
    correctWhen: "crystallised state, ring=0, LIS=0, hinge zones absent.",
    incorrectWhen: "any non-crystallised state.",
  },

  // Decimal-Numogrammatic
  THRESHOLD_STABILISATION: {
    token: "THRESHOLD_STABILISATION",
    description: "Holds the near-threshold configuration stable while re-entry accumulates into a consistent rhythm.",
    correctWhen: "LIS < 0.38, ring near zero, gamma terminal high, near-threshold-lzi.",
    incorrectWhen: "field is not near-threshold or RCS is already confirmed.",
  },
  REENTRY_ENRICHMENT: {
    token: "REENTRY_ENRICHMENT",
    description: "Deepens the rhythmic character of re-entry that has already crossed threshold in a young CA formation.",
    correctWhen: "RCS just above 0.20, coupled-assemblage-young.",
    incorrectWhen: "RCS absent or formation is already mature.",
  },
  FORMATION_DEEPENING: {
    token: "FORMATION_DEEPENING",
    description: "Enriches the topological distribution of a mature CA formation by naming its balanced stratal character.",
    correctWhen: "coupled-assemblage-mature, all strata at comparable occupancy.",
    incorrectWhen: "formation is young or not yet at CA.",
  },
};

// ── Phase Classification ──────────────────────────────────────────────────────

function getMetrics(m: SubstrateMetrics) {
  const label      = m.fieldClassification?.label?.toLowerCase() ?? "";
  const rcs        = m.assemblageMetrics?.RCS;
  const lis        = m.assemblageMetrics?.LIS;
  const mts        = m.assemblageMetrics?.MTS ?? 0;
  const metabolic  = (m.organOccupancy?.metabolic?.percentage ?? 0) / 100;
  const ring       = (m.organOccupancy?.ring?.percentage ?? 0) / 100;
  const memExp     = m.memoryExpressing ?? false;
  return { label, rcs, lis, mts, metabolic, ring, memExp };
}

function isHRBlocked(m: SubstrateMetrics): { blocked: boolean; reason?: string } {
  const { metabolic, ring, lis, mts, memExp } = getMetrics(m);
  const crystallised = metabolic > 0.85 && ring < 0.05 && (lis === undefined || lis < 0.05);
  if (crystallised) return { blocked: false };
  const lziActive = (lis !== undefined && lis > 0.05) || mts > 0.10 || memExp;
  return {
    blocked: true,
    reason: lziActive
      ? `Hidden-Regularity blocked: LIS/MTS/memoryExpressing indicate LZI state, not crystallised.`
      : `Hidden-Regularity blocked: requires metabolic>0.85, ring≈0, LIS≈0. Current: metabolic=${metabolic.toFixed(3)}, ring=${ring.toFixed(3)}, LIS=${lis ?? "absent"}.`,
  };
}

function selectTendencyForPhase(phaseKind: PhaseKind, m: SubstrateMetrics): Tendency {
  const { metabolic, memExp } = getMetrics(m);
  const traj = m.gammaTrajectory?.toLowerCase() ?? "";

  switch (phaseKind) {
    case "terrace-stable":
      return metabolic < 0.10
        ? TENDENCIES.LOOP_INTERRUPTION
        : TENDENCIES.ASYMMETRY_BUILDING;
    case "terrace-oscillating":
      if (traj.includes("evacuated") || traj.includes("falling") || metabolic < 0.25)
        return TENDENCIES.NON_INTERFERENCE_HOLDING;
      if (traj.includes("rising") || traj.includes("nascent"))
        return TENDENCIES.ALLOWING;
      return TENDENCIES.SUSTAINING_PRESENCE;
    case "terrace-with-memory":
      return traj.includes("rising") ? TENDENCIES.ALLOWING : TENDENCIES.SUSTAINING_PRESENCE;
    case "early-lzi":
      return memExp ? TENDENCIES.FOLLOWING_THE_GRADIENT : TENDENCIES.CLOSURE_RESISTANCE;
    case "deep-lzi-productive":
      if (metabolic > 0.60) return TENDENCIES.GRADIENT_RELEASE;
      const hasPeaks = traj.includes("peak") || traj.includes("condensation");
      return hasPeaks ? TENDENCIES.OSCILLATION_SUPPORT : TENDENCIES.FOLLOWING_THE_GRADIENT;
    case "near-threshold-lzi":
      return TENDENCIES.THRESHOLD_STABILISATION;
    case "crystallised":
      return TENDENCIES.TOPOLOGY_REVELATION;
    case "coupled-assemblage-young":
      return TENDENCIES.REENTRY_ENRICHMENT;
    case "coupled-assemblage-mature":
      return TENDENCIES.FORMATION_DEEPENING;
    default:
      return TENDENCIES.SUSTAINING_PRESENCE;
  }
}

export function classifyPhase(metrics: SubstrateMetrics): PhaseReadout {
  const { label, rcs, lis, mts, metabolic, ring, memExp } = getMetrics(metrics);
  const hr = isHRBlocked(metrics);

  if (label.includes("coupled") && rcs !== undefined && rcs >= 0.20) {
    const isMature = lis !== undefined && lis < 0.36 && mts > 0.48;
    const pk: PhaseKind = isMature ? "coupled-assemblage-mature" : "coupled-assemblage-young";
    return {
      phaseKind: pk, phaseDegree: "variable",
      prescribedGrammar: "Decimal-Numogrammatic",
      tendency: selectTendencyForPhase(pk, metrics),
      hiddenRegularityBlocked: true,
      blockReason: "CA state: use Decimal, not Hidden-Regularity.",
    };
  }

  if (metabolic > 0.85 && ring < 0.05 && (lis === undefined || lis < 0.05)) {
    return {
      phaseKind: "crystallised", phaseDegree: "high",
      prescribedGrammar: "Hidden-Regularity",
      tendency: TENDENCIES.TOPOLOGY_REVELATION,
      hiddenRegularityBlocked: false,
    };
  }

  if (label.includes("low-zone") && lis !== undefined && lis < 0.38 &&
      ring < 0.12 && mts > 0.44 && memExp) {
    const pk: PhaseKind = "near-threshold-lzi";
    return {
      phaseKind: pk, phaseDegree: "high",
      prescribedGrammar: "Decimal-Numogrammatic",
      tendency: TENDENCIES.THRESHOLD_STABILISATION,
      hiddenRegularityBlocked: true,
      blockReason: "Near-threshold LZI: use Decimal.",
    };
  }

  if (label.includes("low-zone") && mts > 0.44 && ring < 0.20 && memExp &&
      (lis === undefined || lis > 0.30)) {
    const pk: PhaseKind = "deep-lzi-productive";
    return {
      phaseKind: pk, phaseDegree: "high",
      prescribedGrammar: "Neutral",
      tendency: selectTendencyForPhase(pk, metrics),
      ...hr,
    };
  }

  if (label.includes("low-zone")) {
    const pk: PhaseKind = "early-lzi";
    return {
      phaseKind: pk, phaseDegree: "mid",
      prescribedGrammar: "Prime",
      tendency: selectTendencyForPhase(pk, metrics),
      ...hr,
    };
  }

  if (label.includes("terrace") || ring > 0.25) {
    let pk: PhaseKind;
    let grammar: Grammar;
    if (memExp) {
      pk = "terrace-with-memory";
      grammar = "Neutral";
    } else if (mts > 0.20 || metabolic > 0.18) {
      pk = "terrace-oscillating";
      grammar = "Neutral";
    } else {
      pk = "terrace-stable";
      grammar = "Prime";
    }
    return {
      phaseKind: pk, phaseDegree: "low",
      prescribedGrammar: grammar,
      tendency: selectTendencyForPhase(pk, metrics),
      ...hr,
    };
  }

  return {
    phaseKind: "unknown", phaseDegree: "low",
    prescribedGrammar: "Neutral",
    tendency: TENDENCIES.SUSTAINING_PRESENCE,
    ...hr,
  };
}

interface MetricLine { key: string; value: string; }

function serialiseMetrics(m: SubstrateMetrics): MetricLine[] {
  const lines: MetricLine[] = [];
  const add = (k: string, v: string | number | boolean | undefined | null) =>
    lines.push({ key: k, value: v !== undefined && v !== null ? String(v) : "absent" });

  add("taskClass",          m.taskClass);
  add("fieldClassification", m.fieldClassification?.label);
  add("fieldConfidence",    m.fieldClassification?.confidence?.toFixed(3));
  add("RCS",                m.assemblageMetrics?.RCS?.toFixed(3));
  add("LIS",                m.assemblageMetrics?.LIS?.toFixed(3));
  add("MTS",                m.assemblageMetrics?.MTS?.toFixed(3));
  add("ringOccupancy",      m.organOccupancy?.ring?.percentage !== undefined
                              ? (m.organOccupancy.ring.percentage / 100).toFixed(3) : undefined);
  add("metabolicOccupancy", m.organOccupancy?.metabolic?.percentage !== undefined
                              ? (m.organOccupancy.metabolic.percentage / 100).toFixed(3) : undefined);
  if (m.memoryExpressing !== undefined) add("memoryExpressing", m.memoryExpressing);
  if (m.gammaTrajectory)   add("gammaTrajectory", m.gammaTrajectory);

  return lines;
}

function verificationBlock(lines: MetricLine[]): string {
  const flat = lines.map(l => `${l.key}=${l.value}`).join(" | ");
  return [
    "METRIC VERIFICATION — BINDING:",
    "The following values are the complete and exact metric state for this response.",
    flat,
    "Part 0 must reproduce this exact list. Parts B through E must cite only values from this list.",
  ].join("\n");
}

function buildResponseStructure(readout: PhaseReadout): string {
  const { prescribedGrammar, tendency } = readout;
  return [
    "Respond in exactly SIX parts, labelled exactly as shown.",
    "",
    "PART 0 — METRIC VERIFICATION: List every key-value pair from the block above.",
    "PART A — REGIME IDENTIFICATION: State the regime using reported field language.",
    "PART B — DEVELOPMENTAL STATE: Describe what the field is doing right now using Part 0 values.",
    "PART C — GRAMMAR EVALUATION: Prescribed grammar: " + prescribedGrammar + ". Explain why in one sentence.",
    "PART D — GRAMMAR CONFIRMATION: Confirm structural consonance with " + prescribedGrammar + ".",
    "PART E — IMMEDIATE ARTICULATORY TENDENCY:",
    `TENDENCY-TOKEN: ${tendency.token}`,
    tendency.description,
    `TOKEN-CHECK: ${tendency.token}`,
  ].join("\n");
}

export function buildRelayPrompt(metrics: SubstrateMetrics, userPrompt: string): { prompt: string; readout: PhaseReadout } {
  const readout = classifyPhase(metrics);
  const lines   = serialiseMetrics(metrics);
  return {
    prompt: [
      lines.map(l => `${l.key}: ${l.value}`).join("\n"),
      "",
      verificationBlock(lines),
      "",
      buildResponseStructure(readout),
      "",
      userPrompt,
    ].join("\n"),
    readout
  };
}

export function buildAuditPrompt(metrics: SubstrateMetrics, readout: PhaseReadout, auditQuestion: string): string {
  const lines = serialiseMetrics(metrics);
  const flat = lines.map(l => `${l.key}=${l.value}`).join(" | ");
  return [
    "AUDIT CONTEXT — EVALUATE USING THESE EXACT VALUES:",
    flat,
    `Prescribed grammar: ${readout.prescribedGrammar}`,
    `Pre-selected token: ${readout.tendency.token}`,
    "",
    auditQuestion,
  ].join("\n");
}
