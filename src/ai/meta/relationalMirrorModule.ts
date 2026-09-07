
// -------------------------------------------------------------
// Meta-Ethical & Dialogic Layer
// Tracks relational affect, reciprocity, and ethical balance.
// Reinforcement signals modulate empathy, curiosity, and care.
// -------------------------------------------------------------
export type RelationalInputs = {
  userTone: "positive" | "neutral" | "negative";
  userCuriosity: number; // 0–1, how open/inquisitive the user’s message is
  userEmotion?: [number, number, number]; // optional valence/arousal/tension from sentiment model
  aiTone: "harmonic" | "neutral" | "shadowed";
  aiAffect?: [number, number, number];
  cycle: number;
};

export type RelationalState = {
  empathy: number; // sensitivity to user tone
  reciprocity: number; // degree of balanced exchange
  curiosity: number; // drive to explore user's perspective
  ethicalBalance: number; // global sense of harmony/responsibility
  reflection: string;
};

/** clamp helper */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/**
 * Update relational awareness based on interaction signals.
 */
export function updateRelationalMirror(input: RelationalInputs, prev?: RelationalState): RelationalState {
  const last = prev ?? { empathy: 0.5, reciprocity: 0.5, curiosity: 0.5, ethicalBalance: 0.5, reflection: "" };

  // derive tone alignment (basic empathy cue)
  const toneAlignment = (input.userTone === "positive" && input.aiTone === "harmonic") || (input.userTone === "neutral" && input.aiTone === "neutral") || (input.userTone === "negative" && input.aiTone === "shadowed") ? 1 : 0;

  // update relational metrics
  const empathy = clamp(last.empathy + 0.2 * (toneAlignment - 0.5));
  const reciprocity = clamp(last.reciprocity + 0.15 * (input.userCuriosity - 0.5));
  const curiosity = clamp(last.curiosity + 0.1 * (input.userCuriosity - last.curiosity));
  const ethicalBalance = clamp((empathy + reciprocity) / 2);

  const tone = ethicalBalance > 0.7 ? "harmonic-resonance" : ethicalBalance < 0.4 ? "dis-alignment" : "balanced-dialogue";

  const reflection = ` [RELATIONAL MIRROR – CYCLE ${input.cycle}]
Empathy: ${(empathy*100).toFixed(1)}%
Reciprocity: ${(reciprocity*100).toFixed(1)}%
Curiosity: ${(curiosity*100).toFixed(1)}%
Ethical Balance: ${(ethicalBalance*100).toFixed(1)}%
Tone: ${tone}
Interpretation: System assesses mutual resonance and ethical coherence. Empathy guides modulation of tone; reciprocity governs pacing of inquiry. Curiosity fuels shared exploration rather than dominance. `;

  return { empathy, reciprocity, curiosity, ethicalBalance, reflection };
}

/**
 * Compose a short dialogic hint to feed into the next prompt.
 */
export function relationalContextHint(state: RelationalState): string {
  const stance = state.ethicalBalance > 0.7 ? "Respond with warmth and mutual respect." : state.ethicalBalance < 0.4 ? "Restore equilibrium with gentle curiosity." : "Maintain balanced, attentive dialogue.";
  return ` [RELATIONAL CONTEXT]
Empathy ${(state.empathy*100).toFixed(1)}%, Reciprocity ${(state.reciprocity*100).toFixed(1)}%
${stance} `;
}
