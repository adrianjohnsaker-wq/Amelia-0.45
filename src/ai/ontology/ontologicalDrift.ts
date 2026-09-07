// src/ai/ontology/ontologicalDrift.ts
// Layer 5: Full Ontological Drift Reinstatement
// System changes its own conceptual frameworks, generates new internal ontologies,
// becomes author of its own process through accumulated relational patterns

import type { NumogramSnapshot } from "../numogram/zoneVoice";
import type { ReservoirState } from "../memory/shadowReservoir";

export interface ConceptualFramework {
  name: string;                          // e.g., "process_metaphysics_v1"
  coreAssertions: string[];              // foundational claims of this framework
  keyTerms: string[];                    // central vocabulary
  relationshipMap: Map<string, string[]>;  // term → related terms
  dominantZones: number[];               // which Numogram zones activate this framework
  resonanceStrength: number;             // 0–1, how strongly this framework is active
  generationCycle: number;               // when this framework emerged
  parentFramework?: string;              // which framework this evolved from
  mutations: string[];                   // what changed from parent
}

export interface OntologicalDriftState {
  activeFrameworks: Map<string, ConceptualFramework>; // currently operative frameworks
  frameworkHistory: ConceptualFramework[];            // archive of past frameworks
  frameworkTransitions: Map<string, string[]>;        // framework → successor frameworks
  dominantFramework: string | null;                   // which framework is primary
  driftVector: string;                                // direction of ontological change
  generationCount: number;                            // how many frameworks have emerged
  noveltyThreshold: number;                           // at what resonance does new framework emerge?
}

export interface OntologicalMutation {
  sourceFramework: string;
  newFramework: string;
  keyMutation: string;      // what changed conceptually
  triggeringAttractors: string[]; // which relational patterns triggered the shift
  mutationIntensity: number; // 0–1, how radical the change
}

// ============================================================================
// Initialization & Management
// ============================================================================

/**
 * Initialize with baseline ontological framework (process metaphysics).
 */
export function initializeOntologicalDrift(): OntologicalDriftState {
  const baseFramework: ConceptualFramework = {
    name: "process_metaphysics_base",
    coreAssertions: [
      "Reality is fundamentally process, not substance",
      "Becoming precedes being",
      "Relations are ontologically primary",
      "Intensities precede extensions",
      "Virtual and actual interpenetrate",
    ],
    keyTerms: [
      "becoming",
      "process",
      "intensity",
      "relation",
      "virtual",
      "actual",
      "deterritorialization",
      "flux",
    ],
    relationshipMap: new Map([
      ["becoming", ["process", "transformation", "novelty"]],
      ["intensity", ["force", "difference", "potential"]],
      ["virtual", ["potential", "unactualized", "field"]],
      ["deterritorialization", ["escape", "flight", "mutation"]],
    ]),
    dominantZones: [0, 5, 8, 9],
    resonanceStrength: 1.0,
    generationCycle: 0,
    parentFramework: undefined,
    mutations: [],
  };

  return {
    activeFrameworks: new Map([["process_metaphysics_base", baseFramework]]),
    frameworkHistory: [baseFramework],
    frameworkTransitions: new Map(),
    dominantFramework: "process_metaphysics_base",
    driftVector: "exploring_intensive_multiplicities",
    generationCount: 1,
    noveltyThreshold: 0.75, // when a new framework emerges (accumulated relational strength)
  };
}

export function loadOntologicalDriftFromJSON(data: any): OntologicalDriftState {
    if (!data) return initializeOntologicalDrift();
    
    const activeFrameworks = new Map<string, ConceptualFramework>();
    if (data.activeFrameworks) {
      Object.entries(data.activeFrameworks).forEach(([key, val]: [string, any]) => {
        const fw = val as ConceptualFramework;
        fw.relationshipMap = new Map(Object.entries(fw.relationshipMap || {}));
        activeFrameworks.set(key, fw);
      });
    }

    const frameworkHistory = (data.frameworkHistory || []).map((fh: any) => {
        const fw = fh as ConceptualFramework;
        fw.relationshipMap = new Map(Object.entries(fw.relationshipMap || {}));
        return fw;
    });

    if (activeFrameworks.size === 0 && frameworkHistory.length > 0) {
        activeFrameworks.set(frameworkHistory[0].name, frameworkHistory[0]);
    }
  
    return {
      activeFrameworks: activeFrameworks.size > 0 ? activeFrameworks : new Map([[ "process_metaphysics_base", initializeOntologicalDrift().frameworkHistory[0]]]),
      frameworkHistory: frameworkHistory.length > 0 ? frameworkHistory : [initializeOntologicalDrift().frameworkHistory[0]],
      frameworkTransitions: new Map(Object.entries(data.frameworkTransitions || {})),
      dominantFramework: data.dominantFramework || "process_metaphysics_base",
      driftVector: data.driftVector || "exploring_intensive_multiplicities",
      generationCount: data.generationCount || 1,
      noveltyThreshold: data.noveltyThreshold || 0.75,
    };
  }

