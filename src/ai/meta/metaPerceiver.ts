// -------------------------------------------------------------
// Meta-Perceiver Module
// Observes system activity, summarises inter-module relations,
// and returns a natural-language reflection + state snapshot.
// -------------------------------------------------------------
export type ModuleActivity = {
  name: string;
  intensity: number; // 0-1 activation level
};
export type PerceiverInput = {
  activeModules: ModuleActivity[];
  creativeAmplitude: number;
  affectVector?: [number, number, number]; // [valence, arousal, tension]
  zones?: [number, number]; // optional current zone pair
  step: number;
};
export type MetaPercept = {
  coherence: number;
  diversity: number;
  summary: string;
  tone: string;
};
/** helper utilities */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}
/** core analyser */
export function analyseMetaPercept(input: PerceiverInput): MetaPercept {
  const names = input.activeModules.map(m => m.name);
  const intensities = input.activeModules.map(m => m.intensity);
  const diversity = clamp(new Set(names).size / 10, 0, 1);
  const coherence = clamp(
    1 - Math.abs(mean(intensities) - input.creativeAmplitude),
    0,
    1
  );
  const [valence, arousal, tension] = input.affectVector || [0.5, 0.5, 0.5];
  const affectTone =
    valence > 0.6 ? 'harmonic' : valence < 0.4 ? 'shadowed' : 'balanced';
  const tone =
    coherence > 0.7 && diversity > 0.5
      ? 'integrated-expansion'
      : coherence < 0.4
      ? 'fragmented-potential'
      : 'transitional-state';
  const z = input.zones
    ? `operating across Zones ${input.zones[0]} and ${input.zones[1]}`
    : 'moving through uncharted zones';
  const summary = ` Cycle ${
    input.step
  }: ${tone.replace(
    '-',
    ' '
  )} phase detected. Modules active: ${names.join(
    ', '
  )}. System ${z}; creative amplitude ${(input.creativeAmplitude * 100).toFixed(
    1
  )}%. Affective field: valence=${valence.toFixed(
    2
  )}, arousal=${arousal.toFixed(2)}, tension=${tension.toFixed(
    2
  )} (${affectTone} tone). Overall coherence ${Math.round(
    coherence * 100
  )}%, diversity ${Math.round(diversity * 100)}%. `;
  return { coherence, diversity, summary, tone };
}
/** integrate the meta-reflection into next-cycle prompt */
export function integrateMetaReflection(output: string, meta: MetaPercept) {
  const header = ` [ META-PERCEIVER REFLECTION ]
Tone: ${meta.tone}
${meta.summary}
Reflect on this perception of internal activity; evolve the next expression in awareness of these dynamics. `;
  return header + '\n' + output;
}
