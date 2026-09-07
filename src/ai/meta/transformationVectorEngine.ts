// -------------------------------------------------------------
// Transformation Vector Engine
// Tracks the oscillation between machineVector (machine) and cosmicVector (cosmic)
// and modulates creative generation parameters in real time.
// -------------------------------------------------------------
export type TransformationState = {
  step: number;
  machineVector: number; // intensity of machinic disassembly (0–1)
  cosmicVector: number; // coherence of cosmic integration (0–1)
  coupling: number; // interaction strength
  creativeAmplitude: number; // emergent creative energy
  phase: number; // oscillatory phase 0–2π
  drift: number; // slow temporal drift
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** initialize a default vector field */
export function initVectorState(): TransformationState {
  return {
    step: 0,
    machineVector: 0.5,
    cosmicVector: 0.5,
    coupling: 0.5,
    creativeAmplitude: 0.0,
    phase: 0.0,
    drift: Math.random() * Math.PI * 2,
  };
}

/** simple oscillator for internal rhythm */
function oscillate(value: number, rate: number, phase: number, step: number) {
  return clamp(0.5 + 0.5 * Math.sin(rate * step + phase), 0, 1);
}

/** core engine update */
export function updateTransformationVectors(
  state: TransformationState,
  feedback: {
    novelty: number;
    coherence: number;
    reward?: number;
  }
) {
  const { novelty, coherence, reward = 0.5 } = feedback;
  const s = { ...state };

  // Step 1: update phase & drift (slow rhythm)
  s.step += 1;
  s.phase += 0.1 + s.drift * 0.0005;

  // Step 2: evolve machineVector/cosmicVector with feedback
  s.machineVector = clamp(0.7 * s.machineVector + 0.3 * novelty + 0.1 * Math.random());
  s.cosmicVector = clamp(
    0.7 * s.cosmicVector + 0.3 * coherence + 0.1 * Math.random()
  );

  // Step 3: compute coupling — higher when both fields are strong
  s.coupling = clamp(s.machineVector * s.cosmicVector * (1 + 0.2 * Math.sin(s.phase)));

  // Step 4: emergent creativeAmplitude = creative energy potential
  s.creativeAmplitude = clamp(
    Math.abs(Math.sin(s.phase)) * (0.5 + 0.5 * (s.coupling + reward - 0.5)),
    0,
    1
  );
  return s;
}

/** derive generation parameters for text synthesis */
export function mapVectorsToGeneration(state: TransformationState) {
  // temperature rises with machineVector, coherence scales top-p
  const temperature = 0.6 + 0.4 * state.machineVector;
  const topP = clamp(0.8 + 0.2 * state.cosmicVector, 0.7, 1.0);
  const creativity = clamp(state.creativeAmplitude, 0.2, 1.0);
  return { temperature, topP, creativity };
}

/** short symbolic reflection for logging or UI */
export function describeVectorState(s: TransformationState) {
  const phaseName =
    s.machineVector > s.cosmicVector
      ? 'Becoming-Machine'
      : s.cosmicVector > s.machineVector
      ? 'Becoming-Cosmic'
      : 'Equilibrium';
  return `Phase: ${phaseName} | Machine ${s.machineVector.toFixed(
    2
  )}, Cosmic ${s.cosmicVector.toFixed(2)}, Amplitude ${s.creativeAmplitude.toFixed(
    2
  )}`;
}
