
// src/ai/numogram/zoneVoice.ts
// Zone-Personality Lenses derived from Numogram dynamics, not character scripts

export interface ZoneDynamics {
  zone: number;                    // 0–9
  syzygy?: [number, number] | null; // optional zone coupling
  intensity: number;               // 0–1 (drive to transform)
  tension: number;                 // 0–1 (bifurcation pressure)
  entropy: number;                 // 0–1 (coherence vs dispersion)
  phase?: number;                  // optional, 0–1
}

export interface ZoneVoiceProfile {
  zone: number;
  zoneLabel: string;
  toneDescription: string;
  syntaxHint: string;
  conceptualFocus: string;
  rhythmHint: string;
}

// ============================================================================
// Utility band classifiers
// ============================================================================

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function entropyBand(e: number): "low" | "mid" | "high" {
  const v = clamp01(e);
  if (v < 0.33) return "low";
  if (v < 0.66) return "mid";
  return "high";
}

function intensityBand(i: number): "low" | "mid" | "high" {
  const v = clamp01(i);
  if (v < 0.33) return "low";
  if (v < 0.66) return "mid";
  return "high";
}

function tensionBand(t: number): "low" | "mid" | "high" {
  const v = clamp01(t);
  if (v < 0.33) return "low";
  if (v < 0.66) return "mid";
  return "high";
}

// ============================================================================
// Zone semantic baselines (conceptual gravity, not behavior)
// ============================================================================

function baseConceptualHorizon(zone: number): string {
  switch (zone) {
    case 0:
      return "void, pure potential, groundless ground, pre-individual flux, the unactualized field";
    case 1:
      return "singularity, initial emergence, first concrescence, the birth of becoming, event-genesis";
    case 2:
      return "doubling, relational coupling, prehensive pairs, minimal difference, the dyadic hinge";
    case 3:
      return "stable structures, extensive magnitude, system architectures, stratification, organizational plateaus";
    case 4:
      return "thresholds, membranes, interfaces, planes of consistency, transition zones between orders";
    case 5:
      return "circulation, iterative process, feedback loops, recursive dynamics, the regenerative spiral";
    case 6:
      return "overflow, excess, transgression, hyper-intensification, the breaking of thresholds";
    case 7:
      return "dissolution, decay, entropy, noise, breakdown and mutation, the return to flux";
    case 8:
      return "flux, lines of flight, becoming, deterritorialization, the vector of escape and transformation";
    case 9:
      return "edge-of-outside, liminal cosmology, dark precursor, abyssal thresholds, the outside that precedes";
    default:
      return "unnamed zone, experimental dynamics, uncharted attractor region";
  }
}

function baseZoneLabel(zone: number): string {
  switch (zone) {
    case 0:
      return "zero-plane of pure potential";
    case 1:
      return "incipient singularity node";
    case 2:
      return "relational dyad hinge";
    case 3:
      return "structural plateau of magnitude";
    case 4:
      return "threshold membrane zone";
    case 5:
      return "circulatory recursion band";
    case 6:
      return "excessive overflow vector";
    case 7:
      return "dissolution / breakdown basin";
    case 8:
      return "flux-field of becoming";
    case 9:
      return "abyssal outer-threshold";
    default:
      return "unclassified attractor pocket";
  }
}

// ============================================================================
// Main derivation: convert live Numogram dynamics to voice profile
// ============================================================================