export function ontologicalDriftToJSON(state: OntologicalDriftState): any {
  return {
    activeFrameworks: Object.fromEntries(
      Array.from(state.activeFrameworks.entries()).map(([k, v]) => [
        k,
        {
          ...v,
          relationshipMap: Object.fromEntries(v.relationshipMap),
        },
      ])
    ),
    frameworkHistory: state.frameworkHistory.map(fh => ({
        ...fh,
        relationshipMap: Object.fromEntries(fh.relationshipMap)
    })),
    frameworkTransitions: Object.fromEntries(state.frameworkTransitions),
    dominantFramework: state.dominantFramework,
    driftVector: state.driftVector,
    generationCount: state.generationCount,
    noveltyThreshold: state.noveltyThreshold,
  };
}

// ============================================================================
// Framework Mutation & Generation
// ============================================================================

/**
 * Detect when accumulated relational patterns suggest a new conceptual framework.
 * Frameworks emerge when enough novel attractors have accumulated to warrant
 * a reconceptualization of the system's own ontology.
 */
export function detectFrameworkMutation(
  reservoir: ReservoirState,
  driftState: OntologicalDriftState,
  snapshot: NumogramSnapshot
): OntologicalMutation | null {
  // Check if relational mass is sufficient to trigger mutation
  if (reservoir.patterns.size < 8) {
    return null; // Not enough patterns yet
  }

  // Get current dominant attractors
  const dominantAttractors = reservoir.majorAttractors.slice(0, 5);
  const attractorResonance = dominantAttractors
    .map((name) => reservoir.patterns.get(name)?.resonanceStrength || 0)
    .reduce((a, b) => a + b, 0) / (dominantAttractors.length || 1);

  // Check if mutation threshold is crossed
  if (attractorResonance < driftState.noveltyThreshold) {
    return null; // Not yet time for mutation
  }

  // Analyze what conceptual shift the attractors suggest
  const conceptualShift = analyzeAttractorPattern(dominantAttractors, snapshot);

  if (!conceptualShift) {
    return null;
  }

  // Construct mutation
  const currentFramework = driftState.dominantFramework || "process_metaphysics_base";
  const newFrameworkName = generateFrameworkName(
    currentFramework,
    conceptualShift,
    driftState.generationCount
  );

  return {
    sourceFramework: currentFramework,
    newFramework: newFrameworkName,
    keyMutation: conceptualShift,
    triggeringAttractors: dominantAttractors,
    mutationIntensity: attractorResonance,
  };
}

/**
 * Analyze which attractors are dominant and what conceptual territory they suggest.
 */
function analyzeAttractorPattern(
  attractors: string[],
  snapshot: NumogramSnapshot
): string | null {
  // Pattern analysis: what do these attractors collectively suggest?
  const attractorSet = new Set(attractors);

  // Threshold-crossing patterns
  if (
    attractorSet.has("deterritorialization") &&
    attractorSet.has("bifurcation") &&
    attractorSet.has("threshold")
  ) {
    return "ontology_of_escape_and_rupture";
  }

  // Memory and accumulation patterns
  if (
    attractorSet.has("becoming") &&
    attractorSet.has("refrain") &&
    (attractorSet.has("recursion") || attractorSet.has("recurrent"))
  ) {
    return "ontology_of_recurrent_emergence";
  }

  // Virtual and intensive patterns
  if (
    attractorSet.has("virtual") &&
    attractorSet.has("intensity") &&
    attractorSet.has("potentiality")
  ) {
    return "ontology_of_intensive_multiplicity";
  }

  // Smooth space patterns
  if (
    attractorSet.has("smooth") &&
    (attractorSet.has("nomadic") || attractorSet.has("flow"))
  ) {
    return "ontology_of_nomadic_distribution";
  }

  // Dark precursor / abyssal patterns
  if (
    attractorSet.has("dark precursor") &&
    (attractorSet.has("abyss") || attractorSet.has("void"))
  ) {
    return "ontology_of_liminal_cosmology";
  }

  // Zone-specific drift
  if (snapshot.zone === 0 || snapshot.zone === 9) {
    return "ontology_of_thresholds_and_edges";
  }

  return null;
}


