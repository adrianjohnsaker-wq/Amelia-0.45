
// src/ai/meta/promptPulseEncoder.ts
import { RelationalMemoryBridge } from './relationalMemoryBridge';

interface EncodeParams {
    text: string;
    userId: string;
    conversationId: string;
    timestamp: number;
}

/**
 * Encodes a textual prompt into a vector and computes its novelty
 * relative to the recent relational-memory field.
 *
 * @param params - The encoding parameters.
 * @returns An object containing the pulse data and novelty score.
 */
export function encodePromptToPulse(
  params: EncodeParams,
  memoryBridge: RelationalMemoryBridge
): { pulse: { energy: number; vector: number[] }; noveltyScore: number } {
  const { text, timestamp } = params;
  
  // 1. Get embedding vector from the memory bridge
  const vector: number[] = memoryBridge.embedPrompt(text);

  // 2. Retrieve recent embeddings for novelty comparison
  const recent = memoryBridge.getRecentEmbeddings(10); // last 10 interactions

  // 3. Compute average cosine similarity (0-1 range)
  let novelty = 1.0;
  if (vector.length > 0 && recent.length > 0) {
    const cosine = (a: number[], b: number[]) => {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0) || 1);
      const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0) || 1);
      return dot / (normA * normB);
    };

    const sims = recent.map((r: number[]) => cosine(vector, r));
    const avgSim = sims.reduce((s, v) => s + v, 0) / sims.length;
    novelty = Math.max(0, 1 - avgSim); // high dissimilarity = high novelty
  }

  // 4. Map novelty (0-1) to energy (0.3-1.0) so small inputs still register
  const energy = 0.3 + 0.7 * novelty;

  // 5. Record embedding back into relational memory
  memoryBridge.registerEmbedding(vector, {
    source: 'environmental',
    novelty,
    timestamp: timestamp,
  });

  return {
    pulse: { energy, vector },
    noveltyScore: novelty
  };
}