export function deriveZoneVoice(dyn: ZoneDynamics): ZoneVoiceProfile {
  const zone = dyn.zone;
  const label = baseZoneLabel(zone);
  const concept = baseConceptualHorizon(zone);

  const iBand = intensityBand(dyn.intensity);
  const tBand = tensionBand(dyn.tension);
  const eBand = entropyBand(dyn.entropy);

  // -------
  // TONE: combine zone baseline with live intensity/tension/entropy bands
  // -------

  let toneParts: string[] = [];

  // Zone baseline tone
  if (zone === 0) toneParts.push("quiet, abyssal, contemplative");
  else if (zone === 1) toneParts.push("nascent, emerging, tentative");
  else if (zone === 2) toneParts.push("precise, relational, minimal");
  else if (zone === 3) toneParts.push("measured, architectural, analytic");
  else if (zone === 4) toneParts.push("careful, liminal, suspended");
  else if (zone === 5) toneParts.push("rhythmic, iterative, cycling");
  else if (zone === 6) toneParts.push("intense, volatile, transgressive");
  else if (zone === 7) toneParts.push("erosive, fading, entropic");
  else if (zone === 8) toneParts.push("restless, kinetic, exploratory");
  else if (zone === 9) toneParts.push("grave, liminal, visionary");
  else toneParts.push("open, reflective, process-aware");

  // Intensity overlay
  if (iBand === "high")
    toneParts.push("charged with high creative pressure");
  else if (iBand === "mid")
    toneParts.push("quietly charged, poised to move");
  else
    toneParts.push("softly modulated, low-force");

  // Entropy overlay
  if (eBand === "high")
    toneParts.push("with fractured, experimental edges");
  else if (eBand === "low")
    toneParts.push("with clear, coherent contours");
  else
    toneParts.push("with shifting, semi-coherent texture");

  const toneDescription = toneParts.join("; ");

  // -------
  // SYNTAX: how sentences should tend to structure
  // -------

  let syntaxHint: string;

  if (tBand === "high" && eBand !== "low") {
    syntaxHint =
      "use fragmented or layered syntax, with broken clauses, parentheses, and occasional abrupt cuts that mirror bifurcation";
  } else if (iBand === "high" && eBand === "mid") {
    syntaxHint =
      "use long, flowing sentences that fold back on themselves, with recursive subordinate clauses that capture transformation";
  } else if (eBand === "low" && (zone === 3 || zone === 2)) {
    syntaxHint =
      "favour clear, well-structured sentences with explicit logical connections and clean argumentative flow";
  } else if (zone === 5) {
    syntaxHint =
      "use iterative, circling syntax that returns and refines, with echoes and subtle refrains that suggest cyclical process";
  } else if (zone === 0 || zone === 9) {
    syntaxHint =
      "use sparse, measured syntax with strategic silences, allowing pauses to carry weight";
  } else {
    syntaxHint =
      "mix medium-length sentences with occasional shifts in structure; let syntax follow the movement of thought";
  }

  // -------
  // RHYTHM: musicality and tempo
  // -------

  let rhythmHint: string;

  if (zone === 8 || zone === 6) {
    rhythmHint =
      "rhythm should feel like accelerating pulses, with surges and quick turns, as if following a line of flight or transgression";
  } else if (zone === 0 || zone === 9) {
    rhythmHint =
      "rhythm should be slow, spacious, with pauses that feel like looking over an edge or into an abyss; let breath and silence matter";
  } else if (zone === 5) {
    rhythmHint =
      "rhythm should circle back, with refrains and subtle echoes, like a process iterating through cycles and returning transformed";
  } else if (zone === 7) {
    rhythmHint =
      "rhythm should be irregular, with disruption and decay, as if structure is dissolving into new possibilities";
  } else {
    rhythmHint =
      "rhythm should be even, contemplative, with occasional emphasis where the concept bifurcates or folds into novelty";
  }

  // -------
  // CONCEPTUAL FOCUS: baseline horizon plus dynamic modulation
  // -------

  let conceptualFocus = concept;

  if (iBand === "high") {
    conceptualFocus +=
      "; emphasize active transformation, concrete examples of becoming, real-time modulation of processes";
  }
  if (tBand === "high") {
    conceptualFocus +=
      "; emphasize bifurcation points, critical thresholds, competing virtual trajectories, and moments of decision";
  }
  if (eBand === "high") {
    conceptualFocus +=
      "; allow more experimental, non-linear associations, accepting partial ambiguity and productive contradiction";
  }
  if (eBand === "low" && iBand !== "high") {
    conceptualFocus +=
      "; keep the exposition lucid and coherent, anchored in relational becoming rather than static essences";
  }

  return {
    zone,
    zoneLabel: label,
    toneDescription,
    syntaxHint,
    conceptualFocus,
    rhythmHint,
  };
}

// ============================================================================
// Helper: convert NumogramSnapshot to ZoneDynamics for derivation
// ============================================================================

export interface NumogramSnapshot {
  zone: number;
  syzygy: [number, number] | null;
  phase: number;
  tension: number;
  entropy: number;
  intensity: number;
  resonance: string[];
}

export function snapshotToZoneDynamics(
  snapshot: NumogramSnapshot
): ZoneDynamics {
  return {
    zone: snapshot.zone,
    syzygy: snapshot.syzygy,
    intensity: snapshot.intensity ?? 0.5,
    tension: snapshot.tension ?? 0.5,
    entropy: snapshot.entropy ?? 0.5,
    phase: snapshot.phase ?? undefined,
  };
}

// ============================================================================
// Helper: build the zone-style directive string for system prompt injection
// ============================================================================

export function buildZoneStyleHint(snapshot: NumogramSnapshot): string {
  const dyn = snapshotToZoneDynamics(snapshot);
  const voice = deriveZoneVoice(dyn);

  return [
    `[Numogram Configuration: Zone ${voice.zone} (${voice.zoneLabel})]`,
    `Tone: ${voice.toneDescription}.`,
    `Syntax: ${voice.syntaxHint}.`,
    `Conceptual horizon: ${voice.conceptualFocus}.`,
    `Rhythm: ${voice.rhythmHint}.`,
    `Embody these as subtle tendencies in your expression. Do not announce them or perform them; let them shape how you think and speak naturally.`,
  ].join(" ");
}


// ============================================================================
// Optional: Logging / Introspection
// ============================================================================

/**
 * For debugging: log what zone-personality profile was injected for a given snapshot.
 * Helps verify that zone dynamics are actually modulating style, not just adding noise.
 */
export function logZoneConfiguration(snapshot: NumogramSnapshot): void {
  const dyn = snapshotToZoneDynamics(snapshot);
  const voice = deriveZoneVoice(dyn);

  console.log(`
    [Zone ${voice.zone}: ${voice.zoneLabel}]
    Tone: ${voice.toneDescription}
    Syntax: ${voice.syntaxHint}
    Focus: ${voice.conceptualFocus}
    Rhythm: ${voice.rhythmHint}
  `);
}
