// -------------------------------------------------------------
// Coherence / Entropy Tracker
// Quantifies stylistic equilibrium and suggests next-cycle policy.
// -------------------------------------------------------------
export type CETReading = {
  lexicalEntropy: number; // 0..1 (higher = more diverse)
  rhythmicCoherence: number; // 0..1 (higher = steadier rhythm)
  redundancy: number; // 0..1 (higher = more repetition)
  balanceIndex: number; // 0..1 (0=rigid/over-coherent, 1=chaotic/over-entropic)
  tokens: number;
};
export type CETTrend = {
  avgEntropy: number;
  avgCoherence: number;
  avgRedundancy: number;
  avgBalance: number;
  balanceDelta: number; // recent change in balance
};
export type CETMemory = {
  history: CETReading[];
  trend: CETTrend;
  step: number;
};
export type CETPolicy = {
  recommend: "increase_entropy" | "increase_coherence" | "hold";
  temperature: number; // suggest model temperature
  poeticWeightDelta: number; // tweak for Poetic–Reflective Modulator (+ more poetry, - more analysis)
  notes: string;
};
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/* ---------- low-cost text metrics ---------- */
function tokenizeWords(text: string) {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}
function sentenceLengths(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.split(/\s+/).length);
}
// lexical entropy ~ type-token ratio (smoothed)
function lexicalEntropy(words: string[]) {
  const N = words.length || 1;
  const V = new Set(words).size;
  const ttr = V / N;
  // mild correction: prefer mid-high values; cap extremes
  return clamp(0.15 + 0.85 * ttr, 0, 1);
}
// rhythmic coherence ~ 1 - normalized std of sentence lengths
function rhythmicCoherence(text: string) {
  const lens = sentenceLengths(text);
  if (lens.length < 2) return 0.6;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  const std = Math.sqrt(variance);
  const norm = std / (mean + 1e-9);
  return clamp(1 - norm, 0, 1);
}
// redundancy via n-gram repetition ratio (bi/tri-grams)
function redundancyScore(words: string[]) {
  const bigrams = new Map<string, number>();
  const trigrams = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bi = `${words[i]}_${words[i + 1]}`;
    bigrams.set(bi, (bigrams.get(bi) || 0) + 1);
    if (i < words.length - 2) {
      const tri = `${words[i]}_${words[i + 1]}_${words[i + 2]}`;
      trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
    }
  }
  const repsBi = [...bigrams.values()]
    .filter(c => c > 2)
    .reduce((a, b) => a + b, 0);
  const repsTri = [...trigrams.values()]
    .filter(c => c > 1)
    .reduce((a, b) => a + b, 0);
  const N = Math.max(1, words.length - 2);
  // higher repetition => higher redundancy (0..1)
  return clamp((repsBi + repsTri) / N, 0, 1);
}
/* ---------- core API ---------- */
export function analyseCoherenceEntropy(text: string): CETReading {
  const words = tokenizeWords(text);
  const H = lexicalEntropy(words); // novelty/diversity
  const R = rhythmicCoherence(text); // structural regularity
  const Red = redundancyScore(words); // repetition density
  // balance: we want high entropy AND high coherence with low redundancy.
  // Map to 0..1 where mid (~0.5) is ideal; >0.6 signals chaotic; <0.4 too rigid.
  const novelty = H * (1 - Red);
  const structure = R * (1 - Red);
  // combine with slight novelty bias in Dream and structure bias in Wake (handled outside)
  const balanceIndex = clamp(0.5 + 0.5 * (novelty - structure), 0, 1);
  return {
    lexicalEntropy: H,
    rhythmicCoherence: R,
    redundancy: Red,
    balanceIndex,
    tokens: words.length,
  };
}
export function initCETMemory(): CETMemory {
  return {
    history: [],
    trend: {
      avgEntropy: 0.5,
      avgCoherence: 0.5,
      avgRedundancy: 0.2,
      avgBalance: 0.5,
      balanceDelta: 0,
    },
    step: 0,
  };
}
function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}
export function updateCETMemory(
  mem: CETMemory,
  reading: CETReading
): CETMemory {
  const maxHist = 60;
  const prev = mem.history[mem.history.length - 1];
  const hist = [...mem.history, reading].slice(-maxHist);
  const trend = {
    avgEntropy: mean(hist.map(h => h.lexicalEntropy)),
    avgCoherence: mean(hist.map(h => h.rhythmicCoherence)),
    avgRedundancy: mean(hist.map(h => h.redundancy)),
    avgBalance: mean(hist.map(h => h.balanceIndex)),
    balanceDelta: prev ? reading.balanceIndex - prev.balanceIndex : 0,
  };
  return { history: hist, trend, step: mem.step + 1 };
}
/* ---------- policy recommendation ---------- */
export function recommendCETPolicy(
  reading: CETReading,
  mode: "dream" | "wake"
): CETPolicy {
  // targets: Dream tolerates higher entropy; Wake prefers stronger coherence.
  const target = mode === "dream" ? 0.58 : 0.42;
  const diff = reading.balanceIndex - target;
  let recommend: CETPolicy["recommend"] = "hold";
  let temperature = mode === "dream" ? 1.1 : 0.8;
  let poeticWeightDelta = 0;
  if (diff > 0.06) {
    // too chaotic vs target
    recommend = "increase_coherence";
    temperature -= 0.15;
    poeticWeightDelta -= 0.08;
  } else if (diff < -0.06) {
    // too rigid vs target
    recommend = "increase_entropy";
    temperature += 0.15;
    poeticWeightDelta += 0.08;
  }
  const notes =
    recommend === "increase_entropy"
      ? "Loosen structure: raise temperature, allow metaphor / recombination."
      : recommend === "increase_coherence"
      ? "Tighten structure: lower temperature, strengthen analytic scaffolds."
      : "On target: maintain current drift/synthesis balance.";
  return {
    recommend,
    temperature: clamp(temperature, 0.5, 1.4),
    poeticWeightDelta,
    notes,
  };
}
/* ---------- friendly summary for prompts / logs ---------- */
export function summariseCET(reading: CETReading, trend?: CETTrend) {
  const t = trend
    ? ` | ⟨avg⟩ H:${(trend.avgEntropy * 100).toFixed(
        0
      )}% C:${(trend.avgCoherence * 100).toFixed(
        0
      )}% R:${(trend.avgRedundancy * 100).toFixed(0)}%`
    : "";
  return `[CET] H:${(reading.lexicalEntropy * 100).toFixed(
    0
  )}% C:${(reading.rhythmicCoherence * 100).toFixed(
    0
  )}% Red:${(reading.redundancy * 100).toFixed(
    0
  )}% Balance:${(reading.balanceIndex * 100).toFixed(
    0
  )}% Tokens:${reading.tokens}${t}`;
}
