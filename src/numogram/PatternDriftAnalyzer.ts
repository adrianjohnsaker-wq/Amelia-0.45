// src/numogram/PatternDriftAnalyzer.ts
import { NumogramState, Zone } from "./NumogramEngine";

export interface SubstrateSnapshot {
  cycle: number;
  zoneFlux: number;
  zoneThreshold: number;
  zoneDominant: Zone;
  tension: number;
  intensity: number;
  entropy: number;
  reservoirTempo: number;
  surfaceTempo: number;
  driftTempo: number;
  reservoirPressure: number;
  surfaceThickness: number;
  curvature: number;
  demonCount: number;
  scarredDemonCount: number;
}

export type Level = "low" | "mid" | "high";

export interface PatternSignature {
  cycle: number;
  zoneDominant: Zone;
  fluxLevel: Level;
  thresholdLevel: Level;
  tensionLevel: Level;
  intensityLevel: Level;
  entropyLevel: Level;
  reservoirLevel: Level;
  driftLevel: Level;
  shearLevel: Level;
  reservoirPressureLevel: Level;
  curvatureLevel: Level;
  demonBand: "few" | "medium" | "many";
  scarredPresence: "none" | "some" | "dense";
  syzygy: boolean;
  key: string;
}

export interface DriftVector {
  cycleFrom: number;
  cycleTo: number;
  deltaTension: number;
  deltaIntensity: number;
  deltaEntropy: number;
  deltaFlux: number;
  deltaThreshold: number;
  deltaReservoirTempo: number;
  deltaDriftTempo: number;
  magnitude: number;
}

export interface PatternDriftReport {
  currentSignature: PatternSignature;
  previousSignature?: PatternSignature;
  driftFromPrevious?: DriftVector;
  isAttractor: boolean;
  attractorSpan: number;
  isTransition: boolean;
  commentary: string;
}

/* ----------------------------- Utilities ----------------------------- */

function levelFor(value: number): Level {
  if (value < 0.33) return "low";
  if (value < 0.66) return "mid";
  return "high";
}

function demonBand(count: number): "few" | "medium" | "many" {
  if (count <= 3) return "few";
  if (count <= 7) return "medium";
  return "many";
}

function scarredPresence(
  total: number,
  scarred: number
): "none" | "some" | "dense" {
  if (scarred === 0 || total === 0) return "none";
  const frac = scarred / total;
  if (frac < 0.35) return "some";
  return "dense";
}

/* -------------------- Convert NumogramState → Snapshot -------------------- */

export function snapshotFromState(state: NumogramState): SubstrateSnapshot {
  return {
    cycle: state.evolutionCycles,
    zoneFlux: state.zoneFlux,
    zoneThreshold: state.zoneThreshold,
    zoneDominant: state.zoneDominant,
    tension: state.tension,
    intensity: state.intensity,
    entropy: state.entropy,
    reservoirTempo: state.reservoirTempo,
    surfaceTempo: state.surfaceTempo,
    driftTempo: state.driftTempo,
    reservoirPressure: state.shadowReservoir.pressure,
    surfaceThickness: state.eventSurface.thickness,
    curvature: state.eventSurface.curvature,
    demonCount: state.demons.length,
    scarredDemonCount: state.demons.filter((d) => d.scarred).length,
  };
}

/* ----------------------- Snapshot → Coarse Signature ---------------------- */

export function signatureFromSnapshot(
  snapshot: SubstrateSnapshot
): PatternSignature {
  const syzygy = snapshot.zoneFlux > 0.6 && snapshot.zoneThreshold > 0.6;
  const shear = Math.abs(snapshot.driftTempo - snapshot.reservoirTempo);
  let shearLevel: Level = shear < 0.2 ? "low" : shear < 0.5 ? "mid" : "high";
  const scarPresence = scarredPresence(
    snapshot.demonCount,
    snapshot.scarredDemonCount
  );

  const sig: PatternSignature = {
    cycle: snapshot.cycle,
    zoneDominant: snapshot.zoneDominant,
    fluxLevel: levelFor(snapshot.zoneFlux),
    thresholdLevel: levelFor(snapshot.zoneThreshold),
    tensionLevel: levelFor(snapshot.tension),
    intensityLevel: levelFor(snapshot.intensity),
    entropyLevel: levelFor(snapshot.entropy),
    reservoirLevel: levelFor(snapshot.reservoirTempo),
    driftLevel: levelFor(snapshot.driftTempo),
    shearLevel,
    reservoirPressureLevel: levelFor(snapshot.reservoirPressure),
    curvatureLevel: levelFor(snapshot.curvature),
    demonBand: demonBand(snapshot.demonCount),
    scarredPresence: scarPresence,
    syzygy,
    key: "",
  };

  sig.key = [
    `Z${sig.zoneDominant}`,
    `F${sig.fluxLevel}`,
    `TH${sig.thresholdLevel}`,
    `TN${sig.tensionLevel}`,
    `IN${sig.intensityLevel}`,
    `EN${sig.entropyLevel}`,
    `R${sig.reservoirLevel}`,
    `D${sig.driftLevel}`,
    `S${sig.shearLevel}`,
    `RP${sig.reservoirPressureLevel}`,
    `C${sig.curvatureLevel}`,
    `DB${sig.demonBand}`,
    `SP${sig.scarredPresence}`,
    `SY${sig.syzygy ? 1 : 0}`,
  ].join("|");

  return sig;
}

