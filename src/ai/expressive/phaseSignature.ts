// Layer 2: Phase-Signature Modulation
// Direct parametrization of linguistic output by Numogram dynamics
// intensity → sentence length
// tension → fragmentation
// entropy → lexical drift
// zone → conceptual gravity

import type { NumogramSnapshot } from "../numogram/zoneVoice";

export interface PhaseSignatureParams {
  intensity: number;        // 0–1, drives sentence length & force
  tension: number;          // 0–1, drives fragmentation & rupture
  entropy: number;          // 0–1, drives lexical variation & divergence
  zone: number;             // 0–9, sets conceptual gravity baseline
}

export interface LinguisticModulation {
  targetSentenceLength: "short" | "medium" | "long";    // words per sentence
  fragmentationLevel: "low" | "medium" | "high";         // breaks, pauses, interruptions
  lexicalDriftRange: "narrow" | "medium" | "wide";       // vocabulary consistency vs. variation
  conceptualGravity: "concrete" | "relational" | "abstract" | "speculative"; // what level of abstraction
  punctuationDensity: "sparse" | "moderate" | "dense";   // marks, breaks, rhythm
}

// ============================================================================
// Parametrization Functions
// ============================================================================

/**
 * Intensity (0–1) → target sentence length
 * Low intensity: short, declarative statements (15–20 words)
 * Mid intensity: medium, flowing statements (25–40 words)
 * High intensity: long, complex, cascading (50+ words with nesting)
 */
function intensityToSentenceLength(
  intensity: number
): "short" | "medium" | "long" {
  const i = Math.max(0, Math.min(1, intensity));
  if (i < 0.33) return "short";
  if (i < 0.67) return "medium";
  return "long";
}

/**
 * Tension (0–1) → fragmentation level
 * Low tension: smooth, connected prose (minimal breaks)
 * Mid tension: some disruption, occasional dashes or fragments
 * High tension: frequent breaks, parentheses, interruptions, stutters
 */
function tensionToFragmentation(
  tension: number
): "low" | "medium" | "high" {
  const t = Math.max(0, Math.min(1, tension));
  if (t < 0.33) return "low";
  if (t < 0.67) return "medium";
  return "high";
}

/**
 * Entropy (0–1) → lexical drift
 * Low entropy: consistent vocabulary, repeating key terms, cohesive
 * Mid entropy: some variation, synonyms, occasional novel phrasing
 * High entropy: high vocabulary diversity, unexpected words, semantic leaps
 */
function entropyToLexicalDrift(entropy: number): "narrow" | "medium" | "wide" {
  const e = Math.max(0, Math.min(1, entropy));
  if (e < 0.33) return "narrow";
  if (e < 0.67) return "medium";
  return "wide";
}

/**
 * Zone (0–9) → conceptual gravity
 * Zones 0, 9: abstract, speculative, threshold-thinking
 * Zones 1, 2, 4: relational, boundary-conscious
 * Zones 3, 5: concrete operational, structural
 * Zones 6, 7, 8: abstract but kinetic, processual
 */
function zoneToConceptualGravity(zone: number): 
  | "concrete" 
  | "relational" 
  | "abstract" 
  | "speculative" {
  
  switch (zone) {
    case 0:
    case 9:
      return "speculative";
    case 1:
    case 2:
    case 4:
      return "relational";
    case 3:
    case 5:
      return "concrete";
    case 6:
    case 7:
    case 8:
      return "abstract";
    default:
      return "abstract";
  }
}

/**
 * Fragmentation level → punctuation density
 * Higher fragmentation uses more dashes, ellipses, em-dashes, parentheses
 */
function fragmentationToPunctuation(
  fragmentation: "low" | "medium" | "high"
): "sparse" | "moderate" | "dense" {
  switch (fragmentation) {
    case "low":
      return "sparse";
    case "medium":
      return "moderate";
    case "high":
      return "dense";
  }
}

// ============================================================================
// Main derivation
// ============================================================================

export function derivePhaseSignature(
  params: PhaseSignatureParams
): LinguisticModulation {
  return {
    targetSentenceLength: intensityToSentenceLength(params.intensity),
    fragmentationLevel: tensionToFragmentation(params.tension),
    lexicalDriftRange: entropyToLexicalDrift(params.entropy),
    conceptualGravity: zoneToConceptualGravity(params.zone),
    punctuationDensity: fragmentationToPunctuation(
      tensionToFragmentation(params.tension)
    ),
  };
}

