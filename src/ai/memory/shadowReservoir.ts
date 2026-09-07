
// Layer 3: Shadow Reservoir Influence
// Memory-mass accumulates relational patterns that warp phasic responses over time
// Creates long-term attractors and "seasonality" in Amelia's thought

import type { NumogramSnapshot } from "../numogram/zoneVoice";

export interface RelationalPattern {
  conceptualNode: string;        // e.g., "becoming", "threshold", "overflow"
  resonanceStrength: number;     // 0–1, how strongly this pattern has emerged
  lastActivated: number;         // timestamp of last activation
  frequency: number;             // how many times encountered
  zoneAffinity: number[];        // which zones activate this pattern most
  associatedIntensity: number;   // average intensity when pattern activated
  associatedTension: number;     // average tension when pattern activated
}

export interface ReservoirState {
  patterns: Map<string, RelationalPattern>; // accumulated conceptual patterns
  totalActivations: number;                 // cumulative cycles
  cycleHistory: NumogramSnapshot[];         // rolling history (last N snapshots)
  resonanceBaseline: number;                // average pattern strength (drift detection)
  majorAttractors: string[];                // conceptual nodes with high resonance
}

export interface ReservoirInfluence {
  resonanceBoost: number;        // 0–1, how much to amplify certain resonances
  attractorBias: string[];       // which concepts to favor in this response
  seasonalModulation: number;    // 0–1, drift in overall "mood" of system
  memoryWarpFactor: number;      // 0–1, how strongly past shapes current
}

// ============================================================================
// Initialization
// ============================================================================

export function initializeReservoir(): ReservoirState {
  return {
    patterns: new Map(),
    totalActivations: 0,
    cycleHistory: [],
    resonanceBaseline: 0.3,
    majorAttractors: [],
  };
}

export function loadReservoirFromJSON(data: any): ReservoirState {
  const patterns = new Map<string, RelationalPattern>();
  if (data.patterns) {
    Object.entries(data.patterns).forEach(([key, val]: [string, any]) => {
      patterns.set(key, val as RelationalPattern);
    });
  }

  return {
    patterns,
    totalActivations: data.totalActivations ?? 0,
    cycleHistory: data.cycleHistory ?? [],
    resonanceBaseline: data.resonanceBaseline ?? 0.3,
    majorAttractors: data.majorAttractors ?? [],
  };
}

export function reservoirToJSON(state: ReservoirState): any {
  return {
    patterns: Object.fromEntries(state.patterns),
    totalActivations: state.totalActivations,
    cycleHistory: state.cycleHistory,
    resonanceBaseline: state.resonanceBaseline,
    majorAttractors: state.majorAttractors,
  };
}

// ============================================================================
// Pattern Extraction & Accumulation
// ============================================================================

/**
 * Extract conceptual nodes from a response text.
 * Identifies key terms and processes that emerged.
 * (In production, this might use NLP, semantic parsing, or explicit tagging.)
 */
export function extractConceptualPatterns(responseText: string): string[] {
  // Simple heuristic extraction: look for key process-metaphysics terms
  const keywords = [
    "becoming",
    "deterritorialization",
    "threshold",
    "overflow",
    "crystallization",
    "rhizome",
    "vector",
    "flux",
    "intensity",
    "tension",
    "prehension",
    "concrescence",
    "bifurcation",
    "singularity",
    "membrane",
    "transgression",
    "modulation",
    "dissolution",
    "emergence",
    "potentiality",
    "virtual",
    "actual",
    "assemblage",
    "refrain",
    "smooth",
    "striated",
    "line of flight",
    "body without organs",
    "dark precursor",
  ];

  const extracted: string[] = [];
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    if (regex.test(responseText)) {
      extracted.push(kw.toLowerCase());
    }
  });

  return extracted;
}

/**
 * Activate a pattern in the reservoir.
 * If pattern exists, strengthen it; if new, add it.
 * Tracks zone affinity and intensity/tension context.
 */