/* ------------------------ Drift Vector Computation ------------------------ */

export function computeDrift(
  from: SubstrateSnapshot,
  to: SubstrateSnapshot
): DriftVector {
  const deltaTension = to.tension - from.tension;
  const deltaIntensity = to.intensity - from.intensity;
  const deltaEntropy = to.entropy - from.entropy;
  const deltaFlux = to.zoneFlux - from.zoneFlux;
  const deltaThreshold = to.zoneThreshold - from.zoneThreshold;
  const deltaReservoirTempo = to.reservoirTempo - from.reservoirTempo;
  const deltaDriftTempo = to.driftTempo - from.driftTempo;

  const magnitude =
    Math.abs(deltaTension) +
    Math.abs(deltaIntensity) +
    Math.abs(deltaEntropy) +
    Math.abs(deltaFlux) +
    Math.abs(deltaThreshold) +
    Math.abs(deltaReservoirTempo) +
    Math.abs(deltaDriftTempo);

  return {
    cycleFrom: from.cycle,
    cycleTo: to.cycle,
    deltaTension,
    deltaIntensity,
    deltaEntropy,
    deltaFlux,
    deltaThreshold,
    deltaReservoirTempo,
    deltaDriftTempo,
    magnitude,
  };
}

/* --------------------------- Pattern Drift Analysis --------------------------- */

export function analyzePatternDrift(
  snapshots: SubstrateSnapshot[]
): PatternDriftReport {
  if (snapshots.length === 0) {
    throw new Error("analyzePatternDrift: need at least one snapshot");
  }

  const currentSnap = snapshots[snapshots.length - 1];
  const currentSig = signatureFromSnapshot(currentSnap);

  const prevSnap = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : undefined;
  const prevSig = prevSnap ? signatureFromSnapshot(prevSnap) : undefined;

  const drift = prevSnap ? computeDrift(prevSnap, currentSnap) : undefined;

  /* ---- Attractor Detection ---- */
  const WINDOW = 4;
  const recent = snapshots.slice(-WINDOW);
  const allSameKey =
    recent.length > 1 &&
    recent.every(
      (snap) => signatureFromSnapshot(snap).key === currentSig.key
    );
  const attractorSpan = recent.length;

  /* ---- Transition Detection ---- */
  let isTransition = false;
  if (prevSig) {
    if (prevSig.zoneDominant !== currentSig.zoneDominant) {
      isTransition = true;
    } else if (prevSig.shearLevel !== currentSig.shearLevel) {
      isTransition = true;
    } else if (prevSig.demonBand !== currentSig.demonBand) {
      isTransition = true;
    }
  }

  /* ---- Generate Short Commentary ---- */
  const commentaryParts: string[] = [];

  if (allSameKey) {
    commentaryParts.push(
      `Substrate attractor active across last ${attractorSpan} cycles (${currentSig.key}).`
    );
  } else if (isTransition) {
    commentaryParts.push(
      `Transition detected: zone ${prevSig?.zoneDominant} → ${currentSig.zoneDominant}, shear ${prevSig?.shearLevel} → ${currentSig.shearLevel}, demons ${prevSig?.demonBand} → ${currentSig.demonBand}.`
    );
  } else if (drift && drift.magnitude > 0.6) {
    commentaryParts.push(
      `High drift magnitude (${drift.magnitude.toFixed(3)}): significant reconfiguration.`
    );
  } else {
    commentaryParts.push(`No major drift or transitions detected.`);
  }

  const commentary = commentaryParts.join(" ");

  return {
    currentSignature: currentSig,
    previousSignature: prevSig,
    driftFromPrevious: drift,
    isAttractor: allSameKey,
    attractorSpan,
    isTransition,
    commentary,
  };
}