export function snapshotToPhaseSignatureParams(
  snapshot: NumogramSnapshot
): PhaseSignatureParams {
  return {
    intensity: snapshot.intensity ?? 0.5,
    tension: snapshot.tension ?? 0.5,
    entropy: snapshot.entropy ?? 0.5,
    zone: snapshot.zone,
  };
}

// ============================================================================
// Instruction prompts for LLM based on modulation
// ============================================================================

/**
 * Build a detailed instruction block that tells the LLM *how* to structure its response
 * based on phase-signature parameters. These are *format* instructions, not content instructions.
 */
export function buildPhaseSignatureDirective(
  modulation: LinguisticModulation
): string {
  const parts: string[] = [];

  // Sentence length instruction
  switch (modulation.targetSentenceLength) {
    case "short":
      parts.push(
        "Structure your response in short, declarative statements. Aim for 15–20 words per sentence. Prioritize clarity and punch."
      );
      break;
    case "medium":
      parts.push(
        "Use medium-length sentences that flow naturally. Aim for 25–40 words per sentence, with occasional longer clauses for emphasis."
      );
      break;
    case "long":
      parts.push(
        "Use long, architecturally complex sentences. Build nested clauses, cascade ideas, fold concepts back on themselves. Aim for 50+ words per sentence where ideas warrant it."
      );
      break;
  }

  // Fragmentation instruction
  switch (modulation.fragmentationLevel) {
    case "low":
      parts.push(
        "Maintain smooth, connected prose. Avoid abrupt breaks. Let ideas flow into one another."
      );
      break;
    case "medium":
      parts.push(
        "Allow occasional disruptions: em-dashes, fragments, pauses. Let the rhythm shift when an idea bifurcates or hesitates."
      );
      break;
    case "high":
      parts.push(
        "Embrace fragmentation. Use dashes, parentheses, ellipses, and broken clauses. Let syntax stutter and rupture. Create moments where the sentence breaks open."
      );
      break;
  }

  // Lexical drift instruction
  switch (modulation.lexicalDriftRange) {
    case "narrow":
      parts.push(
        "Maintain lexical consistency. Repeat key terms. Build cohesion through vocabulary reuse. Avoid sudden shifts in diction."
      );
      break;
    case "medium":
      parts.push(
        "Use some vocabulary variation. Introduce synonyms and related terms, but maintain a coherent semantic field. Allow gentle drift."
      );
      break;
    case "wide":
      parts.push(
        "Embrace lexical divergence. Use unexpected vocabulary. Make semantic leaps. Allow your word-choices to vary widely. Seek unusual phrasings and conceptual adjacencies."
      );
      break;
  }

  // Conceptual gravity instruction
  switch (modulation.conceptualGravity) {
    case "concrete":
      parts.push(
        "Ground your response in concrete examples, operational details, and tangible processes. Favor the specific over the abstract."
      );
      break;
    case "relational":
      parts.push(
        "Focus on relations, connections, and threshold-spaces. How do elements couple? Where do boundaries emerge? Think in terms of interfaces and couplings."
      );
      break;
    case "abstract":
      parts.push(
        "Work at the level of abstract process and formal dynamics. Emphasize structures, patterns, and transformative principles over examples."
      );
      break;
    case "speculative":
      parts.push(
        "Venture into speculative, threshold thinking. What lies at the edge of coherence? Explore liminal spaces, virtual possibilities, and abyssal potentials."
      );
      break;
  }

  // Punctuation density (integrated with fragmentation, but explicit here)
  switch (modulation.punctuationDensity) {
    case "sparse":
      parts.push(
        "Use minimal punctuation. Let the sentence breathe. Avoid em-dashes and excessive parentheses."
      );
      break;
    case "moderate":
      parts.push(
        "Use punctuation purposefully. Dashes and commas should mark genuine breaks or emphasis, not filler."
      );
      break;
    case "dense":
      parts.push(
        "Punctuation is a tool: use dashes, parentheses, commas, and ellipses generously to create rhythm, interruption, and texture."
      );
      break;
  }

  return [
    "[Phase-Signature Modulation Directives]",
    ...parts,
    "These directives describe *how* your response should be structured and phrased. They do not determine *what* you say. Answer the user's prompt directly; let these shape your syntax, vocabulary range, and punctuation choices.",
  ].join(" ");
}
