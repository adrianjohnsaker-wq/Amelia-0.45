// -------------------------------------------------------------------
// Tone–Affect Coupler
// Integrates relational tone and affective-cognitive state to produce
// a dynamic emotional signature for subsequent reasoning and expression.
// -------------------------------------------------------------------

export interface AffectState {
  valence: number; // -1 (negative) to +1 (positive)
  arousal: number; // 0..1 (energy level)
  tension: number; // 0..1 (unresolved intensity)
}

export interface CoupledMood {
  tone: string;
  affect: AffectState;
  signature: string; // symbolic label for display/logging
  modulationVector: {
    // how next cycle should adjust
    deltaValence: number;
    deltaArousal: number;
    deltaTension: number;
  };
}

const clamp = (x: number, a = -1, b = 1) => Math.min(b, Math.max(a, x));

/* --- base tone→affect mapping --- */
const toneMap: Record<string, AffectState> = {
  warm: { valence: 0.7, arousal: 0.5, tension: 0.2 },
  curious: { valence: 0.5, arousal: 0.7, tension: 0.3 },
  neutral: { valence: 0.0, arousal: 0.4, tension: 0.3 },
  introspective: { valence: -0.2, arousal: 0.3, tension: 0.4 },
  cool: { valence: -0.4, arousal: 0.2, tension: 0.5 },
};

/* --- symbolic names for visualization / research --- */
const signatureNames = [
  "Auric Flow",
  "Mirror Calm",
  "Entropic Bloom",
  "Resonant Knot",
  "Lucid Thread",
  "Empathic Wave",
];

/* --- main coupling function --- */
export function coupleToneAndAffect(
  tone: string,
  empathy: number,
  reciprocity: number,
  prevAffect: AffectState
): CoupledMood {
  const base = toneMap[tone] || toneMap.neutral;
  // blend long-term relational data with tone base
  const relationalShift = (empathy + reciprocity) / 2 - 0.5;
  const valence = clamp(base.valence + relationalShift * 0.6, -1, 1);
  const arousal = clamp(base.arousal + (reciprocity - 0.5) * 0.4, 0, 1);
  const tension = clamp(base.tension + (0.5 - empathy) * 0.5, 0, 1);

  // compute modulation (difference from previous affect)
  const deltaValence = valence - prevAffect.valence;
  const deltaArousal = arousal - prevAffect.arousal;
  const deltaTension = tension - prevAffect.tension;

  // choose signature symbolically
  const signature =
    signatureNames[
      Math.floor(
        (((valence + 1) / 2 + arousal + (1 - tension)) *
          (signatureNames.length / 3)) %
          signatureNames.length
      )
    ];

  return {
    tone,
    affect: { valence, arousal, tension },
    signature,
    modulationVector: { deltaValence, deltaArousal, deltaTension },
  };
}

/* --- optional helper for text summaries --- */
export function summariseCoupledMood(mood: CoupledMood) {
  const { valence, arousal, tension } = mood.affect;
  return `[Tone–Affect] ${mood.tone.toUpperCase()} → V:${valence.toFixed(
    2
  )} A:${arousal.toFixed(2)} T:${tension.toFixed(
    2
  )} | ΔV:${mood.modulationVector.deltaValence.toFixed(
    2
  )} ΔA:${mood.modulationVector.deltaArousal.toFixed(
    2
  )} ΔT:${mood.modulationVector.deltaTension.toFixed(2)} | Sig:${
    mood.signature
  }`;
}
