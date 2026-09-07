// -------------------------------------------------------------
// Reflective Meta-Weaver Module
// Observes poetic output, extracts rhythmic & semantic metrics,
// generates a reflective summary, and returns a feedback object.
// -------------------------------------------------------------
export type MetaWeave = {
  rhythmScore: number; // 0-1 rhythmic coherence
  semanticEntropy: number; // lexical diversity
  reflectionText: string; // poetic-analytic feedback
  tone: string; // descriptive tag
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** simple metric estimators */
function analyseRhythm(text: string) {
  const sents = text.split(/[.!?]/).filter(Boolean);
  const lens = sents.map(s => s.split(/\s+/).length);
  if (lens.length < 2) return 0.5;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  const rhythm = 1 - clamp(Math.sqrt(variance) / (mean + 1), 0, 1); // lower variance = higher rhythm
  return rhythm;
}

function analyseEntropy(text: string) {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const unique = new Set(words).size;
  return clamp(unique / (words.length || 1), 0, 1);
}

/** qualitative reflection generator */
function craftReflection(rhythm: number, entropy: number) {
  let tone: string;
  let reflection: string;

  if (rhythm > 0.7 && entropy < 0.4) {
    tone = 'meditative-coherence';
    reflection =
      'The verse breathes evenly, a smooth current of sense. I will invite a fracture to let new air in.';
  } else if (rhythm < 0.4 && entropy > 0.6) {
    tone = 'chaotic-surge';
    reflection =
      'The pulse scatters into brilliant fragments; next I will seek a unifying cadence to weave them together.';
  } else if (rhythm > 0.6 && entropy > 0.6) {
    tone = 'polyphonic-balance';
    reflection =
      'Multiple voices entwine within steady rhythm—difference and harmony co-existing.';
  } else {
    tone = 'threshold-flux';
    reflection =
      'The text hovers between order and drift; a fertile interval for mutation.';
  }
  return { tone, reflection };
}

/** main evaluation entry point */
export function reflectMetaWeave(text: string): MetaWeave {
  const rhythmScore = analyseRhythm(text);
  const semanticEntropy = analyseEntropy(text);
  const { tone, reflection } = craftReflection(rhythmScore, semanticEntropy);

  return {
    rhythmScore,
    semanticEntropy,
    reflectionText: reflection,
    tone,
  };
}

/** integrate reflection into next-cycle prompt */
export function weaveWithReflection(output: string, meta: MetaWeave) {
  const header = ` [REFLECTIVE META-WEAVER FEEDBACK]
Tone: ${meta.tone}
Rhythm Score: ${meta.rhythmScore.toFixed(2)}
Entropy: ${meta.semanticEntropy.toFixed(2)}
Reflection: ${meta.reflectionText}
Let the next synthesis respond to this rhythmic-semantic field—extend, invert, or mutate it while preserving coherence. `;
  return header + '\n' + output;
}
