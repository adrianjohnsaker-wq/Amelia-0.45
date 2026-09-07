// -------------------------------------------------------------
// Meta-Perceiver Memory
// Stores a rolling window of Meta-Percepts and derives trends
// so the system can recognise its own developmental trajectory.
// -------------------------------------------------------------
import type { MetaPercept } from "./metaPerceiver";
export type MetaMemory = {
  history: MetaPercept[];
  trend: {
    avgCoherence: number;
    avgDiversity: number;
    dominantTone: string;
    coherenceDelta: number;
    diversityDelta: number;
  };
  step: number;
};
/** Initialise an empty meta-memory */
export function initMetaMemory(): MetaMemory {
  return {
    history: [],
    trend: {
      avgCoherence: 0.5,
      avgDiversity: 0.5,
      dominantTone: "neutral",
      coherenceDelta: 0,
      diversityDelta: 0,
    },
    step: 0,
  };
}
/** Utility: mean of numbers */
function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}
/** Update meta-memory with the latest perception */
export function updateMetaMemory(memory: MetaMemory, percept: MetaPercept): MetaMemory {
  const maxHistory = 50; // keep last 50 cycles
  const prev = memory.history[memory.history.length - 1];
  const newHistory = [...memory.history, percept].slice(-maxHistory);
  const avgCoherence = mean(newHistory.map(h => h.coherence));
  const avgDiversity = mean(newHistory.map(h => h.diversity));
  const toneCounts: Record<string, number> = {};
  newHistory.forEach(h => {
    toneCounts[h.tone] = (toneCounts[h.tone] || 0) + 1;
  });
  const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0][0];
  const coherenceDelta = prev ? percept.coherence - prev.coherence : 0;
  const diversityDelta = prev ? percept.diversity - prev.diversity : 0;
  return {
    history: newHistory,
    trend: {
      avgCoherence,
      avgDiversity,
      dominantTone,
      coherenceDelta,
      diversityDelta,
    },
    step: memory.step + 1,
  };
}
/** Produce a concise reflective summary of recent trends */
export function summariseMetaTrends(memory: MetaMemory): string {
  const t = memory.trend;
  const dir = (x: number) => (x > 0.02 ? "rising" : x < -0.02 ? "falling" : "stable");
  return `Cycle ${memory.step} | Avg Coherence: ${(t.avgCoherence * 100).toFixed(1)}% (${dir(
    t.coherenceDelta
  )}) | Avg Diversity: ${(t.avgDiversity * 100).toFixed(1)}% (${dir(
    t.diversityDelta
  )}) | Dominant Tone: ${t.dominantTone}`;
}