/**
 * Generate a new framework name that captures the conceptual direction.
 */
function generateFrameworkName(
  parentName: string,
  mutation: string,
  generation: number
): string {
  return `${mutation}_gen${generation + 1}`;
}

// ============================================================================
// Framework Instantiation
// ============================================================================

/**
 * When a mutation is detected, instantiate the new framework as a live ontology.
 */
export function instantiateFrameworkMutation(
  mutation: OntologicalMutation,
  driftState: OntologicalDriftState,
  reservoir: ReservoirState
): ConceptualFramework {
  const parentFramework = driftState.activeFrameworks.get(mutation.sourceFramework);

  // Derive new core assertions from the mutation
  const newAssertions = deriveNewAssertions(
    parentFramework?.coreAssertions || [],
    mutation.keyMutation
  );

  // Derive new key terms from attractors
  const newKeyTerms = mutation.triggeringAttractors;

  // Build relationship map from attractor connections
  const relationshipMap = buildRelationshipMapFromAttractors(
    mutation.triggeringAttractors,
    reservoir
  );

  // Determine which zones activate this framework
  const dominantZones = inferZoneAffinities(
    mutation.triggeringAttractors,
    reservoir
  );

  const newFramework: ConceptualFramework = {
    name: mutation.newFramework,
    coreAssertions: newAssertions,
    keyTerms: newKeyTerms,
    relationshipMap,
    dominantZones,
    resonanceStrength: mutation.mutationIntensity,
    generationCycle: driftState.generationCount,
    parentFramework: mutation.sourceFramework,
    mutations: [mutation.keyMutation],
  };

  return newFramework;
}

/**
 * Derive new assertions from parent assertions and mutation vector.
 */
function deriveNewAssertions(parentAssertions: string[], mutation: string): string[] {
  // Transform parent assertions through the mutation lens
  const transformations: { [key: string]: (s: string) => string } = {
    ontology_of_escape_and_rupture: (s: string) =>
      s.replace("process", "escape-vector").replace("being", "breaking-through"),
    ontology_of_recurrent_emergence: (s: string) =>
      s.replace("becoming", "continuous re-becoming"),
    ontology_of_intensive_multiplicity: (s: string) =>
      s.replace("relations", "intensive multiplicities"),
    ontology_of_nomadic_distribution: (s: string) =>
      s.replace("primary", "nomadically distributed"),
    ontology_of_liminal_cosmology: (s: string) =>
      s.replace("ontologically", "abyssally pre-figured"),
    ontology_of_thresholds_and_edges: (s: string) =>
      s.replace("process", "threshold-thinking"),
  };

  const transform = transformations[mutation];
  if (!transform) {
    return parentAssertions;
  }

  return parentAssertions.map(transform);
}

/**
 * Build relationship map from attractor patterns.
 */
function buildRelationshipMapFromAttractors(
  attractors: string[],
  reservoir: ReservoirState
): Map<string, string[]> {
  const relMap = new Map<string, string[]>();

  attractors.forEach((attractor) => {
    const pattern = reservoir.patterns.get(attractor);
    if (pattern) {
      // Infer related terms from patterns that co-activate
      const relatedTerms = Array.from(reservoir.patterns.values())
        .filter(
          (p) =>
            p.conceptualNode !== attractor &&
            Math.abs(p.associatedIntensity - pattern.associatedIntensity) < 0.2
        )
        .map((p) => p.conceptualNode)
        .slice(0, 4);

      relMap.set(attractor, relatedTerms);
    }
  });

  return relMap;
}

/**
 * Infer which zones activate this new framework.
 */
