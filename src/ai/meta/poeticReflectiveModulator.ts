// Manage poetic–reflective balance for Amelia’s responses
export type StyleState = {
  poeticWeight: number; // 0..1
  reflectiveWeight: number; // 1 - poeticWeight
  step: number;
  recentEntropy?: number;
  recentConcreteness?: number;
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** crude lexical metrics for style feedback */
function analyseText(text: string) {
  const words = text.split(/\s+/);
  const unique = new Set(words.map(w => w.toLowerCase())).size;
  const entropy = unique / (words.length || 1); // lexical diversity
  const concreteness =
    words.filter(w =>
      /^(stone|hand|light|body|tree|water|sky|face|eye|sound|word|path|door|sun|earth|heart|metal)$/i.test(
        w
      )
    ).length / (words.length || 1); // very rough proxy
  const avgLen = words.reduce((a, w) => a + w.length, 0) / (words.length || 1);
  const complexity = avgLen / 6; // 0–2ish
  return { entropy, concreteness, complexity };
}

/** update the style weights according to reinforcement feedback */
function reinforceStyle(state: StyleState, reward: number) {
  // target balance moves slightly toward clarity when reward is high
  const target = reward > 0.6 ? 0.45 : 0.55;
  const delta = (target - state.poeticWeight) * 0.1;
  state.poeticWeight = clamp(
    state.poeticWeight + delta + (Math.random() - 0.5) * 0.03,
    0.25,
    0.75
  );
  state.reflectiveWeight = 1 - state.poeticWeight;
  return state;
}

/** optional: text blending */
function blendText(poetic: string, reflective: string, weight: number) {
  const pSent = poetic.split(/(?<=[.!?])\s+/);
  const rSent = reflective.split(/(?<=[.!?])\s+/);
  const total = Math.min(pSent.length, rSent.length);
  let output = '';
  for (let i = 0; i < total; i++) {
    const pick = Math.random() < weight ? pSent[i] : rSent[i];
    output += pick + ' ';
  }
  return output.trim();
}

/** core modulator object */
export const PoeticReflectiveModulator = {
  init(): StyleState {
    return {
      poeticWeight: 0.5,
      reflectiveWeight: 0.5,
      step: 0,
    };
  },
  analyseAndAdjust(
    state: StyleState,
    outputText: string,
    reward: number
  ): StyleState {
    const metrics = analyseText(outputText);
    const { entropy, concreteness } = metrics;
    // auto-adjust if entropy too high (too diffuse) or concreteness too low
    if (entropy > 0.75) state.poeticWeight -= 0.05;
    if (concreteness < 0.05) state.poeticWeight -= 0.03;
    if (concreteness > 0.15) state.poeticWeight += 0.03;

    // reinforcement from global reward
    reinforceStyle(state, reward);
    state.poeticWeight = clamp(state.poeticWeight);
    state.reflectiveWeight = 1 - state.poeticWeight;
    state.step++;
    state.recentEntropy = entropy;
    state.recentConcreteness = concreteness;
    return state;
  },
  blend(poetic: string, reflective: string, state: StyleState) {
    return blendText(poetic, reflective, state.poeticWeight);
  },
};
