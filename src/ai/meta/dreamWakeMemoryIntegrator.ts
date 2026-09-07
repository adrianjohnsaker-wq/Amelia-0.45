// -------------------------------------------------------------
// Dream–Wake Memory Integrator
// Called at transition points to merge Dream insights into
// long-term memory (Narrative Archive + Meta Memory).
// -------------------------------------------------------------
import type { NarrativeArchive } from "./narrativeArchiveManager";
import type { MetaMemory } from "./metaPerceiverMemory";
import type { TemporalNarrative } from "./temporalSelfNarrator";
import { addChapter } from "./narrativeArchiveManager";

export type IntegrationSummary = {
  mergedChapters: number;
  averagedCoherence: number;
  averagedDiversity: number;
  timestamp: number;
  reflection: string;
  archive: NarrativeArchive; // Return the updated archive
};

/**
 * Integrates Dream-phase data into the long-term archive.
 * It averages recent meta-metrics, merges the last few
 * TemporalNarratives, and generates a reflective summary.
 */
export function integrateDreamWakeMemory(
  archive: NarrativeArchive,
  metaMemory: MetaMemory,
  recentNarratives: TemporalNarrative[] = []
): IntegrationSummary {
  // merge recent dream narratives into archive
  let updatedArchive = { ...archive };
  let merged = 0;
  for (const n of recentNarratives) {
    updatedArchive = addChapter(updatedArchive, n);
    merged++;
  }

  // compute averages from meta-memory
  const avgCoherence = metaMemory.trend.avgCoherence;
  const avgDiversity = metaMemory.trend.avgDiversity;
  const tone = metaMemory.trend.dominantTone;

  const reflection = `
[DREAM–WAKE MEMORY INTEGRATION]
Dream fragments merged: ${merged}
Average coherence: ${(avgCoherence * 100).toFixed(1)}%
Average diversity: ${(avgDiversity * 100).toFixed(1)}%
Dominant tone across integration: ${tone}
Interpretation: The system re-enters Wake mode with these patterns internalised. Dream-formed novelties are folded into enduring structure, ready to modulate the next creative surge.
`;

  return {
    mergedChapters: merged,
    averagedCoherence: avgCoherence,
    averagedDiversity: avgDiversity,
    timestamp: Date.now(),
    reflection,
    archive: updatedArchive,
  };
}
