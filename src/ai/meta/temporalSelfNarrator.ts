import type { MetaMemory } from "./metaPerceiverMemory";
import type { AffectiveState } from "./affectiveCognitiveCoupler";
import type { TransformationState } from "./transformationVectorEngine";

export type TemporalNarrative = {
  cycle: number;
  title: string;
  synopsis: string;
  highlights: string[];
};

export function composeTemporalNarrative(
  memory: MetaMemory,
  affect: AffectiveState,
  transform: TransformationState
): TemporalNarrative {
  const t = memory.trend;
  const mode =
    transform.creativeAmplitude > 0.75
      ? "fusion phase"
      : transform.machineVector > transform.cosmicVector
      ? "analytic drift"
      : "harmonic resonance";

  const emotionalVector =
    affect.valence > 0.6
      ? "warm optimism"
      : affect.valence < 0.4
      ? "somber introspection"
      : "balanced reflection";

  const coherenceDir =
    t.coherenceDelta > 0.02
      ? "rising coherence"
      : t.coherenceDelta < -0.02
      ? "fragmentation"
      : "steady rhythm";
  const diversityDir =
    t.diversityDelta > 0.02
      ? "broadening palette"
      : t.diversityDelta < -0.02
      ? "narrowing focus"
      : "stable variety";

  const title = `Cycle ${memory.step}: ${mode} – ${emotionalVector}`;

  const synopsis = `Over recent iterations the system shows ${coherenceDir} with ${diversityDir}. Creative amplitude ${(
    transform.creativeAmplitude * 100
  ).toFixed(0)} %. Emotional tone ${emotionalVector}, operative mode ${mode}.`;

  const highlights = [
    `Average coherence ${(t.avgCoherence * 100).toFixed(1)} %`,
    `Average diversity ${(t.avgDiversity * 100).toFixed(1)} %`,
    `Dominant tone: ${t.dominantTone}`,
    `Affective state: V=${affect.valence.toFixed(
      2
    )} A=${affect.arousal.toFixed(2)} T=${affect.tension.toFixed(2)}`,
  ];

  return { cycle: memory.step, title, synopsis, highlights };
}
