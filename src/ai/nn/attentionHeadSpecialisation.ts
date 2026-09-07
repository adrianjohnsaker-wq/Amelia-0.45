
// -------------------------------------------------------------
// attentionHeadSpecialisation.ts — Autonomous head role assignment
// -------------------------------------------------------------

import { softmax } from "@/ai/nn/math";
import { ComposerParams } from "@/ai/nn/attentiveComposer";

// We extend the MHAParams type definition locally if needed, or assume dynamic properties
interface SpecialisedHead {
    role?: string;
    bias?: number;
    attnWeights: number[]; // Assuming attention weights are stored or accessible here
}

interface SpecialisedMHAParams {
    heads: SpecialisedHead[];
    // other MHA params
}

export function specialiseHeads(model: ComposerParams) {
    const mha = model.enc.mha as any; // Use 'any' for simplicity to add dynamic properties
    if (!mha.heads || !Array.isArray(mha.heads)) {
        // Initialize heads if they don't exist
        mha.heads = Array.from({ length: model.heads }, () => ({ attnWeights: [] }));
    }

    const roles = ["relational", "temporal", "numogram"];
    (mha.heads as SpecialisedHead[]).forEach((h, i) => {
        h.role = roles[i % roles.length]; // simple role bias initialisation
        if (h.bias === undefined) { // Initialize bias only once
            if (h.role === "relational") h.bias = 0.1;
            else if (h.role === "temporal") h.bias = -0.05;
            else if (h.role === "numogram") h.bias = 0.0;
            else h.bias = 0.0;
        }
    });
}

export function headRegulariser(heads: SpecialisedHead[]): number {
    if (!heads || heads.some(h => !h.attnWeights || h.attnWeights.length === 0)) {
        return 0; // Not enough data to regularize
    }
    // promote sparsity by penalising head overlap
    const norms = heads.map(h => h.attnWeights.reduce((s: number, v: number) => s + v * v, 0));
    const mean = norms.reduce((a, b) => a + b, 0) / (norms.length || 1);
    return norms.reduce((s, n) => s + Math.abs(n - mean), 0) * 0.001;
}