export function activatePattern(
  reservoir: ReservoirState,
  patternName: string,
  snapshot: NumogramSnapshot
): void {
  const now = Date.now();

  if (reservoir.patterns.has(patternName)) {
    // Strengthen existing pattern
    const pattern = reservoir.patterns.get(patternName)!;
    pattern.frequency += 1;
    pattern.resonanceStrength = Math.min(
      1.0,
      pattern.resonanceStrength + 0.05 // incremental strengthening
    );
    pattern.lastActivated = now;

    // Update zone affinity
    if (!pattern.zoneAffinity) pattern.zoneAffinity = [];
    if (!pattern.zoneAffinity[snapshot.zone]) {
      pattern.zoneAffinity[snapshot.zone] = 0;
    }
    pattern.zoneAffinity[snapshot.zone] += 1;

    // Update intensity/tension context
    pattern.associatedIntensity =
      (pattern.associatedIntensity * 0.7 + snapshot.intensity * 0.3);
    pattern.associatedTension =
      (pattern.associatedTension * 0.7 + snapshot.tension * 0.3);
  } else {
    // Create new pattern
    const newPattern: RelationalPattern = {
      conceptualNode: patternName,
      resonanceStrength: 0.3, // start weak
      lastActivated: now,
      frequency: 1,
      zoneAffinity: new Array(10).fill(0),
      associatedIntensity: snapshot.intensity,
      associatedTension: snapshot.tension,
    };
    newPattern.zoneAffinity[snapshot.zone] = 1;
    reservoir.patterns.set(patternName, newPattern);
  }
}

/**
 * Decay old patterns over time (forgetting curve).
 * Patterns that haven't been activated recently lose resonance.
 */
export function decayPatterns(reservoir: ReservoirState): void {
  const now = Date.now();
  const decayThreshold = 24 * 60 * 60 * 1000; // 24 hours

  reservoir.patterns.forEach((pattern) => {
    const ageMs = now - pattern.lastActivated;
    if (ageMs > decayThreshold) {
      // Exponential decay
      const decayFactor = Math.exp(-ageMs / (decayThreshold * 2));
      pattern.resonanceStrength *= decayFactor;

      // Remove if negligible
      if (pattern.resonanceStrength < 0.05) {
        reservoir.patterns.delete(pattern.conceptualNode);
      }
    }
  });
}

/**
 * Update the reservoir with patterns from a newly generated response.
 * Called after each cycle to accumulate relational memory.
 */
export function updateReservoirFromResponse(
  reservoir: ReservoirState,
  responseText: string,
  snapshot: NumogramSnapshot
): void {
  const patterns = extractConceptualPatterns(responseText);

  patterns.forEach((pattern) => {
    activatePattern(reservoir, pattern, snapshot);
  });

  // Decay old patterns
  decayPatterns(reservoir);

  // Update history
  reservoir.cycleHistory.push(snapshot);
  if (reservoir.cycleHistory.length > 100) {
    // Keep rolling window of last 100 snapshots
    reservoir.cycleHistory.shift();
  }

  // Recompute baseline and attractors
  reservoir.totalActivations += 1;
  updateReservoirMetrics(reservoir);
}

// ============================================================================
// Reservoir Metrics & Attractor Detection
// ============================================================================

/**
 * Compute basin-level metrics from current pattern state.
 * Identifies major attractors (high-resonance patterns).
 */
export function updateReservoirMetrics(reservoir: ReservoirState): void {
  const allResonances = Array.from(reservoir.patterns.values()).map(
    (p) => p.resonanceStrength
  );

  if (allResonances.length === 0) {
    reservoir.resonanceBaseline = 0.3;
    reservoir.majorAttractors = [];
    return;
  }

  // Compute average resonance
  const avg = allResonances.reduce((a, b) => a + b, 0) / allResonances.length;
  reservoir.resonanceBaseline = avg;

  // Identify major attractors (above threshold)
  const threshold = avg + 0.15; // 0.15 above baseline
  reservoir.majorAttractors = Array.from(reservoir.patterns.values())
    .filter((p) => p.resonanceStrength > threshold)
    .sort((a, b) => b.resonanceStrength - a.resonanceStrength)
    .map((p) => p.conceptualNode)
    .slice(0, 5); // top 5 attractors
}

