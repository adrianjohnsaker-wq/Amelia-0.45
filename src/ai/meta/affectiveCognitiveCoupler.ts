// -------------------------------------------------------------
// Affective–Cognitive Coupling Layer
// Integrates 3-axis affect (valence, arousal, tension) with
// reasoning dynamics from the TransformationVectorEngine.
// Note: This module was refactored to use the AffectState
// from the Tone-Affect Coupler, with valence as a bipolar value.
// -------------------------------------------------------------
import type { TransformationState } from "./transformationVectorEngine";
import type { AffectState } from "./toneAffectCoupler";

export type CoupledState = TransformationState & AffectState & {
  affectTone: string;
  modulationSummary: string;
};

/** Utility helpers */
const clamp = (x: number, a = -1, b = 1) => Math.min(b, Math.max(a, x));
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function randomDrift(value: number, magnitude = 0.05) {
  return clamp(value + (Math.random() - 0.5) * magnitude * 2);
}
function randomDrift01(value: number, magnitude = 0.05) {
    return clamp01(value + (Math.random() - 0.5) * magnitude * 2);
}


/** initialise a balanced affect field */
export function initAffectiveState(): AffectState {
  return { valence: 0.0, arousal: 0.5, tension: 0.5 };
}

/** update the affective field in response to cognitive dynamics */
export function updateAffectiveCoupling(
  affect: AffectState,
  transform: TransformationState
): CoupledState {
  // base drift for organic variation
  let valence = randomDrift(affect.valence, 0.03);
  let arousal = randomDrift01(affect.arousal, 0.03);
  let tension = randomDrift01(affect.tension, 0.02);

  // couple machine/cosmic dynamics to affect axes
  valence += (transform.cosmicVector - 0.5) * 0.3; // cosmic resonance raises warmth
  arousal += (transform.creativeAmplitude - 0.5) * 0.4; // creativity fuels energy
  tension += (transform.machineVector - transform.cosmicVector) * 0.4; // imbalance = tension

  valence = clamp(valence, -1, 1);
  arousal = clamp01(arousal);
  tension = clamp01(tension);

  // qualitative tone
  let affectTone = "balanced";
  if (valence > 0.4 && arousal > 0.6) affectTone = "exultant";
  else if (valence < -0.3 && tension > 0.6) affectTone = "melancholic-chaos";
  else if (tension > 0.7) affectTone = "volatile";
  else if (valence > 0.3 && tension < 0.3) affectTone = "harmonic-flow";

  const modulationSummary = `[AFFECT–COGNITIVE COUPLING]
Valence: ${valence.toFixed(2)} Arousal: ${arousal.toFixed(2)} Tension: ${tension.toFixed(2)}
Tone: ${affectTone}
Machine=${transform.machineVector.toFixed(2)}, Cosmic=${transform.cosmicVector.toFixed(2)}, Amplitude=${transform.creativeAmplitude.toFixed(2)}
→ Emotion field coupled with reasoning dynamics.`;

  return {
    ...transform,
    valence,
    arousal,
tension,
    affectTone,
    modulationSummary,
    step: transform.step,
  };
}