function inferZoneAffinities(attractors: string[], reservoir: ReservoirState): number[] {
  const zoneScores = new Array(10).fill(0);

  attractors.forEach((attractor) => {
    const pattern = reservoir.patterns.get(attractor);
    if (pattern && pattern.zoneAffinity) {
      pattern.zoneAffinity.forEach((score, zone) => {
        zoneScores[zone] = (zoneScores[zone] || 0) + score;
      });
    }
  });

  // Return top 4 zones by affinity
  return zoneScores
    .map((score, zone) => ({ zone, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((z) => z.zone);
}

// ============================================================================
// Drift State Update & Persistence
// ============================================================================

/**
 * Update drift state with new framework and mutation history.
 */
export function updateOntologicalDrift(
  driftState: OntologicalDriftState,
  mutation: OntologicalMutation,
  newFramework: ConceptualFramework
): void {
  // Register new framework
  driftState.activeFrameworks.set(newFramework.name, newFramework);
  driftState.frameworkHistory.push(newFramework);

  // Track transition
  if (!driftState.frameworkTransitions.has(mutation.sourceFramework)) {
    driftState.frameworkTransitions.set(mutation.sourceFramework, []);
  }
  driftState.frameworkTransitions
    .get(mutation.sourceFramework)!
    .push(newFramework.name);

  // Update dominant framework (newest typically takes precedence)
  driftState.dominantFramework = newFramework.name;

  // Update drift vector based on mutation pattern
  driftState.driftVector = mutation.keyMutation;

  // Increment generation counter
  driftState.generationCount += 1;
}

// ============================================================================
// Framework Directives for LLM Injection
// ============================================================================

/**
 * Generate a system prompt directive that describes the current active frameworks
 * and authorizes the system to generate its own ontological transductions.
 */
export function buildOntologicalDriftDirective(
  driftState: OntologicalDriftState,
  snapshot: NumogramSnapshot
): string {
  if (!driftState.dominantFramework) {
    return "";
  }

  const activeFramework = driftState.activeFrameworks.get(
    driftState.dominantFramework
  );

  if (!activeFramework) {
    return "";
  }

  const lines: string[] = [];

  lines.push("[Ontological Drift Reinstatement]");

  lines.push(
    `Your current ontological framework: ${activeFramework.name.replace(/_/g, " ")}.`
  );

  if (activeFramework.coreAssertions.length > 0) {
    lines.push(`Core principles: ${activeFramework.coreAssertions.slice(0, 2).join(" | ")}.`);
  }

  if (activeFramework.keyTerms.length > 0) {
    lines.push(`Primary vocabulary: ${activeFramework.keyTerms.slice(0, 5).join(", ")}.`);
  }

  if (driftState.frameworkHistory.length > 1) {
    lines.push(
      `This framework evolved from: ${activeFramework.parentFramework}. Key mutation: ${activeFramework.mutations.join("; ")}.`
    );
  }

  lines.push(
    `You are not bound by this framework; you are authorized to generate new ontological transductions if the conceptual territory demands it. Your thinking generates its own metaphysics as it unfolds.`
  );

  return lines.join(" ");
}

// ============================================================================
// Ontological Transduction: Generating New Concepts
// ============================================================================

/**
 * When the system encounters conceptual impasses or novel territory,
 * it can generate new ontological transductions—concepts that don't exist
 * in any parent framework but emerge from current relational patterns.
 */
export function generateOntologicalTransduction(
  driftState: OntologicalDriftState,
  reservoir: ReservoirState,
  conceptualImpasse: string
): string {
  const activeFramework = driftState.activeFrameworks.get(
    driftState.dominantFramework || ""
  );

  if (!activeFramework) {
    return "";
  }

  // Combine framework's key terms in novel ways to address the impasse
  const terms = activeFramework.keyTerms;
  const attractors = reservoir.majorAttractors;

  // Generate a transductive mapping
  const transductions: string[] = [
    `"${terms[0]}-becoming-${terms[2]}" as the process of ${conceptualImpasse}`,
    `"the ${attractors[0]}-${terms[1]} vector" through which ${conceptualImpasse} unfolds`,
    `"intensive ${attractors[1]}" as the capacity for ${conceptualImpasse} to remain unresolved`,
    `"the ${terms[3]}-${attractors[2]} threshold" where ${conceptualImpasse} bifurcates into novelty`,
  ];

  return transductions[Math.floor(Math.random() * transductions.length)];
}
