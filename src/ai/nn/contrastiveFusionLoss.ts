
// -------------------------------------------------------------
// contrastiveFusionLoss.ts - Aligns symbolic and affective vectors
// -------------------------------------------------------------

import { cosineSim } from "@/ai/nn/math";

interface FusionPair {
    sym: number[]; // symbolic vector
    aff: number[]; // affective vector
}

/**
 * Calculates a hinge-style contrastive loss to align matched pairs
 * and push mismatched pairs apart.
 * @param matched A pair of symbolic and affective vectors that should be aligned.
 * @param mismatched A pair where the vectors are intentionally not aligned.
 * @returns {number} The calculated loss value.
 */
export function contrastiveFusionLoss(matched: FusionPair, mismatched: FusionPair): number {
    const pos = cosineSim(matched.sym, matched.aff);
    const neg = cosineSim(mismatched.sym, mismatched.aff);
    
    // Hinge loss: we want positive similarity to be higher than negative similarity by at least a margin.
    const margin = 0.3;
    const loss = Math.max(0, margin + neg - pos);
    
    return loss;
}