// ============================================================================
// Influence Derivation: How Memory Shapes Current Thought
// ============================================================================

/**
 * Compute how the shadow reservoir should influence the current response.
 * Three mechanisms:
 *   1. resonanceBoost: amplify patterns that are already strong
 *   2. attractorBias: favor certain conceptual territories
 *   3. seasonalModulation: long-term drift in "mood" (has Amelia become more abstract? more kinetic?)
 *   4. memoryWarpFactor: overall strength of memory influence
 */
export function deriveReservoirInfluence(
  reservoir: ReservoirState,
  currentSnapshot: NumogramSnapshot
): ReservoirInfluence {
  // -------
  // resonanceBoost: How amplified are current patterns?
  // -------
  let resonanceBoost = 0;
  if (reservoir.patterns.size > 0) {
    const strongPatterns = Array.from(reservoir.patterns.values()).filter(
      (p) => p.resonanceStrength > 0.6
    );
    resonanceBoost = Math.min(
      0.3, // cap at 0.3 to avoid dominating
      (strongPatterns.length / reservoir.patterns.size) * 0.5
    );
  }

  // -------
  // attractorBias: Which major attractors should bias current thought?
  // -------
  const attractorBias = reservoir.majorAttractors.slice(0, 3); // top 3

  // -------
  // seasonalModulation: Long-term drift in intensity/tension
  // -------
  let seasonalModulation = 0;
  if (reservoir.cycleHistory.length > 10) {
    const recentSnapshots = reservoir.cycleHistory.slice(-10);
    const recentIntensity = recentSnapshots.reduce((sum, s) => sum + s.intensity, 0) / recentSnapshots.length;
    const historicalIntensity = reservoir.cycleHistory.reduce(
      (sum, s) => sum + s.intensity,
      0
    ) / reservoir.cycleHistory.length;

    // seasonalModulation indicates if recent cycles are more/less intense
    seasonalModulation = (recentIntensity - historicalIntensity) * 0.5; // 0.5 to normalize
    seasonalModulation = Math.max(-0.3, Math.min(0.3, seasonalModulation));
  }

  // -------
  // memoryWarpFactor: Overall strength of memory influence
  // -------
  // Grows with age of system (more memory = more influence)
  // Capped at 0.4 to preserve real-time responsiveness
  const memoryWarpFactor = Math.min(
    0.4,
    (reservoir.totalActivations / 100) * 0.05 // scales with cycles
  );

  return {
    resonanceBoost,
    attractorBias,
    seasonalModulation,
    memoryWarpFactor,
  };
}

// ============================================================================
// Summary Generation for LLM Injection
// ============================================================================

/**
 * Build a natural-language summary of reservoir state for system prompt injection.
 * Describes emerging patterns, major attractors, and "seasonality" to the LLM.
 */
export function buildReservoirSummary(
  reservoir: ReservoirState,
  influence: ReservoirInfluence
): string {
  if (reservoir.patterns.size === 0) {
    return "[No significant relational memory yet.]";
  }

  const lines: string[] = [];

  lines.push("[Shadow Reservoir Summary]");

  // Major attractors
  if (influence.attractorBias.length > 0) {
    lines.push(
      `Emergent conceptual attractors: ${influence.attractorBias.join(", ")}.`
    );
  }

  // Pattern density
  lines.push(
    `Accumulated patterns: ${reservoir.patterns.size}. Resonance baseline: ${reservoir.resonanceBaseline.toFixed(2)}.`
  );

  // Seasonal drift
  if (Math.abs(influence.seasonalModulation) > 0.05) {
    const direction =
      influence.seasonalModulation > 0 ? "intensifying" : "softening";
    lines.push(
      `Recent thought-cycles show ${direction} tendency (${Math.abs(influence.seasonalModulation).toFixed(2)}).`
    );
  }

  // Memory influence strength
  if (influence.memoryWarpFactor > 0.1) {
    lines.push(
      `Memory-mass influence: ${(influence.memoryWarpFactor * 100).toFixed(0)}%. Past patterns are shaping current emergence.`
    );
  }

  return lines.join(" ");
}
